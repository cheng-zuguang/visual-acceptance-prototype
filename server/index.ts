import { existsSync } from "node:fs";
import { lookup } from "node:dns/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import express from "express";
import { DEFAULT_AI_MODEL, listAiModels } from "./ai";
import { defaultRulesYaml } from "./default-rules";
import { demoHtml } from "./demo";
import { localText, requestLocale } from "./i18n";
import { ReviewService } from "./review";
import { createPublicApiApp, type ServiceIdentity } from "./public-api";
import type { BrowserCaptureCredential } from "./capture";
import { createWebCompareRouter } from "./web-compare-api";
import { aiDefaultsFromEnvironment } from "./ai-review-config";
import { createReviewMcpHttpEndpoint } from "./mcp-http";
import { createClientIpAllowlist } from "./client-ip-access";

const app = express();
const port = Number(process.env.PORT || 4318);
const host = process.env.HOST || "0.0.0.0";
const reviewService = new ReviewService();

app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));

function publicServiceTokens(): Record<string, ServiceIdentity> {
  const token = process.env.DIFFLAB_SERVICE_TOKEN?.trim();
  return token
    ? {
        [token]: {
          tenantId: process.env.DIFFLAB_TENANT_ID?.trim() || "default",
          scopes: ["reviews:create", "reviews:read", "reviews:cancel", "assets:write", "metrics:read"]
        }
      }
    : {};
}

function commaSeparatedEnvironment(name: string): string[] | undefined {
  const values = (process.env[name] ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return values.length ? values : undefined;
}

app.use(createClientIpAllowlist({
  allowedClientIps: commaSeparatedEnvironment("DIFFLAB_ALLOWED_CLIENT_IPS") ?? [],
  publicPaths: ["/api/health"],
}));

const serviceTokens = publicServiceTokens();
const mcpApiBaseUrl = process.env.DIFFLAB_API_BASE_URL?.trim()
  || `http://127.0.0.1:${port}`;
const parsedMcpApiBaseUrl = new URL(mcpApiBaseUrl);
if (!new Set(["http:", "https:"]).has(parsedMcpApiBaseUrl.protocol)) {
  throw new Error("DIFFLAB_API_BASE_URL must use HTTP or HTTPS.");
}
const reviewMcpHttpEndpoint = createReviewMcpHttpEndpoint({
  apiBaseUrl: parsedMcpApiBaseUrl.toString(),
  serviceTokens,
  defaultAi: aiDefaultsFromEnvironment(process.env),
  host,
  allowedHosts: commaSeparatedEnvironment("DIFFLAB_MCP_ALLOWED_HOSTS"),
  allowedOrigins: commaSeparatedEnvironment("DIFFLAB_MCP_ALLOWED_ORIGINS"),
  onerror: (error) => console.error(`MCP Streamable HTTP error: ${error.message}`),
});

app.use("/mcp", reviewMcpHttpEndpoint.middleware);

const allowedHosts = (process.env.DIFFLAB_ALLOWED_H5_HOSTS ?? "")
  .split(",")
  .map((hostName) => hostName.trim().toLowerCase())
  .filter(Boolean);
const webhookAllowedHosts = (process.env.DIFFLAB_ALLOWED_WEBHOOK_HOSTS ?? "")
  .split(",")
  .map((hostName) => hostName.trim().toLowerCase())
  .filter(Boolean);

app.use(createPublicApiApp({
  serviceTokens,
  allowedHosts,
  webhookAllowedHosts,
  lookupHost: async (hostname) => (await lookup(hostname, { all: true, verbatim: true }))
    .map(({ address }) => address),
  resolveCredential: async (_tenantId, credentialRef) => {
    if (credentialRef !== process.env.DIFFLAB_FIGMA_CREDENTIAL_REF) {
      throw new Error("Unknown Figma credentialRef.");
    }
    const token = process.env.FIGMA_TOKEN?.trim();
    if (!token) throw new Error("The configured Figma credential is unavailable.");
    return token;
  },
  resolveBrowserCredential: async (_tenantId, credentialRef) => {
    if (credentialRef !== process.env.DIFFLAB_BROWSER_CREDENTIAL_REF) {
      throw new Error("Unknown browser credentialRef.");
    }
    const raw = process.env.DIFFLAB_BROWSER_CREDENTIAL_JSON?.trim();
    if (!raw) throw new Error("The configured browser credential is unavailable.");
    return JSON.parse(raw) as BrowserCaptureCredential;
  },
  resolveWebhookSecret: async (_tenantId, secretRef) => {
    if (secretRef !== process.env.DIFFLAB_WEBHOOK_SECRET_REF) {
      throw new Error("Unknown webhook secretRef.");
    }
    const secret = process.env.DIFFLAB_WEBHOOK_SECRET?.trim();
    if (!secret) throw new Error("The configured webhook secret is unavailable.");
    return secret;
  },
  signingSecret: process.env.DIFFLAB_SIGNING_SECRET,
  maxPages: Number(process.env.DIFFLAB_MAX_PAGES || 10),
  maxConcurrentPages: Number(process.env.DIFFLAB_MAX_CONCURRENT_PAGES || 3),
  maxConcurrentPagePairs: Number(process.env.DIFFLAB_MAX_CONCURRENT_PAGE_PAIRS || 8),
  maxConcurrentReviews: Number(process.env.DIFFLAB_MAX_CONCURRENT_REVIEWS || 5),
  maxConcurrentReviewsPerTenant: Number(process.env.DIFFLAB_MAX_CONCURRENT_REVIEWS_PER_TENANT || 2),
  maxQueuedReviews: Number(process.env.DIFFLAB_MAX_QUEUED_REVIEWS || 100),
  maxQueuedReviewsPerTenant: Number(process.env.DIFFLAB_MAX_QUEUED_REVIEWS_PER_TENANT || 20),
  maxReviewSubmissionsPerMinute: Number(process.env.DIFFLAB_REVIEW_SUBMISSIONS_PER_MINUTE || 60),
  capacityRetryAfterSeconds: Number(process.env.DIFFLAB_CAPACITY_RETRY_AFTER_SECONDS || 5),
  aiAdviceAlertMinAttempts: Number(process.env.DIFFLAB_AI_ALERT_MIN_ATTEMPTS || 20),
  aiAdviceTimeoutAlertRatio: Number(process.env.DIFFLAB_AI_TIMEOUT_ALERT_RATIO || 0.2),
  aiAdviceEvidenceDanglingAlertRatio: Number(process.env.DIFFLAB_AI_EVIDENCE_DANGLING_ALERT_RATIO || 0.1),
  reviewTimeoutMs: Number(process.env.DIFFLAB_REVIEW_TIMEOUT_MS || 120_000),
  maxAssetBytes: Number(process.env.DIFFLAB_MAX_ASSET_BYTES || 25 * 1024 * 1024),
  maxImagePixels: Number(process.env.DIFFLAB_MAX_IMAGE_PIXELS || 40_000_000),
  maxReviewAssetBytes: Number(process.env.DIFFLAB_MAX_REVIEW_ASSET_BYTES || 100 * 1024 * 1024),
  defaultAi: aiDefaultsFromEnvironment(process.env),
  executeReview: (input, context) => reviewService.reviewPagePairs(input, {
    maxConcurrency: context?.maxConcurrency,
    signal: context?.signal,
    onPageUpdate: context?.onPageUpdate
  })
}));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, prototype: true });
});

app.get("/api/default-rules", (request, response) => {
  response.type("text/yaml").send(defaultRulesYaml(requestLocale(request.query.locale)));
});

app.post("/api/ai/models", async (request, response, next) => {
  try {
    const locale = requestLocale(request.body?.locale);
    const apiKey = typeof request.body?.apiKey === "string"
      ? request.body.apiKey.trim() || process.env.OPENAI_API_KEY
      : process.env.OPENAI_API_KEY;
    const apiUrl = typeof request.body?.apiUrl === "string"
      ? request.body.apiUrl.trim() || process.env.OPENAI_BASE_URL
      : process.env.OPENAI_BASE_URL;
    if (!apiKey && !apiUrl) {
      throw new Error(localText(locale, "获取官方模型列表需要 AI API Key；本地兼容服务请填写 API 请求地址。", "An AI API key is required to fetch the official model list. For a local compatible service, enter its API endpoint."));
    }
    const models = await listAiModels({ apiKey, apiUrl, locale });
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
  response.type("html").send(demoHtml(kind, requestLocale(request.query.locale)));
});

app.use(createWebCompareRouter({
  executeReview: (input) => reviewService.reviewPagePairs(input),
  executeDemo: (input) => reviewService.reviewDemo({
    ...input,
    baseUrl: `http://127.0.0.1:${port}`
  })
}));

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
    const locale = requestLocale(_request.body?.locale ?? _request.query.locale);
    const message = error instanceof Error ? error.message : localText(locale, "未知错误", "Unknown error");
    response.status(400).json({ error: message });
  }
);

const httpServer = app.listen(port, host, () => {
  const displayHost = host === "0.0.0.0" ? "127.0.0.1" : host;
  console.log(`DiffLab prototype server: http://${displayHost}:${port}`);
  console.log(`DiffLab Streamable HTTP MCP: http://${displayHost}:${port}/mcp`);
});

httpServer.once("close", () => {
  void reviewMcpHttpEndpoint.close();
});
