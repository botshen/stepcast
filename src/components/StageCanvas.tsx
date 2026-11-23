import React, { useEffect, useRef, useState } from "react";
import {
  Crosshair,
  EyeOff,
  Highlighter,
  Maximize2,
  ZoomIn,
} from "lucide-react";
import { useWorkflowStore } from "../store/useWorkflowStore";
import {
  computeCropViewport,
  renderStyledStepDataUrl,
} from "../lib/compilers";
import { messages } from "../lib/i18n";
import { EmptyTimelinePlaceholder } from "./TopBar";
import { HostAppBadgeIcon } from "./StepTimeline";

export const StageCanvas: React.FC = () => {
  const {
    locale,
    session,
    selectedStepId,
    drawMode,
    setDrawMode,
    updateStep,
    addRedactionBox,
    loadSampleWorkflow,
    startRecordingSession,
    showToast,
  } = useWorkflowStore();

  const t = messages[locale];
  const stepIndex = session.steps.findIndex((s) => s.id === selectedStepId);
  const step = stepIndex >= 0 ? session.steps[stepIndex] : session.steps[0];

  const [renderedSrc, setRenderedSrc] = useState<string>("");
  const [pulseFeedback, setPulseFeedback] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const imgOverlayRef = useRef<HTMLDivElement | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [dragCurrent, setDragCurrent] = useState<{
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!step) {
      setRenderedSrc("");
      return;
    }
    void renderStyledStepDataUrl(
      step,
      stepIndex >= 0 ? stepIndex : 0,
      session,
      1120,
      locale
    ).then((url) => {
      if (!cancelled) setRenderedSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [step, stepIndex, session, locale]);

  if (!step) {
    return (
      <EmptyTimelinePlaceholder
        onLoadSample={() => void loadSampleWorkflow()}
        onStartRecord={() => void startRecordingSession(false)}
      />
    );
  }

  const padRatio = session.canvasTheme === "minimal" ? 18 / 1120 : 38 / 1120;

  const clientPointToSourceNorm = (clientX: number, clientY: number) => {
    const el = imgOverlayRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const rx = (clientX - rect.left) / rect.width;
    const ry = (clientY - rect.top) / rect.height;

    const innerRx = (rx - padRatio) / (1 - padRatio * 2);
    const innerRy = (ry - padRatio) / (1 - padRatio * 2);
    if (innerRx < 0 || innerRx > 1 || innerRy < 0 || innerRy > 1) {
      return null;
    }

    const crop = computeCropViewport(
      step.normX,
      step.normY,
      step.focusMode,
      step.zoomLevel
    );
    return {
      x: Math.max(0, Math.min(1, crop.sx + innerRx * crop.sw)),
      y: Math.max(0, Math.min(1, crop.sy + innerRy * crop.sh)),
      viewRx: rx,
      viewRy: ry,
    };
  };

  return (
    <main className="flex-1 min-w-0 bg-[#f4f3ef] flex flex-col h-full overflow-y-auto">
      {/* Canvas Sub-Toolbar */}
      <div className="px-5 pt-3 pb-1.5 flex items-center justify-between gap-3 max-w-[820px] w-full mx-auto">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-[#161615] tabular-nums shrink-0">
            {t.stepProgress(stepIndex + 1, session.steps.length)}
          </span>
          <HostAppBadgeIcon appName={step.appName} />
          <span className="text-xs text-[#57534e] truncate">
            {step.appName}
            {step.windowTitle ? ` · ${step.windowTitle}` : ""}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() =>
              updateStep(step.id, {
                focusMode:
                  step.focusMode === "auto_zoom" ? "full" : "auto_zoom",
              })
            }
            className={`h-7 px-2.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              step.focusMode === "auto_zoom"
                ? "bg-[#18181b] text-white"
                : "bg-[#e6e3db] text-[#161615] hover:bg-[#dcd8ce]"
            }`}
          >
            {step.focusMode === "auto_zoom" ? (
              <>
                <ZoomIn className="w-3.5 h-3.5" />
                <span className="tabular-nums">
                  {t.smartZoom(step.zoomLevel.toFixed(2))}
                </span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>{t.fullView}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() =>
              setDrawMode(drawMode === "highlight" ? null : "highlight")
            }
            className={`h-7 px-2.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              drawMode === "highlight"
                ? "bg-[#b45309] text-white"
                : "bg-[#e6e3db] text-[#161615] hover:bg-[#dcd8ce]"
            }`}
          >
            <Highlighter className="w-3.5 h-3.5" />
            <span>
              {drawMode === "highlight"
                ? t.drawingHighlight
                : t.drawHighlight}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setDrawMode(drawMode === "redact" ? null : "redact")}
            className={`h-7 px-2.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              drawMode === "redact"
                ? "bg-[#18181b] text-white"
                : "bg-[#e6e3db] text-[#161615] hover:bg-[#dcd8ce]"
            }`}
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>
              {drawMode === "redact" ? t.drawingRedact : t.drawRedact}
            </span>
          </button>
        </div>
      </div>

      {/* Center Visual Frame (sized so bottom 3-line editors fit cleanly in 1440x900) */}
      <div className="px-5 py-1.5 flex items-center justify-center">
        <div
          ref={imgOverlayRef}
          onMouseDown={(e) => {
            if (!drawMode) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const pt = {
              x: (e.clientX - rect.left) / rect.width,
              y: (e.clientY - rect.top) / rect.height,
            };
            setDragStart(pt);
            setDragCurrent(pt);
          }}
          onMouseMove={(e) => {
            if (!drawMode || !dragStart) return;
            const rect = e.currentTarget.getBoundingClientRect();
            setDragCurrent({
              x: (e.clientX - rect.left) / rect.width,
              y: (e.clientY - rect.top) / rect.height,
            });
          }}
          onMouseUp={(e) => {
            if (drawMode && dragStart && dragCurrent) {
              const el = imgOverlayRef.current;
              if (el) {
                const rect = el.getBoundingClientRect();
                const p1 = clientPointToSourceNorm(
                  rect.left + dragStart.x * rect.width,
                  rect.top + dragStart.y * rect.height
                );
                const p2 = clientPointToSourceNorm(e.clientX, e.clientY);
                if (p1 && p2) {
                  const x = Math.min(p1.x, p2.x);
                  const y = Math.min(p1.y, p2.y);
                  const w = Math.abs(p2.x - p1.x);
                  const h = Math.abs(p2.y - p1.y);
                  if (w > 0.015 && h > 0.012) {
                    addRedactionBox(step.id, {
                      kind: drawMode,
                      x,
                      y,
                      w,
                      h,
                      label:
                        drawMode === "highlight"
                          ? locale === "en"
                            ? "Spotlight Callout"
                            : "重点高亮框"
                          : locale === "en"
                          ? "Redacted Secret"
                          : "隐私脱敏区域",
                    });
                  }
                }
              }
              setDragStart(null);
              setDragCurrent(null);
              return;
            }

            if (!drawMode) {
              const hit = clientPointToSourceNorm(e.clientX, e.clientY);
              if (hit) {
                setPulseFeedback({ x: hit.viewRx, y: hit.viewRy });
                window.setTimeout(() => setPulseFeedback(null), 420);
                updateStep(step.id, { normX: hit.x, normY: hit.y });
                showToast(
                  locale === "en"
                    ? "Locked focus reticle"
                    : "已锁定点击聚焦锚点"
                );
              }
            }
          }}
          className={`relative w-full max-w-[688px] rounded-xl overflow-hidden shadow-sm select-none transition-all duration-200 ${
            drawMode ? "cursor-crosshair" : "cursor-pointer"
          }`}
        >
          {renderedSrc ? (
            <img
              src={renderedSrc}
              alt={step.title}
              draggable={false}
              className="w-full h-auto block transition-opacity duration-150"
            />
          ) : (
            <div className="aspect-16/10 bg-[#e6e3db] flex items-center justify-center text-xs text-[#57534e]">
              …
            </div>
          )}

          {pulseFeedback && (
            <span
              style={{
                left: `${pulseFeedback.x * 100}%`,
                top: `${pulseFeedback.y * 100}%`,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border-2 border-[#c5281c] animate-ping pointer-events-none"
            />
          )}

          {drawMode && dragStart && dragCurrent && (
            <div
              style={{
                left: `${Math.min(dragStart.x, dragCurrent.x) * 100}%`,
                top: `${Math.min(dragStart.y, dragCurrent.y) * 100}%`,
                width: `${Math.abs(dragCurrent.x - dragStart.x) * 100}%`,
                height: `${Math.abs(dragCurrent.y - dragStart.y) * 100}%`,
              }}
              className={`absolute rounded pointer-events-none border-2 ${
                drawMode === "highlight"
                  ? "bg-amber-400/15 border-amber-500"
                  : "bg-[#18181b]/75 border-amber-500"
              }`}
            />
          )}
        </div>
      </div>

      <div className="px-5 pb-1 flex items-center justify-center">
        <span className="text-xs text-[#57534e] inline-flex items-center gap-1.5 tabular-nums">
          <Crosshair className="w-3.5 h-3.5" />
          <span>
            {t.anchorHint(
              (step.normX * 100).toFixed(0),
              (step.normY * 100).toFixed(0)
            )}
          </span>
        </span>
      </div>

      {/* Inline Step Copy & Agent Instruction Editor */}
      <section
        aria-label="Step editor"
        className="px-5 py-2.5 max-w-[820px] w-full mx-auto space-y-2.5"
      >
        <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-3">
          <div>
            <label
              htmlFor="step-title-input"
              className="block text-xs font-semibold text-[#44403c] mb-1"
            >
              {t.humanStepTitle}
            </label>
            <input
              id="step-title-input"
              type="text"
              value={step.title}
              onChange={(e) => updateStep(step.id, { title: e.target.value })}
              className="w-full h-8 px-3 rounded-lg bg-white border border-[#dad6cc] text-xs font-medium text-[#161615] truncate focus:text-clip focus:outline-none focus:border-[#18181b]"
            />
          </div>

          <div>
            <label
              htmlFor="step-cli-input"
              className="block text-xs font-medium text-[#57534e] mb-1"
            >
              {t.cliSnippetLabel}
            </label>
            <input
              id="step-cli-input"
              type="text"
              value={step.commandSnippet ?? ""}
              placeholder="pnpm dlx ..."
              onChange={(e) =>
                updateStep(step.id, { commandSnippet: e.target.value })
              }
              className="w-full h-8 px-3 rounded-lg bg-white border border-[#dad6cc] text-xs font-mono-code text-[#161615] truncate focus:text-clip focus:outline-none focus:border-[#18181b]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="step-note-input"
              className="block text-xs font-medium text-[#57534e] mb-1"
            >
              {t.humanNoteLabel}
            </label>
            <textarea
              id="step-note-input"
              rows={4}
              value={step.note}
              placeholder={t.humanNotePlaceholder}
              onChange={(e) => updateStep(step.id, { note: e.target.value })}
              className="w-full min-h-[88px] px-3 py-2 rounded-lg bg-white border border-[#dad6cc] text-xs text-[#161615] leading-[18px] focus:outline-none focus:border-[#18181b] resize-none"
            />
          </div>

          <div>
            <label
              htmlFor="step-agent-input"
              className="block text-xs font-medium text-[#57534e] mb-1"
            >
              {t.agentInstLabel}
            </label>
            <textarea
              id="step-agent-input"
              rows={4}
              value={step.agentInstruction}
              onChange={(e) =>
                updateStep(step.id, { agentInstruction: e.target.value })
              }
              className="w-full min-h-[88px] px-3 py-2 rounded-lg bg-white border border-[#dad6cc] text-xs font-mono-code text-[#161615] leading-[18px] focus:outline-none focus:border-[#18181b] resize-none"
            />
          </div>
        </div>
      </section>
    </main>
  );
};
