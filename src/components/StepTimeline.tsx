import React from "react";
import {
  AppWindow,
  ArrowDown,
  ArrowUp,
  Code2,
  CopyPlus,
  EyeOff,
  Globe,
  Image as ImageIcon,
  Keyboard,
  Plus,
  Terminal,
  Trash2,
} from "lucide-react";
import { useWorkflowStore } from "../store/useWorkflowStore";
import { messages } from "../lib/i18n";

export function HostAppBadgeIcon({ appName }: { appName: string }) {
  const lower = appName.toLowerCase();
  if (
    lower.includes("chrome") ||
    lower.includes("safari") ||
    lower.includes("edge") ||
    lower.includes("firefox") ||
    lower.includes("arc")
  ) {
    return (
      <span className="w-4 h-4 rounded bg-[#dbeafe] text-[#1d4ed8] inline-flex items-center justify-center shrink-0">
        <Globe className="w-2.5 h-2.5" />
      </span>
    );
  }
  if (
    lower.includes("ghostty") ||
    lower.includes("terminal") ||
    lower.includes("iterm") ||
    lower.includes("warp") ||
    lower.includes("powershell")
  ) {
    return (
      <span className="w-4 h-4 rounded bg-[#27272a] text-[#6ee7b7] inline-flex items-center justify-center shrink-0">
        <Terminal className="w-2.5 h-2.5" />
      </span>
    );
  }
  if (
    lower.includes("cursor") ||
    lower.includes("code") ||
    lower.includes("xcode") ||
    lower.includes("zed")
  ) {
    return (
      <span className="w-4 h-4 rounded bg-[#e0e7ff] text-[#4338ca] inline-flex items-center justify-center shrink-0">
        <Code2 className="w-2.5 h-2.5" />
      </span>
    );
  }
  if (lower.includes("导入") || lower.includes("import")) {
    return (
      <span className="w-4 h-4 rounded bg-[#eae7df] text-[#44403c] inline-flex items-center justify-center shrink-0">
        <ImageIcon className="w-2.5 h-2.5" />
      </span>
    );
  }
  return (
    <span className="w-4 h-4 rounded bg-[#eae7df] text-[#44403c] inline-flex items-center justify-center shrink-0">
      <AppWindow className="w-2.5 h-2.5" />
    </span>
  );
}

export const StepTimeline: React.FC = () => {
  const {
    locale,
    session,
    selectedStepId,
    selectStep,
    duplicateStep,
    moveStep,
    deleteStep,
    appendStepFromImageFile,
  } = useWorkflowStore();

  const t = messages[locale];
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const firstTs = session.steps[0]?.timestampMs ?? 0;

  return (
    <aside className="w-68 shrink-0 bg-[#faf9f6] border-r border-[#e4e1d8] flex flex-col h-full select-none">
      <div className="px-3.5 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#161615]">
            {t.timelineTitle}
          </span>
          <span className="text-xs text-[#57534e] tabular-nums">
            {t.stepsCount(session.steps.length)}
          </span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              void appendStepFromImageFile(f);
              e.target.value = "";
            }
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="h-6 px-2 rounded text-xs font-medium text-[#57534e] hover:text-[#161615] hover:bg-[#eae7df] flex items-center gap-1 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t.insertShot}</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
        {session.steps.map((step, index) => {
          const isSelected = step.id === selectedStepId;
          const deltaSec = Math.max(
            0,
            (step.timestampMs - firstTs) / 1000
          ).toFixed(1);
          const sourceBadge =
            step.detectionSource === "accessibility"
              ? t.sourceAx
              : step.detectionSource === "vision_ocr"
              ? t.sourceOcr
              : step.detectionSource === "manual"
              ? t.sourceManual
              : t.sourceCoords;

          const redactCount = step.redactions.filter(
            (r) => r.kind !== "highlight"
          ).length;

          return (
            <div
              key={step.id}
              onClick={() => selectStep(step.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  selectStep(step.id);
                }
              }}
              className={`group rounded-lg px-2.5 py-2.5 transition-all duration-150 cursor-pointer ${
                isSelected ? "bg-white shadow-xs" : "hover:bg-[#efede7]"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={`w-5 h-5 rounded-md text-xs font-bold tabular-nums flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    isSelected
                      ? "bg-[#c5281c] text-white"
                      : "bg-[#e5e2d9] text-[#44403c]"
                  }`}
                >
                  {index + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <span className="inline-flex items-center gap-1.5 min-w-0">
                      <HostAppBadgeIcon appName={step.appName} />
                      <span className="text-xs font-medium text-[#44403c] truncate">
                        {step.appName}
                      </span>
                    </span>
                    <span className="text-xs text-[#6b6660] tabular-nums shrink-0">
                      +{deltaSec}s
                    </span>
                  </div>

                  <p className="text-xs font-medium text-[#161615] line-clamp-2 leading-normal m-0">
                    {step.title}
                  </p>

                  <div className="mt-1.5 flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-xs text-[#57534e] bg-[#efede7] px-1.5 py-0.5 rounded">
                        {sourceBadge}
                      </span>
                      {step.shortcutKey && (
                        <span className="text-xs text-[#161615] bg-[#e5e2d9] px-1.5 py-0.5 rounded inline-flex items-center gap-1 font-mono-code">
                          <Keyboard className="w-3 h-3" />
                          <span>{step.shortcutKey}</span>
                        </span>
                      )}
                      {redactCount > 0 && (
                        <span className="text-xs text-[#92400e] bg-[#fef3c7] px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                          <EyeOff className="w-3 h-3" />
                          <span>{t.badgeRedacted}</span>
                        </span>
                      )}
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 flex items-center gap-0.5 transition-opacity shrink-0">
                      <button
                        type="button"
                        aria-label={t.duplicateStep}
                        title={t.duplicateStep}
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateStep(step.id);
                        }}
                        className="p-1 rounded hover:bg-[#e5e2d9] text-[#57534e]"
                      >
                        <CopyPlus className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        aria-label={t.moveUp}
                        disabled={index === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveStep(step.id, "up");
                        }}
                        className="p-1 rounded hover:bg-[#e5e2d9] text-[#57534e] disabled:opacity-30"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        aria-label={t.moveDown}
                        disabled={index === session.steps.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveStep(step.id, "down");
                        }}
                        className="p-1 rounded hover:bg-[#e5e2d9] text-[#57534e] disabled:opacity-30"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        aria-label={t.deleteStep}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteStep(step.id);
                        }}
                        className="p-1 rounded hover:bg-[#fee2e2] text-[#b91c1c]"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
