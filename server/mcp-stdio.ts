import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createReviewMcpServer } from "./mcp";
import { aiDefaultsFromEnvironment } from "./ai-review-config";

const apiBaseUrl = process.env.DIFFLAB_API_BASE_URL?.trim();
const serviceToken = process.env.DIFFLAB_SERVICE_TOKEN?.trim();

if (!apiBaseUrl || !serviceToken) {
  console.error("DIFFLAB_API_BASE_URL and DIFFLAB_SERVICE_TOKEN are required.");
  process.exitCode = 1;
} else {
  const parsedUrl = new URL(apiBaseUrl);
  if (!new Set(["http:", "https:"]).has(parsedUrl.protocol)) {
    throw new Error("DIFFLAB_API_BASE_URL must use HTTP or HTTPS.");
  }

  serveStdio(
    () => createReviewMcpServer({
      apiBaseUrl: parsedUrl.toString(),
      serviceToken,
      defaultAi: aiDefaultsFromEnvironment(process.env),
    }),
    {
      onerror: (error) => console.error(`MCP transport error: ${error.message}`),
    },
  );
}
