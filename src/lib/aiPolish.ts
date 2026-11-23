import type { AiProviderConfig, WorkflowSession } from "../types/workflow";

export interface PolishedResult {
  sessionTitle: string;
  sessionSubtitle: string;
  skillSlug: string;
  skillDescription: string;
  steps: Array<{
    id: string;
    title: string;
    note: string;
    agentInstruction: string;
  }>;
}

export function runDeterministicLocalPolish(
  session: WorkflowSession
): PolishedResult {
  const apps = Array.from(new Set(session.steps.map((s) => s.appName)));
  const slug = session.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return {
    sessionTitle: session.title.trim(),
    sessionSubtitle:
      session.subtitle.trim() ||
      `跨 ${apps.join("、")} 的 ${session.steps.length} 步标准操作流程`,
    skillSlug: slug || session.skillMeta.slug || "stepcast-workflow",
    skillDescription:
      session.skillMeta.description ||
      `Execute the ${session.steps.length}-step "${session.title}" workflow across ${apps.join(", ")}.`,
    steps: session.steps.map((s, idx) => {
      const target = (s.elementLabel || s.ocrText || "").trim();
      const cleanTitle = target
        ? `在 ${s.appName} 中${s.button === "right" ? "右键" : "点击"}「${target}」`
        : s.title.replace(/^步骤\s*\d+[:：]?\s*/, "");
      const agentInst = target
        ? `Step ${idx + 1} in "${s.appName}": locate "${target}" (${
            s.elementRole || s.detectionSource
          }) and perform ${s.button}-click.${
            s.commandSnippet ? ` Run \`${s.commandSnippet}\`.` : ""
          }`
        : s.agentInstruction;
      return {
        id: s.id,
        title: s.title.length > 6 ? s.title : cleanTitle,
        note: s.note,
        agentInstruction: agentInst,
      };
    }),
  };
}

export async function polishWorkflowWithAi(
  session: WorkflowSession,
  config: AiProviderConfig
): Promise<PolishedResult> {
  if (!config.apiKey.trim()) {
    return runDeterministicLocalPolish(session);
  }

  const endpoint = `${config.baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const compactSteps = session.steps.map((s, idx) => ({
    id: s.id,
    stepNumber: idx + 1,
    appName: s.appName,
    windowTitle: s.windowTitle,
    elementRole: s.elementRole,
    label: s.elementLabel || s.ocrText,
    currentTitle: s.title,
    currentNote: s.note,
    commandSnippet: s.commandSnippet || "",
    hasRedactions: s.redactions.length > 0,
  }));

  const prompt = `你是技术文档主编与 AI Agent Skill 架构师。请根据以下捕获的跨应用操作步骤，润色生成清晰的中文 SOP 步骤标题/说明，以及英文确定性 Agent 指令。只返回严格合法的 JSON 对象，结构如下：
{
  "sessionTitle": "...",
  "sessionSubtitle": "...",
  "skillSlug": "kebab-case-english-slug",
  "skillDescription": "Concise English description for SKILL.md frontmatter",
  "steps": [{ "id": "...", "title": "...", "note": "...", "agentInstruction": "..." }]
}

原始数据：
${JSON.stringify({ title: session.title, steps: compactSteps }, null, 2)}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: config.model.trim() || "deepseek-chat",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`模型接口请求失败 (${res.status})`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  const cleaned = content.replace(/^```json\s*|\s*```$/g, "").trim();
  return JSON.parse(cleaned) as PolishedResult;
}
