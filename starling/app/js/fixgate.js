// Decides which position fix becomes "where I am". Pure: no DOM, no network.
// GPS and network fixes interleave, and a vague one must not drag the pin off
// a sharp one.

import { haversineMeters } from "./fmt.js";

export const UNKNOWN_ACC_M = 1000;
export const HOLD_MS = 20000;

const accOf = (fix) => (Number.isFinite(fix.acc) ? Math.max(1, fix.acc) : UNKNOWN_ACC_M);

export function createFixGate({ holdMs = HOLD_MS } = {}) {
  let held = null;
  let counts = { adopted: 0, confirmed: 0, held: 0 };

  const adopt = (fix, now) => {
    held = { fix, at: now };
    counts.adopted++;
    return { fix, adopted: true };
  };

  return {
    take(fix, now, { still = false } = {}) {
      if (!held) return adopt(fix, now);
      const a = accOf(fix);
      const h = accOf(held.fix);
      if (a <= Math.max(h * 1.5, h + 10)) return adopt(fix, now);
      const d = haversineMeters(held.fix.lat, held.fix.lon, fix.lat, fix.lon);
      if (d <= a || still) {
        counts.confirmed++;
        return { fix: { ...held.fix, ts: Math.max(held.fix.ts ?? 0, fix.ts ?? now) }, adopted: false };
      }
      if (now - held.at < holdMs) {
        counts.held++;
        return { fix: held.fix, adopted: false };
      }
      return adopt(fix, now);
    },
    reset() {
      held = null;
      counts = { adopted: 0, confirmed: 0, held: 0 };
    },
    stats() {
      return { ...counts };
    },
  };
}
