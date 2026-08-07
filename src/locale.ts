export type Locale = "zh-CN" | "en";

export function normalizeLocale(value: unknown): Locale {
  return typeof value === "string" && value.toLowerCase().startsWith("en") ? "en" : "zh-CN";
}

