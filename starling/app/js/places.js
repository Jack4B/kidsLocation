// Places: named spots like Home or School. A place is either private (it
// lives only on this device, the way every place did before) or shared with
// the circle: then it travels as a sealed "place" message in the member's own
// stream, exactly like a chat message, so the relay sees a padded ciphertext
// it cannot tell from a position. Positions arrive encrypted from circle
// members; this module compares them against the places and reports
// enter/leave transitions. Spec of the shared format: docs/PLACES.md.
//
// Detection is deliberately conservative, because GPS jitter at a boundary
// would otherwise flap "arrived" / "left" all afternoon:
//   - enter when a point lands inside the place radius
//   - leave only past radius * EXIT_FACTOR + EXIT_PAD meters (hysteresis)
//   - after any flip, the opposite flip is suppressed for MIN_FLIP_MS
//   - coarse-mode points are ignored: a deliberately degraded position has
//     nothing honest to say about a 250 m circle
//   - stale points are ignored: silence is not the same thing as leaving

import { haversineMeters } from "./fmt.js";

export const PLACE_RADII = [100, 250, 500];
export const DEFAULT_RADIUS = 250;
export const MAX_PLACES = 10;
export const MAX_NAME_LEN = 24;
export const EXIT_FACTOR = 1.4;
export const EXIT_PAD_M = 60;
export const MIN_FLIP_MS = 120_000;
export const POINT_MAX_AGE_MS = 10 * 60 * 1000;
// A fix vaguer than this has nothing honest to say about a 100-500 m circle,
// same reasoning as ignoring coarse mode.
export const MAX_ACC_M = 150;
// How much of the reported accuracy radius counts against a transition. Full
// accuracy would make a 100 m place unenterable on a mid phone; none of it
// re-opens the boundary-jitter flapping this module exists to stop.
export const ACC_CONFIDENCE_CAP_M = 50;
// Faster than this between two fixes is a GPS glitch, not travel. Airliners
// cruise near 250 m/s but hand out no fixes mid-flight; cars and trains stay
// far under it.
export const MAX_SPEED_MS = 90;
export const PLACE_ALERTS = ["both", "arrive", "leave", "off"];

export function newPlaceId() {
  const b = new Uint8Array(4);
  globalThis.crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

// Shape-check one stored place. Storage is local, but it is still parsed
// input: a migrated or hand-edited record must not crash the tracker.
export function validPlace(p) {
  return (
    typeof p === "object" &&
    p !== null &&
    typeof p.id === "string" &&
    /^[0-9a-f]{8}$/.test(p.id) &&
    typeof p.name === "string" &&
    p.name.length > 0 &&
    p.name.length <= MAX_NAME_LEN &&
    Number.isFinite(p.lat) &&
    Math.abs(p.lat) <= 90 &&
    Number.isFinite(p.lon) &&
    Math.abs(p.lon) <= 180 &&
    PLACE_RADII.includes(p.radius) &&
    (p.fence === undefined || typeof p.fence === "boolean") &&
    (p.alerts === undefined || PLACE_ALERTS.includes(p.alerts)) &&
    (p.sh === undefined || validShare(p.sh))
  );
}

// ------------------------------------------------------------ shared places
//
// A shared place carries sh = { w, by, c }: w is the time of its last write,
// by the member who wrote it, c this device's own member id in the circle it
// belongs to. Fence and alerts stay local choices and never travel.
//
// Wire envelope, after the sender's v and ts:
//   { t: "place", op: "set", id, w, n, la, lo, r }   add or change
//   { t: "place", op: "del", id, w }                 remove
// The newest write wins, ordered by (w, writer), so every phone reaches the
// same list whatever order the messages arrive in. A removal leaves a
// tombstone, so an older "set" served late cannot bring the place back.
// Each member re-sends the writes that are theirs now and then, because the
// relay keeps a message for 24 hours at most.

const MEMBER_RE = /^[A-Za-z0-9_-]{1,64}$/;
const ID_RE = /^[0-9a-f]{8}$/;
export const PLACE_RESEND_MS = 6 * 60 * 60 * 1000;
export const TOMB_KEEP_MS = 7 * 24 * 60 * 60 * 1000;
const COORD_DP = 1e5;

function validShare(sh) {
  return (
    typeof sh === "object" &&
    sh !== null &&
    Number.isSafeInteger(sh.w) &&
    sh.w > 0 &&
    typeof sh.by === "string" &&
    MEMBER_RE.test(sh.by) &&
    typeof sh.c === "string" &&
    MEMBER_RE.test(sh.c)
  );
}

export const isShared = (p) => !!p?.sh;
// The places of one circle that this device should be sending: the ones
// whose last write was its own.
export const ownWrites = (places, self) => places.filter((p) => p.sh && p.sh.c === self && p.sh.by === self);

const round = (x) => Math.round(x * COORD_DP) / COORD_DP;

// The fields a shared place puts on the wire. About a meter of precision is
// plenty for a 100 m circle and keeps the message short.
export function placeFields(place) {
  if (!place?.sh) throw new Error("place: not shared");
  return {
    t: "place",
    op: "set",
    id: place.id,
    w: place.sh.w,
    n: place.name,
    la: round(place.lat),
    lo: round(place.lon),
    r: place.radius,
  };
}

export const tombFields = (tomb) => ({ t: "place", op: "del", id: tomb.id, w: tomb.w });

// A decrypted place message as a receiver may believe it, or null. The
// roster has checked the signature, epoch and ts; this is shape only.
export function readPlaceMsg(obj) {
  if (!obj || obj.t !== "place") return null;
  if (typeof obj.id !== "string" || !ID_RE.test(obj.id)) return null;
  if (!Number.isSafeInteger(obj.w) || obj.w <= 0) return null;
  if (obj.op === "del") return { op: "del", id: obj.id, w: obj.w };
  if (obj.op !== "set") return null;
  const name = typeof obj.n === "string" ? obj.n.trim().slice(0, MAX_NAME_LEN) : "";
  const place = { id: obj.id, name, lat: obj.la, lon: obj.lo, radius: obj.r };
  if (!validPlace(place)) return null;
  return { op: "set", id: obj.id, w: obj.w, name, lat: obj.la, lon: obj.lo, radius: obj.r };
}

// Whether write a beats write b. Ties on time go to the larger member id,
// an arbitrary rule every phone applies the same way.
const newer = (aw, aby, bw, bby) => aw > bw || (aw === bw && aby > bby);

// Fold one received message into this device's places and tombstones.
// Pure: returns { places, tombs, changed }. `self` is this device's member
// id in the circle the message came from.
export function applyPlaceMsg(places, tombs, { from, msg, self, now = Date.now() }) {
  const same = { places, tombs, changed: false };
  if (!msg || typeof from !== "string" || !MEMBER_RE.test(from) || !MEMBER_RE.test(self || "")) return same;
  const cur = places.find((p) => p.id === msg.id);
  // A private place with the same id is this phone's own; nothing from outside touches it.
  if (cur && !cur.sh) return same;
  if (cur && cur.sh.c !== self) return same;
  const tomb = tombs.find((x) => x.id === msg.id && x.c === self);
  const held = cur ? cur.sh : tomb;
  if (held && !newer(msg.w, from, held.w, held.by)) return same;
  const restTombs = tombs.filter((x) => x !== tomb);
  if (msg.op === "del") {
    return {
      places: places.filter((p) => p !== cur),
      tombs: [...restTombs, { id: msg.id, w: msg.w, by: from, c: self, at: now }],
      changed: true,
    };
  }
  // A new place over the cap is not taken; the sender's phone shows it, this one cannot.
  if (!cur && sanitizePlaces(places).length >= MAX_PLACES) return same;
  const next = {
    id: msg.id,
    name: msg.name,
    lat: msg.lat,
    lon: msg.lon,
    radius: msg.radius,
    ...(cur?.fence !== undefined ? { fence: cur.fence } : {}),
    ...(cur?.alerts !== undefined ? { alerts: cur.alerts } : {}),
    sh: { w: msg.w, by: from, c: self },
  };
  return {
    places: cur ? places.map((p) => (p === cur ? next : p)) : [...places, next],
    tombs: restTombs,
    changed: true,
  };
}

// A write time for a local change that beats whatever the place held, even
// with this phone's clock behind the writer's.
export const nextWrite = (held, now = Date.now()) => Math.max(now, (held?.w ?? 0) + 1);

export function sanitizeTombs(list, now = Date.now()) {
  return (Array.isArray(list) ? list : []).filter(
    (x) =>
      x &&
      typeof x.id === "string" &&
      ID_RE.test(x.id) &&
      Number.isSafeInteger(x.w) &&
      typeof x.by === "string" &&
      MEMBER_RE.test(x.by) &&
      typeof x.c === "string" &&
      MEMBER_RE.test(x.c) &&
      Number.isFinite(x.at) &&
      now - x.at < TOMB_KEEP_MS,
  ).slice(-100);
}

// No choice stored means both ways, which is how every place behaved before.
export function announces(place, type) {
  const mode = place?.alerts ?? "both";
  return mode === "both" || mode === type;
}

export const sanitizePlaces = (list) =>
  (Array.isArray(list) ? list : []).filter(validPlace).slice(0, MAX_PLACES);

// The place a point is inside of, by the ENTER radius: nearest center wins
// when circles overlap, so a member is only ever "at" one place. `margin`
// shrinks the effective radius, so a caller can demand the fix be inside
// with room to spare rather than merely touching the line.
export function placeContaining(places, lat, lon, margin = 0) {
  let best = null;
  let bestD = Infinity;
  for (const p of places) {
    const d = haversineMeters(lat, lon, p.lat, p.lon);
    if (d + margin <= p.radius && d < bestD) {
      best = p;
      bestD = d;
    }
  }
  return best;
}

// The fence an outgoing position must snap to, or null. Pure so the send
// path's one privacy-critical decision is table-testable: inside a fenced
// place the place's center goes out instead of the fix. An SOS never snaps,
// because someone coming to help needs the real position, and coarse mode
// never snaps, because replacing a ~1 km grid point with an exact center
// would SHARPEN the position, not blur it.
export function fenceSnap(places, lat, lon, { sos = false, precision = "precise" } = {}) {
  if (sos || precision === "coarse") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return placeContaining(
    places.filter((p) => p.fence === true),
    lat,
    lon,
  );
}

// Per-member arrive/leave tracking against the current set of places.
export function createPlaceTracker(initialPlaces = []) {
  let places = sanitizePlaces(initialPlaces);
  // memberId -> { placeId, since, flippedAt, arrivedAt, coarse }; null placeId is nowhere, null arrivedAt is unseen.
  const state = new Map();

  function setPlaces(next) {
    places = sanitizePlaces(next);
    const live = new Set(places.map((p) => p.id));
    // A deleted place must not fire a "left" event later; forget it quietly.
    for (const rec of state.values()) {
      if (rec.placeId && !live.has(rec.placeId)) {
        rec.placeId = null;
        rec.flippedAt = 0;
        rec.arrivedAt = null;
      }
    }
  }

  // Feed one member point. Returns a list of events, each
  // { type: "arrive" | "leave", memberId, placeId, placeName }.
  function update(memberId, lat, lon, { mode, ts, now = Date.now(), acc } = {}) {
    if (!places.length) return [];
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    if (mode === "coarse") {
      // The place stays remembered so a return to precise inside it is not a fresh "arrived".
      const held = state.get(memberId);
      if (held) {
        held.coarse = true;
        held.arrivedAt = null;
      }
      return [];
    }
    if (Number.isFinite(ts) && now - ts > POINT_MAX_AGE_MS) return [];
    if (Number.isFinite(acc) && acc > MAX_ACC_M) return [];
    // How much of the accuracy radius argues against a transition. Unknown
    // accuracy contributes nothing, exactly the old behavior.
    const conf = Number.isFinite(acc) ? Math.min(Math.max(acc, 0), ACC_CONFIDENCE_CAP_M) : 0;
    const at = Number.isFinite(ts) ? ts : now;

    let rec = state.get(memberId);
    if (!rec) {
      // First sight of a member: adopt where they already are without an
      // event. "Juno arrived at Home" is false if Juno was home all along.
      const here = placeContaining(places, lat, lon);
      rec = { placeId: here?.id ?? null, since: now, flippedAt: 0, arrivedAt: null, last: { lat, lon, at } };
      state.set(memberId, rec);
      return [];
    }

    // A fix implying impossible speed is a glitch until a second fix agrees
    // with it. One agreeing follow-up means the move was real (a flight, a
    // dead phone that woke up across town) and transitions resume from there;
    // a follow-up back near the old track discards the glitch quietly.
    if (rec.last) {
      const dtS = Math.max(1, at - rec.last.at) / 1000;
      const jumpSpeed = haversineMeters(lat, lon, rec.last.lat, rec.last.lon) / dtS;
      if (jumpSpeed > MAX_SPEED_MS) {
        const j = rec.jump;
        const confirmed =
          j && haversineMeters(lat, lon, j.lat, j.lon) / (Math.max(1, at - j.at) / 1000) <= MAX_SPEED_MS;
        if (!confirmed) {
          rec.jump = { lat, lon, at };
          return [];
        }
        rec.jump = null;
      } else {
        rec.jump = null;
      }
    }
    rec.last = { lat, lon, at };
    const afterCoarse = rec.coarse === true;
    rec.coarse = false;

    const events = [];
    const current = rec.placeId ? places.find((p) => p.id === rec.placeId) : null;

    if (current) {
      const d = haversineMeters(lat, lon, current.lat, current.lon);
      const exitAt = current.radius * EXIT_FACTOR + EXIT_PAD_M;
      // The fix must be clearly outside: its accuracy circle counts against
      // the leave, so a vague point at the boundary keeps you home.
      if (d - conf >= exitAt && now - rec.flippedAt >= MIN_FLIP_MS) {
        rec.placeId = null;
        rec.since = now;
        rec.flippedAt = now;
        rec.arrivedAt = null;
        events.push({ type: "leave", memberId, placeId: current.id, placeName: current.name });
      }
    }

    if (!rec.placeId) {
      const entered = placeContaining(places, lat, lon, conf);
      // Entering somewhere new is allowed in the same tick as leaving: walking
      // straight from one place into an adjacent one is real. Re-entering the
      // place just left is what the flip cooldown exists to absorb.
      const bouncing =
        entered && current && entered.id === current.id && now - rec.flippedAt < MIN_FLIP_MS && events.length === 0;
      if (entered && !bouncing) {
        rec.placeId = entered.id;
        rec.since = now;
        rec.flippedAt = now;
        // The fix's own time, but a sender clock running ahead cannot date an arrival in the future.
        rec.arrivedAt = afterCoarse ? null : Math.min(at, now);
        events.push({ type: "arrive", memberId, placeId: entered.id, placeName: entered.name });
      }
    }

    return events;
  }

  const placed = (memberId) => {
    const rec = state.get(memberId);
    return rec?.placeId && !rec.coarse ? rec : null;
  };

  function placeFor(memberId) {
    const rec = placed(memberId);
    return rec ? places.find((p) => p.id === rec.placeId) || null : null;
  }

  function sinceFor(memberId) {
    return placed(memberId)?.since ?? null;
  }

  function arrivedAtFor(memberId) {
    return placed(memberId)?.arrivedAt ?? null;
  }

  function forget(memberId) {
    state.delete(memberId);
  }

  return {
    setPlaces,
    update,
    placeFor,
    sinceFor,
    arrivedAtFor,
    forget,
    clear: () => state.clear(),
    places: () => places,
  };
}
