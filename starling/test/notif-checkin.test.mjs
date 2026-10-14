// Checking in from the sharing notification, and the circle hearing a plain check-in, run through main.js.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { installDom, loadApp, settle } from "./dom-harness.mjs";

const harness = installDom();
const { internals } = await loadApp(harness);
const state = internals.state;

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
globalThis.navigator.getBattery = async () => ({ level: 0.5 });

const { openGeneration } = await import("../app/js/rekey.js");
const { epochAt } = await import("../app/js/ratchet.js");
const { generateIdentity, newSeed, sealMessage, openMessage, buildPost } = await import("../app/js/crypto.js");
const { b64uEncode, b64uDecode } = await import("../app/js/wire.js");
const { dbSet, wipeAll } = await import("../app/js/store.js");
const { OK_WINDOW_MS } = await import("../app/js/checkin.js");

test.after(() => harness.stopTimers());

const ok = (obj) => ({ ok: true, status: 200, json: async () => obj });
const MIN = 60_000;

let relayDown = false;
async function circleWith(self, peer) {
  internals.teardownNet();
  await wipeAll();
  relayDown = false;
  Object.assign(state, {
    circles: [],
    locked: false,
    lock: null,
    vaultKey: null,
    demo: false,
    chainDestroyed: false,
    sharing: false,
    sosActive: false,
    clockError: null,
    pinned: new Map(),
    me: null,
    identity: self,
  });
  await dbSet("identity", self);
  const seed = newSeed();
  const e0 = epochAt(Date.now());
  state.gen = await openGeneration({ seed: new Uint8Array(seed), g: 0, e0 });
  state.gen.at = Date.now();
  const peerGen = await openGeneration({ seed: new Uint8Array(seed), g: 0, e0 });
  assert.ok(
    await internals.addPinned({ alg: peer.alg, pk: b64uEncode(peer.pk), epk: b64uEncode(peer.epk), name: "Peer" }),
  );
  state.genRoster = new Set(state.pinned.keys());
  const posted = [];
  harness.onFetch(async (url, init) => {
    if (!/\/api\/v2\/f\/[0-9a-f]{32}/.test(url)) return null;
    if (init?.method === "POST") {
      if (relayDown) return { ok: false, status: 503, json: async () => ({}) };
      posted.push(JSON.parse(init.body));
      return ok({ ok: true, now: Date.now() });
    }
    return ok({ now: Date.now(), members: [] });
  });
  internals.setupNet();
  await settle(50);
  window.__starlingErrors.length = 0;
  return { peerGen, posted };
}

async function opened(peerGen, post) {
  const key = await peerGen.ratchet.keyFor(post.e, post.m, post.ts);
  return openMessage(key, peerGen.channelId, post.m, post.e, post.ts, b64uDecode(post.n), b64uDecode(post.c));
}

let lastTs = Date.now();
async function peerPost(peer, peerGen, fields, { alerts = true } = {}) {
  const ts = (lastTs = Math.max(Date.now(), lastTs + 1));
  const e = epochAt(ts);
  const key = await peerGen.ratchet.keyFor(e, peer.memberId, ts);
  const sealed = await sealMessage(key, peerGen.channelId, peer.memberId, e, ts, { v: 2, ts, name: "Juno", ...fields });
  const post = await buildPost(peer, peerGen.channelId, e, sealed, ts);
  await internals.roster().ingest([
    {
      m: peer.memberId,
      alg: peer.alg,
      pk: b64uEncode(peer.pk),
      epk: b64uEncode(peer.epk),
      points: [{ e: post.e, ts: post.ts, srv: post.ts, n: post.n, c: post.c, sig: post.sig }],
    },
  ]);
  if (alerts) internals.checkAlerts();
  return ts;
}

const toastTexts = () => harness.node("#toasts").children.map((n) => n.textContent);
const checkedIn = () => toastTexts().filter((x) => x === "Juno checked in");

async function withClock(offsetMs, fn) {
  const realNow = Date.now;
  Date.now = () => realNow() + offsetMs;
  try {
    return await fn();
  } finally {
    Date.now = realNow;
  }
}

function fakeNative() {
  const results = [];
  globalThis.StarlingNative = { shareCheckinResult: (r) => results.push(r) };
  return results;
}

test("a deliberate check-in stamps the posts after it, for ten minutes", async () => {
  const self = await generateIdentity();
  const peer = await generateIdentity();
  const { peerGen, posted } = await circleWith(self, peer);

  assert.equal(await internals.doCheckin(), "ok");
  const first = await opened(peerGen, posted.at(-1));
  assert.equal(first.t, "checkin");
  assert.ok(Math.abs(first.ok - Date.now()) < 5000, "ok is when the person checked in");

  state.me = { lat: 45.5, lon: -122.6, acc: 8, ts: Date.now() };
  state.sharing = true;
  try {
    internals.sendLoc(true);
    await settle(200);
    const loc = await opened(peerGen, posted.at(-1));
    assert.equal(loc.t, "loc");
    assert.equal(loc.ok, first.ok, "a later position carries the same stamp");

    await withClock(OK_WINDOW_MS + MIN, async () => {
      internals.sendLoc(true);
      await settle(200);
    });
    const late = await opened(peerGen, posted.at(-1));
    assert.equal("ok" in late, false, "and it stops after ten minutes");
  } finally {
    state.sharing = false;
  }
});

test("the timer-set post and a plain post never make a check-in stamp", async () => {
  const self = await generateIdentity();
  const peer = await generateIdentity();
  const { peerGen, posted } = await circleWith(self, peer);

  await internals.startCheckinTimer(30);
  await settle(100);
  const timer = await opened(peerGen, posted.at(-1));
  assert.ok(timer.due, "it is the timer post");
  assert.equal("ok" in timer, false, "setting a timer is not checking in");

  const src = readFileSync(new URL("../app/js/main.js", import.meta.url), "utf8");
  const stamps = [...src.matchAll(/\bstampOk\(\)/g)].length;
  assert.equal(stamps, 3, "the definition, doCheckin and the retry line, and nothing else");
  const hello = src.slice(src.indexOf('sendMsg("checkin").catch'), src.indexOf('sendMsg("checkin").catch') + 80);
  assert.ok(hello.length > 0 && !/stampOk/.test(hello));
});

test("a check-in that is retried is stamped again, so a late delivery still announces itself", async () => {
  const self = await generateIdentity();
  const peer = await generateIdentity();
  const { peerGen, posted } = await circleWith(self, peer);
  relayDown = true;
  assert.equal(await internals.doCheckin(), "queued");
  assert.equal(posted.length, 0);

  relayDown = false;
  await withClock(OK_WINDOW_MS + MIN, async () => {
    internals.outbox.flush();
    await settle(150);
    assert.ok(posted.length >= 1, "the retry landed");
    const late = await opened(peerGen, posted.at(-1));
    assert.equal(late.t, "checkin");
    assert.ok(Math.abs(late.ok - Date.now()) < 5000, "stamped at the retry, not at the first try");
  });
  internals.outbox.clear();
});

test("a retry inside the window keeps the first stamp, so the circle hears one check-in", async () => {
  const self = await generateIdentity();
  const peer = await generateIdentity();
  const { peerGen, posted } = await circleWith(self, peer);
  relayDown = true;
  const before = Date.now();
  assert.equal(await internals.doCheckin(), "queued");
  const after = Date.now();
  await settle(60);
  assert.equal(posted.length, 0);

  relayDown = false;
  internals.outbox.flush();
  await settle(150);
  assert.ok(posted.length >= 1, "the retry landed");
  for (const post of posted) {
    const msg = await opened(peerGen, post);
    assert.ok(msg.ok >= before && msg.ok <= after, "the stamp is the tap, not the retry");
  }
  internals.outbox.clear();
});

test("a stamp made in one circle never rides posts in another", async () => {
  const self = await generateIdentity();
  const peer = await generateIdentity();
  const { peerGen, posted } = await circleWith(self, peer);
  await internals.doCheckin();
  state.identity = await generateIdentity();
  try {
    await internals.startCheckinTimer(30);
    await settle(100);
  } finally {
    state.identity = self;
  }
  const next = await opened(peerGen, posted.at(-1));
  assert.ok(next.due, "it is the timer post");
  assert.equal("ok" in next, false);
});

test("locking forgets the stamp going out", async () => {
  const self = await generateIdentity();
  const peer = await generateIdentity();
  await circleWith(self, peer);
  await internals.doCheckin();
  state.lock = { enabled: true, autolockMs: 60000 };
  internals.lockNow();
  const back = await circleWith(self, peer);
  await internals.startCheckinTimer(30);
  await settle(100);
  const timer = await opened(back.peerGen, back.posted.at(-1));
  assert.ok(timer.due);
  assert.equal("ok" in timer, false);
});

test("the notification button checks in and reports ok, a queued retry as queued, a dead clock as failed", async () => {
  const self = await generateIdentity();
  const peer = await generateIdentity();
  const { peerGen, posted } = await circleWith(self, peer);
  const results = fakeNative();
  state.me = { lat: 45.5, lon: -122.6, acc: 8, ts: Date.now() };
  state.sharing = true;
  try {
    internals.onShareSignal({ checkin: true });
    await settle(200);
    assert.deepEqual(results, ["ok"]);
    const sent = await opened(peerGen, posted.at(-1));
    assert.equal(sent.t, "checkin");
    assert.equal(sent.lat, 45.5, "a sharing phone checks in with its position");
    assert.ok(sent.ok);

    relayDown = true;
    internals.onShareSignal({ checkin: true });
    await settle(200);
    assert.deepEqual(results, ["ok", "queued"]);
    internals.outbox.clear();

    state.clockError = { skewMs: 1, at: Date.now() };
    internals.onShareSignal({ checkin: true });
    await settle(200);
    assert.deepEqual(results, ["ok", "queued", "failed"]);
    internals.outbox.clear();
  } finally {
    state.sharing = false;
    state.clockError = null;
    delete globalThis.StarlingNative;
  }
});

test("the notification button cannot cancel an SOS, and reports failed when nothing is shared", async () => {
  const self = await generateIdentity();
  const peer = await generateIdentity();
  const { posted } = await circleWith(self, peer);
  const results = fakeNative();
  try {
    state.sharing = true;
    state.sosActive = true;
    internals.onShareSignal({ checkin: true });
    await settle(150);
    assert.deepEqual(results, ["sos"]);
    assert.equal(state.sosActive, true, "the SOS is exactly as it was");
    assert.equal(posted.length, 0, "and nothing was sent");

    state.sosActive = false;
    state.sharing = false;
    internals.onShareSignal({ checkin: true });
    await settle(150);
    assert.deepEqual(results, ["sos", "failed"]);
    assert.equal(posted.length, 0);
  } finally {
    state.sharing = false;
    state.sosActive = false;
    delete globalThis.StarlingNative;
  }
});

test("a plain check-in from a member is announced once per stamp", async () => {
  const self = await generateIdentity();
  const peer = await generateIdentity();
  const { peerGen } = await circleWith(self, peer);
  harness.node("#toasts").children.length = 0;

  const at = Date.now();
  await peerPost(peer, peerGen, { t: "checkin", ok: at });
  await peerPost(peer, peerGen, { t: "loc", lat: 1, lon: 2, ok: at });
  await peerPost(peer, peerGen, { t: "loc", lat: 1, lon: 2, ok: at });
  assert.equal(checkedIn().length, 1, "one toast across three posts");

  await peerPost(peer, peerGen, { t: "checkin", ok: at + 1000 });
  assert.equal(checkedIn().length, 2, "a new check-in is a new announcement");
});

test("a stale stamp is never announced, however late the phone first sees it", async () => {
  const self = await generateIdentity();
  const peer = await generateIdentity();
  const { peerGen } = await circleWith(self, peer);
  harness.node("#toasts").children.length = 0;

  await peerPost(peer, peerGen, { t: "loc", lat: 1, lon: 2, ok: Date.now() - 9 * MIN }, { alerts: false });
  await withClock(2 * MIN, async () => internals.checkAlerts());
  assert.deepEqual(checkedIn(), [], "eleven minutes after the check-in is too late");
  await peerPost(peer, peerGen, { t: "loc", lat: 1, lon: 2 });
  assert.deepEqual(checkedIn(), []);
});

test("this device's own posts never announce a check-in to itself", async () => {
  const self = await generateIdentity();
  const peer = await generateIdentity();
  const { peerGen } = await circleWith(self, peer);
  harness.node("#toasts").children.length = 0;
  await peerPost(self, peerGen, { t: "checkin", ok: Date.now() });
  internals.checkAlerts();
  assert.deepEqual(checkedIn(), []);
  const src = readFileSync(new URL("../app/js/main.js", import.meta.url), "utf8");
  assert.match(src, /rec\.ok && rec\.id !== state\.identity\?\.memberId \?/, "and the loop skips its own record on its own");
});

test("a check-in that clears an SOS is announced once, not twice", async () => {
  const self = await generateIdentity();
  const peer = await generateIdentity();
  const { peerGen } = await circleWith(self, peer);
  harness.node("#toasts").children.length = 0;

  await peerPost(peer, peerGen, { t: "sos", lat: 1, lon: 2 });
  assert.ok(toastTexts().some((x) => x.startsWith("SOS from")));
  const at = Date.now();
  await peerPost(peer, peerGen, { t: "checkin", ok: at });
  assert.equal(checkedIn().length, 1, "the SOS branch spoke and the plain branch kept quiet");
  await peerPost(peer, peerGen, { t: "loc", lat: 1, lon: 2, ok: at });
  assert.equal(checkedIn().length, 1, "and that stamp is already heard");
});
