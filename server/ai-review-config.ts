import type { AiReviewOptions } from "./review";

export function adviceProviderFromEnvironment(environment: Record<string, string | undefined>): "openai" | "jev" {
  const provider = environment.DIFFLAB_AI_ADVICE_PROVIDER?.trim() || "openai";
  if (provider !== "openai" && provider !== "jev") throw new Error("DIFFLAB_AI_ADVICE_PROVIDER must be openai or jev.");
  return provider;
}

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
  const provider = adviceProviderFromEnvironment(environment);
  const autoEnabled = Boolean(apiKey || hasCustomEndpoint || (provider === "jev" && environment.TYPESAFE_API_KEY?.trim()));
  if (!autoEnabled && !enabledValue) return undefined;

  return {
    requested: enabledValue ? enabledValue === "true" : autoEnabled,
    ...(apiKey ? { apiKey } : {}),
    ...(apiUrl ? { apiUrl } : {}),
    ...(model ? { model } : {}),
  };
}
