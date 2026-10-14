// The fix gate: which of GPS, network and probe fixes becomes the pin.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { createFixGate, HOLD_MS, UNKNOWN_ACC_M } from "../app/js/fixgate.js";
import { haversineMeters } from "../app/js/fmt.js";

const LAT = 40.7;
const LON = -73.9;
const M_PER_DEG_LAT = 111194.9;
const north = (m) => LAT + m / M_PER_DEG_LAT;

const fix = (northM, acc, ts, over = {}) => ({ lat: north(northM), lon: LON, acc, spd: null, hdg: null, ts, ...over });

test("the first fix is adopted", () => {
  const g = createFixGate();
  const f = fix(0, 30, 1000);
  const r = g.take(f, 1000);
  assert.equal(r.fix, f);
  assert.equal(r.adopted, true);
});

test("a sharper fix replaces a vaguer one", () => {
  const g = createFixGate();
  g.take(fix(0, 60, 1000), 1000);
  const sharp = fix(200, 5, 2000);
  const r = g.take(sharp, 2000);
  assert.equal(r.fix, sharp);
  assert.equal(r.adopted, true);
});

test("a walking GPS track adopts every fix", () => {
  const g = createFixGate();
  let t = 0;
  for (let i = 0; i < 40; i++) {
    t += 15000;
    const f = fix(i * 15, 4 + (i % 6), t);
    const r = g.take(f, t);
    assert.equal(r.fix, f);
    assert.equal(r.adopted, true);
  }
  assert.deepEqual(g.stats(), { adopted: 40, confirmed: 0, held: 0 });
});

test("a vague network fix that agrees keeps the GPS spot and moves the clock", () => {
  const g = createFixGate();
  const gps = fix(0, 5, 1000, { spd: 1.2, hdg: 90 });
  g.take(gps, 1000);
  const r = g.take(fix(30, 40, 4000), 4000);
  assert.equal(r.adopted, false);
  assert.equal(r.fix.lat, gps.lat);
  assert.equal(r.fix.lon, gps.lon);
  assert.equal(r.fix.acc, 5);
  assert.equal(r.fix.spd, 1.2);
  assert.equal(r.fix.hdg, 90);
  assert.equal(r.fix.ts, 4000);
  assert.equal(g.stats().confirmed, 1);
});

test("a confirming fix never moves the timestamp back", () => {
  const g = createFixGate();
  g.take(fix(0, 5, 9000), 9000);
  assert.equal(g.take(fix(10, 40, 3000), 9500).fix.ts, 9000);
});

test("a confidently wrong fix is set aside inside the hold window, adopted after it", () => {
  const g = createFixGate();
  const gps = fix(0, 5, 1000);
  g.take(gps, 1000);
  const wrong = fix(80, 20, 5000);
  const early = g.take(wrong, 1000 + HOLD_MS - 1);
  assert.equal(early.adopted, false);
  assert.equal(early.fix, gps);
  assert.equal(early.fix.ts, 1000);
  assert.deepEqual(g.stats(), { adopted: 1, confirmed: 0, held: 1 });
  const late = g.take(wrong, 1000 + HOLD_MS);
  assert.equal(late.adopted, true);
  assert.equal(late.fix, wrong);
});

test("in still mode the same wrong fix is never adopted", () => {
  const g = createFixGate();
  const gps = fix(0, 5, 1000);
  g.take(gps, 1000);
  for (const now of [5000, 25000, 600000, 86400000]) {
    const r = g.take(fix(80, 20, now), now, { still: true });
    assert.equal(r.adopted, false);
    assert.equal(r.fix.lat, gps.lat);
  }
  assert.equal(g.stats().adopted, 1);
});

test("a five minute GPS and network interleave never moves the position", () => {
  const g = createFixGate();
  const gps0 = fix(0, 5, 0);
  g.take(gps0, 0);
  for (let t = 5000; t <= 300000; t += 5000) {
    const jitter = ((t / 5000) % 3) - 1;
    const f = t % 15000 === 0 ? fix(jitter * 3, 4 + (t % 4), t) : fix(35 + jitter * 5, 45, t);
    const r = g.take(f, t);
    assert.ok(haversineMeters(gps0.lat, gps0.lon, r.fix.lat, r.fix.lon) < 6, `moved at ${t}`);
  }
  assert.ok(g.stats().confirmed > 0);
});

test("a missing accuracy counts as a very vague fix", () => {
  assert.equal(UNKNOWN_ACC_M, 1000);
  const g = createFixGate();
  const gps = fix(0, 5, 1000);
  g.take(gps, 1000);
  const r = g.take(fix(500, null, 2000), 2000);
  assert.equal(r.adopted, false);
  assert.equal(r.fix.lat, gps.lat);
  assert.equal(r.fix.ts, 2000);
  const g2 = createFixGate();
  g2.take(fix(0, null, 1000), 1000);
  assert.equal(g2.take(fix(300, 900, 2000), 2000).adopted, true);
});

test("an accuracy of zero is treated as one metre", () => {
  const g = createFixGate();
  g.take(fix(0, 0, 1000), 1000);
  assert.equal(g.take(fix(100, 12, 2000), 2000).adopted, false);
});

test("reset clears the held fix and the counts", () => {
  const g = createFixGate();
  g.take(fix(0, 5, 1000), 1000);
  g.take(fix(80, 20, 2000), 2000);
  g.reset();
  assert.deepEqual(g.stats(), { adopted: 0, confirmed: 0, held: 0 });
  const vague = fix(80, 200, 3000);
  const r = g.take(vague, 3000);
  assert.equal(r.adopted, true);
  assert.equal(r.fix, vague);
});

test("stats count each outcome once", () => {
  const g = createFixGate();
  g.take(fix(0, 5, 0), 0);
  g.take(fix(10, 40, 1000), 1000);
  g.take(fix(90, 20, 2000), 2000);
  g.take(fix(1, 6, 3000), 3000);
  assert.deepEqual(g.stats(), { adopted: 2, confirmed: 1, held: 1 });
});

test("onFix in main.js routes every fix through the gate", () => {
  const src = readFileSync(new URL("../app/js/main.js", import.meta.url), "utf8");
  const body = src.slice(src.indexOf("function onFix(fix)"));
  const head = body.slice(0, body.indexOf("\n}\n"));
  assert.match(head, /state\.me = fixGate\.take\(fix, Date\.now\(\), \{ still: stillNow\(\) \}\)\.fix;/);
  assert.doesNotMatch(head, /state\.me = fix;/);
});

test("onFix measures movement from the position the gate kept", () => {
  const src = readFileSync(new URL("../app/js/main.js", import.meta.url), "utf8");
  const body = src.slice(src.indexOf("function onFix(fix)"));
  const head = body.slice(0, body.indexOf("\n}\n"));
  assert.match(head, /haversineMeters\(lastSentPos\.lat, lastSentPos\.lon, state\.me\.lat, state\.me\.lon\) > 25/);
  assert.doesNotMatch(head, /lastSentPos\.lon, fix\.lat, fix\.lon/);
});
