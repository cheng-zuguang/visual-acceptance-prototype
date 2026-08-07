import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import express from "express";
import multer from "multer";
import type { AcceptanceConfig } from "../src/types";
import { DEFAULT_AI_MODEL, generateAiAdvice, listAiModels } from "./ai";
import { capturePage } from "./capture";
import { compareDesignToPage } from "./compare";
import { DEFAULT_RULES_YAML, parseAcceptanceYaml } from "./default-rules";
import { demoHtml, createDemoSources } from "./demo";
import { designFromFigma, designFromImage, type DesignSource } from "./design";
import { createReport } from "./report";

const app = express();
const port = Number(process.env.PORT || 4318);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 }
});

app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, prototype: true });
});

app.get("/api/default-rules", (_request, response) => {
  response.type("text/yaml").send(DEFAULT_RULES_YAML);
});

app.post("/api/ai/models", async (request, response, next) => {
  try {
    const apiKey = typeof request.body?.apiKey === "string"
      ? request.body.apiKey.trim() || process.env.OPENAI_API_KEY
      : process.env.OPENAI_API_KEY;
    const apiUrl = typeof request.body?.apiUrl === "string"
      ? request.body.apiUrl.trim() || process.env.OPENAI_BASE_URL
      : process.env.OPENAI_BASE_URL;
    if (!apiKey && !apiUrl) {
      throw new Error("获取官方模型列表需要 AI API Key；本地兼容服务请填写 API 请求地址。");
    }
    const models = await listAiModels({ apiKey, apiUrl });
    response.json({
      models,
      defaultModel: process.env.OPENAI_MODEL?.trim() || DEFAULT_AI_MODEL
    });
  } catch (error) {
    next(error);
  }
});

app.get("/demo/:kind", (request, response) => {
  const kind = request.params.kind === "actual" ? "actual" : "reference";
  response.type("html").send(demoHtml(kind));
});

function scaledDesign(design: DesignSource, config: AcceptanceConfig): DesignSource {
  if (config.viewport === "auto") return design;
  const scaleX = config.viewport.width / design.viewport.width;
  const scaleY = config.viewport.height / design.viewport.height;
  return {
    ...design,
    viewport: config.viewport,
    elements: design.elements.map((element) => ({
      ...element,
      box: {
        x: element.box.x * scaleX,
        y: element.box.y * scaleY,
        width: element.box.width * scaleX,
        height: element.box.height * scaleY
      }
    })),
    diagnostics: [...design.diagnostics, `规则覆盖视口为 ${config.viewport.width} × ${config.viewport.height}。`]
  };
}

async function maybeAiAdvice(input: {
  requested: boolean;
  apiKey?: string;
  apiUrl?: string;
  model?: string;
  comparison: Awaited<ReturnType<typeof compareDesignToPage>>;
  diagnostics: string[];
}) {
  if (!input.requested) return undefined;
  const apiKey = input.apiKey?.trim() || process.env.OPENAI_API_KEY;
  const apiUrl = input.apiUrl?.trim() || process.env.OPENAI_BASE_URL;
  if (!apiKey && !apiUrl) {
    input.diagnostics.push("已请求 AI 建议，但未配置 OpenAI API Key；已跳过。 ");
    return undefined;
  }
  try {
    return await generateAiAdvice({
      apiKey,
      apiUrl,
      model: input.model,
      issues: input.comparison.issues,
      referenceImage: input.comparison.referenceImage,
      actualImage: input.comparison.actualImage,
      similarity: input.comparison.similarity
    });
  } catch (error) {
    input.diagnostics.push(`AI 建议生成失败：${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

app.post("/api/compare", upload.single("designImage"), async (request, response, next) => {
  const startedAt = Date.now();
  try {
    const config = parseAcceptanceYaml(request.body.rulesYaml);
    let design: DesignSource;
    if (request.file) {
      design = await designFromImage(request.file.buffer, request.file.originalname);
    } else if (typeof request.body.figmaUrl === "string" && request.body.figmaUrl.trim()) {
      design = await designFromFigma(
        request.body.figmaUrl.trim(),
        request.body.figmaToken?.trim() || process.env.FIGMA_TOKEN || ""
      );
    } else {
      throw new Error("请选择设计稿图片或输入 Figma Frame 链接。");
    }
    design = scaledDesign(design, config);

    const h5Url = String(request.body.h5Url ?? "").trim();
    if (!h5Url) throw new Error("请输入 H5 页面地址。");
    const capture = await capturePage(h5Url, design.viewport, config);
    const comparison = await compareDesignToPage(design, capture, config);
    const diagnostics = [...design.diagnostics, ...capture.diagnostics];
    const aiAdvice = await maybeAiAdvice({
      requested: request.body.useAi === "true",
      apiKey: request.body.openaiKey,
      apiUrl: request.body.openaiApiUrl,
      model: request.body.openaiModel,
      comparison,
      diagnostics
    });

    response.json(
      createReport({
        comparison,
        source: { design: design.label, h5: capture.finalUrl },
        viewport: design.viewport,
        rules: config,
        diagnostics,
        durationMs: Date.now() - startedAt,
        aiAdvice
      })
    );
  } catch (error) {
    next(error);
  }
});

app.post("/api/demo-compare", async (request, response, next) => {
  const startedAt = Date.now();
  try {
    const config = parseAcceptanceYaml(request.body?.rulesYaml);
    const baseUrl = `http://127.0.0.1:${port}`;
    const { design, actual } = await createDemoSources(baseUrl, config);
    const comparison = await compareDesignToPage(design, actual, config);
    const diagnostics = [...design.diagnostics, ...actual.diagnostics];
    const aiAdvice = await maybeAiAdvice({
      requested: request.body?.useAi === true,
      apiKey: request.body?.openaiKey,
      apiUrl: request.body?.openaiApiUrl,
      model: request.body?.openaiModel,
      comparison,
      diagnostics
    });
    response.json(
      createReport({
        comparison,
        source: { design: "内置基准页面", h5: `${baseUrl}/demo/actual` },
        viewport: design.viewport,
        rules: config,
        diagnostics,
        durationMs: Date.now() - startedAt,
        aiAdvice
      })
    );
  } catch (error) {
    next(error);
  }
});

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(currentDir, "../dist");
if (process.env.NODE_ENV === "production" && existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((_request, response) => response.sendFile(path.join(distDir, "index.html")));
}

app.use(
  (
    error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction
  ) => {
    const message = error instanceof Error ? error.message : "未知错误";
    response.status(400).json({ error: message });
  }
);

app.listen(port, "127.0.0.1", () => {
  console.log(`DiffLab prototype server: http://127.0.0.1:${port}`);
});
