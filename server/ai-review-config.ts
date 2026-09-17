import type { AiReviewOptions } from "./review";

export function aiDefaultsFromEnvironment(
  environment: Record<string, string | undefined>,
): AiReviewOptions | undefined {
  const apiKey = environment.OPENAI_API_KEY?.trim();
  const apiUrl = environment.OPENAI_BASE_URL?.trim();
  const model = environment.OPENAI_MODEL?.trim();
  const enabledValue = environment.DIFFLAB_AI_ENABLED?.trim().toLowerCase();
  if (enabledValue && !["true", "false"].includes(enabledValue)) {
    throw new Error("DIFFLAB_AI_ENABLED must be true or false.");
  }
  const hasCustomEndpoint = Boolean(
    apiUrl && !/^https:\/\/api\.openai\.com\/v1\/?$/i.test(apiUrl),
  );
  const autoEnabled = Boolean(apiKey || hasCustomEndpoint);
  if (!autoEnabled && !enabledValue) return undefined;

  return {
    requested: enabledValue ? enabledValue === "true" : autoEnabled,
    ...(apiKey ? { apiKey } : {}),
    ...(apiUrl ? { apiUrl } : {}),
    ...(model ? { model } : {}),
  };
}
