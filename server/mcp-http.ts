import {
  createMcpExpressApp,
  requireBearerAuth,
  type OAuthTokenVerifier,
} from "@modelcontextprotocol/express";
import { toNodeHandler } from "@modelcontextprotocol/node";
import {
  createMcpHandler,
  OAuthError,
  OAuthErrorCode,
} from "@modelcontextprotocol/server";
import type { Express } from "express";
import type { AiReviewOptions } from "./review";
import { createReviewMcpServer } from "./mcp";
import type { ServiceIdentity } from "./public-api";

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];
// The current public API service-token registry has no expiry field, while the
// SDK's bearer verifier requires one. Year 9999 preserves that existing policy.
const STATIC_SERVICE_TOKEN_EXPIRES_AT = 253_402_300_799;

export interface ReviewMcpHttpEndpointOptions {
  apiBaseUrl: string;
  serviceTokens: Record<string, ServiceIdentity>;
  fetch?: typeof globalThis.fetch;
  defaultAi?: AiReviewOptions;
  host?: string;
  allowedHosts?: string[];
  allowedOrigins?: string[];
  onerror?: (error: Error) => void;
}

export interface ReviewMcpHttpEndpoint {
  middleware: Express;
  close: () => Promise<void>;
}

function serviceTokenVerifier(
  serviceTokens: Record<string, ServiceIdentity>,
): OAuthTokenVerifier {
  return {
    async verifyAccessToken(token) {
      const identity = serviceTokens[token];
      if (!identity) {
        throw new OAuthError(OAuthErrorCode.InvalidToken, "Invalid service token.");
      }
      return {
        token,
        clientId: identity.tenantId,
        scopes: [...identity.scopes],
        expiresAt: STATIC_SERVICE_TOKEN_EXPIRES_AT,
      };
    },
  };
}

export function createReviewMcpHttpEndpoint(
  options: ReviewMcpHttpEndpointOptions,
): ReviewMcpHttpEndpoint {
  const allowedHosts = options.allowedHosts?.length
    ? options.allowedHosts
    : LOCAL_HOSTS;
  const allowedOrigins = options.allowedOrigins?.length
    ? options.allowedOrigins
    : allowedHosts;
  const handler = createMcpHandler(({ authInfo }) => {
    if (!authInfo) {
      throw new OAuthError(OAuthErrorCode.InvalidToken, "Missing authenticated service identity.");
    }
    return createReviewMcpServer({
      apiBaseUrl: options.apiBaseUrl,
      serviceToken: authInfo.token,
      fetch: options.fetch,
      defaultAi: options.defaultAi,
    });
  }, {
    onerror: options.onerror,
  });
  const nodeHandler = toNodeHandler(handler, { onerror: options.onerror });
  const middleware = createMcpExpressApp({
    host: options.host ?? "127.0.0.1",
    allowedHosts,
    allowedOrigins,
    jsonLimit: "1mb",
  });
  middleware.disable("x-powered-by");
  const authenticate = requireBearerAuth({
    verifier: serviceTokenVerifier(options.serviceTokens),
  });

  middleware.all("/", authenticate, (request, response) => {
    void nodeHandler(request, response, request.body);
  });

  return {
    middleware,
    close: () => handler.close(),
  };
}
