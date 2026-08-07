import type { AiAdvice, Issue } from "../src/types";
import { localText, type Locale } from "./i18n";

export const DEFAULT_AI_MODEL = "gpt-5.6-terra";

const ADVICE_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    priorities: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          reason: { type: "string" },
          action: { type: "string" }
        },
        required: ["title", "reason", "action"],
        additionalProperties: false
      }
    }
  },
  required: ["summary", "priorities"],
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

export async function generateAiAdvice(input: {
  apiKey?: string;
  apiUrl?: string;
  model?: string;
  issues: Issue[];
  referenceImage: Buffer;
  actualImage: Buffer;
  similarity: number;
  locale: Locale;
}): Promise<AiAdvice> {
  const endpoint = resolveResponsesEndpoint(input.apiUrl, input.locale);
  const model = input.model?.trim() || process.env.OPENAI_MODEL?.trim() || DEFAULT_AI_MODEL;
  const issueDigest = input.issues.slice(0, 35).map((issue) => ({
    severity: issue.severity,
    category: issue.category,
    title: issue.title,
    expected: issue.expected,
    actual: issue.actual,
    selector: issue.selector,
    confidence: issue.confidence
  }));
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (input.apiKey) headers.Authorization = `Bearer ${input.apiKey}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    redirect: "error",
    signal: AbortSignal.timeout(60_000),
    body: JSON.stringify({
      model,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: (input.locale === "en"
                ? [
                    "You are a frontend visual acceptance assistant. Use the two images and deterministic rule results to summarize the highest-priority fixes in English.",
                    "The first image is the design reference; the second is the H5 screenshot.",
                    "Do not change the rule engine's pass/fail result. Do not invent CSS selectors or values.",
                    `Visual similarity: ${(input.similarity * 100).toFixed(2)}%`,
                    `Rule findings: ${JSON.stringify(issueDigest)}`
                  ]
                : [
                    "你是前端视觉验收助手。根据两张图和确定性规则结果，用简体中文总结最值得先修的项目。",
                    "第一张图是设计基准，第二张图是 H5 实际截图。",
                    "不得改变规则引擎的通过/不通过结论；不要虚构 CSS 选择器或数值。",
                    `视觉相似度：${(input.similarity * 100).toFixed(2)}%`,
                    `规则问题：${JSON.stringify(issueDigest)}`
                  ]).join("\n")
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
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "visual_acceptance_advice",
          schema: ADVICE_SCHEMA,
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
  if (!outputText) throw new Error(localText(input.locale, "AI API 未返回可读取的建议内容。", "The AI API returned no readable advice."));
  const advice = JSON.parse(outputText) as AiAdvice;
  return { ...advice, model };
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
