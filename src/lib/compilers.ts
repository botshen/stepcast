import type {
  CanvasTheme,
  CapturedStep,
  Locale,
  WorkflowSession,
} from "../types/workflow";
import { messages } from "./i18n";
import { buildZipArchiveBytes, dataUrlToBytes } from "./zipBuilder";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

function getThemeColors(theme: CanvasTheme) {
  switch (theme) {
    case "obsidian":
      return {
        bgStart: "#1c1c1f",
        bgEnd: "#2a2a30",
        border: "rgba(255,255,255,0.12)",
      };
    case "sand":
      return {
        bgStart: "#e9e5dc",
        bgEnd: "#dcd6c8",
        border: "rgba(22,22,21,0.1)",
      };
    case "slate":
      return {
        bgStart: "#1e293b",
        bgEnd: "#334155",
        border: "rgba(255,255,255,0.14)",
      };
    case "minimal":
    default:
      return {
        bgStart: "#f4f3ef",
        bgEnd: "#f4f3ef",
        border: "rgba(22,22,21,0.12)",
      };
  }
}

export function computeCropViewport(
  normX: number,
  normY: number,
  focusMode: "auto_zoom" | "full",
  zoomLevel: number
) {
  if (focusMode === "full" || zoomLevel <= 1.02) {
    return { sx: 0, sy: 0, sw: 1, sh: 1 };
  }
  const z = Math.max(1.1, Math.min(3.2, zoomLevel));
  const sw = 1 / z;
  const sh = 1 / z;
  const sx = Math.max(0, Math.min(1 - sw, normX - sw / 2));
  const sy = Math.max(0, Math.min(1 - sh, normY - sh / 2));
  return { sx, sy, sw, sh };
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function renderStyledStepDataUrl(
  step: CapturedStep,
  stepIndex: number,
  session: WorkflowSession,
  outWidth = 1120,
  locale: Locale = "zh"
): Promise<string> {
  if (!step.imageDataUrl) return "";
  const img = await loadImage(step.imageDataUrl);
  const aspect = img.height / img.width || 0.625;
  const pad = session.canvasTheme === "minimal" ? 18 : 38;
  const innerW = outWidth - pad * 2;
  const innerH = Math.round(innerW * aspect);
  const outHeight = innerH + pad * 2;

  const canvas = document.createElement("canvas");
  canvas.width = outWidth;
  canvas.height = outHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return step.imageDataUrl;

  const palette = getThemeColors(session.canvasTheme);
  const grad = ctx.createLinearGradient(0, 0, outWidth, outHeight);
  grad.addColorStop(0, palette.bgStart);
  grad.addColorStop(1, palette.bgEnd);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, outWidth, outHeight);

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 12;
  roundedRect(ctx, pad, pad, innerW, innerH, 12);
  ctx.fillStyle = "#111";
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundedRect(ctx, pad, pad, innerW, innerH, 12);
  ctx.clip();

  const crop = computeCropViewport(
    step.normX,
    step.normY,
    step.focusMode,
    step.zoomLevel
  );
  ctx.drawImage(
    img,
    crop.sx * img.width,
    crop.sy * img.height,
    crop.sw * img.width,
    crop.sh * img.height,
    pad,
    pad,
    innerW,
    innerH
  );

  // Render privacy redactions & spotlight highlights
  for (const box of step.redactions) {
    const rx = pad + ((box.x - crop.sx) / crop.sw) * innerW;
    const ry = pad + ((box.y - crop.sy) / crop.sh) * innerH;
    const rw = (box.w / crop.sw) * innerW;
    const rh = (box.h / crop.sh) * innerH;

    if (box.kind === "highlight") {
      ctx.save();
      ctx.fillStyle = "rgba(245, 158, 11, 0.12)";
      roundedRect(ctx, rx, ry, rw, rh, 6);
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#d97706";
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.fillStyle = "#18181b";
      roundedRect(ctx, rx, ry, rw, rh, 5);
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.82)";
      ctx.font = "600 12px -apple-system, BlinkMacSystemFont, sans-serif";
      if (rw > 96 && rh > 18) {
        ctx.fillText(messages[locale].redactedStamp, rx + 10, ry + rh / 2 + 4);
      }
    }
  }

  // Click target highlight ring (hollow center so button label stays legible)
  const cx = pad + ((step.normX - crop.sx) / crop.sw) * innerW;
  const cy = pad + ((step.normY - crop.sy) / crop.sh) * innerH;

  if (step.button === "shortcut" && step.shortcutKey) {
    const label = step.shortcutKey;
    ctx.font = "700 15px -apple-system, BlinkMacSystemFont, sans-serif";
    const tw = Math.max(54, ctx.measureText(label).width + 24);
    const th = 34;
    const kx = Math.max(pad + 12, Math.min(pad + innerW - tw - 12, cx - tw / 2));
    const ky = Math.max(pad + 12, Math.min(pad + innerH - th - 12, cy - th / 2));
    ctx.fillStyle = "rgba(24, 24, 27, 0.92)";
    roundedRect(ctx, kx, ky, tw, th, 8);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, kx + tw / 2, ky + th / 2 + 1);
  } else {
    // Offset outer reticle halo so the target button text inside stays 100% unobstructed
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 44, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(217, 56, 41, 0.08)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, 36, 0, Math.PI * 2);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = session.ringColor || "#D93829";
    ctx.stroke();
    ctx.restore();
  }

  if (session.showStepBadge) {
    const bx = Math.min(pad + innerW - 28, cx + 30);
    const by = Math.max(pad + 26, cy - 30);
    ctx.beginPath();
    ctx.arc(bx, by, 13, 0, Math.PI * 2);
    ctx.fillStyle = session.ringColor || "#D93829";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 12px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(stepIndex + 1), bx, by + 0.5);
  }

  ctx.restore();

  ctx.save();
  roundedRect(ctx, pad, pad, innerW, innerH, 12);
  ctx.lineWidth = 1;
  ctx.strokeStyle = palette.border;
  ctx.stroke();
  ctx.restore();

  return canvas.toDataURL("image/png");
}

export async function exportSopLongImageDataUrl(
  session: WorkflowSession,
  locale: Locale = "zh"
): Promise<string> {
  const width = 1040;
  const padX = 48;
  const renderedFrames: string[] = [];
  for (let i = 0; i < session.steps.length; i++) {
    renderedFrames.push(
      await renderStyledStepDataUrl(
        session.steps[i],
        i,
        session,
        width - padX * 2,
        locale
      )
    );
  }
  const frameImgs = await Promise.all(
    renderedFrames.map((src) => (src ? loadImage(src) : Promise.resolve(null)))
  );

  const headerH = 148;
  const footerH = 68;
  const stepBlocksH = session.steps.reduce((sum, step, idx) => {
    const img = frameImgs[idx];
    const imgH = img
      ? Math.round(((width - padX * 2) / img.width) * img.height)
      : 0;
    const extraNote = step.note ? 34 : 0;
    const extraCmd = step.commandSnippet ? 42 : 0;
    return sum + 62 + extraNote + extraCmd + imgH + 36;
  }, 0);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = headerH + stepBlocksH + footerH;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#faf9f6";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#161615";
  ctx.font = "700 28px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText(session.title, padX, 64);

  ctx.fillStyle = "#575551";
  ctx.font = "400 15px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText(
    session.subtitle ||
      (locale === "en"
        ? `${session.steps.length}-step operational workflow`
        : `共 ${session.steps.length} 个标准操作步骤`),
    padX,
    98
  );

  ctx.strokeStyle = "#e6e4dd";
  ctx.beginPath();
  ctx.moveTo(padX, 124);
  ctx.lineTo(width - padX, 124);
  ctx.stroke();

  let cursorY = headerH;
  for (let i = 0; i < session.steps.length; i++) {
    const step = session.steps[i];
    ctx.fillStyle = "#c5281c";
    roundedRect(ctx, padX, cursorY, 28, 28, 7);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 14px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(i + 1), padX + 14, cursorY + 19);
    ctx.textAlign = "left";

    ctx.fillStyle = "#161615";
    ctx.font = "600 18px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(step.title, padX + 40, cursorY + 20);
    cursorY += 38;

    if (step.note) {
      ctx.fillStyle = "#575551";
      ctx.font = "400 14px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText(step.note, padX + 40, cursorY + 14);
      cursorY += 30;
    }

    if (step.commandSnippet) {
      ctx.fillStyle = "#18181b";
      roundedRect(ctx, padX + 40, cursorY, width - padX * 2 - 40, 32, 6);
      ctx.fill();
      ctx.fillStyle = "#e4e4e7";
      ctx.font = "500 13px Menlo, Monaco, monospace";
      ctx.fillText(`$ ${step.commandSnippet}`, padX + 54, cursorY + 21);
      cursorY += 42;
    }

    const img = frameImgs[i];
    if (img) {
      const targetW = width - padX * 2;
      const targetH = Math.round((targetW / img.width) * img.height);
      ctx.drawImage(img, padX, cursorY + 8, targetW, targetH);
      cursorY += targetH + 40;
    } else {
      cursorY += 24;
    }
  }

  ctx.fillStyle = "#87847e";
  ctx.font = "500 13px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText(
    session.watermark || "Generated with StepCast",
    padX,
    canvas.height - 28
  );

  return canvas.toDataURL("image/png");
}

export function compileSopMarkdown(
  session: WorkflowSession,
  imagePathsOrUrls?: string[],
  locale: Locale = "zh"
): string {
  const isEn = locale === "en";
  const lines: string[] = [];
  lines.push(`# ${session.title}`);
  if (session.subtitle) {
    lines.push(`\n> ${session.subtitle}`);
  }
  const apps = Array.from(new Set(session.steps.map((s) => s.appName)));
  lines.push(
    isEn
      ? `\n- **Total Steps**: ${session.steps.length}  |  **Applications**: ${
          apps.join(" → ") || "Desktop"
        }`
      : `\n- **步骤总数**：${session.steps.length} 步  |  **涉及应用**：${
          apps.join(" → ") || "桌面环境"
        }`
  );
  lines.push(`\n---\n`);

  session.steps.forEach((step, idx) => {
    lines.push(
      isEn ? `## Step ${idx + 1}: ${step.title}` : `## 步骤 ${idx + 1}：${step.title}`
    );
    lines.push(
      isEn
        ? `- **Application**: \`${step.appName}\`${
            step.windowTitle ? ` (${step.windowTitle})` : ""
          }`
        : `- **所属应用**：\`${step.appName}\`${
            step.windowTitle ? `（${step.windowTitle}）` : ""
          }`
    );
    if (step.shortcutKey) {
      lines.push(
        isEn
          ? `- **Shortcut**: \`${step.shortcutKey}\``
          : `- **快捷键**：\`${step.shortcutKey}\``
      );
    }
    if (step.note) {
      lines.push(
        isEn ? `- **Notes**: ${step.note}` : `- **操作说明**：${step.note}`
      );
    }
    if (step.commandSnippet) {
      lines.push(`\n\`\`\`bash\n${step.commandSnippet}\n\`\`\``);
    }
    if (imagePathsOrUrls && imagePathsOrUrls[idx]) {
      lines.push(`\n![Step ${idx + 1} - ${step.title}](${imagePathsOrUrls[idx]})`);
    }
    lines.push("");
  });

  if (session.watermark) {
    lines.push(`---\n*${session.watermark}*`);
  }
  return lines.join("\n");
}

export async function exportSkillBundleZipBytes(
  session: WorkflowSession,
  locale: Locale = "zh"
): Promise<Uint8Array> {
  const slug =
    session.skillMeta.slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "") || "stepcast-workflow";

  const relativeAssetPaths: string[] = [];
  const entries: Array<{ path: string; data: Uint8Array | string }> = [];

  for (let i = 0; i < session.steps.length; i++) {
    const fileName = `step-${String(i + 1).padStart(2, "0")}.png`;
    const renderedUrl = await renderStyledStepDataUrl(
      session.steps[i],
      i,
      session,
      1120,
      locale
    );
    if (renderedUrl) {
      entries.push({
        path: `${slug}/assets/${fileName}`,
        data: dataUrlToBytes(renderedUrl),
      });
      relativeAssetPaths.push(`assets/${fileName}`);
    } else {
      relativeAssetPaths.push("");
    }
  }

  const sopRootMd = compileSopMarkdown(session, relativeAssetPaths, locale);
  const sopRefPaths = relativeAssetPaths.map((p) => (p ? `../${p}` : ""));
  const sopRefMd = compileSopMarkdown(session, sopRefPaths, locale);
  const skillMd = compileAgentSkillMarkdown(session);

  entries.unshift(
    { path: `${slug}/SKILL.md`, data: skillMd },
    { path: `${slug}/SOP.md`, data: sopRootMd },
    { path: `${slug}/references/visual-sop.md`, data: sopRefMd }
  );

  return buildZipArchiveBytes(entries);
}

export async function compileStandaloneHtml(
  session: WorkflowSession,
  locale: Locale = "zh"
): Promise<string> {
  const isEn = locale === "en";
  const rendered: string[] = [];
  for (let i = 0; i < session.steps.length; i++) {
    rendered.push(
      await renderStyledStepDataUrl(session.steps[i], i, session, 1040, locale)
    );
  }

  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const stepCards = session.steps
    .map(
      (s, i) => `
      <section class="step-card" data-step="${i}" id="step-${i + 1}">
        <div class="step-head">
          <span class="step-num">${i + 1}</span>
          <div>
            <h2>${esc(s.title)}</h2>
            <div class="meta">${esc(s.appName)}${
        s.windowTitle ? ` · ${esc(s.windowTitle)}` : ""
      }</div>
          </div>
        </div>
        ${s.note ? `<p class="note">${esc(s.note)}</p>` : ""}
        ${
          s.commandSnippet
            ? `<pre class="cmd"><code>$ ${esc(s.commandSnippet)}</code></pre>`
            : ""
        }
        ${
          rendered[i]
            ? `<figure class="shot"><img src="${rendered[i]}" alt="Step ${
                i + 1
              }" loading="lazy" /></figure>`
            : ""
        }
      </section>`
    )
    .join("\n");

  const slidesJson = JSON.stringify(
    session.steps.map((s, i) => ({
      num: i + 1,
      title: s.title,
      app: s.appName,
      note: s.note,
      img: rendered[i] || "",
    }))
  ).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="${isEn ? "en" : "zh-CN"}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(session.title)} — StepCast SOP</title>
<style>
  body { margin: 0; background: #f5f4f0; color: #161615; font-family: -apple-system, BlinkMacSystemFont, "Inter", "PingFang SC", sans-serif; line-height: 1.6; }
  .wrap { max-width: 920px; margin: 40px auto; padding: 0 24px 64px; }
  header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 1px solid #e2dfd7; }
  h1 { font-size: 26px; margin: 0 0 6px; letter-spacing: -0.02em; }
  .sub { color: #575551; font-size: 14px; margin: 0; }
  .mode-switch { display: inline-flex; background: #e8e5dc; padding: 3px; border-radius: 8px; gap: 4px; }
  .mode-btn { border: 0; background: transparent; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; color: #57534e; }
  .mode-btn.active { background: #fff; color: #161615; box-shadow: 0 1px 2px rgba(0,0,0,0.06); }
  .step-card { background: #ffffff; border: 1px solid #e6e4dd; border-radius: 14px; padding: 24px; margin-bottom: 24px; }
  .step-head { display: flex; align-items: flex-start; gap: 14px; }
  .step-num { width: 28px; height: 28px; border-radius: 8px; background: #c5281c; color: #fff; font-weight: 700; font-size: 14px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; }
  h2 { font-size: 18px; margin: 0 0 2px; }
  .meta { font-size: 12px; color: #6b6660; }
  .note { margin: 12px 0 0 42px; color: #44423e; font-size: 14px; }
  .cmd { margin: 12px 0 0 42px; background: #18181b; color: #f4f4f5; padding: 10px 14px; border-radius: 8px; font-size: 13px; overflow-x: auto; }
  .shot { margin: 16px 0 0; }
  .shot img { width: 100%; border-radius: 10px; display: block; }
  #player-view { display: none; background: #fff; border: 1px solid #e6e4dd; border-radius: 16px; padding: 24px; }
  .player-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .nav-btn { background: #18181b; color: #fff; border: 0; border-radius: 8px; padding: 8px 16px; font-size: 13px; font-weight: 600; cursor: pointer; }
  .nav-btn:disabled { opacity: 0.35; cursor: default; }
  footer { text-align: center; color: #6b6660; font-size: 12px; margin-top: 40px; }
</style>
</head>
<body>
  <div class="wrap">
    <header>
      <div>
        <h1>${esc(session.title)}</h1>
        <p class="sub">${esc(session.subtitle)}</p>
      </div>
      <div class="mode-switch">
        <button class="mode-btn active" id="btn-doc" onclick="setMode('doc')">${
          isEn ? "Document View" : "全文阅读"
        }</button>
        <button class="mode-btn" id="btn-play" onclick="setMode('play')">${
          isEn ? "▶ Interactive Walkthrough" : "▶ 交互式分步回放"
        }</button>
      </div>
    </header>
    <div id="doc-view">${stepCards}</div>
    <div id="player-view">
      <div class="player-nav">
        <button class="nav-btn" id="prev-btn" onclick="go(-1)">← ${
          isEn ? "Previous" : "上一步"
        }</button>
        <strong id="player-progress"></strong>
        <button class="nav-btn" id="next-btn" onclick="go(1)">${
          isEn ? "Next" : "下一步"
        } →</button>
      </div>
      <h2 id="player-title" style="margin-bottom:6px"></h2>
      <p id="player-note" style="color:#57534e;font-size:14px;margin:0 0 14px"></p>
      <img id="player-img" style="width:100%;border-radius:12px;cursor:pointer" onclick="go(1)" alt="Interactive step" />
    </div>
    <footer>${esc(session.watermark)}</footer>
  </div>
  <script>
    const slides = ${slidesJson};
    let idx = 0;
    function renderSlide() {
      if (!slides.length) return;
      const s = slides[idx];
      document.getElementById('player-progress').textContent = s.num + ' / ' + slides.length + ' · ' + s.app;
      document.getElementById('player-title').textContent = s.title;
      document.getElementById('player-note').textContent = s.note || '';
      document.getElementById('player-img').src = s.img;
      document.getElementById('prev-btn').disabled = idx === 0;
      document.getElementById('next-btn').disabled = idx === slides.length - 1;
    }
    function go(delta) {
      const next = idx + delta;
      if (next >= 0 && next < slides.length) { idx = next; renderSlide(); }
    }
    function setMode(m) {
      document.getElementById('doc-view').style.display = m === 'doc' ? 'block' : 'none';
      document.getElementById('player-view').style.display = m === 'play' ? 'block' : 'none';
      document.getElementById('btn-doc').className = 'mode-btn' + (m === 'doc' ? ' active' : '');
      document.getElementById('btn-play').className = 'mode-btn' + (m === 'play' ? ' active' : '');
      if (m === 'play') renderSlide();
    }
    window.addEventListener('keydown', (e) => {
      if (document.getElementById('player-view').style.display === 'block') {
        if (e.key === 'ArrowRight') go(1);
        if (e.key === 'ArrowLeft') go(-1);
      }
    });
  </script>
</body>
</html>`;
}

export function compileAgentSkillMarkdown(session: WorkflowSession): string {
  const meta = session.skillMeta;
  const slug =
    meta.slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "") || "recorded-workflow";

  const apps = Array.from(new Set(session.steps.map((s) => s.appName)));

  const lines: string[] = [];
  lines.push(`---`);
  lines.push(`name: ${slug}`);
  lines.push(
    `description: "${meta.description.replace(/"/g, '\\"')}${
      meta.triggers ? ` Triggers on: ${meta.triggers}.` : ""
    }"`
  );
  if (meta.allowedTools.length > 0) {
    lines.push(`allowed-tools: [${meta.allowedTools.join(", ")}]`);
  }
  lines.push(`metadata:`);
  lines.push(`  generator: stepcast-0.1.0`);
  lines.push(`  step-count: "${session.steps.length}"`);
  lines.push(`---`);
  lines.push(``);
  lines.push(`# ${meta.name || session.title}`);
  lines.push(``);
  if (session.subtitle) {
    lines.push(`${session.subtitle}`);
    lines.push(``);
  }
  lines.push(`## Target Environment`);
  lines.push(`- **Applications involved**: ${apps.join(", ") || "Desktop"}`);
  lines.push(
    `- **Visual reference**: See \`references/visual-sop.md\` when disambiguating UI states.`
  );
  lines.push(``);
  lines.push(`## Execution Procedure`);
  lines.push(``);

  session.steps.forEach((step, idx) => {
    const anchor = step.elementLabel || step.ocrText;
    lines.push(`### Step ${idx + 1}: ${step.title}`);
    lines.push(`- **Action**: ${step.agentInstruction || step.title}`);
    if (step.shortcutKey) {
      lines.push(`- **Keyboard Shortcut**: \`${step.shortcutKey}\``);
    }
    lines.push(
      `- **UI Anchor**: App \`${step.appName}\`${
        step.windowTitle ? `, Window \`${step.windowTitle}\`` : ""
      }${
        anchor
          ? `, Target \`${anchor}\` (${
              step.detectionSource === "vision_ocr"
                ? "OCR label"
                : step.elementRole || "Accessibility node"
            })`
          : `, Normalized coords (${step.normX.toFixed(2)}, ${step.normY.toFixed(
              2
            )})`
      }`
    );
    if (step.commandSnippet) {
      lines.push(`- **CLI Command**: \`${step.commandSnippet}\``);
    }
    const redactCount = step.redactions.filter(
      (r) => r.kind !== "highlight"
    ).length;
    if (redactCount > 0) {
      lines.push(
        `- **Security Guardrail**: Contains ${redactCount} redacted sensitive field(s). Never print raw credentials into logs or commits.`
      );
    }
    if (step.note) {
      lines.push(`- **Verification / Note**: ${step.note}`);
    }
    lines.push(``);
  });

  return lines.join("\n");
}
