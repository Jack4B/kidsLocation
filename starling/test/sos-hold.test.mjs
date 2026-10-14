// A long press on the SOS label must arm the hold, not select the word and
// open the text menu (#29).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { installDom } from "./dom-harness.mjs";

const harness = installDom({ interactive: true });
const ui = await import("../app/js/ui.js");
test.after(() => harness.stopTimers());

const css = readFileSync(new URL("../app/css/app.css", import.meta.url), "utf8");
const rule = css.match(/\.qbtn-sos \{([^}]*)\}/)[1];

test("the SOS control cannot be selected or call out", () => {
  assert.match(rule, /-webkit-user-select:\s*none/);
  assert.match(rule, /(^|[\s;])user-select:\s*none/);
  assert.match(rule, /-webkit-touch-callout:\s*none/);
  assert.match(rule, /touch-action:\s*none/);
});

test("a contextmenu from the label is cancelled", () => {
  const btn = harness.makeEl("button");
  ui.holdToFire(btn, { onFire() {} });
  const ev = { type: "contextmenu", defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
  btn.dispatchEvent(ev);
  assert.equal(ev.defaultPrevented, true);
});

test("a press that starts on the label arms like one on the border", () => {
  const btn = harness.makeEl("button");
  ui.holdToFire(btn, { onFire() {} });
  btn.dispatchEvent({ type: "pointerdown", button: 0, target: harness.makeEl("span") });
  assert.equal(btn.classList.contains("arming"), true);
});

test("a finger that slides off the start point disarms the hold", () => {
  const btn = harness.makeEl("button");
  ui.holdToFire(btn, { onFire() {} });
  btn.dispatchEvent({ type: "pointerdown", button: 0, clientX: 100, clientY: 100 });
  btn.dispatchEvent({ type: "pointermove", clientX: 104, clientY: 106 });
  assert.equal(btn.classList.contains("arming"), true, "small jitter keeps the hold");
  btn.dispatchEvent({ type: "pointermove", clientX: 100, clientY: 140 });
  assert.equal(btn.classList.contains("arming"), false, "a drag cancels it");
});
