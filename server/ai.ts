import type {
  AgentElementBindingRequest,
  AgentElementBindingResult,
  AgentHypothesis,
  AgentHypothesisRequest,
  AiAdvice,
  AiAdviceEvidenceRef,
  PageAlignmentPlan,
  PageAlignmentRegionDecision,
  ReviewIssue
} from "../src/types";
import { localText, type Locale } from "./i18n";

export const DEFAULT_AI_MODEL = "gpt-5.6-terra";

interface AiAdviceSelection {
  summaryEvidenceRefs: AiAdviceEvidenceRef[];
  priorities: Array<{ evidenceRefs: AiAdviceEvidenceRef[] }>;
}

interface AiAdviceEvidence {
  ref: AiAdviceEvidenceRef;
  kind: "review-issue" | "page-alignment";
  title: string;
  reason: string;
  action: string;
  digest: Record<string, unknown>;
}

function adviceSchema(allowedRefs: AiAdviceEvidenceRef[]): Record<string, unknown> {
  const evidenceRef = { type: "string", enum: allowedRefs };
  return {
    type: "object",
    properties: {
      summaryEvidenceRefs: {
        type: "array",
        minItems: 1,
        maxItems: 12,
        items: evidenceRef
      },
      priorities: {
        type: "array",
        minItems: 1,
        maxItems: 5,
        items: {
          type: "object",
          properties: {
            evidenceRefs: {
              type: "array",
              minItems: 1,
              maxItems: 8,
              items: evidenceRef
            }
          },
          required: ["evidenceRefs"],
          additionalProperties: false
        }
      }
    },
    required: ["summaryEvidenceRefs", "priorities"],
    additionalProperties: false
  };
}

const AGENT_HYPOTHESIS_SCHEMA = {
  type: "object",
  properties: {
    candidateType: { type: "string", enum: ["market-value", "date-time", "countdown", "probability"] },
    binding: {
      type: "object",
      properties: {
        figmaNodeId: { type: "string" },
        fingerprintKey: { type: "string" }
      },
      required: ["figmaNodeId", "fingerprintKey"],
      additionalProperties: false
    },
    strategy: {
      type: "string",
      enum: [
        "normalize-market-value-text",
        "normalize-date-time-text",
        "normalize-countdown-text",
        "normalize-probability-text"
      ]
    },
    normalizedProperties: {
      type: "array",
      minItems: 1,
      maxItems: 1,
      items: { type: "string", enum: ["text"] }
    },
    reasons: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: { type: "string" }
    }
  },
  required: [
    "candidateType",
    "binding",
    "strategy",
    "normalizedProperties",
    "reasons"
  ],
  additionalProperties: false
};

const ELEMENT_BINDING_SCHEMA = {
  type: "object",
  properties: {
    pageSummary: { type: "string" },
    alignmentPlan: {
      type: "object",
      properties: {
        regions: {
          type: "array",
          maxItems: 40,
          items: {
            type: "object",
            properties: {
              designParentFigmaNodeId: { type: "string" },
              designPath: {
                type: "array",
                maxItems: 12,
                items: { type: "string" }
              },
              status: {
                type: "string",
                enum: ["matched", "missing-in-actual", "uncertain"]
              },
              actualParentSelector: { type: ["string", "null"] },
              displacement: {
                anyOf: [
                  {
                    type: "object",
                    properties: {
                      x: { type: "number" },
                      y: { type: "number" }
                    },
                    required: ["x", "y"],
                    additionalProperties: false
                  },
                  { type: "null" }
                ]
              },
              confidence: { type: "number", minimum: 0, maximum: 1 },
              reason: { type: "string" }
            },
            required: [
              "designParentFigmaNodeId",
              "designPath",
              "status",
              "actualParentSelector",
              "displacement",
              "confidence",
              "reason"
            ],
            additionalProperties: false
          }
        }
      },
      required: ["regions"],
      additionalProperties: false
    },
    bindings: {
      type: "array",
      maxItems: 60,
      items: {
        type: "object",
        properties: {
          figmaNodeId: { type: "string" },
          fingerprintKey: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          reason: { type: "string" }
        },
        required: ["figmaNodeId", "fingerprintKey", "confidence", "reason"],
        additionalProperties: false
      }
    }
  },
  required: ["pageSummary", "alignmentPlan", "bindings"],
  additionalProperties: false
};

function extractOutputText(payload: Record<string, unknown>): string | undefined {
  if (typeof payload.output_text === "string") return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as Record<string, unknown>).content)
      ? ((item as Record<string, unknown>).content as unknown[])
      : [];
    for (const block of content) {
      if (!block || typeof block !== "object") continue;
      const text = (block as Record<string, unknown>).text;
      if (typeof text === "string") return text;
    }
  }
  return undefined;
}

function parseJsonOutput(outputText: string): unknown {
  const trimmed = outputText.trim();
  try {
    return JSON.parse(trimmed);
  } catch (initialError) {
    const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1];
    if (!fenced) throw initialError;
    return JSON.parse(fenced);
  }
}

function uniqueEvidenceRefs(
  values: unknown[],
  allowedRefs: ReadonlySet<AiAdviceEvidenceRef>
): AiAdviceEvidenceRef[] {
  const refs: AiAdviceEvidenceRef[] = [];
  for (const value of values) {
    if (typeof value !== "string" || !allowedRefs.has(value as AiAdviceEvidenceRef)) {
      throw new Error("AI advice referenced evidence outside the published review boundary.");
    }
    const ref = value as AiAdviceEvidenceRef;
    if (!refs.includes(ref)) refs.push(ref);
  }
  if (refs.length === 0) {
    throw new Error("AI advice must reference at least one published evidence item.");
  }
  return refs;
}

function parseAiAdviceSelection(
  outputText: string,
  allowedRefs: ReadonlySet<AiAdviceEvidenceRef>
): AiAdviceSelection {
  const value = parseJsonOutput(outputText);
  if (Array.isArray(value)) {
    const evidenceRefs = uniqueEvidenceRefs(value, allowedRefs);
    return {
      summaryEvidenceRefs: evidenceRefs,
      priorities: evidenceRefs.slice(0, 5).map((ref) => ({ evidenceRefs: [ref] }))
    };
  }
  if (!value || typeof value !== "object") {
    throw new Error("AI advice selection must be an object.");
  }
  const candidate = value as Record<string, unknown>;
  if (!Array.isArray(candidate.summaryEvidenceRefs) || !Array.isArray(candidate.priorities)) {
    throw new Error("AI advice selection must contain summaryEvidenceRefs and priorities.");
  }
  if (candidate.priorities.length === 0 || candidate.priorities.length > 5) {
    throw new Error("AI advice must contain between one and five grounded priorities.");
  }
  return {
    summaryEvidenceRefs: uniqueEvidenceRefs(candidate.summaryEvidenceRefs, allowedRefs),
    priorities: candidate.priorities.map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        throw new Error("Every AI advice priority must be an object.");
      }
      const evidenceRefs = (item as Record<string, unknown>).evidenceRefs;
      if (!Array.isArray(evidenceRefs)) {
        throw new Error("Every AI advice priority must contain evidenceRefs.");
      }
      return { evidenceRefs: uniqueEvidenceRefs(evidenceRefs, allowedRefs) };
    })
  };
}

function matchedAlignmentEvidence(
  region: PageAlignmentRegionDecision,
  locale: Locale
): AiAdviceEvidence | undefined {
  if (region.status !== "matched" || !region.actualParentSelector || !region.displacement) return undefined;
  const path = region.designPath.join(" / ") || region.designParentFigmaNodeId;
  const displacement = region.displacement
    ? `x=${region.displacement.x}px, y=${region.displacement.y}px`
    : localText(locale, "无已验证整体位移", "no verified whole-region displacement");
  return {
    ref: `page-alignment:${region.designParentFigmaNodeId}`,
    kind: "page-alignment",
    title: localText(locale, `${path} 模块对齐`, `${path} module alignment`),
    reason: region.reason,
    action: localText(
      locale,
      `复核${path}的整体定位，已验证位移为 ${displacement}；详见关联证据。`,
      `Review the positioning of ${path}; verified displacement is ${displacement}. See linked evidence.`
    ),
    digest: {
      designPath: region.designPath,
      designParentFigmaNodeId: region.designParentFigmaNodeId,
      actualParentSelector: region.actualParentSelector,
      displacement: region.displacement,
      reason: region.reason,
      evidenceConfidence: region.evidenceConfidence,
      anchorStats: region.anchorStats
    }
  };
}

function buildAiAdviceEvidence(
  issues: ReviewIssue[],
  pageAlignment: PageAlignmentPlan,
  locale: Locale
): AiAdviceEvidence[] {
  const issueEvidence: AiAdviceEvidence[] = issues.map((issue) => ({
    ref: `review-issue:${issue.id}`,
    kind: "review-issue",
    title: issue.title,
    reason: issue.summary,
    action: issue.location.selector?.startsWith("body >")
      ? issue.primaryAction.replaceAll(issue.location.selector, localText(locale, "该模块内的对应元素", "the corresponding element in this module"))
      : issue.primaryAction,
    digest: {
      id: issue.id,
      priority: issue.priority,
      severity: issue.severity,
      category: issue.category,
      title: issue.title,
      summary: issue.summary,
      expected: issue.expected,
      actual: issue.actual,
      primaryAction: issue.primaryAction,
      location: issue.location,
      evidenceConfidence: issue.evidenceConfidence
    }
  }));
  const alignmentEvidence = pageAlignment.regions
    .map((region) => matchedAlignmentEvidence(region, locale))
    .filter((item): item is AiAdviceEvidence => Boolean(item));
  return [...issueEvidence, ...alignmentEvidence];
}

function materializeAiAdvice(
  selection: AiAdviceSelection,
  evidence: AiAdviceEvidence[],
  locale: Locale,
  model: string
): AiAdvice {
  const evidenceByRef = new Map(evidence.map((item) => [item.ref, item]));
  const resolve = (refs: AiAdviceEvidenceRef[]): AiAdviceEvidence[] => refs.map((ref) => {
    const item = evidenceByRef.get(ref);
    if (!item) throw new Error("AI advice evidence disappeared before publication.");
    return item;
  });
  const summaryItems = resolve(selection.summaryEvidenceRefs);
  return {
    model,
    summaryEvidenceRefs: selection.summaryEvidenceRefs,
    summary: localText(
      locale,
      `AI 仅对最终发布问题和已验证模块对齐结论排序。优先处理：${summaryItems.map((item) => item.title).join("；")}。`,
      `AI ranked only final published issues and verified module-alignment decisions. Prioritize: ${summaryItems.map((item) => item.title).join("; ")}.`
    ),
    priorities: selection.priorities.map(({ evidenceRefs }) => {
      const items = resolve(evidenceRefs);
      const primary = items.find(item => item.ref.startsWith("review-issue:missing-module:")) ??
        items.find(item => item.kind === "review-issue") ?? items[0];
      return {
        title: primary.title,
        reason: primary.reason,
        action: primary.action,
        evidenceRefs
      };
    })
  };
}

function enforceBlockingStructuralCoverage(
  selection: AiAdviceSelection,
  issues: ReviewIssue[]
): AiAdviceSelection {
  const requiredRefs = issues
    .filter((issue) => (issue.rule === "missing_module" && issue.severity === "error") ||
      (issue.rule === "design_coverage_unverified" && issue.severity === "pending" && Boolean(issue.coverageModule)))
    .map((issue): AiAdviceEvidenceRef => `review-issue:${issue.id}`);
  if (!requiredRefs.length) return selection;

  const summaryEvidenceRefs = [...new Set([
    ...requiredRefs,
    ...selection.summaryEvidenceRefs
  ])];
  const selectedPriorityRefs = new Set(
    selection.priorities.flatMap((priority) => priority.evidenceRefs)
  );
  const requiredPriorities = requiredRefs
    .filter((ref) => !selectedPriorityRefs.has(ref) ||
      (issues.some(issue => `review-issue:${issue.id}` === ref && issue.rule === "design_coverage_unverified" && issue.coverageModule) &&
        !selection.priorities.some(priority => priority.evidenceRefs.length === 1 && priority.evidenceRefs[0] === ref)))
    .map((ref) => ({ evidenceRefs: [ref] }));
  return {
    summaryEvidenceRefs,
    priorities: [...requiredPriorities, ...selection.priorities]
  };
}

async function repairAiAdviceSelection(input: {
  endpoint: string;
  headers: Record<string, string>;
  model: string;
  locale: Locale;
  outputText: string;
  allowedRefs: AiAdviceEvidenceRef[];
  schema: Record<string, unknown>;
  signal: AbortSignal;
}): Promise<string> {
  const repairResponse = await fetch(input.endpoint, {
    method: "POST",
    headers: input.headers,
    redirect: "error",
    signal: AbortSignal.any([input.signal, AbortSignal.timeout(30_000)]),
    body: JSON.stringify({
      model: input.model,
      store: false,
      input: [{
        role: "user",
        content: [{
          type: "input_text",
          text: localText(
            input.locale,
            [
              "下面是一次视觉验收证据排序，但格式不是约定的 JSON。",
              "只从允许的证据引用中修复格式；不得输出原始建议文本或增加新事实。",
              `允许的证据引用：${JSON.stringify(input.allowedRefs)}`,
              `原始输出：${JSON.stringify(input.outputText.slice(0, 12_000))}`
            ].join("\n"),
            [
              "The following visual-review evidence ranking did not use the required JSON format.",
              "Repair only with allowed evidence references; do not return raw advice prose or add facts.",
              `Allowed evidence references: ${JSON.stringify(input.allowedRefs)}`,
              `Original output: ${JSON.stringify(input.outputText.slice(0, 12_000))}`
            ].join("\n")
          )
        }]
      }],
      text: {
        format: {
          type: "json_schema",
          name: "visual_acceptance_advice",
          schema: input.schema,
          strict: true
        }
      }
    })
  });
  if (!repairResponse.ok) {
    const body = await repairResponse.text();
    throw new Error(localText(
      input.locale,
      `AI 建议格式修复失败（${repairResponse.status}）：${body.slice(0, 240)}`,
      `AI advice format repair failed (${repairResponse.status}): ${body.slice(0, 240)}`
    ));
  }
  const repairPayload = (await repairResponse.json()) as Record<string, unknown>;
  const repairedOutputText = extractOutputText(repairPayload);
  if (!repairedOutputText) {
    throw new Error(localText(
      input.locale,
      "AI 建议格式修复未返回可读取内容。",
      "AI advice format repair returned no readable content."
    ));
  }
  return repairedOutputText;
}

type AdviceInput = {
  apiKey?: string;
  apiUrl?: string;
  model?: string;
  issues: ReviewIssue[];
  pageAlignment: PageAlignmentPlan;
  locale: Locale;
};

export class PartialAiAdviceError extends Error {
  constructor(error: unknown, public readonly partialAdvice: AiAdvice) {
    super(error instanceof Error ? error.message : String(error));
    this.name = error instanceof Error ? error.name : "Error";
  }
}

export async function generateAiAdvice(input: AdviceInput): Promise<AiAdvice> {
  const evidence = buildAiAdviceEvidence(input.issues, input.pageAlignment, input.locale);
  const signal = AbortSignal.timeout(60_000);
  if (evidence.length <= 64) return generateAiAdviceBatch(input, evidence, signal);
  const completed: AiAdvice[] = [];
  const materialize = () => materializeAiAdvice(enforceBlockingStructuralCoverage({
    summaryEvidenceRefs: [...new Set(completed.flatMap(item => item.summaryEvidenceRefs))],
    priorities: completed.flatMap(item => item.priorities.map(priority => ({ evidenceRefs: priority.evidenceRefs })))
  }, input.issues), evidence, input.locale, input.model?.trim() || process.env.OPENAI_MODEL?.trim() || DEFAULT_AI_MODEL);
  for (let offset = 0; offset < evidence.length; offset += 64) {
    const batch = evidence.slice(offset, offset + 64);
    const refs = new Set(batch.map(item => item.ref));
    try {
      signal.throwIfAborted();
      completed.push(await generateAiAdviceBatch({ ...input,
        issues: input.issues.filter(issue => refs.has(`review-issue:${issue.id}`))
      }, batch, signal));
    } catch (error) {
      if (!completed.length) throw error;
      const advice = materialize();
      advice.summary = localText(input.locale, "部分 AI 排序已完成，后续批次失败；以下不代表完整审查。", "AI ranking is partial: a later batch failed; this is not a complete review.") + advice.summary;
      throw new PartialAiAdviceError(error, advice);
    }
  }
  return materialize();
}

async function generateAiAdviceBatch(input: AdviceInput, evidence: AiAdviceEvidence[], signal: AbortSignal): Promise<AiAdvice> {
  const endpoint = resolveResponsesEndpoint(input.apiUrl, input.locale);
  const model = input.model?.trim() || process.env.OPENAI_MODEL?.trim() || DEFAULT_AI_MODEL;
  if (evidence.length === 0) {
    throw new Error(localText(
      input.locale,
      "没有最终发布的 ReviewIssue 或已验证的匹配模块可供 AI 汇总。",
      "No final ReviewIssue or verified matched module is available for AI advice."
    ));
  }
  const allowedRefs = evidence.map((item) => item.ref);
  const allowedRefSet = new Set(allowedRefs);
  const schema = adviceSchema(allowedRefs);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (input.apiKey) headers.Authorization = `Bearer ${input.apiKey}`;
  const evidenceDigest = evidence.map((item) => ({
    ref: item.ref,
    kind: item.kind,
    ...item.digest
  }));

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    redirect: "error",
    signal,
    body: JSON.stringify({
      model,
      input: [{
        role: "user",
        content: [{
          type: "input_text",
          text: localText(
            input.locale,
            [
              "请按修复优先级排序给出的视觉走查证据。",
              "只返回证据引用；最终文字由确定性程序根据引用证据组装。",
              "只能使用证据目录中的最终发布 ReviewIssue 和已验证的已匹配模块对齐结论。",
              "设计侧未匹配节点和待确认节点不属于比对交集，已在程序入口处排除。",
              `证据目录：${JSON.stringify(evidenceDigest)}`
            ].join("\n"),
            [
              "Rank the supplied visual-review evidence by repair priority.",
              "Return evidence references only. Deterministic code assembles final prose from those references.",
              "Use only final published ReviewIssues and verified matched PageAlignmentPlan decisions in the evidence catalog.",
              "Design-only unmatched and uncertain nodes are outside the review intersection and were removed at the program boundary.",
              `Evidence catalog: ${JSON.stringify(evidenceDigest)}`
            ].join("\n")
          )
        }]
      }],
      text: {
        format: {
          type: "json_schema",
          name: "visual_acceptance_advice",
          schema,
          strict: true
        }
      }
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(localText(input.locale, `AI API 请求失败（${response.status}）：${body.slice(0, 240)}`, `AI API request failed (${response.status}): ${body.slice(0, 240)}`));
  }
  const payload = (await response.json()) as Record<string, unknown>;
  const outputText = extractOutputText(payload);
  if (!outputText) {
    throw new Error(localText(input.locale, "AI API 未返回可读取的建议内容。", "The AI API returned no readable advice."));
  }
  let selection: AiAdviceSelection;
  try {
    selection = parseAiAdviceSelection(outputText, allowedRefSet);
  } catch {
    const repairedOutputText = await repairAiAdviceSelection({
      endpoint,
      headers,
      model,
      locale: input.locale,
      outputText,
      allowedRefs,
      schema,
      signal
    });
    selection = parseAiAdviceSelection(repairedOutputText, allowedRefSet);
  }
  return materializeAiAdvice(
    enforceBlockingStructuralCoverage(selection, input.issues),
    evidence,
    input.locale,
    model
  );
}

export async function generateDynamicHypothesis(input: {
  apiKey?: string;
  apiUrl?: string;
  model?: string;
  request: AgentHypothesisRequest;
}): Promise<AgentHypothesis> {
  const endpoint = resolveResponsesEndpoint(input.apiUrl, input.request.locale);
  const model = input.model?.trim() || process.env.OPENAI_MODEL?.trim() || DEFAULT_AI_MODEL;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (input.apiKey?.trim()) headers.Authorization = `Bearer ${input.apiKey.trim()}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({
      model,
      store: false,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                input.request.locale === "en"
                  ? "Classify only the supplied ambiguous UI candidate as market-value, date-time, countdown, or probability. Choose the matching text-only normalization strategy. Deterministic code will verify the semantic value family, binding, geometry, and style. Do not widen the region or properties."
                  : "仅将给出的歧义 UI 候选分类为行情值、日期时间、倒计时或概率，并选择对应的纯文本归一化策略；确定性代码会独立验证语义值族、绑定、几何和样式。不得扩大区域或属性范围。",
                JSON.stringify(input.request)
              ].join("\n")
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "dynamic_agent_hypothesis",
          schema: AGENT_HYPOTHESIS_SCHEMA,
          strict: true
        }
      }
    })
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      localText(
        input.request.locale,
        `动态 Agent 请求失败（${response.status}）：${body.slice(0, 240)}`,
        `Dynamic Agent request failed (${response.status}): ${body.slice(0, 240)}`
      )
    );
  }
  const payload = (await response.json()) as Record<string, unknown>;
  const outputText = extractOutputText(payload);
  if (!outputText) {
    throw new Error(
      localText(
        input.request.locale,
        "动态 Agent 未返回可读取的假设。",
        "The Dynamic Agent returned no readable hypothesis."
      )
    );
  }
  return JSON.parse(outputText) as AgentHypothesis;
}

export async function generateElementBindings(input: {
  apiKey?: string;
  apiUrl?: string;
  model?: string;
  request: AgentElementBindingRequest;
  referenceImage: Buffer;
  actualImage: Buffer;
}): Promise<AgentElementBindingResult> {
  const endpoint = resolveResponsesEndpoint(input.apiUrl, input.request.locale);
  const model = input.model?.trim() || process.env.OPENAI_MODEL?.trim() || DEFAULT_AI_MODEL;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (input.apiKey?.trim()) headers.Authorization = `Bearer ${input.apiKey.trim()}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    redirect: "error",
    signal: AbortSignal.timeout(resolveElementBindingTimeoutMs()),
    body: JSON.stringify({
      model,
      store: false,
      input: [{
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              input.request.locale === "en"
                ? "First infer business-module correspondence, missing/reordered modules, and whole-region displacement from both images and regionHints. Return that structure in alignmentPlan before proposing element bindings. Each region must use a designParentFigmaNodeId and designPath from the supplied design candidates. Use status matched only with an actualParentSelector from the supplied actual candidates; use missing-in-actual when the design region has no counterpart; use uncertain when evidence is insufficient. For missing-in-actual and uncertain, set actualParentSelector and displacement to null. For matched, provide actualParentSelector and provide displacement when inferred, otherwise null. Then bind elements only within matched modules using ancestorPath, parentSelector, contextTexts, semantics, and visual evidence; never bind by top-to-bottom order alone. Duplicate text is intentionally delegated to you. Bind only semantically identical elements from the supplied candidate IDs. Return no binding when uncertain. Summarize the page-level structural hypothesis in pageSummary. Deterministic code verifies every proposal and AI must not decide pass/fail."
                : "请先结合两张图片与 regionHints 推断业务模块对应关系、缺失/重排模块和区域整体位移，并在元素绑定前输出结构化 alignmentPlan。每个模块只能使用设计候选中的 designParentFigmaNodeId 和 designPath；仅在开发候选中存在对应 actualParentSelector 时标记 matched，设计模块没有对应实现时标记 missing-in-actual，证据不足时标记 uncertain。missing-in-actual 和 uncertain 的 actualParentSelector、displacement 必须为 null；matched 必须提供 actualParentSelector，能推断位移时提供 displacement，否则为 null。然后再利用 ancestorPath、parentSelector、contextTexts、语义及视觉证据，仅在 matched 模块内部绑定元素；禁止仅按从上到下顺序匹配。重复文案是有意交给你的歧义候选。只能使用候选列表中的 ID 绑定语义相同的元素；不确定时不要绑定，并在 pageSummary 中总结页面级结构假设。所有提案会由确定性代码复核，AI 不得决定通过或失败。",
              input.request.locale === "en"
                ? "designRegions is the structural module inventory, including groups omitted from element candidates. Use its real IDs, parent IDs, boxes and descendant contextTexts to identify whole business cards, not tiny status labels. Propose one missing ancestor card rather than duplicate missing descendants. Bind elements only from designCandidates."
                : "designRegions 是独立结构模块清单，包含元素候选未收录的编组。使用其真实 ID、父 ID、范围与后代 contextTexts 识别完整业务卡片，不要用细小状态标签代替整卡。缺失模块优先提议完整父卡片，不要重复提议其后代。元素绑定仍仅使用 designCandidates。",
              JSON.stringify(input.request)
            ].join("\n")
          },
          {
            type: "input_image",
            image_url: `data:image/png;base64,${input.referenceImage.toString("base64")}`,
            detail: "high"
          },
          {
            type: "input_image",
            image_url: `data:image/png;base64,${input.actualImage.toString("base64")}`,
            detail: "high"
          }
        ]
      }],
      text: {
        format: {
          type: "json_schema",
          name: "visual_semantic_element_bindings",
          schema: ELEMENT_BINDING_SCHEMA,
          strict: true
        }
      }
    })
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(localText(
      input.request.locale,
      `AI 元素语义绑定请求失败（${response.status}）：${body.slice(0, 240)}`,
      `AI element-binding request failed (${response.status}): ${body.slice(0, 240)}`
    ));
  }
  const payload = (await response.json()) as Record<string, unknown>;
  const outputText = extractOutputText(payload);
  if (!outputText) {
    throw new Error(localText(
      input.request.locale,
      "AI 元素语义绑定未返回可读取结果。",
      "AI element binding returned no readable result."
    ));
  }
  return JSON.parse(outputText) as AgentElementBindingResult;
}

export function resolveElementBindingTimeoutMs(
  environment: Record<string, string | undefined> = process.env
): number {
  const parsed = Number(environment.DIFFLAB_AI_BINDING_TIMEOUT_MS);
  if (!Number.isFinite(parsed)) return 120_000;
  return Math.min(180_000, Math.max(10_000, Math.round(parsed)));
}

function resolveResourceEndpoint(input: string | undefined, resource: "responses" | "models", locale: Locale): string {
  const configured = input?.trim() || process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1";
  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error(localText(locale, "AI API 请求地址格式无效。", "The AI API endpoint is invalid."));
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(localText(locale, "AI API 请求地址只支持 http 或 https 协议。", "The AI API endpoint must use HTTP or HTTPS."));
  }
  const path = url.pathname.replace(/\/+$/, "");
  url.pathname = /\/(responses|models)$/.test(path)
    ? path.replace(/\/(responses|models)$/, `/${resource}`)
    : `${path}/${resource}`;
  return url.toString();
}

export function resolveResponsesEndpoint(input?: string, locale: Locale = "zh-CN"): string {
  return resolveResourceEndpoint(input, "responses", locale);
}

export function resolveModelsEndpoint(input?: string, locale: Locale = "zh-CN"): string {
  return resolveResourceEndpoint(input, "models", locale);
}

function readModelId(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  for (const key of ["id", "model", "name"] as const) {
    if (typeof record[key] === "string" && record[key].trim()) return record[key].trim();
  }
  return undefined;
}

export async function listAiModels(input: { apiKey?: string; apiUrl?: string; locale: Locale }): Promise<string[]> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (input.apiKey?.trim()) headers.Authorization = `Bearer ${input.apiKey.trim()}`;

  const response = await fetch(resolveModelsEndpoint(input.apiUrl, input.locale), {
    method: "GET",
    headers,
    redirect: "error",
    signal: AbortSignal.timeout(30_000)
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(localText(input.locale, `模型列表请求失败（${response.status}）：${body.slice(0, 240)}`, `Model list request failed (${response.status}): ${body.slice(0, 240)}`));
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const entries = Array.isArray(payload.data)
    ? payload.data
    : Array.isArray(payload.models)
      ? payload.models
      : [];
  const models = [...new Set(entries.map(readModelId).filter((id): id is string => Boolean(id)))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );
  if (models.length === 0) throw new Error(localText(input.locale, "模型列表响应中未找到可用的模型 ID。", "No usable model IDs were found in the model-list response."));
  return models;
}
