import { normalizeLocale, type Locale } from "../src/locale";

export type { Locale };

export function requestLocale(value: unknown): Locale {
  return normalizeLocale(value);
}

export function localText(locale: Locale, zhCN: string, en: string): string {
  return locale === "en" ? en : zhCN;
}

