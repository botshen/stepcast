import React, { useEffect, useState } from "react";
import {
  Archive,
  Check,
  Copy,
  Download,
  Image as ImageIcon,
} from "lucide-react";
import { useWorkflowStore } from "../store/useWorkflowStore";
import {
  compileSopMarkdown,
  compileStandaloneHtml,
  exportSkillBundleZipBytes,
  exportSopLongImageDataUrl,
  renderStyledStepDataUrl,
} from "../lib/compilers";
import { messages } from "../lib/i18n";

export const SopPreviewView: React.FC = () => {
  const { locale, session, showToast } = useWorkflowStore();
  const t = messages[locale];
  const [renderedImages, setRenderedImages] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all(
      session.steps.map((s, idx) =>
        renderStyledStepDataUrl(s, idx, session, 960, locale)
      )
    ).then((urls) => {
      if (!cancelled) setRenderedImages(urls);
    });
    return () => {
      cancelled = true;
    };
  }, [session, locale]);

  const handleCopyMarkdown = async () => {
    const relPaths = session.steps.map(
      (_, i) => `assets/step-${String(i + 1).padStart(2, "0")}.png`
    );
    const md = compileSopMarkdown(session, relPaths, locale);
    await navigator.clipboard.writeText(md);
    setCopied(true);
    showToast(
      locale === "en"
        ? "Copied clean Markdown to clipboard"
        : "已复制干净相对路径 Markdown 至剪贴板"
    );
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    const bytes = await exportSkillBundleZipBytes(session, locale);
    const blob = new Blob([bytes.buffer as ArrayBuffer], {
      type: "application/zip",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${session.skillMeta.slug || "stepcast-guide"}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(
      locale === "en"
        ? "Downloaded Markdown + assets ZIP archive"
        : "已下载含 assets 高清配图目录的 ZIP 包"
    );
  };

  const handleDownloadHtml = async () => {
    const html = await compileStandaloneHtml(session, locale);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${session.skillMeta.slug || "stepcast-guide"}.html`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(
      locale === "en"
        ? "Downloaded interactive standalone HTML guide"
        : "已下载含分步交互回放器的离线 HTML 手册"
    );
  };

  const handleDownloadLongImage = async () => {
    const png = await exportSopLongImageDataUrl(session, locale);
    const a = document.createElement("a");
    a.href = png;
    a.download = `${session.skillMeta.slug || "stepcast-guide"}.png`;
    a.click();
    showToast(
      locale === "en"
        ? "Exported high-DPI vertical SOP PNG"
        : "已导出高清一图流 SOP 长图"
    );
  };

  return (
    <div className="flex-1 bg-[#f4f3ef] h-full overflow-y-auto px-6 py-4">
      <div className="max-w-[920px] mx-auto space-y-3.5">
        {/* Compact Single-Row Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#161615]">
              {t.sopToolbarLabel}
            </span>
            <span className="text-xs text-[#57534e] tabular-nums">
              · {t.stepsCount(session.steps.length)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleCopyMarkdown()}
              className="h-8 px-3 rounded-md bg-white hover:bg-[#faf9f6] border border-[#dad6cc] text-[#161615] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-[#15803d]" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{t.copyMarkdown}</span>
            </button>
            <button
              type="button"
              onClick={() => void handleDownloadZip()}
              className="h-8 px-3 rounded-md bg-white hover:bg-[#faf9f6] border border-[#dad6cc] text-[#161615] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>{t.downloadZipBundle}</span>
            </button>
            <button
              type="button"
              onClick={() => void handleDownloadLongImage()}
              className="h-8 px-3 rounded-md bg-white hover:bg-[#faf9f6] border border-[#dad6cc] text-[#161615] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>{t.exportLongPng}</span>
            </button>
            <button
              type="button"
              onClick={() => void handleDownloadHtml()}
              className="h-8 px-3.5 rounded-md bg-[#18181b] hover:bg-[#2e2e32] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.downloadHtmlGuide}</span>
            </button>
          </div>
        </div>

        <article className="bg-white rounded-xl px-7 py-6 shadow-xs space-y-6">
          <header className="pb-4 border-b border-[#ece9e1]">
            <h1 className="text-xl font-bold text-[#161615] tracking-tight m-0 mb-1.5">
              {session.title}
            </h1>
            {session.subtitle && (
              <p className="text-xs text-[#57534e] m-0 leading-relaxed">
                {session.subtitle}
              </p>
            )}
          </header>

          <div className="space-y-7">
            {session.steps.map((step, idx) => (
              <section key={step.id} className="space-y-2.5">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-md bg-[#c5281c] text-white font-bold text-xs tabular-nums flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold text-[#161615] m-0 leading-snug">
                      {step.title}
                    </h2>
                    <span className="text-xs text-[#57534e]">
                      {step.appName}
                      {step.windowTitle ? ` · ${step.windowTitle}` : ""}
                    </span>
                  </div>
                </div>

                {step.note && (
                  <p className="text-xs text-[#44403c] pl-9 m-0 leading-relaxed">
                    {step.note}
                  </p>
                )}

                {step.commandSnippet && (
                  <pre className="ml-9 bg-[#18181b] text-[#f4f4f5] px-3.5 py-2 rounded-lg text-xs font-mono-code overflow-x-auto">
                    <code>$ {step.commandSnippet}</code>
                  </pre>
                )}

                {renderedImages[idx] && (
                  <div className="pl-9 pt-0.5">
                    <img
                      src={renderedImages[idx]}
                      alt={step.title}
                      className="w-full max-w-[740px] rounded-lg block"
                    />
                  </div>
                )}
              </section>
            ))}
          </div>

          {session.watermark && (
            <footer className="pt-4 border-t border-[#ece9e1] text-center text-xs text-[#57534e]">
              {session.watermark}
            </footer>
          )}
        </article>
      </div>
    </div>
  );
};
