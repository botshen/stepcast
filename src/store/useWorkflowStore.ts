import { create } from "zustand";
import type {
  ActiveWorkspaceTab,
  AiProviderConfig,
  AnnotationKind,
  CapturedStep,
  Locale,
  PermissionStatus,
  RedactionBox,
  SessionSummary,
  SkillMeta,
  WorkflowSession,
} from "../types/workflow";
import { createSampleSession } from "../lib/sampleData";
import { buildStepFromNativeEvent, nativeBridge } from "../lib/bridge";
import { detectInitialLocale, persistLocale } from "../lib/i18n";

const AI_CONFIG_KEY = "stepcast_ai_provider_v1";
const MAX_HISTORY = 25;

function loadSavedAiConfig(): AiProviderConfig {
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {
    baseUrl: "https://api.deepseek.com/v1",
    apiKey: "",
    model: "deepseek-chat",
  };
}

function createBlankSession(locale: Locale): WorkflowSession {
  const id = `session-${Date.now().toString(36)}`;
  const title = locale === "en" ? "Untitled Workflow" : "新建操作录制流程";
  return {
    id,
    title,
    subtitle: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    canvasTheme: "obsidian",
    ringColor: "#D93829",
    showStepBadge: true,
    watermark: "Captured with StepCast · Open-Source SOP & Skill Compiler",
    skillMeta: {
      slug: "custom-workflow-skill",
      name: title,
      description: "Execute recorded desktop & browser procedural workflow.",
      triggers: "",
      allowedTools: ["Bash", "Read", "Write", "Browser"],
    },
    steps: [],
  };
}

interface WorkflowStoreState {
  locale: Locale;
  session: WorkflowSession;
  past: WorkflowSession[];
  future: WorkflowSession[];
  savedSessions: SessionSummary[];
  selectedStepId: string | null;
  activeTab: ActiveWorkspaceTab;
  isRecording: boolean;
  drawMode: AnnotationKind | null;
  permissions: PermissionStatus;
  aiConfig: AiProviderConfig;
  toastMessage: string | null;

  initialize: () => Promise<void>;
  setLocale: (locale: Locale) => Promise<void>;
  refreshPermissions: () => Promise<void>;
  requestOsPermission: (kind: "accessibility" | "screen") => Promise<void>;
  setActiveTab: (tab: ActiveWorkspaceTab) => void;
  selectStep: (id: string) => void;
  stepRelative: (delta: -1 | 1) => void;
  setDrawMode: (mode: AnnotationKind | null) => void;
  showToast: (msg: string) => void;

  undo: () => void;
  redo: () => void;

  startRecordingSession: (startFresh?: boolean) => Promise<void>;
  stopRecordingSession: () => Promise<void>;
  captureSingleStepNow: () => Promise<void>;
  appendStepFromImageFile: (file: File) => Promise<void>;
  loadSampleWorkflow: () => Promise<void>;
  createNewEmptySession: () => Promise<void>;
  switchSession: (id: string) => Promise<void>;
  removeSession: (id: string) => Promise<void>;

  updateSessionMeta: (
    patch: Partial<
      Pick<
        WorkflowSession,
        | "title"
        | "subtitle"
        | "canvasTheme"
        | "ringColor"
        | "showStepBadge"
        | "watermark"
      >
    >
  ) => void;
  updateSkillMeta: (patch: Partial<SkillMeta>) => void;
  updateStep: (stepId: string, patch: Partial<CapturedStep>) => void;
  duplicateStep: (stepId: string) => void;
  moveStep: (stepId: string, direction: "up" | "down") => void;
  deleteStep: (stepId: string) => void;
  addRedactionBox: (stepId: string, box: Omit<RedactionBox, "id">) => void;
  removeRedactionBox: (stepId: string, boxId: string) => void;
  applyAllStepsZoom: (
    focusMode: "auto_zoom" | "full",
    zoomLevel: number
  ) => void;
  setAiConfig: (cfg: AiProviderConfig) => void;
  persistCurrentSession: () => Promise<void>;
}

let unlistenStep: (() => void) | null = null;
let unlistenState: (() => void) | null = null;

function pushHistory(
  past: WorkflowSession[],
  current: WorkflowSession
): WorkflowSession[] {
  const next = [...past, structuredClone(current)];
  return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
}

const initialLocale = detectInitialLocale();

export const useWorkflowStore = create<WorkflowStoreState>((set, get) => ({
  locale: initialLocale,
  session: createSampleSession(initialLocale),
  past: [],
  future: [],
  savedSessions: [],
  selectedStepId: "step-sample-1",
  activeTab: "studio",
  isRecording: false,
  drawMode: null,
  permissions: {
    accessibility: true,
    screenRecording: true,
    platform: "macos",
  },
  aiConfig: loadSavedAiConfig(),
  toastMessage: null,

  showToast(msg: string) {
    set({ toastMessage: msg });
    window.setTimeout(() => {
      if (get().toastMessage === msg) {
        set({ toastMessage: null });
      }
    }, 3200);
  },

  async initialize() {
    const loc = detectInitialLocale();
    const perms = await nativeBridge.checkPermissions();
    const summaries = await nativeBridge.listSessions();

    const urlLangExplicit =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("lang");

    if (summaries.length > 0 && !urlLangExplicit) {
      const latestRaw = await nativeBridge.loadSession(summaries[0].id);
      if (latestRaw) {
        try {
          const loaded = JSON.parse(latestRaw) as WorkflowSession;
          set({
            locale: loc,
            session: loaded,
            past: [],
            future: [],
            selectedStepId: loaded.steps[0]?.id ?? null,
            savedSessions: summaries,
            permissions: perms,
          });
        } catch {
          set({ locale: loc, permissions: perms, savedSessions: summaries });
        }
      }
    } else {
      const sample = createSampleSession(loc);
      await nativeBridge.saveSession(
        sample.id,
        sample.title,
        sample.steps.length,
        JSON.stringify(sample)
      );
      const nextList = await nativeBridge.listSessions();
      set({
        locale: loc,
        session: sample,
        past: [],
        future: [],
        selectedStepId: sample.steps[0]?.id ?? null,
        savedSessions: nextList,
        permissions: perms,
      });
    }

    if (unlistenStep) unlistenStep();
    if (unlistenState) unlistenState();

    unlistenStep = await nativeBridge.onStepCaptured((evt) => {
      const step = buildStepFromNativeEvent(evt, get().locale);
      set((state) => {
        const nextSteps = [...state.session.steps, step];
        return {
          past: pushHistory(state.past, state.session),
          future: [],
          session: {
            ...state.session,
            updatedAt: new Date().toISOString(),
            steps: nextSteps,
          },
          selectedStepId: step.id,
        };
      });
      void get().persistCurrentSession();
    });

    unlistenState = await nativeBridge.onRecordingStateChanged((recording) => {
      set({ isRecording: recording });
    });
  },

  async setLocale(locale: Locale) {
    persistLocale(locale);
    const curr = get().session;
    if (curr.id.startsWith("sample-mcp-release-flow")) {
      const sample = createSampleSession(locale);
      set({
        locale,
        session: sample,
        selectedStepId: sample.steps[0]?.id ?? null,
      });
      await get().persistCurrentSession();
    } else {
      set({ locale });
    }
  },

  async refreshPermissions() {
    const perms = await nativeBridge.checkPermissions();
    set({ permissions: perms });
  },

  async requestOsPermission(kind) {
    const perms = await nativeBridge.requestPermission(kind);
    set({ permissions: perms });
    const isEn = get().locale === "en";
    get().showToast(
      kind === "accessibility"
        ? isEn
          ? "Opened Accessibility settings — enable StepCast to inspect UI controls"
          : "已打开辅助功能授权设置，勾选 StepCast 即可自动识别控件名称"
        : isEn
        ? "Opened Screen Recording settings — enable StepCast to capture screens"
        : "已打开屏幕录制授权设置，授权后即可捕获高清操作画面"
    );
  },

  setActiveTab(tab) {
    set({ activeTab: tab });
  },

  selectStep(id) {
    set({ selectedStepId: id });
  },

  stepRelative(delta) {
    const { session, selectedStepId } = get();
    if (session.steps.length === 0) return;
    const idx = session.steps.findIndex((s) => s.id === selectedStepId);
    const nextIdx = Math.max(
      0,
      Math.min(session.steps.length - 1, (idx < 0 ? 0 : idx) + delta)
    );
    set({ selectedStepId: session.steps[nextIdx].id });
  },

  setDrawMode(mode) {
    set({ drawMode: mode });
  },

  undo() {
    const { past, session, future } = get();
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    set({
      past: past.slice(0, -1),
      session: prev,
      future: [structuredClone(session), ...future].slice(0, MAX_HISTORY),
      selectedStepId: prev.steps[0]?.id ?? null,
    });
    void get().persistCurrentSession();
  },

  redo() {
    const { past, session, future } = get();
    if (future.length === 0) return;
    const [next, ...rest] = future;
    set({
      past: pushHistory(past, session),
      session: next,
      future: rest,
      selectedStepId: next.steps[0]?.id ?? null,
    });
    void get().persistCurrentSession();
  },

  async startRecordingSession(startFresh = false) {
    const isEn = get().locale === "en";
    if (startFresh) {
      const blank = createBlankSession(get().locale);
      set({
        session: blank,
        past: [],
        future: [],
        selectedStepId: null,
        activeTab: "studio",
      });
    }
    try {
      await nativeBridge.startRecording(true);
      set({ isRecording: true });
      get().showToast(
        isEn
          ? "Recording active — perform your workflow in any app"
          : "已启动后台录制：请切换到任意软件正常操作"
      );
    } catch (err) {
      get().showToast(
        err instanceof Error ? err.message : "Failed to start recording"
      );
    }
  },

  async stopRecordingSession() {
    const isEn = get().locale === "en";
    await nativeBridge.stopRecording();
    set({ isRecording: false });
    await get().persistCurrentSession();
    get().showToast(
      isEn
        ? `Recording finished (${get().session.steps.length} steps)`
        : `录制完成，共捕获 ${get().session.steps.length} 个步骤`
    );
  },

  async captureSingleStepNow() {
    try {
      const evt = await nativeBridge.captureInstantSnapshot();
      const step = buildStepFromNativeEvent(evt, get().locale);
      set((state) => ({
        past: pushHistory(state.past, state.session),
        future: [],
        session: {
          ...state.session,
          updatedAt: new Date().toISOString(),
          steps: [...state.session.steps, step],
        },
        selectedStepId: step.id,
      }));
      await get().persistCurrentSession();
    } catch (err) {
      get().showToast(err instanceof Error ? err.message : "Snapshot failed");
    }
  },

  async appendStepFromImageFile(file: File) {
    const isEn = get().locale === "en";
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Failed to read image"));
      reader.readAsDataURL(file);
    });
    const stem = file.name.replace(/\.[^.]+$/, "");
    const newStep: CapturedStep = {
      id: `manual-${Date.now().toString(36)}`,
      timestampMs: Date.now(),
      appName: isEn ? "Imported Screen" : "手动导入画面",
      bundleId: "",
      windowTitle: stem,
      button: "left",
      normX: 0.5,
      normY: 0.5,
      screenWidth: 1280,
      screenHeight: 800,
      scaleFactor: 2,
      elementRole: "CustomTarget",
      elementLabel: "",
      ocrText: "",
      detectionSource: "manual",
      imageDataUrl: dataUrl,
      title: isEn ? `Step: ${stem}` : `操作步骤：${stem}`,
      note: isEn
        ? "Click anywhere on the canvas to position the focus ring."
        : "可在画布任意位置点击以校准红圈焦点。",
      agentInstruction: `Inspect view "${file.name}" and click the highlighted target.`,
      focusMode: "auto_zoom",
      zoomLevel: 1.65,
      redactions: [],
    };
    set((state) => ({
      past: pushHistory(state.past, state.session),
      future: [],
      session: {
        ...state.session,
        updatedAt: new Date().toISOString(),
        steps: [...state.session.steps, newStep],
      },
      selectedStepId: newStep.id,
    }));
    await get().persistCurrentSession();
  },

  async loadSampleWorkflow() {
    const sample = createSampleSession(get().locale);
    set({
      session: sample,
      past: [],
      future: [],
      selectedStepId: sample.steps[0]?.id ?? null,
      activeTab: "studio",
    });
    await get().persistCurrentSession();
  },

  async createNewEmptySession() {
    const blank = createBlankSession(get().locale);
    set({
      session: blank,
      past: [],
      future: [],
      selectedStepId: null,
      activeTab: "studio",
    });
    await get().persistCurrentSession();
  },

  async switchSession(id: string) {
    const raw = await nativeBridge.loadSession(id);
    if (!raw) return;
    const loaded = JSON.parse(raw) as WorkflowSession;
    set({
      session: loaded,
      past: [],
      future: [],
      selectedStepId: loaded.steps[0]?.id ?? null,
    });
  },

  async removeSession(id: string) {
    await nativeBridge.deleteSession(id);
    const list = await nativeBridge.listSessions();
    if (list.length > 0) {
      await get().switchSession(list[0].id);
      set({ savedSessions: list });
    } else {
      const blank = createBlankSession(get().locale);
      set({
        session: blank,
        past: [],
        future: [],
        selectedStepId: null,
        savedSessions: [],
      });
    }
  },

  updateSessionMeta(patch) {
    set((state) => ({
      past: pushHistory(state.past, state.session),
      future: [],
      session: {
        ...state.session,
        ...patch,
        updatedAt: new Date().toISOString(),
      },
    }));
    void get().persistCurrentSession();
  },

  updateSkillMeta(patch) {
    set((state) => ({
      past: pushHistory(state.past, state.session),
      future: [],
      session: {
        ...state.session,
        updatedAt: new Date().toISOString(),
        skillMeta: {
          ...state.session.skillMeta,
          ...patch,
        },
      },
    }));
    void get().persistCurrentSession();
  },

  updateStep(stepId, patch) {
    set((state) => ({
      session: {
        ...state.session,
        updatedAt: new Date().toISOString(),
        steps: state.session.steps.map((s) =>
          s.id === stepId ? { ...s, ...patch } : s
        ),
      },
    }));
    void get().persistCurrentSession();
  },

  duplicateStep(stepId) {
    set((state) => {
      const idx = state.session.steps.findIndex((s) => s.id === stepId);
      if (idx < 0) return state;
      const copy: CapturedStep = {
        ...structuredClone(state.session.steps[idx]),
        id: `dup-${Date.now().toString(36)}`,
      };
      const next = [...state.session.steps];
      next.splice(idx + 1, 0, copy);
      return {
        past: pushHistory(state.past, state.session),
        future: [],
        session: {
          ...state.session,
          updatedAt: new Date().toISOString(),
          steps: next,
        },
        selectedStepId: copy.id,
      };
    });
    void get().persistCurrentSession();
  },

  moveStep(stepId, direction) {
    set((state) => {
      const idx = state.session.steps.findIndex((s) => s.id === stepId);
      if (idx < 0) return state;
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= state.session.steps.length) {
        return state;
      }
      const next = [...state.session.steps];
      const [moved] = next.splice(idx, 1);
      next.splice(targetIdx, 0, moved);
      return {
        past: pushHistory(state.past, state.session),
        future: [],
        session: {
          ...state.session,
          updatedAt: new Date().toISOString(),
          steps: next,
        },
      };
    });
    void get().persistCurrentSession();
  },

  deleteStep(stepId) {
    set((state) => {
      const idx = state.session.steps.findIndex((s) => s.id === stepId);
      const next = state.session.steps.filter((s) => s.id !== stepId);
      const nextSelected =
        state.selectedStepId === stepId
          ? next[Math.min(idx, next.length - 1)]?.id ?? null
          : state.selectedStepId;
      return {
        past: pushHistory(state.past, state.session),
        future: [],
        session: {
          ...state.session,
          updatedAt: new Date().toISOString(),
          steps: next,
        },
        selectedStepId: nextSelected,
      };
    });
    void get().persistCurrentSession();
  },

  addRedactionBox(stepId, box) {
    const redaction: RedactionBox = {
      ...box,
      id: `red-${Date.now().toString(36)}`,
    };
    set((state) => ({
      past: pushHistory(state.past, state.session),
      future: [],
      session: {
        ...state.session,
        updatedAt: new Date().toISOString(),
        steps: state.session.steps.map((s) =>
          s.id === stepId
            ? { ...s, redactions: [...s.redactions, redaction] }
            : s
        ),
      },
      drawMode: null,
    }));
    void get().persistCurrentSession();
  },

  removeRedactionBox(stepId, boxId) {
    set((state) => ({
      past: pushHistory(state.past, state.session),
      future: [],
      session: {
        ...state.session,
        updatedAt: new Date().toISOString(),
        steps: state.session.steps.map((s) =>
          s.id === stepId
            ? { ...s, redactions: s.redactions.filter((r) => r.id !== boxId) }
            : s
        ),
      },
    }));
    void get().persistCurrentSession();
  },

  applyAllStepsZoom(focusMode, zoomLevel) {
    set((state) => ({
      past: pushHistory(state.past, state.session),
      future: [],
      session: {
        ...state.session,
        updatedAt: new Date().toISOString(),
        steps: state.session.steps.map((s) => ({
          ...s,
          focusMode,
          zoomLevel,
        })),
      },
    }));
    void get().persistCurrentSession();
  },

  setAiConfig(cfg) {
    localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(cfg));
    set({ aiConfig: cfg });
  },

  async persistCurrentSession() {
    const { session } = get();
    await nativeBridge.saveSession(
      session.id,
      session.title,
      session.steps.length,
      JSON.stringify(session)
    );
    const list = await nativeBridge.listSessions();
    set({ savedSessions: list });
  },
}));
