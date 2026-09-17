import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { AiReviewOptions } from "./review";

export interface ReviewMcpServerOptions {
  apiBaseUrl: string;
  serviceToken: string;
  fetch?: typeof globalThis.fetch;
  defaultAi?: AiReviewOptions;
}

type JsonObject = Record<string, unknown>;

const aiInput = z.object({
  requested: z.boolean().optional(),
  apiKey: z.string().optional(),
  apiUrl: z.string().optional(),
  model: z.string().optional(),
});

const createReviewInput = z.object({
  request: z.record(z.string(), z.unknown()),
  ai: aiInput.optional(),
  idempotencyKey: z.string().max(200).optional(),
});

const reviewIdInput = z.object({
  reviewId: z.string().min(1),
});

function apiUrl(baseUrl: string, path: string): URL {
  return new URL(path, `${baseUrl.replace(/\/$/, "")}/`);
}

function requestWithAiDefaults(
  request: JsonObject,
  defaults: AiReviewOptions | undefined,
  supplied: AiReviewOptions | undefined,
): JsonObject {
  const embedded = request.ai;
  const embeddedAi = embedded && typeof embedded === "object" && !Array.isArray(embedded)
    ? embedded as JsonObject
    : {};
  if (!defaults && !supplied && !Object.keys(embeddedAi).length) return request;
  return {
    ...request,
    ai: { ...defaults, ...embeddedAi, ...supplied },
  };
}

async function readJson(response: Response): Promise<JsonObject> {
  const value: unknown = await response.json();
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Public review API returned a non-object JSON response");
  }
  return value as JsonObject;
}

export function createReviewMcpServer(options: ReviewMcpServerOptions): McpServer {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const server = new McpServer({
    name: "difflab-review",
    version: "1.0.0",
  });

  const callPublicApi = async (
    path: string,
    init: RequestInit = {},
  ): Promise<{
    content: [{ type: "text"; text: string }];
    structuredContent: JsonObject;
    isError?: true;
  }> => {
    const response = await fetchImpl(apiUrl(options.apiBaseUrl, path), {
      ...init,
      headers: {
        authorization: `Bearer ${options.serviceToken}`,
        ...init.headers,
      },
    });
    const payload = await readJson(response);
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
      ...(response.ok ? {} : { isError: true as const }),
    };
  };

  server.registerTool(
    "review.create",
    {
      title: "Create UI review",
      description: "Create an asynchronous UI review, optionally overriding local AI defaults.",
      inputSchema: createReviewInput,
      annotations: {
        readOnlyHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ request, ai, idempotencyKey }) => {
      return callPublicApi("/v1/reviews", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}),
        },
        body: JSON.stringify(requestWithAiDefaults(request, options.defaultAi, ai)),
      });
    },
  );

  server.registerTool(
    "review.get",
    {
      title: "Get UI review status",
      description: "Get execution status, acceptance verdict, and progress for a Review.",
      inputSchema: reviewIdInput,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ reviewId }) => callPublicApi(`/v1/reviews/${encodeURIComponent(reviewId)}`),
  );

  server.registerTool(
    "review.get_result",
    {
      title: "Get UI review result",
      description: "Get the completed Review verdict, findings, metrics, and artifact identifiers.",
      inputSchema: reviewIdInput,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ reviewId }) => callPublicApi(
      `/v1/reviews/${encodeURIComponent(reviewId)}/result`,
    ),
  );

  server.registerTool(
    "review.list_artifacts",
    {
      title: "List UI review artifacts",
      description: "List report artifacts and their short-lived signed download URLs.",
      inputSchema: reviewIdInput,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ reviewId }) => callPublicApi(
      `/v1/reviews/${encodeURIComponent(reviewId)}/artifacts`,
    ),
  );

  return server;
}
