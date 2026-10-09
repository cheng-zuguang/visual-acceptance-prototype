import { useI18n } from "./i18n";

export interface AdviceSettingsValue {
  provider: "default" | "openai" | "jev";
  apiKey: string;
  model: string;
}

export const emptyAdviceSettings: AdviceSettingsValue = { provider: "default", apiKey: "", model: "" };

export function adviceRequestFields(value: AdviceSettingsValue, enabled: boolean): Record<string, string> {
  if (!enabled) return {};
  return {
    adviceProvider: value.provider,
    ...(value.provider === "jev" ? { jevApiKey: value.apiKey.trim(), jevModel: value.model.trim() } : {})
  };
}

export function AdviceSettings({ value, onChange, enabled }: {
  value: AdviceSettingsValue;
  onChange: (value: AdviceSettingsValue) => void;
  enabled: boolean;
}) {
  const { t } = useI18n();
  return (
    <fieldset className="advice-settings" disabled={!enabled}>
      <legend>{t("credentials.advice.title")}</legend>
      <label className="field" htmlFor="advice-provider">
        <span>{t("credentials.advice.provider")}</span>
        <select id="advice-provider" name="adviceProvider" value={value.provider}
          aria-describedby="advice-provider-help"
          onChange={event => onChange({ ...value, provider: event.target.value as AdviceSettingsValue["provider"] })}>
          <option value="default">{t("credentials.advice.default")}</option>
          <option value="openai">{t("credentials.advice.openai")}</option>
          <option value="jev">{t("credentials.advice.jev")}</option>
        </select>
      </label>
      <p id="advice-provider-help">{t("credentials.advice.help")}</p>
      {value.provider === "jev" && <>
        <label className="field" htmlFor="jev-api-key">
          <span>TypeSafe API Key</span>
          <div className="input-shell"><input id="jev-api-key" name="jevApiKey" type="password"
            autoComplete="off" spellCheck={false} maxLength={4096} value={value.apiKey}
            aria-describedby="jev-key-help" placeholder={t("credentials.advice.keyPlaceholder")}
            onChange={event => onChange({ ...value, apiKey: event.target.value })} /></div>
          <small id="jev-key-help">{t("credentials.advice.keyHelp")}</small>
        </label>
        <label className="field" htmlFor="jev-model">
          <span>{t("credentials.advice.model")}</span>
          <div className="input-shell"><input id="jev-model" name="jevModel" type="text"
            autoComplete="off" spellCheck={false} maxLength={4096} value={value.model}
            placeholder={t("credentials.advice.modelPlaceholder")}
            onChange={event => onChange({ ...value, model: event.target.value })} /></div>
        </label>
      </>}
    </fieldset>
  );
}
