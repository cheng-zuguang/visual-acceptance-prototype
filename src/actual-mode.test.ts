import assert from "node:assert/strict";
import test from "node:test";
import { canContinueWithActualEvidence } from "./actual-mode";

test("requires only the ActualEvidence inputs selected by the user", () => {
  assert.equal(canContinueWithActualEvidence("live", "https://h5.test", 0), true);
  assert.equal(canContinueWithActualEvidence("live", "", 1), false);
  assert.equal(canContinueWithActualEvidence("screenshot", "", 1), true);
  assert.equal(canContinueWithActualEvidence("screenshot", "https://h5.test", 0), false);
  assert.equal(canContinueWithActualEvidence("hybrid", "https://h5.test", 1), true);
  assert.equal(canContinueWithActualEvidence("hybrid", "", 1), false);
  assert.equal(canContinueWithActualEvidence("hybrid", "https://h5.test", 0), false);
  assert.equal(canContinueWithActualEvidence("long_screenshot", "", 1), true);
  assert.equal(canContinueWithActualEvidence("long_screenshot", "https://h5.test", 1), true);
  assert.equal(canContinueWithActualEvidence("long_screenshot", "", 2), false);
});
