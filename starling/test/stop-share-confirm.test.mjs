// Turning sharing off asks first, and child mode asks for the PIN instead.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const main = readFileSync(new URL("../app/js/main.js", import.meta.url), "utf8");
const ui = readFileSync(new URL("../app/js/ui.js", import.meta.url), "utf8");

test("stopping a share without child mode asks for confirmation", () => {
  assert.match(main, /if \(state\.sharing && !shareGuard && !state\.demo && !\(await ui\.confirmStopSharing\(\)\)\) return;/);
});

test("the confirmation resolves false when closed without an answer", () => {
  const at = ui.indexOf("export function confirmStopSharing()");
  assert.ok(at >= 0);
  const body = ui.slice(at, at + 1200);
  assert.match(body, /if \(!answered\) resolve\(false\);/);
  assert.match(body, /stop-share-go/);
  assert.match(body, /stop-share-cancel/);
});

test("settings fold the technical groups and the members sheet folds the safety numbers", () => {
  assert.match(ui, /const ADVANCED = \["Keys and history", "App lock", "Advanced", "Your data", "Danger zone"\];/);
  assert.match(ui, /if \(ADVANCED\.includes\(FOCUS_GROUPS\[focus\]\)\) showAdvanced\(\);/);
  assert.match(ui, /keysBox\.append\(intro, you, ledger\);/);
});
