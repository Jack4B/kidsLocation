// The real main.js on a phone set to English: a fresh install still opens in
// Polish, and numbers, distances and clock times follow Polish conventions.
import test from "node:test";
import assert from "node:assert/strict";

import { installDom, loadApp } from "./dom-harness.mjs";

Object.defineProperty(globalThis.navigator, "language", { value: "en-US", configurable: true });
Object.defineProperty(globalThis.navigator, "languages", { value: ["en-US", "en"], configurable: true });

const harness = installDom();
globalThis.indexedDB ??= {
  open() {
    throw new Error("no indexeddb in the harness");
  },
  deleteDatabase() {
    const req = {};
    setTimeout(() => req.onsuccess?.(), 0);
    return req;
  },
};
const { internals } = await loadApp(harness, { lang: "pl" });
const { t, currentLocale } = await import("../app/js/i18n.js");
const fmt = await import("../app/js/fmt.js");

test.after(() => harness.stopTimers());

test("a fresh install boots in Polish on an English phone", () => {
  assert.equal(internals.state.settings.lang, "pl");
  assert.equal(currentLocale(), "pl");
  assert.equal(globalThis.document.documentElement.lang, "pl");
  assert.equal(t("Start sharing"), "Zacznij udostępniać");
  assert.equal(t("Settings"), "Ustawienia");
});

test("Polish formatting: 24-hour clock, decimal comma, metric", () => {
  fmt.setUnits("metric");
  assert.equal(fmt.fmtDistance(1234), "1,2 km");
  assert.equal(fmt.fmtDistance(250), "250 m");
  const at = new Date(2026, 0, 5, 14, 7).getTime();
  assert.equal(fmt.fmtClock(at), "14:07");
  assert.equal(fmt.fmtRelTime(5000), "teraz");
  assert.equal(fmt.resolveUnits("auto", "pl-PL"), "metric");
});
