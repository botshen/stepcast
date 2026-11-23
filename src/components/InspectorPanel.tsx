import React, { useState } from "react";
import { EyeOff, Highlighter, Sparkles, Trash2, Wand2 } from "lucide-react";
import { useWorkflowStore } from "../store/useWorkflowStore";
import type { CanvasTheme } from "../types/workflow";
import { polishWorkflowWithAi } from "../lib/aiPolish";
import { messages } from "../lib/i18n";

const TOOL_OPTIONS = ["Bash", "Read", "Write", "Browser", "MCP"];

export const InspectorPanel: React.FC = () => {
  const {
    locale,
    session,
    selectedStepId,
    aiConfig,
    updateSessionMeta,
    updateSkillMeta,
    updateStep,
    removeRedactionBox,
    applyAllStepsZoom,
    setAiConfig,
    showToast,
  } = useWorkflowStore();

  const t = messages[locale];
  const [isPolishing, setIsPolishing] = useState(false);
  const [showApiSettings, setShowApiSettings] = useState(false);

  const themes: Array<{ id: CanvasTheme; label: string; swatch: string }> = [
    { id: "obsidian", label: t.themeObsidian, swatch: "bg-[#1f1f24]" },
    { id: "sand", label: t.themeSand, swatch: "bg-[#ded8ca]" },
    { id: "slate", label: t.themeSlate, swatch: "bg-[#283548]" },
    { id: "minimal", label: t.themeMinimal, swatch: "bg-[#f4f3ef]" },
  ];

  const step =
    session.steps.find((s) => s.id === selectedStepId) ?? session.steps[0];

  const handleRunPolish = async () => {
    if (session.steps.length === 0) return;
    setIsPolishing(true);
    try {
      const res = await polishWorkflowWithAi(session, aiConfig);
      updateSessionMeta({
        title: res.sessionTitle,
        subtitle: res.sessionSubtitle,
      });
      updateSkillMeta({
        slug: res.skillSlug,
        description: res.skillDescription,
      });
      for (const item of res.steps) {
        updateStep(item.id, {
          title: item.title,
          note: item.note,
          agentInstruction: item.agentInstruction,
        });
      }
      showToast(
        locale === "en"
          ? "Polished workflow titles & SKILL.md instructions"
          : aiConfig.apiKey.trim()
          ? "已完成大模型双轨文案与 SKILL.md 润色"
          : "已完成本地规则化整理（配置 API Key 可启用深度润色）"
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Polish failed");
    } finally {
      setIsPolishing(false);
    }
  };

  return (
    <aside className="w-76 shrink-0 bg-white border-l border-[#e4e1d8] flex flex-col h-full overflow-y-auto px-4 py-3.5 space-y-4">
      {/* Section 1: Document Title & AI Polish */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#161615]">
            {t.workflowInfo}
          </span>
          <button
            type="button"
            disabled={isPolishing}
            onClick={() => void handleRunPolish()}
            className="h-6 px-2 rounded-md bg-[#18181b] hover:bg-[#2e2e32] text-white text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Wand2 className="w-3 h-3" />
            <span>{isPolishing ? t.polishing : t.aiPolish}</span>
          </button>
        </div>

        <input
          type="text"
          aria-label={t.titlePlaceholder}
          value={session.title}
          onChange={(e) => updateSessionMeta({ title: e.target.value })}
          placeholder={t.titlePlaceholder}
          className="w-full h-8 px-2.5 rounded-md bg-[#f5f4f0] focus:bg-white border border-transparent focus:border-[#18181b] text-xs font-medium text-[#161615] truncate focus:text-clip focus:outline-none"
        />

        <textarea
          rows={3}
          aria-label={t.subtitlePlaceholder}
          value={session.subtitle}
          onChange={(e) => updateSessionMeta({ subtitle: e.target.value })}
          placeholder={t.subtitlePlaceholder}
          className="w-full min-h-[66px] px-2.5 py-2 rounded-md bg-[#f5f4f0] focus:bg-white border border-transparent focus:border-[#18181b] text-xs text-[#44403c] leading-[18px] focus:outline-none resize-none"
        />
      </div>

      {/* Section 2: Screen Studio Style Framing & Auto-Zoom */}
      <div className="space-y-2.5 pt-3 border-t border-[#efede7]">
        <span className="block text-xs font-semibold text-[#161615]">
          {t.canvasAppearance}
        </span>

        <div className="grid grid-cols-2 gap-1.5">
          {themes.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => updateSessionMeta({ canvasTheme: item.id })}
              className={`h-8 px-2.5 rounded-md text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer ${
                session.canvasTheme === item.id
                  ? "bg-[#18181b] text-white"
                  : "bg-[#f5f4f0] text-[#44403c] hover:bg-[#eae7df]"
              }`}
            >
              <span
                className={`w-3 h-3 rounded-full border border-black/15 ${item.swatch}`}
              />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {step && (
          <div className="pt-1 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#57534e]">{t.zoomFactorLabel}</span>
              <span className="font-semibold text-[#161615] tabular-nums">
                {step.zoomLevel.toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              aria-label={t.zoomFactorLabel}
              min={1.0}
              max={2.8}
              step={0.05}
              value={step.zoomLevel}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                updateStep(step.id, {
                  zoomLevel: val,
                  focusMode: val <= 1.05 ? "full" : "auto_zoom",
                });
              }}
              className="w-full accent-[#c5281c] cursor-pointer"
            />
            <div className="flex items-center justify-between gap-2">
              <label className="inline-flex items-center gap-1.5 text-xs text-[#57534e] cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={session.showStepBadge}
                  onChange={(e) =>
                    updateSessionMeta({ showStepBadge: e.target.checked })
                  }
                  className="accent-[#18181b]"
                />
                <span>{t.showBadgeLabel}</span>
              </label>
              <button
                type="button"
                onClick={() =>
                  applyAllStepsZoom(step.focusMode, step.zoomLevel)
                }
                className="text-xs font-medium text-[#57534e] hover:text-[#161615] underline cursor-pointer whitespace-nowrap"
              >
                {t.applyToAll}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Section 3: Privacy Redactions & Highlights on Current Step */}
      {step && step.redactions.length > 0 && (
        <div className="space-y-2 pt-3 border-t border-[#efede7]">
          <span className="block text-xs font-semibold text-[#161615]">
            {t.annotationsTitle(step.redactions.length)}
          </span>
          <div className="space-y-1">
            {step.redactions.map((box, i) => (
              <div
                key={box.id}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-[#f5f4f0] text-xs"
              >
                <span className="text-[#44403c] truncate inline-flex items-center gap-1.5">
                  {box.kind === "highlight" ? (
                    <Highlighter className="w-3.5 h-3.5 text-[#b45309] shrink-0" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-[#57534e] shrink-0" />
                  )}
                  <span className="truncate">
                    {box.label || `#${i + 1}`}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label="Remove annotation"
                  onClick={() => removeRedactionBox(step.id, box.id)}
                  className="text-[#b91c1c] hover:opacity-75 p-0.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 4: Agent SKILL.md Compiler Metadata */}
      <div className="space-y-2.5 pt-3 border-t border-[#efede7]">
        <span className="block text-xs font-semibold text-[#161615]">
          {t.skillConfigTitle}
        </span>

        <div>
          <label
            htmlFor="skill-slug-input"
            className="block text-xs text-[#57534e] mb-1"
          >
            {t.skillSlugLabel}
          </label>
          <input
            id="skill-slug-input"
            type="text"
            value={session.skillMeta.slug}
            onChange={(e) => updateSkillMeta({ slug: e.target.value })}
            className="w-full h-8 px-2.5 rounded-md bg-[#f5f4f0] focus:bg-white border border-transparent focus:border-[#18181b] text-xs font-mono-code text-[#161615] truncate focus:text-clip focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="skill-triggers-input"
            className="block text-xs text-[#57534e] mb-1"
          >
            {t.skillTriggersLabel}
          </label>
          <input
            id="skill-triggers-input"
            type="text"
            value={session.skillMeta.triggers}
            placeholder={t.skillTriggersPlaceholder}
            onChange={(e) => updateSkillMeta({ triggers: e.target.value })}
            className="w-full h-8 px-2.5 rounded-md bg-[#f5f4f0] focus:bg-white border border-transparent focus:border-[#18181b] text-xs text-[#161615] truncate focus:text-clip focus:outline-none"
          />
        </div>

        <div>
          <span className="block text-xs text-[#57534e] mb-1.5">
            {t.allowedToolsLabel}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {TOOL_OPTIONS.map((tool) => {
              const active = session.skillMeta.allowedTools.includes(tool);
              return (
                <button
                  key={tool}
                  type="button"
                  onClick={() => {
                    const next = active
                      ? session.skillMeta.allowedTools.filter((x) => x !== tool)
                      : [...session.skillMeta.allowedTools, tool];
                    updateSkillMeta({ allowedTools: next });
                  }}
                  className={`h-6 px-2.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                    active
                      ? "bg-[#18181b] text-white border border-[#18181b]"
                      : "bg-[#f5f4f0] text-[#44403c] border border-[#dad6cc] hover:bg-[#eae7df]"
                  }`}
                >
                  {tool}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section 5: Optional BYOK LLM Configuration */}
      <div className="pt-3 border-t border-[#efede7] space-y-2">
        <button
          type="button"
          onClick={() => setShowApiSettings(!showApiSettings)}
          className="w-full flex items-center justify-between text-xs font-medium text-[#57534e] hover:text-[#161615] cursor-pointer"
        >
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.byokSettings}</span>
          </span>
          <span>{showApiSettings ? t.collapse : t.expand}</span>
        </button>

        {showApiSettings && (
          <div className="space-y-2 pt-1">
            <input
              type="text"
              aria-label="OpenAI compatible base URL"
              value={aiConfig.baseUrl}
              onChange={(e) =>
                setAiConfig({ ...aiConfig, baseUrl: e.target.value })
              }
              placeholder="https://api.deepseek.com/v1"
              className="w-full h-8 px-2.5 rounded-md bg-[#f5f4f0] text-xs font-mono-code text-[#161615] focus:outline-none"
            />
            <input
              type="password"
              aria-label="API Key"
              value={aiConfig.apiKey}
              onChange={(e) =>
                setAiConfig({ ...aiConfig, apiKey: e.target.value })
              }
              placeholder="sk-... (stored locally only)"
              className="w-full h-8 px-2.5 rounded-md bg-[#f5f4f0] text-xs font-mono-code text-[#161615] focus:outline-none"
            />
            <input
              type="text"
              aria-label="Model name"
              value={aiConfig.model}
              onChange={(e) =>
                setAiConfig({ ...aiConfig, model: e.target.value })
              }
              placeholder="deepseek-chat / gpt-4o-mini"
              className="w-full h-8 px-2.5 rounded-md bg-[#f5f4f0] text-xs font-mono-code text-[#161615] focus:outline-none"
            />
          </div>
        )}
      </div>
    </aside>
  );
};
