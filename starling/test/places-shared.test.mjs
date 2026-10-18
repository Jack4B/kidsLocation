import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  applyPlaceMsg,
  readPlaceMsg,
  placeFields,
  tombFields,
  ownWrites,
  nextWrite,
  sanitizeTombs,
  sanitizePlaces,
  validPlace,
  MAX_PLACES,
  MAX_NAME_LEN,
  TOMB_KEEP_MS,
} from "../app/js/places.js";
import { PAD_LEN, PAD_RESERVE } from "../app/js/wire.js";

const ME = "me_member";
const A = "anna_member";
const B = "bart_member";
const set = (id, w, extra = {}) => ({ op: "set", id, w, name: "Szkoła", lat: 52.1, lon: 21.2, radius: 250, ...extra });
const apply = (places, tombs, from, msg, now = 1000) => applyPlaceMsg(places, tombs, { from, msg, self: ME, now });

test("the longest place message fits the padded size with the usual reserve", () => {
  const name = "ŻŹĆŃĄŚŁĘÓżźćńąśłęóŻŹĆŃĄŚ".slice(0, MAX_NAME_LEN);
  const place = { id: "abcdef01", name, lat: -89.123456789, lon: -179.123456789, radius: 500, sh: { w: Number.MAX_SAFE_INTEGER, by: A, c: ME } };
  const env = { v: 2, ts: Number.MAX_SAFE_INTEGER, ...placeFields(place) };
  const bytes = new TextEncoder().encode(JSON.stringify(env)).length;
  assert.ok(bytes <= PAD_LEN - PAD_RESERVE, `${bytes} bytes`);
  assert.equal(env.la, -89.12346, "about a meter of precision");
});

test("the parser refuses bad fields", () => {
  const ok = { t: "place", op: "set", id: "abcdef01", w: 5, n: "Dom", la: 52, lo: 21, r: 100 };
  assert.ok(readPlaceMsg(ok));
  for (const bad of [
    { ...ok, t: "chat" },
    { ...ok, op: "move" },
    { ...ok, id: "nothex!!" },
    { ...ok, w: -1 },
    { ...ok, w: 1.5 },
    { ...ok, la: 91 },
    { ...ok, lo: "21" },
    { ...ok, r: 300 },
    { ...ok, n: "   " },
  ]) {
    assert.equal(readPlaceMsg(bad), null, JSON.stringify(bad));
  }
  assert.deepEqual(readPlaceMsg({ t: "place", op: "del", id: "abcdef01", w: 7 }), { op: "del", id: "abcdef01", w: 7 });
  assert.equal(readPlaceMsg({ ...ok, n: "x".repeat(40) }).name.length, MAX_NAME_LEN);
});

test("order of arrival does not change the result", () => {
  const msgs = [
    [A, set("aaaaaaaa", 10)],
    [B, set("aaaaaaaa", 20, { name: "Szkoła Kuby" })],
    [A, set("bbbbbbbb", 5)],
    [B, { op: "del", id: "bbbbbbbb", w: 6 }],
    [A, set("aaaaaaaa", 15, { radius: 500 })],
  ];
  const run = (order) => {
    let st = { places: [], tombs: [] };
    for (const [from, msg] of order) st = apply(st.places, st.tombs, from, msg);
    return st.places.map((p) => [p.id, p.name, p.radius, p.sh.w, p.sh.by]);
  };
  const want = run(msgs);
  assert.deepEqual(want, [["aaaaaaaa", "Szkoła Kuby", 250, 20, B]]);
  assert.deepEqual(run([...msgs].reverse()), want);
  assert.deepEqual(run([msgs[3], msgs[1], msgs[4], msgs[0], msgs[2]]), want);
});

test("a removed place does not come back from a late older message", () => {
  let st = apply([], [], A, set("aaaaaaaa", 10));
  st = apply(st.places, st.tombs, B, { op: "del", id: "aaaaaaaa", w: 11 });
  assert.equal(st.places.length, 0);
  st = apply(st.places, st.tombs, A, set("aaaaaaaa", 10));
  assert.equal(st.changed, false);
  assert.equal(st.places.length, 0);
  // A newer write does bring it back: someone added it again on purpose.
  st = apply(st.places, st.tombs, A, set("aaaaaaaa", 12));
  assert.equal(st.places.length, 1);
  assert.equal(st.tombs.length, 0);
});

test("a repeated message changes nothing", () => {
  const st = apply([], [], A, set("aaaaaaaa", 10));
  const again = apply(st.places, st.tombs, A, set("aaaaaaaa", 10));
  assert.equal(again.changed, false);
  assert.equal(again.places, st.places);
});

test("ties on time go the same way on every phone", () => {
  const x = apply(apply([], [], A, set("aaaaaaaa", 10, { name: "A" })).places, [], B, set("aaaaaaaa", 10, { name: "B" }));
  const y = apply(apply([], [], B, set("aaaaaaaa", 10, { name: "B" })).places, [], A, set("aaaaaaaa", 10, { name: "A" }));
  assert.equal(x.places[0].name, y.places[0].name);
});

test("local fence and alert choices survive a change from the circle", () => {
  let st = apply([], [], A, set("aaaaaaaa", 10));
  st.places[0] = { ...st.places[0], fence: true, alerts: "arrive" };
  st = apply(st.places, st.tombs, B, set("aaaaaaaa", 11, { name: "Nowa" }));
  assert.equal(st.places[0].fence, true);
  assert.equal(st.places[0].alerts, "arrive");
  assert.equal(st.places[0].name, "Nowa");
});

test("private places and other circles' places are never touched from outside", () => {
  const mine = { id: "aaaaaaaa", name: "Dom", lat: 1, lon: 1, radius: 100 };
  assert.equal(apply([mine], [], A, set("aaaaaaaa", 99)).changed, false);
  assert.equal(apply([mine], [], A, { op: "del", id: "aaaaaaaa", w: 99 }).changed, false);
  const other = { ...mine, sh: { w: 1, by: A, c: "other_circle" } };
  assert.equal(apply([other], [], A, set("aaaaaaaa", 99)).changed, false);
});

test("the circle's list stops at the place cap", () => {
  const full = Array.from({ length: MAX_PLACES }, (_, i) => ({
    id: i.toString(16).padStart(8, "0"),
    name: `P${i}`,
    lat: 1,
    lon: 1,
    radius: 100,
  }));
  assert.equal(apply(full, [], A, set("ffffffff", 5)).changed, false);
});

test("shared places pass the stored-shape check, broken share records do not", () => {
  const p = { id: "aaaaaaaa", name: "Dom", lat: 1, lon: 1, radius: 100, sh: { w: 3, by: A, c: ME } };
  assert.ok(validPlace(p));
  assert.equal(validPlace({ ...p, sh: { w: 3, by: A } }), false);
  assert.equal(validPlace({ ...p, sh: { w: "3", by: A, c: ME } }), false);
  assert.equal(sanitizePlaces([p, { ...p, sh: null }]).length, 1);
});

test("a phone resends only its own writes, and a local write always moves forward", () => {
  const places = [
    { id: "aaaaaaaa", name: "A", lat: 1, lon: 1, radius: 100, sh: { w: 1, by: ME, c: ME } },
    { id: "bbbbbbbb", name: "B", lat: 1, lon: 1, radius: 100, sh: { w: 1, by: A, c: ME } },
    { id: "cccccccc", name: "C", lat: 1, lon: 1, radius: 100 },
  ];
  assert.deepEqual(ownWrites(places, ME).map((p) => p.id), ["aaaaaaaa"]);
  assert.equal(nextWrite({ w: 5000 }, 10), 5001);
  assert.equal(nextWrite(null, 10), 10);
  assert.deepEqual(tombFields({ id: "aaaaaaaa", w: 4 }), { t: "place", op: "del", id: "aaaaaaaa", w: 4 });
});

test("old tombstones are let go after a week", () => {
  const tomb = { id: "aaaaaaaa", w: 1, by: A, c: ME, at: 0 };
  assert.equal(sanitizeTombs([tomb], TOMB_KEEP_MS - 1).length, 1);
  assert.equal(sanitizeTombs([tomb], TOMB_KEEP_MS).length, 0);
  assert.equal(sanitizeTombs([{ ...tomb, id: "zz" }], 1).length, 0);
});

test("main.js: places travel on the live sender and arrive through the roster", () => {
  const net = readFileSync(new URL("../app/js/net.js", import.meta.url), "utf8");
  assert.match(net, /if \(obj\.t === "chat" \|\| obj\.t === "place"\)/, "a place is a message, never a position");
  const main = readFileSync(new URL("../app/js/main.js", import.meta.url), "utf8");
  assert.match(main, /onPlace: \(from, obj\) => onPlaceMsg\(from, obj\)/);
  assert.match(main, /await sender\.send\(place \? placeFields\(place\) : tombFields\(tomb\)\)/);
  // Places from before the update stay private until someone shares them.
  assert.match(main, /onShare: \(id, on\) => \(on \? sharePlace\(id\) : unsharePlace\(id, true\)\)/);
});

test("main.js: a newcomer gets the circle's places at once, not at the next six-hour resend", () => {
  const main = readFileSync(new URL("../app/js/main.js", import.meta.url), "utf8");
  const fn = main.slice(main.indexOf("function resendPlacesForNewcomers"), main.indexOf("function addPlace"));
  assert.match(fn, /channel !== placePeers\.channel \|\| n > placePeers\.n/, "a bigger roster or a re-key for an admission");
  assert.match(fn, /resendPlacesIfDue\(Date\.now\(\), true\)/);
  assert.match(main, /onChange: \(\) => \{\s*checkAlerts\(\);\s*persistRatchet\(\);\s*resendPlacesForNewcomers\(\);/);
});
