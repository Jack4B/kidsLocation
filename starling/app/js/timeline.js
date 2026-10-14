// The person sheet's recent history, read from the trail this phone already
// holds for that member. Pure: no DOM, no words (ui.js writes those), so the
// rules are table-testable. Nothing here is stored or sent; it is a reading of
// points already in memory, inside the history window the circle allows.

import { haversineMeters } from "./fmt.js";
import { placeContaining } from "./places.js";

// Points closer than this to the first point of a run count as one stay.
export const STAY_RADIUS_M = 100;
// A run shorter than this is a pause on the way, not a stay.
export const STAY_MIN_MS = 3 * 60 * 1000;
// The sheet shows this many entries, newest first.
export const TIMELINE_MAX = 5;

// trail: [{lat, lon, ts}] in any order. Returns entries newest first:
//   { kind: "stay", start, end, place } where place is a saved place name or null
//   { kind: "move", start, end, meters }
// Only points inside [now - windowMs, now] are read.
export function buildTimeline(trail, { now, windowMs, places = [] } = {}) {
  const from = now - windowMs;
  const pts = (trail || [])
    .filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lon) && Number.isFinite(p.ts) && p.ts >= from && p.ts <= now)
    .sort((a, b) => a.ts - b.ts);
  if (!pts.length) return [];

  // Runs of points that stay within STAY_RADIUS_M of the run's first point.
  const runs = [];
  let run = [pts[0]];
  for (const p of pts.slice(1)) {
    const anchor = run[0];
    if (haversineMeters(anchor.lat, anchor.lon, p.lat, p.lon) <= STAY_RADIUS_M) run.push(p);
    else {
      runs.push(run);
      run = [p];
    }
  }
  runs.push(run);

  // A run is a stay when it lasted, or when it sits in a saved place; the
  // rest is movement, and movements next to each other merge into one.
  const out = [];
  for (const r of runs) {
    const first = r[0];
    const last = r[r.length - 1];
    const place = placeContaining(places, first.lat, first.lon)?.name || null;
    const stay = last.ts - first.ts >= STAY_MIN_MS || place !== null;
    const prev = out[out.length - 1];
    if (stay) {
      if (prev?.kind === "move") {
        prev.end = first.ts;
        prev.meters += haversineMeters(prev.lastLat, prev.lastLon, first.lat, first.lon);
      }
      out.push({ kind: "stay", start: first.ts, end: last.ts, place, lastLat: last.lat, lastLon: last.lon });
      continue;
    }
    let meters = 0;
    for (let i = 1; i < r.length; i++) meters += haversineMeters(r[i - 1].lat, r[i - 1].lon, r[i].lat, r[i].lon);
    if (prev?.kind === "move") {
      prev.meters += haversineMeters(prev.lastLat, prev.lastLon, first.lat, first.lon) + meters;
      prev.end = last.ts;
      prev.lastLat = last.lat;
      prev.lastLon = last.lon;
    } else {
      // The move starts where the stay before it ended.
      const start = prev ? prev.end : first.ts;
      const lead = prev ? haversineMeters(prev.lastLat, prev.lastLon, first.lat, first.lon) : 0;
      out.push({ kind: "move", start, end: last.ts, meters: lead + meters, lastLat: last.lat, lastLon: last.lon });
    }
  }
  return out
    .filter((e) => e.kind === "stay" || e.meters >= STAY_RADIUS_M)
    .map(({ lastLat: _a, lastLon: _b, ...e }) => (e.kind === "move" ? { ...e, meters: Math.round(e.meters) } : e))
    .reverse()
    .slice(0, TIMELINE_MAX);
}
