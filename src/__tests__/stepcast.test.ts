import { describe, expect, it } from "vitest";
import {
  compileAgentSkillMarkdown,
  compileSopMarkdown,
  computeCropViewport,
} from "../lib/compilers";
import { buildZipArchiveBytes, crc32 } from "../lib/zipBuilder";
import { createSampleSession } from "../lib/sampleData";
import { buildStepFromNativeEvent } from "../lib/bridge";
import { runDeterministicLocalPolish } from "../lib/aiPolish";
import { useWorkflowStore } from "../store/useWorkflowStore";

describe("StepCast Core Compilers & Store", () => {
  it("clamps auto-zoom crop viewport cleanly inside [0, 1] bounds", () => {
    const edgeCrop = computeCropViewport(0.96, 0.94, "auto_zoom", 2.0);
    expect(edgeCrop.sw).toBeCloseTo(0.5);
    expect(edgeCrop.sh).toBeCloseTo(0.5);
    expect(edgeCrop.sx + edgeCrop.sw).toBeLessThanOrEqual(1.0001);
    expect(edgeCrop.sy + edgeCrop.sh).toBeLessThanOrEqual(1.0001);

    const fullCrop = computeCropViewport(0.3, 0.7, "full", 2.5);
    expect(fullCrop).toEqual({ sx: 0, sy: 0, sw: 1, sh: 1 });
  });

  it("compiles specification-compliant SKILL.md with YAML frontmatter and security guardrails", () => {
    const sample = createSampleSession("en");
    const skillMd = compileAgentSkillMarkdown(sample);

    expect(skillMd.startsWith("---\nname: configure-github-release-mcp\n")).toBe(
      true
    );
    expect(skillMd).toContain("allowed-tools: [Bash, Read, Write, Browser]");
    expect(skillMd).toContain("Security Guardrail");
    expect(skillMd).toContain("pnpm dlx @modelcontextprotocol/inspector");
  });

  it("compiles clean relative-asset Markdown for GitHub & Notion", () => {
    const sample = createSampleSession("zh");
    const paths = ["assets/step-01.png", "assets/step-02.png", "assets/step-03.png", "assets/step-04.png"];
    const md = compileSopMarkdown(sample, paths, "zh");

    expect(md).toContain("# 配置 GitHub Fine-Grained Token");
    expect(md).toContain("](assets/step-01.png)");
    expect(md).not.toContain("data:image/svg+xml");
  });

  it("builds valid PKZIP binary archives with accurate CRC32 checksums", () => {
    const hello = new TextEncoder().encode("hello stepcast");
    expect(crc32(hello)).toBeGreaterThan(0);

    const zipBytes = buildZipArchiveBytes([
      { path: "demo-skill/SKILL.md", data: "---\nname: demo\n---\n" },
      { path: "demo-skill/SOP.md", data: "# Demo Guide\n" },
    ]);

    // Local file header PK\x03\x04
    expect(zipBytes[0]).toBe(0x50);
    expect(zipBytes[1]).toBe(0x4b);
    expect(zipBytes[2]).toBe(0x03);
    expect(zipBytes[3]).toBe(0x04);
    expect(zipBytes.length).toBeGreaterThan(120);
  });

  it("hydrates native events including keyboard shortcuts and offline Vision auto-redactions", () => {
    const step = buildStepFromNativeEvent(
      {
        id: "evt-99",
        timestampMs: 1700000005000,
        appName: "Cursor",
        bundleId: "com.cursor",
        windowTitle: "Settings",
        button: "shortcut",
        shortcutKey: "⌘⇧P",
        normX: 0.5,
        normY: 0.5,
        screenWidth: 1440,
        screenHeight: 900,
        scaleFactor: 2,
        elementRole: "",
        elementLabel: "",
        ocrText: "",
        detectionSource: "accessibility",
        imagePath: "",
        autoRedactions: [
          { x: 0.1, y: 0.2, w: 0.3, h: 0.04, label: "API Secret Key" },
        ],
      },
      "en"
    );

    expect(step.button).toBe("shortcut");
    expect(step.shortcutKey).toBe("⌘⇧P");
    expect(step.redactions).toHaveLength(1);
    expect(step.redactions[0].label).toBe("API Secret Key");
  });

  it("supports undo/redo, step duplication, and deterministic local polish in Zustand store", async () => {
    await useWorkflowStore.getState().loadSampleWorkflow();
    const initialCount = useWorkflowStore.getState().session.steps.length;
    expect(initialCount).toBe(4);

    const firstId = useWorkflowStore.getState().session.steps[0].id;
    useWorkflowStore.getState().duplicateStep(firstId);
    expect(useWorkflowStore.getState().session.steps.length).toBe(5);

    useWorkflowStore.getState().undo();
    expect(useWorkflowStore.getState().session.steps.length).toBe(4);

    useWorkflowStore.getState().redo();
    expect(useWorkflowStore.getState().session.steps.length).toBe(5);

    const polished = runDeterministicLocalPolish(
      useWorkflowStore.getState().session
    );
    expect(polished.steps).toHaveLength(5);
  });
});
