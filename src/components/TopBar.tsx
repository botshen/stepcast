import React from "react";
import {
  Camera,
  CheckCircle2,
  CircleDot,
  FileCode2,
  FileText,
  FolderPlus,
  Globe,
  Layers,
  Redo2,
  ShieldAlert,
  Square,
  Undo2,
  Upload,
} from "lucide-react";
import { useWorkflowStore } from "../store/useWorkflowStore";
import { isTauriRuntime } from "../lib/bridge";
import { messages } from "../lib/i18n";

export const TopBar: React.FC<{ onBackToWebsite?: () => void }> = ({
  onBackToWebsite,
}) => {
  const {
    locale,
    session,
    past,
    future,
    savedSessions,
    activeTab,
    isRecording,
    permissions,
    setLocale,
    setActiveTab,
    undo,
    redo,
    startRecordingSession,
    stopRecordingSession,
    captureSingleStepNow,
    appendStepFromImageFile,
    loadSampleWorkflow,
    createNewEmptySession,
    switchSession,
    requestOsPermission,
  } = useWorkflowStore();

  const t = messages[locale];
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const needsPerm =
    isTauriRuntime() &&
    (!permissions.accessibility || !permissions.screenRecording);

  return (
    <header className="h-12 shrink-0 bg-[#faf9f6] border-b border-[#e4e1d8] px-4 flex items-center justify-between gap-3 select-none">
      {/* Left: Brand, Session Switcher & Undo/Redo */}
      <div className="flex items-center gap-2.5 min-w-0">
        {onBackToWebsite ? (
          <button
            type="button"
            onClick={onBackToWebsite}
            title={locale === "en" ? "Back to Official Website" : "返回官网首页"}
            className="flex items-center gap-2 shrink-0 hover:opacity-80 cursor-pointer"
          >
            <span className="w-6 h-6 rounded-md bg-[#18181b] flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-[#e03e2f]" />
            </span>
            <span className="font-semibold text-sm tracking-tight text-[#161615]">
              StepCast
            </span>
          </button>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-6 h-6 rounded-md bg-[#18181b] flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-[#e03e2f]" />
            </span>
            <span className="font-semibold text-sm tracking-tight text-[#161615]">
              StepCast
            </span>
          </div>
        )}

        <span className="text-[#cbc7bc]">/</span>

        <select
          aria-label="Switch workflow session"
          value={session.id}
          onChange={(e) => {
            if (e.target.value === "__new__") {
              void createNewEmptySession();
            } else if (e.target.value === "__sample__") {
              void loadSampleWorkflow();
            } else {
              void switchSession(e.target.value);
            }
          }}
          className="h-8 max-w-[260px] rounded-md bg-[#eeece6] hover:bg-[#e6e3db] px-2.5 text-xs font-medium text-[#161615] truncate focus:outline-none focus:ring-2 focus:ring-[#18181b]"
        >
          <option value={session.id}>
            {session.title} ({t.stepsCount(session.steps.length)})
          </option>
          {savedSessions
            .filter((s) => s.id !== session.id)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({t.stepsCount(s.stepCount)})
              </option>
            ))}
          <option value="__new__">{t.newBlankFlow}</option>
          <option value="__sample__">{t.reloadSampleFlow}</option>
        </select>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            aria-label={t.undoTip}
            title={t.undoTip}
            disabled={past.length === 0}
            onClick={undo}
            className="h-7 w-7 rounded-md flex items-center justify-center text-[#44403c] hover:bg-[#eae7df] disabled:opacity-45 cursor-pointer disabled:cursor-default transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            aria-label={t.redoTip}
            title={t.redoTip}
            disabled={future.length === 0}
            onClick={redo}
            className="h-7 w-7 rounded-md flex items-center justify-center text-[#44403c] hover:bg-[#eae7df] disabled:opacity-45 cursor-pointer disabled:cursor-default transition-colors"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {needsPerm ? (
          <button
            type="button"
            onClick={() =>
              void requestOsPermission(
                !permissions.screenRecording ? "screen" : "accessibility"
              )
            }
            className="h-7 px-2.5 rounded-md bg-[#fef3c7] text-[#92400e] hover:bg-[#fde68a] text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>
              {!permissions.screenRecording
                ? t.grantScreenPerm
                : t.grantAxPerm}
            </span>
          </button>
        ) : (
          <span className="hidden xl:inline-flex items-center gap-1 text-xs text-[#57534e]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#15803d]" />
            <span>{t.localEngineReady}</span>
          </span>
        )}
      </div>

      {/* Center: Segmented Workspace Switcher */}
      <nav
        aria-label="Workspace mode switcher"
        className="flex items-center bg-[#eae7df] p-0.5 rounded-lg shrink-0"
      >
        <button
          id="tab-studio"
          type="button"
          onClick={() => setActiveTab("studio")}
          className={`h-7 px-3 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all duration-150 cursor-pointer ${
            activeTab === "studio"
              ? "bg-white text-[#161615] shadow-xs"
              : "text-[#57534e] hover:text-[#161615]"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{t.tabStudio}</span>
        </button>
        <button
          id="tab-sop"
          type="button"
          onClick={() => setActiveTab("sop")}
          className={`h-7 px-3 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all duration-150 cursor-pointer ${
            activeTab === "sop"
              ? "bg-white text-[#161615] shadow-xs"
              : "text-[#57534e] hover:text-[#161615]"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>{t.tabSop}</span>
        </button>
        <button
          id="tab-skill"
          type="button"
          onClick={() => setActiveTab("skill")}
          className={`h-7 px-3 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all duration-150 cursor-pointer ${
            activeTab === "skill"
              ? "bg-white text-[#161615] shadow-xs"
              : "text-[#57534e] hover:text-[#161615]"
          }`}
        >
          <FileCode2 className="w-3.5 h-3.5" />
          <span>{t.tabSkill}</span>
        </button>
      </nav>

      {/* Right: Single Unmistakable Global Capture Scope */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          id="lang-toggle"
          type="button"
          onClick={() => void setLocale(locale === "zh" ? "en" : "zh")}
          className="h-8 px-2.5 rounded-md text-xs font-medium text-[#44403c] hover:bg-[#eae7df] flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{locale === "zh" ? "EN" : "中文"}</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              void appendStepFromImageFile(file);
              e.target.value = "";
            }
          }}
        />

        {isTauriRuntime() ? (
          <button
            type="button"
            onClick={() => void captureSingleStepNow()}
            className="h-8 px-2.5 rounded-md bg-[#eae7df] hover:bg-[#dedad0] text-[#161615] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{t.snapStep}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-8 px-2.5 rounded-md bg-[#eae7df] hover:bg-[#dedad0] text-[#161615] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{t.importImage}</span>
          </button>
        )}

        {!isRecording ? (
          <button
            type="button"
            onClick={() => void startRecordingSession(false)}
            className="h-8 px-3.5 rounded-md bg-[#c5281c] hover:bg-[#ab2016] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <CircleDot className="w-3.5 h-3.5" />
            <span>{t.startRecord}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void stopRecordingSession()}
            className="h-8 px-3.5 rounded-md bg-[#18181b] hover:bg-[#27272a] text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-[#ef4444] animate-record-dot" />
            <Square className="w-3 h-3 fill-current" />
            <span className="tabular-nums">
              {t.stopRecord} ({session.steps.length})
            </span>
          </button>
        )}
      </div>
    </header>
  );
};

export const EmptyTimelinePlaceholder: React.FC<{
  onLoadSample: () => void;
  onStartRecord: () => void;
}> = ({ onLoadSample, onStartRecord }) => {
  const locale = useWorkflowStore((s) => s.locale);
  const t = messages[locale];
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-11 h-11 rounded-xl bg-[#eae7df] flex items-center justify-center mb-3 text-[#44403c]">
        <FolderPlus className="w-5 h-5" />
      </div>
      <h2 className="text-base font-semibold text-[#161615] mb-1">
        {t.emptyTitle}
      </h2>
      <p className="text-xs text-[#57534e] max-w-md mb-5 leading-relaxed">
        {t.emptyDesc}
      </p>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onStartRecord}
          className="h-8 px-4 rounded-md bg-[#c5281c] hover:bg-[#ab2016] text-white text-xs font-semibold cursor-pointer"
        >
          {t.emptyRecordBtn}
        </button>
        <button
          type="button"
          onClick={onLoadSample}
          className="h-8 px-3.5 rounded-md bg-[#eae7df] hover:bg-[#dedad0] text-[#161615] text-xs font-medium cursor-pointer"
        >
          {t.emptySampleBtn}
        </button>
      </div>
    </div>
  );
};
