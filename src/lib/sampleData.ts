import type { Locale, WorkflowSession } from "../types/workflow";

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;
}

const FRAME_1_GITHUB = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
  <rect width="1280" height="800" fill="#f6f8fa"/>
  <rect width="1280" height="52" fill="#24292f"/>
  <circle cx="28" cy="26" r="7" fill="#ff5f56"/>
  <circle cx="50" cy="26" r="7" fill="#ffbd2e"/>
  <circle cx="72" cy="26" r="7" fill="#27c93f"/>
  <rect x="110" y="13" width="460" height="26" rx="6" fill="#32383f"/>
  <text x="128" y="30" fill="#d0d7de" font-family="-apple-system, sans-serif" font-size="13">github.com/settings/personal-access-tokens/new</text>

  <rect x="80" y="92" width="240" height="640" rx="8" fill="#ffffff" stroke="#d0d7de"/>
  <text x="104" y="132" fill="#1f2328" font-family="-apple-system, sans-serif" font-weight="600" font-size="14">Developer settings</text>
  <rect x="92" y="152" width="216" height="34" rx="6" fill="#ddf4ff"/>
  <text x="108" y="174" fill="#0969da" font-family="-apple-system, sans-serif" font-weight="600" font-size="13">Fine-grained tokens</text>
  <text x="108" y="214" fill="#57606a" font-family="-apple-system, sans-serif" font-size="13">Tokens (classic)</text>
  <text x="108" y="250" fill="#57606a" font-family="-apple-system, sans-serif" font-size="13">OAuth Apps</text>

  <rect x="352" y="92" width="848" height="640" rx="10" fill="#ffffff" stroke="#d0d7de"/>
  <text x="392" y="142" fill="#1f2328" font-family="-apple-system, sans-serif" font-weight="700" font-size="22">New fine-grained personal access token</text>
  <text x="392" y="172" fill="#57606a" font-family="-apple-system, sans-serif" font-size="13">Scoped strictly to target release repositories for CI &amp; MCP deployment.</text>

  <text x="392" y="220" fill="#1f2328" font-family="-apple-system, sans-serif" font-weight="600" font-size="13">Token name *</text>
  <rect x="392" y="232" width="440" height="38" rx="6" fill="#f6f8fa" stroke="#d0d7de"/>
  <text x="408" y="256" fill="#1f2328" font-family="Menlo, monospace" font-size="13">stepcast-release-bot-prod</text>

  <text x="392" y="308" fill="#1f2328" font-family="-apple-system, sans-serif" font-weight="600" font-size="13">Preview Secret Key (Sensitive)</text>
  <rect x="392" y="320" width="520" height="42" rx="6" fill="#fff8c5" stroke="#d4a72c"/>
  <text x="410" y="346" fill="#7d4e00" font-family="Menlo, monospace" font-size="14">github_pat_11A9X820_secret9928174650_PROD</text>

  <text x="392" y="408" fill="#1f2328" font-family="-apple-system, sans-serif" font-weight="600" font-size="13">Repository permissions</text>
  <rect x="392" y="422" width="760" height="96" rx="8" fill="#f6f8fa" stroke="#d0d7de"/>
  <text x="416" y="456" fill="#1f2328" font-family="-apple-system, sans-serif" font-size="13">Contents: Read and write   ·   Actions: Read-only   ·   Metadata: Read-only</text>
  <text x="416" y="488" fill="#57606a" font-family="-apple-system, sans-serif" font-size="12">Expiration: 90 days (2027-02-21)</text>

  <rect x="956" y="566" width="196" height="42" rx="8" fill="#1f883d"/>
  <text x="990" y="592" fill="#ffffff" font-family="-apple-system, sans-serif" font-weight="600" font-size="14">Generate token</text>
</svg>
`);

const FRAME_2_TERMINAL = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
  <rect width="1280" height="800" fill="#121316"/>
  <rect x="64" y="56" width="1152" height="688" rx="12" fill="#18191d" stroke="#2d3039"/>
  <rect x="64" y="56" width="1152" height="42" rx="12" fill="#202228"/>
  <circle cx="92" cy="77" r="6.5" fill="#ff5f56"/>
  <circle cx="112" cy="77" r="6.5" fill="#ffbd2e"/>
  <circle cx="132" cy="77" r="6.5" fill="#27c93f"/>
  <text x="560" y="82" fill="#9ca3af" font-family="Menlo, monospace" font-size="12">Ghostty — ~/code/stepcast</text>

  <text x="104" y="148" fill="#6ee7b7" font-family="Menlo, monospace" font-size="14">➜  stepcast git:(main)</text>
  <text x="312" y="148" fill="#f3f4f6" font-family="Menlo, monospace" font-size="14">pnpm dlx @modelcontextprotocol/inspector --transport stdio</text>
  <text x="104" y="186" fill="#9ca3af" font-family="Menlo, monospace" font-size="13">Starting MCP Inspector v0.18.2 on http://127.0.0.1:6274 ...</text>
  <text x="104" y="216" fill="#38bdf8" font-family="Menlo, monospace" font-size="13">✔ Connected to stdio server: github-release-mcp (12 tools exposed)</text>

  <rect x="104" y="256" width="1040" height="190" rx="8" fill="#111215" stroke="#2d3039"/>
  <text x="132" y="294" fill="#e5e7eb" font-family="Menlo, monospace" font-weight="700" font-size="14">Health Check Summary</text>
  <text x="132" y="328" fill="#a7f3d0" font-family="Menlo, monospace" font-size="13">[PASS] Verify GitHub PAT scope: repo:contents, repo:metadata</text>
  <text x="132" y="358" fill="#a7f3d0" font-family="Menlo, monospace" font-size="13">[PASS] Dry-run changelog synthesis: v0.1.0 (4 commits)</text>
  <text x="132" y="388" fill="#fde68a" font-family="Menlo, monospace" font-size="13">[READY] Awaiting confirmation to register global MCP profile</text>

  <rect x="104" y="484" width="268" height="44" rx="8" fill="#2563eb"/>
  <text x="136" y="511" fill="#ffffff" font-family="-apple-system, sans-serif" font-weight="600" font-size="14">Write to ~/.claude.json</text>

  <rect x="392" y="484" width="180" height="44" rx="8" fill="#272a33" stroke="#3f4451"/>
  <text x="434" y="511" fill="#d1d5db" font-family="-apple-system, sans-serif" font-size="14">Run Test Suite</text>
</svg>
`);

const FRAME_3_EDITOR = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
  <rect width="1280" height="800" fill="#1e1e20"/>
  <rect width="240" height="800" fill="#171719"/>
  <text x="28" y="42" fill="#e4e4e7" font-family="-apple-system, sans-serif" font-weight="700" font-size="14">Cursor Settings</text>
  <text x="28" y="90" fill="#a1a1aa" font-family="-apple-system, sans-serif" font-size="13">General</text>
  <text x="28" y="124" fill="#a1a1aa" font-family="-apple-system, sans-serif" font-size="13">Models</text>
  <rect x="16" y="142" width="208" height="34" rx="6" fill="#27272a"/>
  <text x="28" y="164" fill="#ffffff" font-family="-apple-system, sans-serif" font-weight="600" font-size="13">Tools &amp; MCP</text>
  <text x="28" y="202" fill="#a1a1aa" font-family="-apple-system, sans-serif" font-size="13">Rules &amp; Skills</text>

  <text x="296" y="76" fill="#fafafa" font-family="-apple-system, sans-serif" font-weight="700" font-size="22">Model Context Protocol (MCP)</text>
  <text x="296" y="106" fill="#a1a1aa" font-family="-apple-system, sans-serif" font-size="13">Manage local stdio and SSE tool servers connected to your coding agent.</text>

  <rect x="296" y="142" width="880" height="148" rx="10" fill="#27272a" stroke="#3f3f46"/>
  <circle cx="330" cy="182" r="6" fill="#22c55e"/>
  <text x="348" y="187" fill="#fafafa" font-family="Menlo, monospace" font-weight="700" font-size="15">github-release-mcp</text>
  <text x="348" y="216" fill="#a1a1aa" font-family="Menlo, monospace" font-size="12">command: npx -y @stepcast/release-mcp --profile prod</text>
  <text x="348" y="246" fill="#86efac" font-family="-apple-system, sans-serif" font-size="12">12 tools enabled · create_release, upload_dmg_asset, sync_homebrew_tap</text>

  <rect x="984" y="166" width="160" height="38" rx="7" fill="#fafafa"/>
  <text x="1014" y="190" fill="#18181b" font-family="-apple-system, sans-serif" font-weight="600" font-size="13">Enable &amp; Reload</text>

  <rect x="296" y="318" width="880" height="128" rx="10" fill="#232326" stroke="#34343a"/>
  <circle cx="330" cy="358" r="6" fill="#22c55e"/>
  <text x="348" y="363" fill="#e4e4e7" font-family="Menlo, monospace" font-weight="600" font-size="14">chrome-devtools-mcp</text>
  <text x="348" y="392" fill="#71717a" font-family="Menlo, monospace" font-size="12">Connected · Port 9222</text>
</svg>
`);

const FRAME_4_VERIFY = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
  <rect width="1280" height="800" fill="#f8fafc"/>
  <rect width="1280" height="56" fill="#ffffff" stroke="#e2e8f0"/>
  <text x="48" y="34" fill="#0f172a" font-family="-apple-system, sans-serif" font-weight="700" font-size="16">GitHub Actions  /  stepcast  /  Release v0.1.0</text>

  <rect x="80" y="96" width="1120" height="600" rx="12" fill="#ffffff" stroke="#e2e8f0"/>
  <circle cx="128" cy="148" r="14" fill="#dcfce7"/>
  <text x="121" y="153" fill="#15803d" font-family="-apple-system, sans-serif" font-weight="700" font-size="15">✓</text>
  <text x="156" y="154" fill="#0f172a" font-family="-apple-system, sans-serif" font-weight="700" font-size="20">Build, Notarize &amp; Publish Universal DMG + MSI</text>
  <text x="156" y="182" fill="#64748b" font-family="-apple-system, sans-serif" font-size="13">Succeeded in 3m 42s · Triggered via MCP Release Workflow</text>

  <rect x="120" y="226" width="310" height="110" rx="10" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="148" y="264" fill="#0f172a" font-family="-apple-system, sans-serif" font-weight="600" font-size="14">✓ macos-aarch64-notarize</text>
  <text x="148" y="294" fill="#64748b" font-family="Menlo, monospace" font-size="12">StepCast_0.1.0_universal.dmg</text>

  <rect x="468" y="226" width="310" height="110" rx="10" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="496" y="264" fill="#0f172a" font-family="-apple-system, sans-serif" font-weight="600" font-size="14">✓ windows-x64-nsis</text>
  <text x="496" y="294" fill="#64748b" font-family="Menlo, monospace" font-size="12">StepCast_0.1.0_x64-setup.exe</text>

  <rect x="816" y="226" width="340" height="110" rx="10" fill="#f0fdf4" stroke="#86efac"/>
  <text x="844" y="264" fill="#166534" font-family="-apple-system, sans-serif" font-weight="700" font-size="14">✓ Publish Latest Release</text>
  <text x="844" y="294" fill="#15803d" font-family="Menlo, monospace" font-size="12">Homebrew Cask &amp; Winget updated</text>

  <rect x="944" y="388" width="212" height="44" rx="8" fill="#0f172a"/>
  <text x="978" y="415" fill="#ffffff" font-family="-apple-system, sans-serif" font-weight="600" font-size="14">Copy Release URL</text>
</svg>
`);

export function createSampleSession(locale: Locale = "zh"): WorkflowSession {
  const baseTs = Date.now() - 48_000;
  const isEn = locale === "en";

  return {
    id: isEn ? "sample-mcp-release-flow-en" : "sample-mcp-release-flow",
    title: isEn
      ? "Configure Scoped GitHub PAT & Mount Release MCP Server"
      : "配置 GitHub Fine-Grained Token 并挂载发版 MCP 服务",
    subtitle: isEn
      ? "Cross-app SOP spanning Chrome, Ghostty terminal, and Cursor IDE with offline secret redaction"
      : "跨浏览器、Ghostty 终端与 Cursor 编辑器的完整联调标准作业程序（含敏感密钥自动打码）",
    createdAt: new Date(baseTs).toISOString(),
    updatedAt: new Date().toISOString(),
    canvasTheme: "obsidian",
    ringColor: "#D93829",
    showStepBadge: true,
    watermark: "Captured with StepCast · Open-Source SOP & Skill Compiler",
    skillMeta: {
      slug: "configure-github-release-mcp",
      name: "Configure GitHub Release MCP",
      description:
        "Configure a scoped GitHub fine-grained PAT, verify the stdio release MCP server via inspector, enable it in the IDE, and verify multi-platform release artifacts.",
      triggers: isEn
        ? "configure release mcp, setup github release pipeline"
        : "配发版 MCP, configure release mcp, 发版流水线初始化",
      allowedTools: ["Bash", "Read", "Write", "Browser"],
    },
    steps: [
      {
        id: "step-sample-1",
        timestampMs: baseTs,
        appName: "Google Chrome",
        bundleId: "com.google.Chrome",
        windowTitle: "New fine-grained personal access token · GitHub",
        button: "left",
        normX: 0.823,
        normY: 0.734,
        screenWidth: 1280,
        screenHeight: 800,
        scaleFactor: 2,
        elementRole: "AXButton",
        elementLabel: "Generate token",
        ocrText: "",
        detectionSource: "accessibility",
        imageDataUrl: FRAME_1_GITHUB,
        title: isEn
          ? 'Click "Generate token" in GitHub Developer Settings with scoped repo permissions'
          : "在 GitHub 开发者设置中点击「Generate token」生成最小权限密钥",
        note: isEn
          ? "Grant only Contents (Read & write) and Actions (Read-only). The live PAT preview is automatically redacted offline."
          : "仅勾选 Contents (Read & write) 与 Actions (Read-only)，生成后页面中的真实 PAT 已自动框选脱敏。",
        agentInstruction:
          'In GitHub Developer Settings > Fine-grained tokens, scope permissions to Contents (Read/Write) and click button "Generate token". Never log raw PAT values.',
        focusMode: "auto_zoom",
        zoomLevel: 1.35,
        redactions: [
          {
            id: "redact-pat-1",
            kind: "redact",
            x: 0.306,
            y: 0.4,
            w: 0.406,
            h: 0.054,
            label: isEn ? "GitHub PAT Secret" : "GitHub PAT 敏感密钥",
          },
        ],
      },
      {
        id: "step-sample-2",
        timestampMs: baseTs + 12_400,
        appName: "Ghostty",
        bundleId: "com.mitchellh.ghostty",
        windowTitle: "Ghostty — ~/code/stepcast",
        button: "left",
        normX: 0.186,
        normY: 0.632,
        screenWidth: 1280,
        screenHeight: 800,
        scaleFactor: 2,
        elementRole: "",
        elementLabel: "",
        ocrText: "Write to ~/.claude.json",
        detectionSource: "vision_ocr",
        imageDataUrl: FRAME_2_TERMINAL,
        title: isEn
          ? 'Run MCP Inspector health check and click "Write to ~/.claude.json"'
          : "在终端运行 MCP Inspector 自检，点击「Write to ~/.claude.json」写入配置",
        note: isEn
          ? "Ghostty renders via GPU without AX nodes; button label was extracted in 15ms via native Vision OCR."
          : "Ghostty 终端属于 GPU 自绘窗口，无障碍树为空，已由 macOS 原生 Vision OCR 自动识别点击处按钮文案。",
        commandSnippet:
          "pnpm dlx @modelcontextprotocol/inspector --transport stdio",
        agentInstruction:
          'Run `pnpm dlx @modelcontextprotocol/inspector --transport stdio` to verify all 12 release tools pass health check, then write server config into `~/.claude.json`.',
        focusMode: "auto_zoom",
        zoomLevel: 1.75,
        redactions: [],
      },
      {
        id: "step-sample-3",
        timestampMs: baseTs + 26_100,
        appName: "Cursor",
        bundleId: "com.todesktop.230313mzl4w4u92",
        windowTitle: "Cursor Settings — Tools & MCP",
        button: "left",
        normX: 0.831,
        normY: 0.231,
        screenWidth: 1280,
        screenHeight: 800,
        scaleFactor: 2,
        elementRole: "AXButton",
        elementLabel: "Enable & Reload",
        ocrText: "",
        detectionSource: "accessibility",
        imageDataUrl: FRAME_3_EDITOR,
        title: isEn
          ? 'Click "Enable & Reload" in Tools & MCP settings to mount all 12 tools'
          : "在编辑器 Tools & MCP 面板点击「Enable & Reload」挂载工具集",
        note: isEn
          ? "Confirm the status indicator turns green showing 12 tools enabled."
          : "确认状态指示灯变为绿色且展示 12 tools enabled。",
        agentInstruction:
          'Open IDE Settings > Tools & MCP, locate `github-release-mcp`, click "Enable & Reload", and confirm green status with 12 tools.',
        focusMode: "auto_zoom",
        zoomLevel: 1.8,
        redactions: [],
      },
      {
        id: "step-sample-4",
        timestampMs: baseTs + 41_800,
        appName: "Google Chrome",
        bundleId: "com.google.Chrome",
        windowTitle: "Release v0.1.0 · GitHub Actions",
        button: "left",
        normX: 0.82,
        normY: 0.512,
        screenWidth: 1280,
        screenHeight: 800,
        scaleFactor: 2,
        elementRole: "AXButton",
        elementLabel: "Copy Release URL",
        ocrText: "",
        detectionSource: "accessibility",
        imageDataUrl: FRAME_4_VERIFY,
        title: isEn
          ? 'Verify macOS & Windows release jobs passed, then click "Copy Release URL"'
          : "核验双平台签名构建全绿，点击「Copy Release URL」归档发布链接",
        note: isEn
          ? "Ensure both notarized universal DMG and Windows NSIS installer artifacts are attached."
          : "同时验证 macOS Notarized DMG 与 Windows NSIS 安装包产物均已上传。",
        agentInstruction:
          'Verify `macos-aarch64-notarize` and `windows-x64-nsis` jobs succeeded, then copy the published GitHub Release URL.',
        focusMode: "auto_zoom",
        zoomLevel: 1.7,
        redactions: [],
      },
    ],
  };
}
