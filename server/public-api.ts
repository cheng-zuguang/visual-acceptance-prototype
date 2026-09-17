import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import express, { type Express, type Request, type Response } from "express";
import sharp, { type Metadata } from "sharp";
import type {
  BatchReviewResult,
  IssueRecheckTarget,
  ScreenshotCrop,
  ScreenshotDeviceMetadata,
  ScreenshotVisualAnchor
} from "../src/types";
import type { AiReviewOptions, ReviewPagePairsInput } from "./review";
import type { BrowserCaptureCredential } from "./capture";
import { AiAdviceMonitor } from "./ai-advice-monitor";
import { buildReviewEvidence, type ReviewEvidence, type EvidenceImage } from "./review-evidence";
import {
  deliverSignedWebhook,
  type ReviewWebhookEventType,
  type WebhookDeliveryRequest
} from "./webhook";

export type ReviewScope =
  | "reviews:create"
  | "reviews:read"
  | "reviews:cancel"
  | "assets:write"
  | "metrics:read";

export interface ServiceIdentity {
  tenantId: string;
  scopes: ReviewScope[];
}

export interface ReviewPageProgressUpdate {
  clientPageId: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  stage: string;
  verdict?: "passed" | "failed" | "needs_review";
  error?: { code: string; message: string; retryable: boolean };
}

export interface ReviewExecutionContext {
  maxConcurrency: number;
  signal: AbortSignal;
  onPageUpdate: (update: ReviewPageProgressUpdate) => void;
}

export interface PublicApiOptions {
  serviceTokens: Record<string, ServiceIdentity>;
  allowedHosts: string[];
  lookupHost: (hostname: string) => Promise<string[]>;
  resolveCredential: (tenantId: string, credentialRef: string) => Promise<string>;
  resolveBrowserCredential?: (
    tenantId: string,
    credentialRef: string
  ) => Promise<BrowserCaptureCredential>;
  executeReview: (
    input: ReviewPagePairsInput,
    context?: ReviewExecutionContext
  ) => Promise<BatchReviewResult>;
  defaultAi?: AiReviewOptions;
  now?: () => Date;
  signingSecret?: string;
  assetUploadTtlMs?: number;
  artifactDownloadTtlMs?: number;
  maxAssetBytes?: number;
  maxImagePixels?: number;
  maxConcurrentPages?: number;
  maxConcurrentPagePairs?: number;
  maxConcurrentReviews?: number;
  maxConcurrentReviewsPerTenant?: number;
  maxQueuedReviews?: number;
  maxQueuedReviewsPerTenant?: number;
  maxReviewSubmissionsPerMinute?: number;
  capacityRetryAfterSeconds?: number;
  maxPages?: number;
  reviewTimeoutMs?: number;
  maxReviewAssetBytes?: number;
  webhookAllowedHosts?: string[];
  resolveWebhookSecret?: (tenantId: string, secretRef: string) => Promise<string>;
  sendWebhook?: (request: WebhookDeliveryRequest) => Promise<{ status: number }>;
  webhookMaxAttempts?: number;
  webhookInitialDelayMs?: number;
  sleep?: (delayMs: number) => Promise<void>;
  aiAdviceAlertMinAttempts?: number;
  aiAdviceTimeoutAlertRatio?: number;
  aiAdviceEvidenceDanglingAlertRatio?: number;
}

export interface NetworkAccessPolicy {
  assertUrl: (url: string) => Promise<string>;
}

type ReviewJobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

interface ReviewJob {
  recheck?: IssueRecheckTarget;
  id: string;
  tenantId: string;
  name: string;
  status: ReviewJobStatus;
  createdAt: string;
  updatedAt: string;
  requestId: string;
  requestedEvidenceModes: Record<string, "live" | "screenshot" | "hybrid" | "long_screenshot">;
  progress: { totalPages: number; completedPages: number; currentStage: string };
  pagePairs: ReviewPageProgressUpdate[];
  abortController: AbortController;
  callback?: {
    url: string;
    events: ReviewWebhookEventType[];
    secretRef: string;
  };
  webhook?: {
    eventId: string;
    status: "delivering" | "delivered" | "failed";
    attempts: number;
    attemptLog: Array<{ attempt: number; status?: number; error?: string }>;
    lastStatus?: number;
    lastError?: string;
  };
  result?: BatchReviewResult;
  evidence?: Promise<ReviewEvidence>;
  error?: PublicApiError;
}

type AssetStatus = "awaiting_upload" | "ready" | "rejected";

interface ScreenshotAsset {
  id: string;
  tenantId: string;
  filename: string;
  contentType: "image/png" | "image/jpeg" | "image/webp";
  declaredSizeBytes: number;
  declaredSha256: string;
  status: AssetStatus;
  createdAt: string;
  expiresAt: string;
  image?: Buffer;
  pixels?: { width: number; height: number };
  error?: { code: string; message: string };
}

interface IdempotencyRecord {
  requestHash: string;
  job: ReviewJob;
}

interface PublicApiError {
  code: string;
  message: string;
  retryable: boolean;
  requestId: string;
  details?: Record<string, unknown>;
}

interface QueuedReviewExecution {
  job: ReviewJob;
  requestedPageConcurrency: number;
  execute: (grantedPageConcurrency: number) => Promise<void>;
}

class ReviewExecutionQueue {
  private readonly pending: QueuedReviewExecution[] = [];
  private running = 0;
  private runningPagePairs = 0;
  private readonly runningByTenant = new Map<string, number>();

  constructor(
    private readonly maxConcurrent: number,
    private readonly maxConcurrentPerTenant: number,
    private readonly maxConcurrentPagePairs: number
  ) {}

  enqueue(
    job: ReviewJob,
    requestedPageConcurrency: number,
    execute: (grantedPageConcurrency: number) => Promise<void>
  ): void {
    this.pending.push({ job, requestedPageConcurrency, execute });
    queueMicrotask(() => this.drain());
  }

  capacityExceeded(
    tenantId: string,
    maxQueued: number,
    maxQueuedPerTenant: number
  ): "global" | "tenant" | undefined {
    const tenantRunning = this.runningByTenant.get(tenantId) ?? 0;
    if (
      this.running < this.maxConcurrent &&
      tenantRunning < this.maxConcurrentPerTenant &&
      this.runningPagePairs < this.maxConcurrentPagePairs
    ) {
      return undefined;
    }
    if (this.pending.length >= maxQueued) return "global";
    const tenantQueued = this.pending.filter(({ job }) => job.tenantId === tenantId).length;
    return tenantQueued >= maxQueuedPerTenant ? "tenant" : undefined;
  }

  remove(reviewId: string): void {
    const index = this.pending.findIndex(({ job }) => job.id === reviewId);
    if (index >= 0) this.pending.splice(index, 1);
  }

  position(reviewId: string): number | undefined {
    const index = this.pending.findIndex(({ job }) => job.id === reviewId);
    return index >= 0 ? index + 1 : undefined;
  }

  private drain(): void {
    while (
      this.running < this.maxConcurrent &&
      this.runningPagePairs < this.maxConcurrentPagePairs &&
      this.pending.length > 0
    ) {
      const index = this.pending.findIndex(({ job }) =>
        (this.runningByTenant.get(job.tenantId) ?? 0) < this.maxConcurrentPerTenant
      );
      if (index < 0) return;
      const [next] = this.pending.splice(index, 1);
      if (isCancelled(next.job)) continue;
      const grantedPageConcurrency = Math.min(
        next.requestedPageConcurrency,
        this.maxConcurrentPagePairs - this.runningPagePairs
      );
      this.running += 1;
      this.runningPagePairs += grantedPageConcurrency;
      this.runningByTenant.set(
        next.job.tenantId,
        (this.runningByTenant.get(next.job.tenantId) ?? 0) + 1
      );
      void next.execute(grantedPageConcurrency).finally(() => {
        this.running -= 1;
        this.runningPagePairs -= grantedPageConcurrency;
        const tenantRunning = (this.runningByTenant.get(next.job.tenantId) ?? 1) - 1;
        if (tenantRunning > 0) this.runningByTenant.set(next.job.tenantId, tenantRunning);
        else this.runningByTenant.delete(next.job.tenantId);
        this.drain();
      });
    }
  }
}

class TenantSubmissionRateLimiter {
  private readonly acceptedAtByTenant = new Map<string, number[]>();

  constructor(private readonly maxPerMinute: number) {}

  accept(tenantId: string, nowMs: number): number | undefined {
    const windowStart = nowMs - 60_000;
    const acceptedAt = (this.acceptedAtByTenant.get(tenantId) ?? [])
      .filter((timestamp) => timestamp > windowStart);
    if (acceptedAt.length >= this.maxPerMinute) {
      this.acceptedAtByTenant.set(tenantId, acceptedAt);
      return Math.max(1, Math.ceil((acceptedAt[0] + 60_000 - nowMs) / 1_000));
    }
    acceptedAt.push(nowMs);
    this.acceptedAtByTenant.set(tenantId, acceptedAt);
    return undefined;
  }
}

class ApiFailure extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly retryable = false,
    readonly details?: Record<string, unknown>
  ) {
    super(message);
  }
}

const ASSET_CONTENT_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

function signedValue(secret: string, purpose: string, resourceId: string, expiresAtMs: number): string {
  return createHmac("sha256", secret)
    .update(`${purpose}\n${resourceId}\n${expiresAtMs}`)
    .digest("hex");
}

function signedResourcePath(input: {
  path: string;
  purpose: string;
  resourceId: string;
  expiresAtMs: number;
  secret: string;
}): string {
  const signature = signedValue(input.secret, input.purpose, input.resourceId, input.expiresAtMs);
  return `${input.path}?expires=${input.expiresAtMs}&signature=${signature}`;
}

function assertSignedResource(input: {
  request: Request;
  purpose: string;
  resourceId: string;
  secret: string;
  nowMs: number;
}): void {
  const expiresAtMs = Number(input.request.query.expires);
  const provided = String(input.request.query.signature ?? "");
  if (!Number.isSafeInteger(expiresAtMs) || expiresAtMs <= input.nowMs) {
    throw new ApiFailure(410, "SIGNED_URL_EXPIRED", "The signed URL has expired.");
  }
  const expected = signedValue(input.secret, input.purpose, input.resourceId, expiresAtMs);
  const valid = provided.length === expected.length && timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  if (!valid) throw new ApiFailure(403, "INVALID_SIGNATURE", "The signed URL is invalid.");
}

function imageContentType(value: unknown): ScreenshotAsset["contentType"] | undefined {
  return ASSET_CONTENT_TYPES.find((contentType) => contentType === value);
}

function parseDevice(value: unknown): ScreenshotDeviceMetadata {
  const device = requireRecord(value, "Screenshot device metadata is required.");
  const viewport = requireRecord(device.viewport, "Screenshot viewport metadata is required.");
  return {
    platform: typeof device.platform === "string" ? device.platform : "",
    ...(typeof device.model === "string" ? { model: device.model } : {}),
    ...(typeof device.osVersion === "string" ? { osVersion: device.osVersion } : {}),
    dpr: Number(device.dpr),
    orientation: device.orientation === "landscape" ? "landscape" : "portrait",
    viewport: { width: Number(viewport.width), height: Number(viewport.height) }
  };
}

function parseCrop(value: unknown): ScreenshotCrop | undefined {
  if (value === undefined) return undefined;
  const crop = requireRecord(value, "Screenshot crop metadata is invalid.");
  const parsed = {
    x: Number(crop.x),
    y: Number(crop.y),
    width: Number(crop.width),
    height: Number(crop.height)
  };
  if (!Object.values(parsed).every(Number.isFinite)) {
    throw new ApiFailure(400, "INVALID_REQUEST", "Screenshot crop metadata is invalid.");
  }
  return parsed;
}

function parseAnchors(value: unknown): ScreenshotVisualAnchor[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new ApiFailure(400, "INVALID_REQUEST", "Screenshot anchors must be an array.");
  }
  return value.map((item) => {
    const anchor = requireRecord(item, "Screenshot anchor metadata is invalid.");
    const box = requireRecord(anchor.box, "Screenshot anchor box is required.");
    const parsed: ScreenshotVisualAnchor = {
      ...(typeof anchor.text === "string" ? { text: anchor.text } : {}),
      ...(typeof anchor.role === "string" ? { role: anchor.role } : {}),
      confidence: Number(anchor.confidence),
      box: {
        x: Number(box.x),
        y: Number(box.y),
        width: Number(box.width),
        height: Number(box.height)
      }
    };
    if (
      !Object.values(parsed.box).every(Number.isFinite) ||
      !Number.isFinite(parsed.confidence) || parsed.confidence < 0 || parsed.confidence > 1
    ) {
      throw new ApiFailure(400, "INVALID_REQUEST", "Screenshot anchor metadata is invalid.");
    }
    return parsed;
  });
}

function tokenFrom(request: Request): string | undefined {
  const match = /^Bearer\s+(.+)$/i.exec(request.header("authorization") ?? "");
  return match?.[1];
}

function authenticate(
  request: Request,
  options: PublicApiOptions,
  scope: ReviewScope
): ServiceIdentity {
  const token = tokenFrom(request);
  const identity = token ? options.serviceTokens[token] : undefined;
  if (!identity) throw new ApiFailure(401, "UNAUTHORIZED", "Valid service authentication is required.");
  if (!identity.scopes.includes(scope)) {
    throw new ApiFailure(403, "FORBIDDEN", `Missing required scope: ${scope}.`);
  }
  return identity;
}

async function assertAllowedUrl(
  rawUrl: unknown,
  options: Pick<PublicApiOptions, "allowedHosts" | "lookupHost">,
  priorResolutions?: Map<string, string>
): Promise<string> {
  let url: URL;
  try {
    url = new URL(String(rawUrl ?? ""));
  } catch {
    throw new ApiFailure(400, "INVALID_REQUEST", "The Live H5 URL is invalid.");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new ApiFailure(400, "H5_ACCESS_DENIED", "The Live H5 URL is not allowed.");
  }
  if (!options.allowedHosts.some((host) => host.toLowerCase() === url.hostname.toLowerCase())) {
    throw new ApiFailure(403, "H5_ACCESS_DENIED", "The Live H5 host is not allowed.");
  }
  let addresses: string[];
  try {
    addresses = await options.lookupHost(url.hostname);
  } catch {
    throw new ApiFailure(400, "H5_NAVIGATION_FAILED", "The Live H5 host could not be resolved.", true);
  }
  if (!addresses.length || addresses.some((address) => !isPublicAddress(address))) {
    throw new ApiFailure(403, "H5_ACCESS_DENIED", "The Live H5 host resolves to a blocked network address.");
  }
  const resolution = [...new Set(addresses.map((address) => address.toLowerCase()))].sort().join(",");
  const prior = priorResolutions?.get(url.hostname);
  if (prior && prior !== resolution) {
    throw new ApiFailure(403, "H5_ACCESS_DENIED", "The Live H5 DNS resolution changed during capture.");
  }
  priorResolutions?.set(url.hostname, resolution);
  return url.toString();
}

export function createNetworkAccessPolicy(
  options: Pick<PublicApiOptions, "allowedHosts" | "lookupHost">
): NetworkAccessPolicy {
  const resolutions = new Map<string, string>();
  return { assertUrl: (url) => assertAllowedUrl(url, options, resolutions) };
}

function isPublicAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const parts = address.split(".").map(Number);
    const value = ((parts[0] * 256 + parts[1]) * 256 + parts[2]) * 256 + parts[3];
    const inRange = (start: string, bits: number): boolean => {
      const octets = start.split(".").map(Number);
      const rangeStart = ((octets[0] * 256 + octets[1]) * 256 + octets[2]) * 256 + octets[3];
      const size = 2 ** (32 - bits);
      return value >= rangeStart && value < rangeStart + size;
    };
    return ![
      ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
      ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
      ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24],
      ["224.0.0.0", 4]
    ].some(([start, bits]) => inRange(start as string, bits as number));
  }
  if (version === 6) {
    const normalized = address.toLowerCase();
    if (normalized.startsWith("::ffff:")) return isPublicAddress(normalized.slice(7));
    return !(
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      /^fe[89ab]/.test(normalized) ||
      normalized.startsWith("ff") ||
      normalized.startsWith("2001:db8:")
    );
  }
  return false;
}

function requireRecord(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiFailure(400, "INVALID_REQUEST", message);
  }
  return value as Record<string, unknown>;
}

function translateAiOptions(
  value: unknown,
  defaults?: AiReviewOptions,
): AiReviewOptions | undefined {
  if (value === undefined) return defaults;
  const input = requireRecord(value, "The AI configuration is invalid.");
  if (input.requested !== undefined && typeof input.requested !== "boolean") {
    throw new ApiFailure(400, "INVALID_REQUEST", "ai.requested must be a boolean.");
  }
  for (const field of ["apiKey", "apiUrl", "model"] as const) {
    if (input[field] !== undefined && typeof input[field] !== "string") {
      throw new ApiFailure(400, "INVALID_REQUEST", `ai.${field} must be a string.`);
    }
  }
  const apiKey = typeof input.apiKey === "string" ? input.apiKey.trim() : "";
  const apiUrl = typeof input.apiUrl === "string" ? input.apiUrl.trim() : "";
  const model = typeof input.model === "string" ? input.model.trim() : "";
  return {
    ...defaults,
    requested: typeof input.requested === "boolean" ? input.requested : true,
    ...(apiKey ? { apiKey } : {}),
    ...(apiUrl ? { apiUrl } : {}),
    ...(model ? { model } : {}),
  };
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function reviewAcceptedPayload(job: ReviewJob): Record<string, unknown> {
  const statusUrl = `/v1/reviews/${job.id}`;
  return {
    schemaVersion: "1.0",
    reviewId: job.id,
    status: job.status,
    createdAt: job.createdAt,
    statusUrl,
    resultUrl: `${statusUrl}/result`,
    artifactsUrl: `${statusUrl}/artifacts`
  };
}

async function parseWebhookCallback(
  body: unknown,
  options: PublicApiOptions,
  networkPolicy: NetworkAccessPolicy
): Promise<ReviewJob["callback"]> {
  const input = requireRecord(body, "A JSON request body is required.");
  if (input.callback === undefined) return undefined;
  const callback = requireRecord(input.callback, "The callback configuration is invalid.");
  const url = typeof callback.url === "string" ? callback.url.trim() : "";
  const secretRef = typeof callback.secretRef === "string" ? callback.secretRef.trim() : "";
  const events = Array.isArray(callback.events) ? callback.events : [];
  const supported = new Set<ReviewWebhookEventType>([
    "review.completed",
    "review.failed",
    "review.cancelled"
  ]);
  if (
    !url || !secretRef || !events.length ||
    events.some((event) => typeof event !== "string" || !supported.has(event as ReviewWebhookEventType)) ||
    !options.resolveWebhookSecret
  ) {
    throw new ApiFailure(400, "INVALID_REQUEST", "A callback requires a URL, supported events, and a webhook secretRef.");
  }
  return {
    url: await networkPolicy.assertUrl(url),
    events: [...new Set(events as ReviewWebhookEventType[])],
    secretRef
  };
}

async function translatePagePair(
  value: unknown,
  identity: ServiceIdentity,
  options: PublicApiOptions,
  networkPolicy: NetworkAccessPolicy,
  assets: Map<string, ScreenshotAsset>
): Promise<ReviewPagePairsInput["pagePairs"][number]> {
  const page = requireRecord(value, "The PagePair is invalid.");
  const design = requireRecord(page.design, "The Figma design source is required.");
  const actual = requireRecord(page.actual, "The actual source is required.");
  if (design.kind !== "figma" || !["live", "screenshot", "hybrid", "long_screenshot"].includes(String(actual.kind))) {
    throw new ApiFailure(400, "INVALID_REQUEST", "The PagePair must use Figma with Live, Screenshot, Hybrid, or Long Screenshot evidence.");
  }
  const clientPageId = typeof page.clientPageId === "string" ? page.clientPageId.trim() : "";
  const pageName = typeof page.pageName === "string" ? page.pageName.trim() : "";
  const frameUrl = typeof design.frameUrl === "string" ? design.frameUrl.trim() : "";
  const credentialRef = typeof design.credentialRef === "string" ? design.credentialRef.trim() : "";
  if (!clientPageId || !pageName || !frameUrl || !credentialRef) {
    throw new ApiFailure(400, "INVALID_REQUEST", "Page identity and Figma credentialRef are required.");
  }
  const accessToken = await options.resolveCredential(identity.tenantId, credentialRef);
  const actualKind = actual.kind as "live" | "screenshot" | "hybrid" | "long_screenshot";
  if (["headers", "cookies", "browserCredential"].some((field) => actual[field] !== undefined)) {
    throw new ApiFailure(400, "INVALID_REQUEST", "Raw browser credentials are not accepted; use browserCredentialRef.");
  }
  const browserCredentialRef = typeof actual.browserCredentialRef === "string"
    ? actual.browserCredentialRef.trim()
    : "";
  if (browserCredentialRef && actualKind === "screenshot") {
    throw new ApiFailure(400, "INVALID_REQUEST", "Screenshot evidence does not use browser credentials.");
  }
  if (browserCredentialRef && !options.resolveBrowserCredential) {
    throw new ApiFailure(400, "INVALID_REQUEST", "The browser credentialRef cannot be resolved by this service.");
  }
  const browserCredential = browserCredentialRef
    ? await options.resolveBrowserCredential!(identity.tenantId, browserCredentialRef)
    : undefined;
  const h5Url = actualKind === "live" || actualKind === "hybrid"
    ? await networkPolicy.assertUrl(String(actual.url ?? ""))
    : actualKind === "long_screenshot" && typeof actual.url === "string" && actual.url.trim()
      ? await networkPolicy.assertUrl(actual.url)
      : undefined;
  if (browserCredentialRef && actualKind === "long_screenshot" && !h5Url) {
    throw new ApiFailure(400, "INVALID_REQUEST", "Long Screenshot browser credentials require an H5 URL.");
  }
  const screenshots = actualKind === "screenshot" || actualKind === "hybrid" || actualKind === "long_screenshot"
    ? (() => {
        const assetIds = Array.isArray(actual.screenshotAssetIds) ? actual.screenshotAssetIds : [];
        if (!assetIds.length || assetIds.some((assetId) => typeof assetId !== "string")) {
          throw new ApiFailure(400, "INVALID_REQUEST", "Screenshot and Hybrid evidence require screenshotAssetIds.");
        }
        if (actualKind === "long_screenshot" && assetIds.length !== 1) {
          throw new ApiFailure(400, "INVALID_REQUEST", "Long Screenshot evidence requires exactly one screenshot asset.");
        }
        const device = parseDevice(actual.device);
        const crop = parseCrop(actual.crop);
        const anchors = parseAnchors(actual.anchors);
        return assetIds.map((assetId) => {
          const asset = assets.get(String(assetId));
          if (!asset || asset.tenantId !== identity.tenantId) {
            throw new ApiFailure(404, "RESOURCE_NOT_FOUND", "Screenshot asset not found.");
          }
          if (asset.status !== "ready" || !asset.image) {
            throw new ApiFailure(409, "ASSET_NOT_READY", "Screenshot asset is not ready.", true);
          }
          return {
            name: asset.filename,
            image: asset.image,
            device,
            ...(crop ? { crop } : {}),
            ...(anchors ? { anchors } : {})
          };
        });
      })()
    : undefined;
  const commonPage = {
    clientPageId,
    pageName,
    design: { kind: "figma" as const, frameUrl, accessToken }
  };
  const translatedPage = actualKind === "live"
    ? {
        ...commonPage,
        actual: {
          kind: "live" as const,
          url: h5Url!,
          validateNavigationUrl: async (url: string) => { await networkPolicy.assertUrl(url); },
          ...(browserCredential ? { browserCredential } : {})
        }
      }
    : actualKind === "screenshot"
      ? { ...commonPage, actual: { kind: "screenshot" as const, screenshots: screenshots! } }
      : actualKind === "long_screenshot"
        ? {
            ...commonPage,
            actual: {
              kind: "long_screenshot" as const,
              screenshot: screenshots![0],
              ...(h5Url ? {
                url: h5Url,
                validateNavigationUrl: async (url: string) => { await networkPolicy.assertUrl(url); },
                ...(browserCredential ? { browserCredential } : {})
              } : {})
            }
          }
        : {
          ...commonPage,
          actual: {
            kind: "hybrid" as const,
            url: h5Url!,
            screenshots: screenshots!,
            validateNavigationUrl: async (url: string) => { await networkPolicy.assertUrl(url); },
            ...(browserCredential ? { browserCredential } : {})
          }
        };
  return translatedPage;
}

async function translateCreateRequest(
  body: unknown,
  identity: ServiceIdentity,
  options: PublicApiOptions,
  networkPolicy: NetworkAccessPolicy,
  assets: Map<string, ScreenshotAsset>
): Promise<ReviewPagePairsInput> {
  const input = requireRecord(body, "A JSON request body is required.");
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const pagePairs = Array.isArray(input.pagePairs) ? input.pagePairs : [];
  if (!name || !pagePairs.length) {
    throw new ApiFailure(400, "INVALID_REQUEST", "A name and at least one PagePair are required.");
  }
  const pageIds = pagePairs.map(page => String(requireRecord(page, "The PagePair is invalid.").clientPageId ?? "").trim());
  if (new Set(pageIds).size !== pageIds.length) {
    throw new ApiFailure(400, "INVALID_REQUEST", "clientPageId must be unique within a Review.");
  }
  const ai = translateAiOptions(input.ai, options.defaultAi);
  return {
    reviewName: name,
    locale: input.locale === "en" ? "en" : "zh-CN",
    ...(ai ? { ai } : {}),
    pagePairs: await Promise.all(
      pagePairs.map((page) => translatePagePair(page, identity, options, networkPolicy, assets))
    )
  };
}

function publicJob(job: ReviewJob, queuePosition?: number): Record<string, unknown> {
  return {
    ...(job.recheck ? { mode: "issue_recheck" } : {}),
    schemaVersion: "1.0",
    reviewId: job.id,
    name: job.name,
    status: job.status,
    ...(job.status === "queued" && queuePosition ? { queuePosition } : {}),
    ...(job.result?.verdict ? { verdict: job.result.verdict } : {}),
    ...(job.result ? { summary: job.result.summary } : {}),
    ...(job.error ? { error: job.error } : {}),
    ...(job.webhook ? { webhook: job.webhook } : {}),
    progress: job.progress,
    pagePairs: job.pagePairs.map((page) => ({
      clientPageId: page.clientPageId,
      status: page.status,
      stage: page.stage,
      ...(page.verdict ? { verdict: page.verdict } : {}),
      ...(page.error ? { error: page.error } : {})
    })),
    createdAt: job.createdAt,
    updatedAt: job.updatedAt
  };
}

function isCancelled(job: ReviewJob): boolean {
  return job.status === "cancelled";
}

function jobForTenant(
  jobs: Map<string, ReviewJob>,
  reviewId: string,
  identity: ServiceIdentity
): ReviewJob {
  const job = jobs.get(reviewId);
  if (!job || job.tenantId !== identity.tenantId) {
    throw new ApiFailure(404, "RESOURCE_NOT_FOUND", "Review not found.");
  }
  return job;
}

function structuredResult(job: ReviewJob, evidence: ReviewEvidence, imageRef: (id: string | null) => unknown): Record<string, unknown> {
  if (!job.result || !["succeeded", "failed"].includes(job.status)) {
    throw new ApiFailure(409, "REVIEW_NOT_READY", "The Review result is not available yet.", true);
  }
  if (job.recheck) {
    const page = job.result.pages[0];
    const refs = evidence.pages.get(page.clientPageId);
    const target = page.recheck;
    return {
      schemaVersion: "1.0", mode: "issue_recheck", reviewId: job.id, status: job.status,
      clientPageId: page.clientPageId, pageName: page.pageName,
      pageEvidence: Object.fromEntries((["designImage", "actualImage", "diffImage"] as const).map(key => [key, imageRef(refs?.[key] ?? null)])),
      results: [{ ...(target ?? { ...job.recheck, verdict: "needs_review", reasonCode: "EXECUTION_FAILED", message: "The review could not produce target evidence.", checks: [], evidenceRefs: [], evidence: [] }),
        ...(page.error ? { error: page.error } : {}),
        designCrop: imageRef(refs?.issueCrops.get("recheck")?.designCrop ?? null),
        actualCrop: imageRef(refs?.issueCrops.get("recheck")?.actualCrop ?? null)
      }],
      artifactIds: ["art_excel", ...evidence.artifacts.keys()]
    };
  }
  return {
    schemaVersion: "1.0",
    reviewId: job.id,
    status: job.status,
    verdict: job.result.verdict,
    summary: job.result.summary,
    pageResults: job.result.pages.map((page) => {
      const requestedEvidenceMode = job.requestedEvidenceModes[page.clientPageId];
      const degradationMessage = requestedEvidenceMode === "hybrid" && page.report?.evidenceMode === "screenshot"
        ? page.report.diagnostics.find((diagnostic) => /degrad|降级/i.test(diagnostic))
        : undefined;
      return {
        clientPageId: page.clientPageId,
        pageName: page.pageName,
        status: page.executionStatus,
        ...(requestedEvidenceMode === "hybrid" ? { requestedEvidenceMode } : {}),
        ...(page.verdict ? { verdict: page.verdict } : {}),
        ...(page.error ? { error: page.error } : {}),
        ...(page.report ? {
          evidenceMode: page.report.evidenceMode,
          ...(page.report.longScreenshot ? { longScreenshot: page.report.longScreenshot } : {}),
          ...(degradationMessage ? {
            degradation: {
              code: "HYBRID_ALIGNMENT_INSUFFICIENT",
              message: degradationMessage
            }
          } : {}),
          metrics: {
            stablePixelSimilarity: page.report.summary.stableSimilarity,
            dynamicAreaRatio: page.report.summary.dynamicRegionAreaRatio,
            matchedElements: page.report.summary.matchedElements,
            unmatchedDesignElements: page.report.summary.unmatchedDesignElements,
            unmatchedActualElements: page.report.summary.unmatchedActualElements
          },
          matching: page.report.matching,
          pageEvidence: Object.fromEntries((["designImage", "actualImage", "diffImage"] as const).map(key => [key, imageRef(evidence.pages.get(page.clientPageId)?.[key] ?? null)])),
          issues: page.report.issues.map(issue => ({ ...issue,
            designCrop: imageRef(evidence.pages.get(page.clientPageId)?.issueCrops.get(issue.id)?.designCrop ?? null),
            actualCrop: imageRef(evidence.pages.get(page.clientPageId)?.issueCrops.get(issue.id)?.actualCrop ?? null)
          })),
          ...(page.report.aiAdviceRejection
            ? { aiAdviceRejection: page.report.aiAdviceRejection }
            : {})
        } : {})
      };
    }),
    artifactIds: ["art_excel", ...evidence.artifacts.keys()]
  };
}

export function createPublicApiApp(options: PublicApiOptions): Express {
  const app = express();
  const jobs = new Map<string, ReviewJob>();
  const assets = new Map<string, ScreenshotAsset>();
  const idempotencyRecords = new Map<string, IdempotencyRecord>();
  const admissions = new Map<string, Promise<void>>();
  const now = options.now ?? (() => new Date());
  const signingSecret = options.signingSecret ?? randomUUID();
  const assetUploadTtlMs = options.assetUploadTtlMs ?? 10 * 60 * 1000;
  const artifactDownloadTtlMs = options.artifactDownloadTtlMs ?? 10 * 60 * 1000;
  const evidenceFor = (job: ReviewJob): Promise<ReviewEvidence> => {
    if (!job.result || !["succeeded", "failed"].includes(job.status)) {
      throw new ApiFailure(409, "REVIEW_NOT_READY", "The Review result is not available yet.", true);
    }
    return job.evidence ??= buildReviewEvidence(job.result);
  };
  const imageMetadata = (job: ReviewJob, image: EvidenceImage) => {
    const { buffer: _buffer, ...metadata } = image;
    const expiresAtMs = now().getTime() + artifactDownloadTtlMs;
    return { ...metadata, expiresAt: new Date(expiresAtMs).toISOString(), downloadUrl: signedResourcePath({
      path: `/v1/reviews/${job.id}/artifacts/${image.artifactId}`, purpose: "artifact-download",
      resourceId: `${job.id}:${image.artifactId}`, expiresAtMs, secret: signingSecret
    }) };
  };
  const maxAssetBytes = options.maxAssetBytes ?? 25 * 1024 * 1024;
  const maxImagePixels = options.maxImagePixels ?? 40_000_000;
  const maxConcurrentPages = Math.max(1, Math.floor(options.maxConcurrentPages ?? 3));
  const maxConcurrentReviews = Math.max(1, Math.floor(options.maxConcurrentReviews ?? 5));
  const maxConcurrentPagePairs = Math.max(
    1,
    Math.floor(options.maxConcurrentPagePairs ?? 8)
  );
  const maxQueuedReviews = Math.max(0, Math.floor(options.maxQueuedReviews ?? 100));
  const maxQueuedReviewsPerTenant = Math.max(0, Math.floor(options.maxQueuedReviewsPerTenant ?? 20));
  const maxReviewSubmissionsPerMinute = Math.max(
    1,
    Math.floor(options.maxReviewSubmissionsPerMinute ?? 60)
  );
  const capacityRetryAfterSeconds = Math.max(1, Math.floor(options.capacityRetryAfterSeconds ?? 5));
  const maxConcurrentReviewsPerTenant = Math.max(
    1,
    Math.min(maxConcurrentReviews, Math.floor(options.maxConcurrentReviewsPerTenant ?? 2))
  );
  const maxPages = Math.max(1, Math.floor(options.maxPages ?? 10));
  const reviewTimeoutMs = Math.max(1, Math.floor(options.reviewTimeoutMs ?? 120_000));
  const maxReviewAssetBytes = Math.max(1, Math.floor(options.maxReviewAssetBytes ?? 100 * 1024 * 1024));
  const webhookMaxAttempts = Math.max(1, Math.floor(options.webhookMaxAttempts ?? 4));
  const webhookInitialDelayMs = Math.max(0, Math.floor(options.webhookInitialDelayMs ?? 1_000));
  const networkPolicy = createNetworkAccessPolicy(options);
  const webhookNetworkPolicy = createNetworkAccessPolicy({
    allowedHosts: options.webhookAllowedHosts ?? [],
    lookupHost: options.lookupHost
  });
  const sendWebhook = options.sendWebhook ?? (async (delivery: WebhookDeliveryRequest) => {
    const response = await fetch(delivery.url, {
      method: "POST",
      headers: delivery.headers,
      body: delivery.body,
      redirect: "manual"
    });
    return { status: response.status };
  });
  const sleep = options.sleep ?? ((delayMs: number) => new Promise<void>((resolve) => setTimeout(resolve, delayMs)));
  const reviewQueue = new ReviewExecutionQueue(
    maxConcurrentReviews,
    maxConcurrentReviewsPerTenant,
    maxConcurrentPagePairs
  );
  const submissionRateLimiter = new TenantSubmissionRateLimiter(maxReviewSubmissionsPerMinute);
  const aiAdviceMonitor = new AiAdviceMonitor({
    minAttempts: options.aiAdviceAlertMinAttempts,
    timeoutRatio: options.aiAdviceTimeoutAlertRatio,
    evidenceDanglingRatio: options.aiAdviceEvidenceDanglingAlertRatio,
    now: () => now().getTime()
  });

  const dispatchWebhook = async (job: ReviewJob, eventType: ReviewWebhookEventType): Promise<void> => {
    if (!job.callback || !job.callback.events.includes(eventType) || job.webhook) return;
    const eventId = `evt_${randomUUID().replaceAll("-", "")}`;
    job.webhook = { eventId, status: "delivering", attempts: 0, attemptLog: [] };
    try {
      const secret = await options.resolveWebhookSecret!(job.tenantId, job.callback.secretRef);
      const result = await deliverSignedWebhook({
        url: job.callback.url,
        secret,
        event: {
          eventId,
          eventType,
          occurredAt: now().toISOString(),
          reviewId: job.id,
          status: eventType === "review.completed"
            ? "succeeded"
            : eventType === "review.failed"
              ? "failed"
              : "cancelled",
          ...(job.result?.verdict ? { verdict: job.result.verdict } : {}),
          resultUrl: `/v1/reviews/${job.id}/result`
        },
        maxAttempts: webhookMaxAttempts,
        initialDelayMs: webhookInitialDelayMs,
        now,
        send: sendWebhook,
        sleep,
        beforeAttempt: async () => { await webhookNetworkPolicy.assertUrl(job.callback!.url); },
        onAttempt: (attempt, attemptResult) => {
          if (job.webhook) {
            job.webhook.attempts = attempt;
            job.webhook.attemptLog.push({ attempt, ...attemptResult });
          }
        }
      });
      job.webhook = {
        eventId,
        ...result,
        attemptLog: job.webhook.attemptLog
      };
    } catch (error) {
      job.webhook = {
        eventId,
        status: "failed",
        attempts: job.webhook.attempts,
        attemptLog: job.webhook.attemptLog,
        lastError: error instanceof Error ? error.message : String(error)
      };
    }
    job.updatedAt = now().toISOString();
  };
  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));

  app.post("/v1/assets", (request, response, next) => {
    try {
      const identity = authenticate(request, options, "assets:write");
      const input = requireRecord(request.body, "A JSON request body is required.");
      const filename = typeof input.filename === "string" ? input.filename.trim() : "";
      const contentType = imageContentType(input.contentType);
      const sizeBytes = Number(input.sizeBytes);
      const sha256 = typeof input.sha256 === "string" ? input.sha256.toLowerCase() : "";
      if (
        input.kind !== "actual-screenshot" || !filename || filename.includes("/") || filename.includes("\\") ||
        !contentType || !Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > maxAssetBytes ||
        !/^[a-f0-9]{64}$/.test(sha256)
      ) {
        throw new ApiFailure(400, "INVALID_REQUEST", "Valid screenshot asset metadata is required.");
      }
      const id = `ast_${randomUUID().replaceAll("-", "")}`;
      const createdAt = now();
      const expiresAtMs = createdAt.getTime() + assetUploadTtlMs;
      const asset: ScreenshotAsset = {
        id,
        tenantId: identity.tenantId,
        filename,
        contentType,
        declaredSizeBytes: sizeBytes,
        declaredSha256: sha256,
        status: "awaiting_upload",
        createdAt: createdAt.toISOString(),
        expiresAt: new Date(expiresAtMs).toISOString()
      };
      assets.set(id, asset);
      response.status(201).json({
        schemaVersion: "1.0",
        assetId: id,
        status: asset.status,
        uploadUrl: signedResourcePath({
          path: `/v1/assets/${id}/content`,
          purpose: "asset-upload",
          resourceId: id,
          expiresAtMs,
          secret: signingSecret
        }),
        expiresAt: asset.expiresAt
      });
    } catch (error) {
      next(error);
    }
  });

  app.put(
    "/v1/assets/:assetId/content",
    express.raw({ type: ["image/png", "image/jpeg", "image/webp"], limit: maxAssetBytes }),
    async (request, response, next) => {
      try {
        const asset = assets.get(request.params.assetId);
        if (!asset) throw new ApiFailure(404, "RESOURCE_NOT_FOUND", "Screenshot asset not found.");
        assertSignedResource({
          request,
          purpose: "asset-upload",
          resourceId: asset.id,
          secret: signingSecret,
          nowMs: now().getTime()
        });
        if (asset.status !== "awaiting_upload") {
          throw new ApiFailure(409, "ASSET_NOT_WRITABLE", "The screenshot asset is no longer writable.");
        }
        const body = Buffer.isBuffer(request.body) ? request.body : Buffer.alloc(0);
        const contentType = String(request.header("content-type") ?? "").split(";", 1)[0];
        const sha256 = createHash("sha256").update(body).digest("hex");
        if (
          contentType !== asset.contentType ||
          body.byteLength !== asset.declaredSizeBytes ||
          sha256 !== asset.declaredSha256
        ) {
          asset.status = "rejected";
          asset.error = { code: "UNSUPPORTED_ASSET", message: "Uploaded screenshot metadata does not match its declaration." };
          throw new ApiFailure(422, asset.error.code, asset.error.message);
        }
        let metadata: Metadata;
        try {
          const image = sharp(body, { limitInputPixels: maxImagePixels });
          metadata = await image.metadata();
          await image.clone().ensureAlpha().raw().toBuffer();
        } catch {
          asset.status = "rejected";
          asset.error = { code: "UNSUPPORTED_ASSET", message: "The uploaded screenshot could not be decoded safely." };
          throw new ApiFailure(422, asset.error.code, asset.error.message);
        }
        const expectedFormat = asset.contentType === "image/jpeg" ? "jpeg" : asset.contentType.slice(6);
        const pixels = (metadata.width ?? 0) * (metadata.height ?? 0);
        if (!metadata.width || !metadata.height || metadata.format !== expectedFormat || pixels > maxImagePixels) {
          asset.status = "rejected";
          asset.error = { code: "UNSUPPORTED_ASSET", message: "The uploaded screenshot type or dimensions are not supported." };
          throw new ApiFailure(422, asset.error.code, asset.error.message);
        }
        asset.status = "ready";
        asset.image = Buffer.from(body);
        asset.pixels = { width: metadata.width, height: metadata.height };
        response.json({
          schemaVersion: "1.0",
          assetId: asset.id,
          status: asset.status,
          filename: asset.filename,
          contentType: asset.contentType,
          sizeBytes: body.byteLength,
          sha256,
          pixels: asset.pixels
        });
      } catch (error) {
        next(error);
      }
    }
  );

  app.get("/v1/assets/:assetId", (request, response, next) => {
    try {
      const identity = authenticate(request, options, "assets:write");
      const asset = assets.get(request.params.assetId);
      if (!asset || asset.tenantId !== identity.tenantId) {
        throw new ApiFailure(404, "RESOURCE_NOT_FOUND", "Screenshot asset not found.");
      }
      response.json({
        schemaVersion: "1.0",
        assetId: asset.id,
        status: asset.status,
        filename: asset.filename,
        contentType: asset.contentType,
        sizeBytes: asset.declaredSizeBytes,
        ...(asset.pixels ? { pixels: asset.pixels } : {}),
        ...(asset.error ? { errorCode: asset.error.code, errorMessage: asset.error.message } : {}),
        createdAt: asset.createdAt
      });
    } catch (error) {
      next(error);
    }
  });

  app.post(["/v1/reviews", "/v1/issue-rechecks"], async (request, response, next) => {
    let releaseAdmission: (() => void) | undefined;
    try {
      const identity = authenticate(request, options, "reviews:create");
      const isRecheck = /^\/v1\/issue-rechecks\/?$/i.test(request.path);
      const raw = requireRecord(request.body, "A JSON request body is required.");
      let recheck: IssueRecheckTarget | undefined;
      if (isRecheck) {
        const issue = requireRecord(raw.issue, "A single issue target is required.");
        if (!((typeof issue.issueId === "string" && issue.issueId.trim().length > 0 && issue.issueId.length <= 200) ||
          (typeof issue.issueId === "number" && Number.isSafeInteger(issue.issueId))) ||
          typeof issue.rule !== "string" || !issue.rule.trim() || issue.rule.length > 100 ||
          typeof issue.figmaNodeId !== "string" || !issue.figmaNodeId.trim() || issue.figmaNodeId.length > 200 ||
          ["property", "selector"].some(key => issue[key] !== undefined && (typeof issue[key] !== "string" || !(issue[key] as string).trim() || (issue[key] as string).length > 1024))) {
          throw new ApiFailure(400, "INVALID_REQUEST", "issueId, rule and figmaNodeId are required; property and selector must be bounded strings.");
        }
        recheck = { issueId: issue.issueId as string | number, rule: issue.rule.trim(), figmaNodeId: issue.figmaNodeId.trim(),
          ...(typeof issue.property === "string" ? { property: issue.property.trim() } : {}),
          ...(typeof issue.selector === "string" ? { selector: issue.selector.trim() } : {}) };
      }
      const createBody = isRecheck ? { ...raw, pagePairs: [requireRecord(raw.pagePair, "A pagePair is required.")] } : raw;
      const idempotencyKey = request.header("idempotency-key")?.trim();
      if (idempotencyKey && idempotencyKey.length > 200) {
        throw new ApiFailure(400, "INVALID_REQUEST", "Idempotency-Key must not exceed 200 characters.");
      }
      const requestHash = createHash("sha256").update(canonicalJson({ operation: isRecheck ? "/v1/issue-rechecks" : "/v1/reviews", body: request.body })).digest("hex");
      const idempotencyId = idempotencyKey ? `${identity.tenantId}\n${idempotencyKey}` : undefined;
      if (idempotencyId) {
        // Credential/DNS resolution yields before the record is created. Serialize
        // admission for this tenant/key so concurrent retries cannot start twice.
        while (admissions.has(idempotencyId)) await admissions.get(idempotencyId);
        let release!: () => void;
        admissions.set(idempotencyId, new Promise<void>(resolve => { release = resolve; }));
        releaseAdmission = () => { admissions.delete(idempotencyId); release(); };
      }
      const prior = idempotencyId ? idempotencyRecords.get(idempotencyId) : undefined;
      if (prior) {
        if (prior.requestHash !== requestHash) {
          throw new ApiFailure(
            409,
            "IDEMPOTENCY_CONFLICT",
            "The Idempotency-Key was already used with different request content."
          );
        }
        response
          .status(202)
          .location(`/v1/reviews/${prior.job.id}`)
          .set("idempotency-replayed", "true")
          .json(reviewAcceptedPayload(prior.job));
        return;
      }
      const requestRecord = createBody;
      const requestedPages = Array.isArray(requestRecord.pagePairs) ? requestRecord.pagePairs.length : 0;
      if (requestedPages > maxPages) {
        throw new ApiFailure(
          413,
          "REVIEW_QUOTA_EXCEEDED",
          `A Review may contain at most ${maxPages} PagePairs.`
        );
      }
      const rateLimitRetryAfterSeconds = submissionRateLimiter.accept(
        identity.tenantId,
        now().getTime()
      );
      if (rateLimitRetryAfterSeconds) {
        throw new ApiFailure(
          429,
          "REVIEW_RATE_LIMITED",
          "The tenant Review submission rate limit was exceeded.",
          true,
          { retryAfterSeconds: rateLimitRetryAfterSeconds }
        );
      }
      const callback = await parseWebhookCallback(request.body, options, webhookNetworkPolicy);
      const input = await translateCreateRequest(createBody, identity, options, networkPolicy, assets);
      if (recheck) input.pagePairs[0].recheck = recheck;
      const referencedAssetBytes = input.pagePairs.reduce((total, page) =>
        page.actual.kind === "screenshot" || page.actual.kind === "hybrid"
          ? total + page.actual.screenshots.reduce((sum, screenshot) => sum + screenshot.image.byteLength, 0)
          : page.actual.kind === "long_screenshot"
            ? total + page.actual.screenshot.image.byteLength
          : total,
      0);
      if (referencedAssetBytes > maxReviewAssetBytes) {
        throw new ApiFailure(
          413,
          "REVIEW_QUOTA_EXCEEDED",
          `Referenced screenshot assets may total at most ${maxReviewAssetBytes} bytes.`
        );
      }
      const capacityScope = reviewQueue.capacityExceeded(
        identity.tenantId,
        maxQueuedReviews,
        maxQueuedReviewsPerTenant
      );
      if (capacityScope) {
        throw new ApiFailure(
          429,
          "REVIEW_CAPACITY_EXCEEDED",
          "The Review execution queue is full. Retry after the requested delay.",
          true,
          { retryAfterSeconds: capacityRetryAfterSeconds, scope: capacityScope }
        );
      }
      const id = `rev_${randomUUID().replaceAll("-", "")}`;
      const requestId = request.header("x-request-id")?.trim() || `req_${randomUUID().replaceAll("-", "")}`;
      const createdAt = now().toISOString();
      const job: ReviewJob = {
        ...(recheck ? { recheck } : {}),
        id,
        tenantId: identity.tenantId,
        name: input.reviewName,
        status: "queued",
        createdAt,
        updatedAt: createdAt,
        requestId,
        requestedEvidenceModes: Object.fromEntries(
          input.pagePairs.map((page) => [page.clientPageId, page.actual.kind])
        ),
        progress: {
          totalPages: input.pagePairs.length,
          completedPages: 0,
          currentStage: "queued"
        },
        pagePairs: input.pagePairs.map((page) => ({
          clientPageId: page.clientPageId,
          status: "queued",
          stage: "queued"
        })),
        abortController: new AbortController(),
        ...(callback ? { callback } : {})
      };
      jobs.set(id, job);
      if (idempotencyId) idempotencyRecords.set(idempotencyId, { requestHash, job });
      reviewQueue.enqueue(
        job,
        Math.max(1, Math.min(input.pagePairs.length, maxConcurrentPages)),
        async (grantedPageConcurrency) => {
        if (isCancelled(job)) return;
        job.status = "running";
        job.progress.currentStage = "review";
        job.updatedAt = now().toISOString();
        try {
          const execution = options.executeReview(input, {
            maxConcurrency: grantedPageConcurrency,
            signal: job.abortController.signal,
            onPageUpdate: (update) => {
              if (job.status !== "running") return;
              const index = job.pagePairs.findIndex((page) => page.clientPageId === update.clientPageId);
              if (index >= 0) job.pagePairs[index] = update;
              job.progress.completedPages = job.pagePairs.filter((page) =>
                page.status === "succeeded" || page.status === "failed" || page.status === "cancelled"
              ).length;
              job.progress.currentStage = update.stage;
              job.updatedAt = now().toISOString();
            }
          });
          let timeout: ReturnType<typeof setTimeout> | undefined;
          let rejectCancellation: ((error: ApiFailure) => void) | undefined;
          const cancellation = new Promise<never>((_resolve, reject) => {
            rejectCancellation = reject;
          });
          const onAbort = () => rejectCancellation?.(
            new ApiFailure(409, "REVIEW_CANCELLED", "The Review was cancelled.")
          );
          job.abortController.signal.addEventListener("abort", onAbort, { once: true });
          try {
            job.result = await Promise.race([
              execution,
              cancellation,
              new Promise<never>((_resolve, reject) => {
                timeout = setTimeout(() => {
                  reject(new ApiFailure(504, "REVIEW_TIMEOUT", "The Review exceeded its total runtime limit.", true));
                  job.abortController.abort();
                }, reviewTimeoutMs);
              })
            ]);
          } finally {
            if (timeout) clearTimeout(timeout);
            job.abortController.signal.removeEventListener("abort", onAbort);
          }
          if (!isCancelled(job)) {
            job.status = job.result.executionStatus;
            job.pagePairs = job.result.pages.map((page) => ({
              clientPageId: page.clientPageId,
              status: page.executionStatus,
              stage: "complete",
              ...(page.verdict ? { verdict: page.verdict } : {}),
              ...(page.error ? { error: page.error } : {})
            }));
            job.progress.completedPages = job.pagePairs.length;
            job.progress.currentStage = "complete";
            aiAdviceMonitor.recordBatch(job.tenantId, job.result);
            if (job.status === "failed") {
              const pageError = job.result.pages.find((page) => page.error)?.error;
              job.error = {
                code: pageError?.code ?? "INTERNAL_ERROR",
                message: pageError?.message ?? "The Review execution failed.",
                retryable: pageError?.retryable ?? true,
                requestId: job.requestId
              };
            }
          }
        } catch (error) {
          if (!isCancelled(job)) {
            job.status = "failed";
            const failure = error instanceof ApiFailure
              ? error
              : new ApiFailure(500, "INTERNAL_ERROR", error instanceof Error ? error.message : String(error), true);
            job.error = {
              code: failure.code,
              message: failure.message,
              retryable: failure.retryable,
              requestId: job.requestId
            };
            job.progress.currentStage = "failed";
            job.pagePairs = job.pagePairs.map((page) =>
              page.status === "succeeded" || page.status === "failed"
                ? page
                : {
                    ...page,
                    status: "failed",
                    stage: "failed",
                    error: {
                      code: failure.code,
                      message: failure.message,
                      retryable: failure.retryable
                    }
                  }
            );
            job.progress.completedPages = job.pagePairs.length;
          }
        }
        job.updatedAt = now().toISOString();
        if (!isCancelled(job)) {
          await dispatchWebhook(job, job.status === "succeeded" ? "review.completed" : "review.failed");
        }
        }
      );
      response
        .status(202)
        .location(`/v1/reviews/${id}`)
        .set("x-request-id", requestId)
        .json(reviewAcceptedPayload(job));
    } catch (error) {
      next(error);
    } finally {
      releaseAdmission?.();
    }
  });

  app.get("/v1/metrics", (request, response, next) => {
    try {
      const identity = authenticate(request, options, "metrics:read");
      response
        .set("content-type", "text/plain; version=0.0.4; charset=utf-8")
        .send(aiAdviceMonitor.prometheus(identity.tenantId));
    } catch (error) {
      next(error);
    }
  });

  app.get("/v1/reviews/:reviewId", (request, response, next) => {
    try {
      const identity = authenticate(request, options, "reviews:read");
      const job = jobForTenant(jobs, request.params.reviewId, identity);
      response.json(publicJob(job, reviewQueue.position(job.id)));
    } catch (error) {
      next(error);
    }
  });

  app.get("/v1/reviews/:reviewId/result", async (request, response, next) => {
    try {
      const identity = authenticate(request, options, "reviews:read");
      const job = jobForTenant(jobs, request.params.reviewId, identity);
      const evidence = await evidenceFor(job);
      response.json(structuredResult(job, evidence, id => id && evidence.artifacts.has(id) ? imageMetadata(job, evidence.artifacts.get(id)!) : null));
    } catch (error) {
      next(error);
    }
  });

  app.get("/v1/reviews/:reviewId/artifacts", async (request, response, next) => {
    try {
      const identity = authenticate(request, options, "reviews:read");
      const job = jobForTenant(jobs, request.params.reviewId, identity);
      if (!job.result || !["succeeded", "failed"].includes(job.status)) {
        throw new ApiFailure(409, "REVIEW_NOT_READY", "Review artifacts are not available yet.", true);
      }
      const artifact = job.result.excel;
      const evidence = await evidenceFor(job);
      const expiresAtMs = now().getTime() + artifactDownloadTtlMs;
      response.json({
        schemaVersion: "1.0",
        artifacts: [{
          artifactId: "art_excel",
          kind: artifact.kind,
          filename: artifact.filename,
          contentType: artifact.contentType,
          sizeBytes: artifact.buffer.byteLength,
          downloadUrl: signedResourcePath({
            path: `/v1/reviews/${job.id}/artifacts/art_excel`,
            purpose: "artifact-download",
            resourceId: `${job.id}:art_excel`,
            expiresAtMs,
            secret: signingSecret
          }),
          expiresAt: new Date(expiresAtMs).toISOString()
        }, ...[...evidence.artifacts.values()].map(image => imageMetadata(job, image))]
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/v1/reviews/:reviewId/artifacts/:artifactId", async (request, response, next) => {
    try {
      let job: ReviewJob;
      if (request.query.signature || request.query.expires) {
        assertSignedResource({
          request,
          purpose: "artifact-download",
          resourceId: `${request.params.reviewId}:${request.params.artifactId}`,
          secret: signingSecret,
          nowMs: now().getTime()
        });
        const signedJob = jobs.get(request.params.reviewId);
        if (!signedJob) throw new ApiFailure(404, "RESOURCE_NOT_FOUND", "Artifact not found.");
        job = signedJob;
      } else {
        const identity = authenticate(request, options, "reviews:read");
        job = jobForTenant(jobs, request.params.reviewId, identity);
      }
      if (
        !job.result ||
        !["succeeded", "failed"].includes(job.status)
      ) {
        throw new ApiFailure(404, "RESOURCE_NOT_FOUND", "Artifact not found.");
      }
      const artifact = request.params.artifactId === "art_excel" ? job.result.excel
        : (await evidenceFor(job)).artifacts.get(request.params.artifactId);
      if (!artifact) throw new ApiFailure(404, "RESOURCE_NOT_FOUND", "Artifact not found.");
      response
        .type(artifact.contentType)
        .set("content-disposition", `attachment; filename*=UTF-8''${encodeURIComponent(artifact.filename)}`)
        .send(artifact.buffer);
    } catch (error) {
      next(error);
    }
  });

  app.post("/v1/reviews/:reviewId/cancel", (request, response, next) => {
    try {
      const identity = authenticate(request, options, "reviews:cancel");
      const job = jobForTenant(jobs, request.params.reviewId, identity);
      if (!["queued", "running"].includes(job.status)) {
        throw new ApiFailure(409, "REVIEW_NOT_CANCELLABLE", "The Review is already terminal.");
      }
      job.status = "cancelled";
      reviewQueue.remove(job.id);
      job.abortController.abort();
      job.progress.currentStage = "cancelled";
      job.pagePairs = job.pagePairs.map((page) =>
        page.status === "succeeded" || page.status === "failed"
          ? page
          : { ...page, status: "cancelled", stage: "cancelled" }
      );
      job.progress.completedPages = job.pagePairs.filter((page) =>
        page.status === "succeeded" || page.status === "failed" || page.status === "cancelled"
      ).length;
      job.updatedAt = now().toISOString();
      response.json(publicJob(job));
      void dispatchWebhook(job, "review.cancelled");
    } catch (error) {
      next(error);
    }
  });

  app.use((error: unknown, request: Request, response: Response, _next: unknown) => {
    const requestId = request.header("x-request-id")?.trim() || `req_${randomUUID().replaceAll("-", "")}`;
    const failure = error instanceof ApiFailure
      ? error
      : new ApiFailure(500, "INTERNAL_ERROR", "The service could not process the request.", true);
    const payload: PublicApiError = {
      code: failure.code,
      message: failure.message,
      retryable: failure.retryable,
      requestId,
      ...(failure.details ? { details: failure.details } : {})
    };
    if (failure.status === 429) {
      const retryAfterSeconds = failure.details?.retryAfterSeconds;
      response.set(
        "retry-after",
        String(typeof retryAfterSeconds === "number" ? retryAfterSeconds : capacityRetryAfterSeconds)
      );
    }
    response.status(failure.status).set("x-request-id", requestId).json({ error: payload });
  });
  return app;
}
