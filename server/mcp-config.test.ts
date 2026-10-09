import assert from "node:assert/strict";
import test from "node:test";
import { aiDefaultsFromEnvironment } from "./ai-review-config";

test("builds enabled MCP AI defaults from local environment variables", () => {
  assert.deepEqual(aiDefaultsFromEnvironment({
    OPENAI_API_KEY: " local-key ",
    OPENAI_BASE_URL: " http://127.0.0.1:11434/v1 ",
    OPENAI_MODEL: " local-vision-model "
  }), {
    requested: true,
    apiKey: "local-key",
    apiUrl: "http://127.0.0.1:11434/v1",
    model: "local-vision-model"
  });
});

test("does not auto-enable AI for the keyless official default endpoint", () => {
  assert.equal(aiDefaultsFromEnvironment({
    OPENAI_BASE_URL: "https://api.openai.com/v1",
    OPENAI_MODEL: "gpt-5.6-terra"
  }), undefined);
});

test("honors an explicit local AI disable switch", () => {
  assert.deepEqual(aiDefaultsFromEnvironment({
    DIFFLAB_AI_ENABLED: "false",
    OPENAI_API_KEY: "local-key",
    OPENAI_MODEL: "local-model"
  }), {
    requested: false,
    apiKey: "local-key",
    model: "local-model"
  });
});


test("Jev can enable shared defaults without placing its credential into caller options", () => {
  assert.deepEqual(aiDefaultsFromEnvironment({ DIFFLAB_AI_ADVICE_PROVIDER: "jev", TYPESAFE_API_KEY: "secret" }), { requested: true });
  assert.deepEqual(aiDefaultsFromEnvironment({ DIFFLAB_AI_ADVICE_PROVIDER: "jev", TYPESAFE_API_KEY: "secret", DIFFLAB_AI_ENABLED: "false" }), { requested: false });
  assert.throws(() => aiDefaultsFromEnvironment({ DIFFLAB_AI_ADVICE_PROVIDER: "unknown" }), /must be openai or jev/);
});
