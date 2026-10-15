// The person sheet's "Last hour": stays and moves read from the trail this
// phone already holds, newest first, named after a saved place when a stay
// falls inside one.
import test from "node:test";
import assert from "node:assert/strict";

import { buildTimeline, peakKmh, STAY_MIN_MS, TIMELINE_MAX } from "../app/js/timeline.js";

const MIN = 60 * 1000;
const NOW = 1_700_000_000_000;
const HOUR = 60 * MIN;
// About 111 m per 0.001 degree of latitude.
const at = (minAgo, dLat = 0, dLon = 0) => ({ lat: 52.2 + dLat, lon: 21.0 + dLon, ts: NOW - minAgo * MIN });
const opts = (extra = {}) => ({ now: NOW, windowMs: HOUR, ...extra });

test("no points, no entries", () => {
  assert.deepEqual(buildTimeline([], opts()), []);
  assert.deepEqual(buildTimeline(null, opts()), []);
});

test("a long pause in one spot is a stay, with its start and end", () => {
  const trail = [at(30), at(25, 0.0001), at(20), at(15, 0, 0.0001)];
  const out = buildTimeline(trail, opts());
  assert.equal(out.length, 1);
  assert.deepEqual(out[0], { kind: "stay", start: NOW - 30 * MIN, end: NOW - 15 * MIN, place: null });
});

test("a short pause is not a stay", () => {
  const short = STAY_MIN_MS / MIN - 1;
  const out = buildTimeline([at(10), at(10 - short)], opts());
  assert.equal(out.length, 0, "under the stay minimum and not moving far enough to count as a move");
});

test("a stay inside a saved place carries the place's name, even when short", () => {
  const places = [{ id: "p1", name: "Home", lat: 52.2, lon: 21.0, radius: 150 }];
  const out = buildTimeline([at(5), at(4)], opts({ places }));
  assert.equal(out.length, 1);
  assert.equal(out[0].kind, "stay");
  assert.equal(out[0].place, "Home");
});

test("stay, move, stay reads newest first, and the move spans the gap between", () => {
  const trail = [
    at(50), at(45), at(40), // stay A
    at(35, 0.003), at(30, 0.006), // moving north, about 700 m
    at(25, 0.009), at(20, 0.009), at(15, 0.009), // stay B
  ];
  const out = buildTimeline(trail, opts());
  assert.deepEqual(out.map((e) => e.kind), ["stay", "move", "stay"]);
  const [b, move, a] = out;
  assert.equal(a.end, NOW - 40 * MIN);
  assert.equal(move.start, a.end, "the move starts where the stay before it ended");
  assert.equal(move.end, b.start, "and ends where the next stay starts");
  assert.ok(move.meters > 900 && move.meters < 1100, `about 1 km in all, got ${move.meters}`);
  assert.ok(Number.isInteger(move.meters));
});

test("points outside the window are not read", () => {
  const trail = [at(120), at(110), at(100), at(20), at(10)];
  const out = buildTimeline(trail, opts());
  assert.equal(out.length, 1);
  assert.equal(out[0].start, NOW - 20 * MIN, "the stay starts inside the window, not two hours ago");
});

test("a jitter of a few meters on the way is not a move", () => {
  const trail = [at(30), at(29, 0.0002), at(28, 0.0004)];
  assert.equal(buildTimeline(trail, opts()).length, 0);
});

test("at most TIMELINE_MAX entries, the newest ones", () => {
  const trail = [];
  for (let i = 0; i < 8; i++) {
    const base = 59 - i * 7;
    trail.push(at(base, i * 0.01), at(base - 4, i * 0.01));
  }
  const out = buildTimeline(trail, opts());
  assert.equal(out.length, TIMELINE_MAX);
  for (let i = 1; i < out.length; i++) assert.ok(out[i - 1].start >= out[i].start, "newest first");
  assert.equal(out[0].end, NOW - 6 * MIN, "the most recent stay leads");
});

test("unsorted input and broken points are handled", () => {
  const trail = [at(15), null, { lat: NaN, lon: 1, ts: NOW }, at(30), at(20)];
  const out = buildTimeline(trail, opts());
  assert.equal(out.length, 1);
  assert.equal(out[0].start, NOW - 30 * MIN);
});

// 0.001 degree of latitude is about 111 m; every 15 s that is about 26.7 km/h.
const fix = (sAgo, dLat) => ({ lat: 52.2 + dLat, lon: 21.0, ts: NOW - sAgo * 1000 });

test("top speed is the highest speed held over two segments in a row", () => {
  // 15 s steps of 0.001, 0.001, 0.004, 0.004, 0.001 degrees: about 27, 27, 107, 107, 27 km/h.
  const pts = [fix(75, 0), fix(60, 0.001), fix(45, 0.002), fix(30, 0.006), fix(15, 0.01), fix(0, 0.011)];
  const kmh = peakKmh(pts);
  assert.ok(kmh >= 105 && kmh <= 108, `got ${kmh}`);
});

test("one jump between two fixes cannot make a top speed on its own", () => {
  // A single 2 km jump between slow segments: about 27, 506, 27 km/h.
  const kmh = peakKmh([fix(45, 0), fix(30, 0.001), fix(15, 0.02), fix(0, 0.021)]);
  assert.ok(kmh < 30, `got ${kmh}`);
});

test("too few or too close points name no top speed", () => {
  assert.equal(peakKmh([]), null);
  assert.equal(peakKmh([fix(15, 0), fix(0, 0.001)]), null);
  assert.equal(peakKmh([fix(3, 0), fix(2, 0.001), fix(1, 0.002)]), null);
});

test("a move entry carries its top speed", () => {
  const trail = [];
  for (let i = 0; i <= 20; i++) trail.push({ lat: 52.2 + i * 0.002, lon: 21.0, ts: NOW - (20 - i) * 15000 });
  const [move] = buildTimeline(trail, opts());
  assert.equal(move.kind, "move");
  assert.ok(move.maxKmh >= 50 && move.maxKmh <= 56, `got ${move.maxKmh}`);
});
