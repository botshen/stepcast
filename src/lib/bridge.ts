import type {
  CapturedStep,
  Locale,
  PermissionStatus,
  RawNativeEvent,
  SessionSummary,
} from "../types/workflow";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
}

async function tauriInvoke<T>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(cmd, args);
}

const WEB_STORAGE_KEY = "stepcast_web_sessions_v1";

function getWebSessionsMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(WEB_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export const nativeBridge = {
  async checkPermissions(): Promise<PermissionStatus> {
    if (!isTauriRuntime()) {
      return {
        accessibility: true,
        screenRecording: true,
        platform: "web-preview",
      };
    }
    return tauriInvoke<PermissionStatus>("check_permissions");
  },

  async requestPermission(
    kind: "accessibility" | "screen"
  ): Promise<PermissionStatus> {
    if (!isTauriRuntime()) {
      return {
        accessibility: true,
        screenRecording: true,
        platform: "web-preview",
      };
    }
    return tauriInvoke<PermissionStatus>("request_permission", { kind });
  },

  async startRecording(minimizeStudio = true): Promise<void> {
    if (!isTauriRuntime()) return;
    await tauriInvoke("start_recording", { minimizeStudio });
  },

  async stopRecording(): Promise<void> {
    if (!isTauriRuntime()) return;
    await tauriInvoke("stop_recording");
  },

  async captureInstantSnapshot(): Promise<RawNativeEvent> {
    if (!isTauriRuntime()) {
      throw new Error(
        "Instant desktop snapshot requires the native StepCast desktop app."
      );
    }
    return tauriInvoke<RawNativeEvent>("capture_instant_snapshot");
  },

  async onStepCaptured(
    handler: (evt: RawNativeEvent) => void
  ): Promise<() => void> {
    if (!isTauriRuntime()) {
      return () => {};
    }
    const { listen } = await import("@tauri-apps/api/event");
    return listen<RawNativeEvent>("stepcast://step-captured", (event) => {
      handler(event.payload);
    });
  },

  async onRecordingStateChanged(
    handler: (recording: boolean) => void
  ): Promise<() => void> {
    if (!isTauriRuntime()) {
      return () => {};
    }
    const { listen } = await import("@tauri-apps/api/event");
    return listen<boolean>("stepcast://recording-state", (event) => {
      handler(Boolean(event.payload));
    });
  },

  async listSessions(): Promise<SessionSummary[]> {
    if (!isTauriRuntime()) {
      const map = getWebSessionsMap();
      return Object.values(map)
        .map((json) => {
          const parsed = JSON.parse(json);
          return {
            id: parsed.id,
            title: parsed.title,
            stepCount: parsed.steps?.length ?? 0,
            updatedAt: parsed.updatedAt ?? new Date().toISOString(),
          };
        })
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
    return tauriInvoke<SessionSummary[]>("list_sessions");
  },

  async loadSession(id: string): Promise<string | null> {
    if (!isTauriRuntime()) {
      const map = getWebSessionsMap();
      return map[id] ?? null;
    }
    return tauriInvoke<string | null>("load_session", { id });
  },

  async saveSession(
    id: string,
    title: string,
    stepCount: number,
    payloadJson: string
  ): Promise<void> {
    if (!isTauriRuntime()) {
      const map = getWebSessionsMap();
      map[id] = payloadJson;
      localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(map));
      return;
    }
    await tauriInvoke("save_session", {
      id,
      title,
      stepCount,
      payloadJson,
    });
  },

  async deleteSession(id: string): Promise<void> {
    if (!isTauriRuntime()) {
      const map = getWebSessionsMap();
      delete map[id];
      localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(map));
      return;
    }
    await tauriInvoke("delete_session", { id });
  },

  async installSkillToAgent(params: {
    agentTarget: "claude" | "codex" | "cursor" | "universal";
    skillSlug: string;
    skillMarkdown: string;
    sopMarkdown: string;
  }): Promise<{ targetPath: string; agentName: string }> {
    if (!isTauriRuntime()) {
      const targetDir =
        params.agentTarget === "claude"
          ? `~/.claude/skills/${params.skillSlug}/SKILL.md`
          : params.agentTarget === "codex"
          ? `~/.codex/skills/${params.skillSlug}/SKILL.md`
          : params.agentTarget === "cursor"
          ? `~/.cursor/skills/${params.skillSlug}/SKILL.md`
          : `~/.agents/skills/${params.skillSlug}/SKILL.md`;
      return {
        targetPath: targetDir,
        agentName:
          params.agentTarget === "claude" ? "Claude Code" : "Local Agent",
      };
    }
    return tauriInvoke("install_skill_to_agent", params);
  },
};

export function buildStepFromNativeEvent(
  evt: RawNativeEvent,
  locale: Locale = "zh"
): CapturedStep {
  const isEn = locale === "en";
  const rawTarget = (evt.elementLabel || evt.ocrText || "").trim();
  const isShortcut = evt.button === "shortcut" && Boolean(evt.shortcutKey);
  const isRight = evt.button === "right";

  let title: string;
  let agentInstruction: string;

  if (isShortcut) {
    title = isEn
      ? `Press shortcut ${evt.shortcutKey} in ${evt.appName}`
      : `在 ${evt.appName} 中按下快捷键「${evt.shortcutKey}」`;
    agentInstruction = `In "${evt.appName}", trigger keyboard shortcut "${evt.shortcutKey}".`;
  } else if (rawTarget) {
    title = isEn
      ? `${isRight ? "Right-click" : "Click"} "${rawTarget}" in ${evt.appName}`
      : `在 ${evt.appName} 中${isRight ? "右键点击" : "点击"}「${rawTarget}」`;
    agentInstruction = `Target app "${evt.appName}"${
      evt.windowTitle ? ` (window: "${evt.windowTitle}")` : ""
    }: ${isRight ? "right-click" : "click"} ${
      evt.elementRole || "control"
    } labeled "${rawTarget}".`;
  } else {
    title = isEn
      ? `${isRight ? "Right-click" : "Click"} target in ${evt.appName}`
      : `在 ${evt.appName} 中执行${isRight ? "右键" : "点击"}操作`;
    agentInstruction = `Target app "${evt.appName}": click at normalized coordinates (${evt.normX.toFixed(
      2
    )}, ${evt.normY.toFixed(2)}).`;
  }

  const autoRedactions = (evt.autoRedactions ?? []).map((r, idx) => ({
    id: `auto-red-${evt.id}-${idx}`,
    kind: "redact" as const,
    x: r.x,
    y: r.y,
    w: r.w,
    h: r.h,
    label: r.label,
  }));

  let note = "";
  if (autoRedactions.length > 0) {
    note = isEn
      ? `Offline Vision scanner auto-redacted ${autoRedactions.length} sensitive token(s).`
      : `离线视觉扫描已自动识别并脱敏 ${autoRedactions.length} 处敏感凭证。`;
  } else if (evt.detectionSource === "vision_ocr") {
    note = isEn
      ? "Extracted control label via native offline Vision OCR."
      : "通过系统原生离线 OCR 识别自绘界面控件文字。";
  }

  return {
    id: evt.id,
    timestampMs: evt.timestampMs,
    appName: evt.appName,
    bundleId: evt.bundleId,
    windowTitle: evt.windowTitle,
    button: isShortcut ? "shortcut" : isRight ? "right" : "left",
    shortcutKey: evt.shortcutKey || undefined,
    normX: evt.normX,
    normY: evt.normY,
    screenWidth: evt.screenWidth || 1440,
    screenHeight: evt.screenHeight || 900,
    scaleFactor: evt.scaleFactor || 2,
    elementRole: evt.elementRole,
    elementLabel: evt.elementLabel,
    ocrText: evt.ocrText,
    detectionSource:
      evt.detectionSource === "accessibility" ||
      evt.detectionSource === "vision_ocr"
        ? evt.detectionSource
        : "coords",
    imageDataUrl: evt.imageDataUrl || "",
    title,
    note,
    agentInstruction,
    focusMode: "auto_zoom",
    zoomLevel: 1.75,
    redactions: autoRedactions,
  };
}
