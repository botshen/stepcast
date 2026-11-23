import React, { useMemo, useState } from "react";
import {
  Archive,
  Check,
  Copy,
  FileCode2,
  FileText,
  FolderCheck,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { useWorkflowStore } from "../store/useWorkflowStore";
import {
  compileAgentSkillMarkdown,
  compileSopMarkdown,
  exportSkillBundleZipBytes,
} from "../lib/compilers";
import { isTauriRuntime, nativeBridge } from "../lib/bridge";
import { messages } from "../lib/i18n";

type PackageFileKey = "SKILL.md" | "SOP.md" | "references/visual-sop.md";

function renderHighlightedMarkdown(content: string): React.ReactNode {
  const lines = content.split("\n");
  let inFrontmatter = false;
  let fenceCount = 0;

  return lines.map((line, idx) => {
    if (line.trim() === "---" && fenceCount < 2) {
      fenceCount += 1;
      inFrontmatter = fenceCount === 1;
      return (
        <div key={idx} className="text-[#a1a1aa]">
          {line}
        </div>
      );
    }

    if (inFrontmatter) {
      const colonIdx = line.indexOf(":");
      if (colonIdx > 0) {
        const key = line.slice(0, colonIdx);
        const rest = line.slice(colonIdx);
        return (
          <div key={idx}>
            <span className="text-[#93c5fd]">{key}</span>
            <span className="text-[#e4e4e7]">{rest}</span>
          </div>
        );
      }
    }

    if (line.startsWith("# ")) {
      return (
        <div key={idx} className="text-[#fafafa] font-bold">
          {line}
        </div>
      );
    }
    if (line.startsWith("## ") || line.startsWith("### ")) {
      return (
        <div key={idx} className="text-[#fcd34d] font-semibold">
          {line}
        </div>
      );
    }
    if (line.includes("Security Guardrail")) {
      return (
        <div key={idx} className="text-[#fca5a5]">
          {line}
        </div>
      );
    }
    if (line.startsWith("- **")) {
      const endBold = line.indexOf("**:", 4);
      if (endBold > 0) {
        return (
          <div key={idx}>
            <span className="text-[#86efac]">{line.slice(0, endBold + 3)}</span>
            <span className="text-[#e4e4e7]">{line.slice(endBold + 3)}</span>
          </div>
        );
      }
    }
    return (
      <div key={idx} className="text-[#d4d4d8]">
        {line || "\u00A0"}
      </div>
    );
  });
}

export const SkillPreviewView: React.FC = () => {
  const { locale, session, showToast } = useWorkflowStore();
  const t = messages[locale];
  const [copied, setCopied] = useState(false);
  const [activeFile, setActiveFile] = useState<PackageFileKey>("SKILL.md");
  const [installedPath, setInstalledPath] = useState<string | null>(null);

  const slug =
    session.skillMeta.slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-") || "stepcast-workflow";

  const skillMarkdown = useMemo(
    () => compileAgentSkillMarkdown(session),
    [session]
  );

  const sopRootMd = useMemo(() => {
    const rel = session.steps.map(
      (_, i) => `assets/step-${String(i + 1).padStart(2, "0")}.png`
    );
    return compileSopMarkdown(session, rel, locale);
  }, [session, locale]);

  const sopRefMd = useMemo(() => {
    const rel = session.steps.map(
      (_, i) => `../assets/step-${String(i + 1).padStart(2, "0")}.png`
    );
    return compileSopMarkdown(session, rel, locale);
  }, [session, locale]);

  const activeContent =
    activeFile === "SKILL.md"
      ? skillMarkdown
      : activeFile === "SOP.md"
      ? sopRootMd
      : sopRefMd;

  const frontmatterEnd = skillMarkdown.indexOf("\n---\n", 4);
  const frontmatterChars =
    frontmatterEnd > 0 ? frontmatterEnd + 4 : Math.min(200, skillMarkdown.length);
  const startupTokens = Math.max(18, Math.round(frontmatterChars / 4));
  const fullTokens = Math.max(40, Math.round(skillMarkdown.length / 4));
  const totalRedactions = session.steps.reduce(
    (sum, s) => sum + s.redactions.filter((r) => r.kind !== "highlight").length,
    0
  );

  const handleCopyActive = async () => {
    await navigator.clipboard.writeText(activeContent);
    setCopied(true);
    showToast(
      locale === "en"
        ? `Copied ${activeFile} to clipboard`
        : `已复制 ${activeFile} 内容`
    );
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSkillZip = async () => {
    const bytes = await exportSkillBundleZipBytes(session, locale);
    const blob = new Blob([bytes.buffer as ArrayBuffer], {
      type: "application/zip",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-skill.zip`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(
      locale === "en"
        ? "Downloaded complete Skill ZIP package"
        : "已下载完整技能归档包 (.zip)"
    );
  };

  const handleInstallToLocalAgent = async (
    target: "claude" | "codex" | "cursor" | "universal"
  ) => {
    try {
      const res = await nativeBridge.installSkillToAgent({
        agentTarget: target,
        skillSlug: slug,
        skillMarkdown,
        sopMarkdown: sopRefMd,
      });
      setInstalledPath(res.targetPath);
      if (!isTauriRuntime()) {
        await handleDownloadSkillZip();
      } else {
        showToast(
          locale === "en"
            ? `Installed skill to ${res.targetPath}`
            : `已成功安装至 ${res.agentName}：${res.targetPath}`
        );
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Install failed");
    }
  };

  const files: Array<{ key: PackageFileKey; label: string; icon: "code" | "doc" }> = [
    { key: "SKILL.md", label: "SKILL.md", icon: "code" },
    { key: "SOP.md", label: "SOP.md", icon: "doc" },
    {
      key: "references/visual-sop.md",
      label: "references/visual-sop.md",
      icon: "doc",
    },
  ];

  return (
    <div className="flex-1 bg-[#f4f3ef] h-full overflow-y-auto px-6 py-4">
      <div className="max-w-[920px] mx-auto space-y-3.5">
        {/* Compact Single-Row Action Bar matching SOP anchor */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#161615]">
              {t.skillToolbarLabel}
            </span>
            <span className="text-xs font-mono-code text-[#57534e]">
              · {slug}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleCopyActive()}
              className="h-8 px-3 rounded-md bg-white hover:bg-[#faf9f6] border border-[#dad6cc] text-[#161615] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-[#15803d]" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{t.copySkill}</span>
            </button>

            <button
              type="button"
              onClick={() => void handleDownloadSkillZip()}
              className="h-8 px-3 rounded-md bg-white hover:bg-[#faf9f6] border border-[#dad6cc] text-[#161615] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>{t.downloadSkillZip}</span>
            </button>

            <button
              type="button"
              onClick={() => void handleInstallToLocalAgent("codex")}
              className="h-8 px-3 rounded-md bg-white hover:bg-[#faf9f6] border border-[#dad6cc] text-[#161615] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <FolderCheck className="w-3.5 h-3.5" />
              <span>{t.installCodex}</span>
            </button>

            <button
              type="button"
              onClick={() => void handleInstallToLocalAgent("claude")}
              className="h-8 px-3.5 rounded-md bg-[#18181b] hover:bg-[#2e2e32] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>{t.installClaude}</span>
            </button>
          </div>
        </div>

        {installedPath && (
          <div className="px-4 py-2 rounded-lg bg-[#dcfce7] text-[#166534] text-xs font-medium flex items-center justify-between">
            <span>
              SKILL.md →
              <code className="font-mono-code ml-1.5">{installedPath}</code>
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[268px_1fr] gap-4 items-start">
          {/* Interactive Package Explorer & Token Telemetry */}
          <div className="bg-white rounded-xl p-4 shadow-xs space-y-4">
            <div className="space-y-1.5">
              <span className="block text-xs font-semibold text-[#161615]">
                {t.packageTreeTitle}
              </span>
              <div className="space-y-1">
                {files.map((f) => {
                  const selected = activeFile === f.key;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setActiveFile(f.key)}
                      className={`w-full px-2.5 py-1.5 rounded-md text-left text-xs font-mono-code flex items-center gap-2 transition-colors cursor-pointer ${
                        selected
                          ? "bg-[#18181b] text-white"
                          : "text-[#44403c] hover:bg-[#f5f4f0]"
                      }`}
                    >
                      {f.icon === "code" ? (
                        <FileCode2 className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span className="truncate">{f.label}</span>
                    </button>
                  );
                })}
                <div className="px-2.5 py-1 text-xs font-mono-code text-[#57534e]">
                  assets/step-01..0{session.steps.length}.png
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#efede7] space-y-2.5">
              <span className="block text-xs font-semibold text-[#161615]">
                {t.metricsTitle}
              </span>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#57534e]">{t.metricStartupTokens}</span>
                  <span className="font-semibold text-[#15803d] tabular-nums">
                    ~{startupTokens} tok
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#57534e]">{t.metricFullTokens}</span>
                  <span className="font-semibold text-[#161615] tabular-nums">
                    ~{fullTokens} tok
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#57534e]">{t.metricRedactions}</span>
                  <span className="font-semibold text-[#161615] inline-flex items-center gap-1 tabular-nums">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#15803d]" />
                    <span>{totalRedactions}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Syntax-Highlighted Code Viewer */}
          <div className="bg-[#18181b] rounded-xl p-5 shadow-xs overflow-x-auto">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#27272a]">
              <span className="text-xs font-mono-code text-[#a1a1aa]">
                {slug}/{activeFile}
              </span>
              <span className="text-xs font-mono-code text-[#86efac] tabular-nums">
                {activeContent.split("\n").length} lines
              </span>
            </div>
            <div className="text-xs font-mono-code leading-relaxed whitespace-pre-wrap">
              {renderHighlightedMarkdown(activeContent)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
