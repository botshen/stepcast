import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  Github,
  Globe,
  Monitor,
  Play,
  Terminal,
} from "lucide-react";
import type { Locale } from "../types/workflow";
import { createSampleSession } from "../lib/sampleData";
import {
  compileAgentSkillMarkdown,
  renderStyledStepDataUrl,
} from "../lib/compilers";

const REPO_URL = "https://github.com/botshen/stepcast";
const LATEST_RELEASE_URL = `${REPO_URL}/releases/latest`;
const MAC_DMG_URL = `${REPO_URL}/releases/download/v0.1.0/StepCast_0.1.0_aarch64.dmg`;
const WIN_EXE_URL = `${LATEST_RELEASE_URL}`;

interface LandingPageProps {
  locale: Locale;
  onChangeLocale: (loc: Locale) => void;
  onOpenWebStudio: () => void;
}

const COPY = {
  zh: {
    navHow: "双轨原理",
    navCompare: "方案对比",
    navInstall: "安装指南",
    tryWeb: "在线试玩工作台",
    heroEyebrow: "MIT 开源 · 100% 本地离线 · macOS & Windows 原生客户端",
    heroTitle: "操作演示一遍，人机同时交付。",
    heroLead:
      "跨浏览器、终端与任意桌面软件正常点一遍流程（15 秒），StepCast 自动识别控件名称、离线脱敏密钥，同步编译为「Screen Studio 级精美图文 SOP」与「Claude Code / Codex 标准 SKILL.md」。",
    dlMac: "下载 macOS 版 (.dmg)",
    dlWin: "Windows 安装包",
    openPlayground: "免安装在线体验工作台",
    metaNote: "安装包仅 7.2 MB · 零本地大模型体积 · 数据 100% 存本机 SQLite",
    prismTitle: "点选下方真实捕获步骤，实时查看同源编译的双份产物",
    redactToggleOn: "已开启离线密钥脱敏",
    redactToggleOff: "查看未脱敏原貌",
    humanOutTag: "产物 A · 面向人类同事与读者 (HTML / Markdown / 长图)",
    agentOutTag: "产物 B · 面向 AI 编程 Agent (~/.claude/skills/*/SKILL.md)",
    compareTitle: "为什么不直接用云端录屏或浏览器插件？",
    colDim: "核心能力",
    colSaas: "闭源云端 (Scribe / Tango)",
    colExt: "纯浏览器插件",
    colUs: "StepCast 开源桌面端",
    rows: [
      [
        "覆盖终端 / IDE / 桌面客户端",
        "强制升级 $29–$35/月 Pro 版",
        "仅限浏览器网页内，出浏览器即盲",
        "原生免费支持 macOS + Windows 全桌面",
      ],
      [
        "自绘窗口与 GPU 终端控件识别",
        "经常只能拿到空白坐标",
        "不支持桌面应用",
        "系统无障碍树 + 15ms 原生离线 OCR 双兜底",
      ],
      [
        "内网后台与生产密钥隐私",
        "截图强制上传第三方云服务器",
        "视插件而定",
        "100% 离线存储 + 截屏瞬间自动遮盖 API Key",
      ],
      [
        "AI Agent 技能资产沉淀",
        "仅限给人看的网页链接",
        "无",
        "一键编译并直装进 Claude Code / Codex / Cursor",
      ],
    ],
    installTitle: "30 秒上手指南",
    step1Title: "1. 下载对应系统安装包",
    step1Body:
      "从 GitHub Releases 下载 macOS (.dmg) 或 Windows (-setup.exe / .msi) 安装程序并拖入应用目录。",
    step2Title: "2. 首次打开与权限勾选（macOS 开源未公证提示）",
    step2Body:
      "由于开源免费版未捆绑商业云端遥测，macOS 首次打开若提示“无法验证开发者”，在终端执行下方一行命令即可放行，随后按顶栏引导开启「屏幕录制」与「辅助功能」：",
    step3Title: "3. 点击录制 → 双轨导出",
    step3Body:
      "点右上角「开始录制」，主窗口自动收起为置顶计步小胶囊；操作完成后一键导出交互式 HTML 手册、ZIP 文档包或直装进本机 ~/.claude/skills。",
    bottomCtaTitle: "现在就开始沉淀你的标准 SOP 与个人 Agent 技能库",
    copied: "已复制",
    copyCmd: "复制命令",
  },
  en: {
    navHow: "Dual Compiler",
    navCompare: "Comparison",
    navInstall: "Install Guide",
    tryWeb: "Web Playground",
    heroEyebrow: "MIT Open Source · 100% Local-First · Native macOS & Windows",
    heroTitle: "Demonstrate once. Ship to humans and agents.",
    heroLead:
      "Walk through any workflow across browsers, GPU terminals, and native desktop apps in 15 seconds. StepCast extracts UI control labels, redacts secrets offline, and compiles both a Screen-Studio-grade visual SOP and an agentskills SKILL.md.",
    dlMac: "Download for macOS (.dmg)",
    dlWin: "Windows Installer",
    openPlayground: "Try Interactive Web Studio",
    metaNote: "7.2 MB native binary · Zero bundled LLM bloat · 100% offline SQLite",
    prismTitle: "Click any captured step below to inspect both live outputs",
    redactToggleOn: "Offline Secret Redaction: ON",
    redactToggleOff: "Secret Redaction: OFF",
    humanOutTag: "Output A · Human Visual SOP (Interactive HTML / Markdown / PNG)",
    agentOutTag: "Output B · AI Agent Skill (~/.claude/skills/*/SKILL.md)",
    compareTitle: "Why native local-first beats cloud SaaS & browser extensions",
    colDim: "Capability",
    colSaas: "Cloud SaaS (Scribe / Tango)",
    colExt: "Browser Extensions",
    colUs: "StepCast (Open Source)",
    rows: [
      [
        "Terminals, IDEs & Native Apps",
        "Locked behind $29–$35/mo Pro",
        "Browser tab sandbox only",
        "Free & Native across macOS + Windows",
      ],
      [
        "GPU Terminals & Electron Labels",
        "Often blank click coordinates",
        "N/A outside browser",
        "OS Accessibility Tree + 15ms Native Offline OCR",
      ],
      [
        "Internal Admin & Secret Safety",
        "Uploaded to vendor cloud",
        "Varies",
        "100% Offline + Auto-Redacts API Keys on Capture",
      ],
      [
        "AI Agent Skill Compilation",
        "Human web links only",
        "None",
        "1-Click Install to Claude Code / Codex / Cursor",
      ],
    ],
    installTitle: "Up and Running in 30 Seconds",
    step1Title: "1. Download the Native Installer",
    step1Body:
      "Grab the latest macOS (.dmg) or Windows (-setup.exe / .msi) package from GitHub Releases.",
    step2Title: "2. First Launch on macOS (Gatekeeper Bypass)",
    step2Body:
      "If macOS flags the unsigned community build on first open, run this one-liner in Terminal, then toggle Screen Recording & Accessibility when prompted:",
    step3Title: "3. Record Once → Export Everywhere",
    step3Body:
      "Hit Record—StepCast minimizes into a floating HUD pill. Click Finish to export standalone interactive HTML guides, clean Markdown ZIPs, or install straight into ~/.claude/skills.",
    bottomCtaTitle: "Turn tacit workflows into durable SOPs and Agent Skills",
    copied: "Copied",
    copyCmd: "Copy",
  },
} as const;

export const LandingPage: React.FC<LandingPageProps> = ({
  locale,
  onChangeLocale,
  onOpenWebStudio,
}) => {
  const c = COPY[locale];
  const [activeIdx, setActiveIdx] = useState(0);
  const [redactEnabled, setRedactEnabled] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [copiedCmd, setCopiedCmd] = useState(false);

  const isWindowsVisitor = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /win/i.test(navigator.userAgent);
  }, []);

  const demoSession = useMemo(() => {
    const base = createSampleSession(locale);
    if (!redactEnabled) {
      return {
        ...base,
        steps: base.steps.map((s) => ({ ...s, redactions: [] })),
      };
    }
    return base;
  }, [locale, redactEnabled]);

  const activeStep = demoSession.steps[activeIdx] || demoSession.steps[0];

  const compiledSkillExcerpt = useMemo(() => {
    const full = compileAgentSkillMarkdown(demoSession);
    const lines = full.split("\n");
    const headerBlock = lines.slice(0, 10).join("\n");
    const marker = `### Step ${activeIdx + 1}:`;
    const startIdx = lines.findIndex((l) => l.startsWith(marker));
    const stepBlock =
      startIdx >= 0
        ? lines.slice(startIdx, startIdx + 8).join("\n")
        : lines.slice(12, 22).join("\n");
    return `${headerBlock}\n\n${stepBlock}`;
  }, [demoSession, activeIdx]);

  useEffect(() => {
    let cancelled = false;
    void renderStyledStepDataUrl(
      activeStep,
      activeIdx,
      demoSession,
      960,
      locale
    ).then((url) => {
      if (!cancelled) setPreviewUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [activeStep, activeIdx, demoSession, locale]);

  const gatekeeperCmd = "xattr -cr /Applications/StepCast.app";

  const handleCopyCmd = async () => {
    await navigator.clipboard.writeText(gatekeeperCmd);
    setCopiedCmd(true);
    window.setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div className="h-screen w-screen overflow-y-auto overflow-x-hidden bg-[#f4f3ef] text-[#161615]">
      {/* Sticky Minimal Navigation */}
      <header className="sticky top-0 z-30 bg-[#f4f3ef]/92 backdrop-blur-md border-b border-[#e4e1d8]">
        <div className="max-w-[1120px] mx-auto h-14 px-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <a
              href="#top"
              className="flex items-center gap-2 text-[#161615] no-underline"
            >
              <span className="w-6 h-6 rounded-md bg-[#18181b] flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-[#e03e2f]" />
              </span>
              <span className="font-bold text-base tracking-tight">
                StepCast
              </span>
            </a>

            <nav className="hidden md:flex items-center gap-5 text-xs font-medium text-[#57534e]">
              <a href="#dual-compiler" className="hover:text-[#161615] no-underline">
                {c.navHow}
              </a>
              <a href="#comparison" className="hover:text-[#161615] no-underline">
                {c.navCompare}
              </a>
              <a href="#install" className="hover:text-[#161615] no-underline">
                {c.navInstall}
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChangeLocale(locale === "zh" ? "en" : "zh")}
              className="h-8 px-2.5 rounded-md text-xs font-medium text-[#44403c] hover:bg-[#eae7df] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{locale === "zh" ? "EN" : "中文"}</span>
            </button>

            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="h-8 px-2.5 rounded-md text-xs font-medium text-[#44403c] hover:bg-[#eae7df] inline-flex items-center gap-1.5 no-underline"
            >
              <Github className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">GitHub</span>
            </a>

            <button
              id="open-web-studio-nav"
              type="button"
              onClick={onOpenWebStudio}
              className="h-8 px-3 rounded-md bg-[#18181b] hover:bg-[#2e2e32] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{c.tryWeb}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Screen 1: Full-Width Editorial Stack + Interactive Dual-Output Split Prism */}
      <main id="top" className="max-w-[1120px] mx-auto px-5 pt-12 pb-20 space-y-24">
        <section className="space-y-8">
          <div className="max-w-[780px] space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#c5281c] leading-normal m-0">
              {c.heroEyebrow}
            </p>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#161615] leading-[1.15] m-0">
              {c.heroTitle}
            </h1>
            <p className="text-sm sm:text-base text-[#44403c] leading-relaxed m-0 max-w-[680px]">
              {c.heroLead}
            </p>

            {/* Primary Download & Web Playground Actions */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <a
                href={isWindowsVisitor ? WIN_EXE_URL : MAC_DMG_URL}
                className="h-10 px-5 rounded-lg bg-[#c5281c] hover:bg-[#ab2016] text-white text-sm font-semibold inline-flex items-center gap-2 no-underline transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>{isWindowsVisitor ? c.dlWin : c.dlMac}</span>
              </a>

              <a
                href={isWindowsVisitor ? MAC_DMG_URL : LATEST_RELEASE_URL}
                className="h-10 px-4 rounded-lg bg-[#eae7df] hover:bg-[#dedad0] text-[#161615] text-sm font-medium inline-flex items-center gap-2 no-underline transition-colors"
              >
                <Monitor className="w-4 h-4" />
                <span>{isWindowsVisitor ? c.dlMac : c.dlWin}</span>
              </a>

              <button
                id="open-web-studio-hero"
                type="button"
                onClick={onOpenWebStudio}
                className="h-10 px-4 rounded-lg bg-white hover:bg-[#faf9f6] border border-[#d6d2c7] text-[#161615] text-sm font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <span>{c.openPlayground}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#57534e] m-0">{c.metaNote}</p>
          </div>

          {/* Interactive Dual-Output Split Prism */}
          <div
            id="dual-compiler"
            className="bg-white rounded-2xl border border-[#e4e1d8] p-4 sm:p-6 shadow-xs space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {demoSession.steps.map((s, idx) => {
                  const active = idx === activeIdx;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActiveIdx(idx)}
                      className={`h-8 px-3 rounded-md text-xs font-medium inline-flex items-center gap-2 transition-colors cursor-pointer ${
                        active
                          ? "bg-[#18181b] text-white"
                          : "bg-[#f4f3ef] text-[#44403c] hover:bg-[#eae7df]"
                      }`}
                    >
                      <span className="tabular-nums font-bold">{idx + 1}</span>
                      <span>{s.appName}</span>
                    </button>
                  );
                })}
              </div>

              {activeIdx === 0 && (
                <button
                  type="button"
                  onClick={() => setRedactEnabled(!redactEnabled)}
                  className={`h-8 px-3 rounded-md text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                    redactEnabled
                      ? "bg-[#fef3c7] text-[#92400e]"
                      : "bg-[#f4f3ef] text-[#44403c]"
                  }`}
                >
                  {redactEnabled ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {redactEnabled ? c.redactToggleOn : c.redactToggleOff}
                  </span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* Left: Human Visual SOP Output */}
              <div className="lg:col-span-7 flex flex-col justify-start space-y-2.5 min-w-0">
                <div className="text-xs font-semibold text-[#57534e] leading-normal">
                  {c.humanOutTag}
                </div>
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={activeStep.title}
                    className="w-full rounded-xl block"
                  />
                ) : (
                  <div className="aspect-16/10 rounded-xl bg-[#eae7df]" />
                )}
                <p className="text-xs font-medium text-[#161615] m-0 leading-relaxed">
                  {activeIdx + 1}. {activeStep.title}
                </p>
              </div>

              {/* Right: Synchronized AI Agent SKILL.md Output */}
              <div className="lg:col-span-5 flex flex-col space-y-2.5 min-w-0">
                <div className="text-xs font-semibold text-[#57534e] leading-normal">
                  {c.agentOutTag}
                </div>
                <div className="flex-1 rounded-xl bg-[#18181b] p-4 overflow-x-auto flex flex-col justify-between">
                  <pre className="text-xs font-mono-code text-[#e4e4e7] m-0 leading-relaxed whitespace-pre-wrap">
                    <code>{compiledSkillExcerpt}</code>
                  </pre>
                  <div className="pt-3 mt-3 border-t border-[#27272a] flex items-center justify-between text-xs text-[#a1a1aa]">
                    <span className="font-mono-code">agentskills v1</span>
                    <button
                      type="button"
                      onClick={onOpenWebStudio}
                      className="text-[#fca5a5] hover:text-white font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>{c.tryWeb}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Screen 2: Open-Canvas Comparison Matrix */}
        <section id="comparison" className="space-y-5">
          <h2 className="text-2xl font-bold tracking-tight text-[#161615] m-0">
            {c.compareTitle}
          </h2>

          <div className="overflow-x-auto bg-white rounded-xl border border-[#e4e1d8]">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b border-[#e4e1d8] bg-[#faf9f6] text-xs font-semibold text-[#44403c]">
                  <th className="py-3.5 px-4">{c.colDim}</th>
                  <th className="py-3.5 px-4">{c.colSaas}</th>
                  <th className="py-3.5 px-4">{c.colExt}</th>
                  <th className="py-3.5 px-4 text-[#c5281c]">{c.colUs}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#efede7] text-xs leading-relaxed">
                {c.rows.map((row, idx) => (
                  <tr key={idx}>
                    <td className="py-3.5 px-4 font-semibold text-[#161615]">
                      {row[0]}
                    </td>
                    <td className="py-3.5 px-4 text-[#57534e]">{row[1]}</td>
                    <td className="py-3.5 px-4 text-[#57534e]">{row[2]}</td>
                    <td className="py-3.5 px-4 font-semibold text-[#161615]">
                      {row[3]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Screen 3: 30-Second User Installation & Gatekeeper Guide */}
        <section id="install" className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight text-[#161615] m-0">
            {c.installTitle}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-[#161615] m-0">
                {c.step1Title}
              </h3>
              <p className="text-xs text-[#44403c] leading-relaxed m-0">
                {c.step1Body}
              </p>
              <div className="pt-1">
                <a
                  href={LATEST_RELEASE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-[#c5281c] hover:underline inline-flex items-center gap-1"
                >
                  <span>GitHub Releases (v0.1.0)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="space-y-2 min-w-0">
              <h3 className="text-sm font-semibold text-[#161615] m-0">
                {c.step2Title}
              </h3>
              <p className="text-xs text-[#44403c] leading-relaxed m-0">
                {c.step2Body}
              </p>
              <div className="mt-2 bg-[#18181b] text-[#f4f4f5] rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                <code className="text-xs font-mono-code truncate">
                  <Terminal className="w-3 h-3 inline mr-1.5 text-[#a1a1aa]" />
                  {gatekeeperCmd}
                </code>
                <button
                  type="button"
                  onClick={() => void handleCopyCmd()}
                  className="h-6 px-2 rounded bg-[#27272a] hover:bg-[#3f3f46] text-xs text-white inline-flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  {copiedCmd ? (
                    <Check className="w-3 h-3 text-[#86efac]" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedCmd ? c.copied : c.copyCmd}</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-[#161615] m-0">
                {c.step3Title}
              </h3>
              <p className="text-xs text-[#44403c] leading-relaxed m-0">
                {c.step3Body}
              </p>
            </div>
          </div>
        </section>

        {/* Bottom Callout */}
        <footer className="pt-10 border-t border-[#e4e1d8] flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-base font-bold text-[#161615] m-0">
              {c.bottomCtaTitle}
            </p>
            <p className="text-xs text-[#57534e] m-0">
              MIT License · Built with Tauri v2 + Rust + React 19
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={MAC_DMG_URL}
              className="h-9 px-4 rounded-lg bg-[#c5281c] hover:bg-[#ab2016] text-white text-xs font-semibold inline-flex items-center gap-1.5 no-underline"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{c.dlMac}</span>
            </a>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="h-9 px-4 rounded-lg bg-[#18181b] hover:bg-[#2e2e32] text-white text-xs font-semibold inline-flex items-center gap-1.5 no-underline"
            >
              <Github className="w-3.5 h-3.5" />
              <span>Star on GitHub</span>
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
};
