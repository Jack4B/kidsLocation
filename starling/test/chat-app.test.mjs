// Family chat through the real main.js: the archive at rest (sealed under the
// app lock, plaintext without, one form on disk), dedup that survives a
// restart because it lives in the archive, the lock and the panic wipe taking
// every message with them, a left circle's chat going with it, what a
// notification may say, and place arrivals as lines in the timeline.
import test from "node:test";
import assert from "node:assert/strict";

import { installDom, loadApp, settle } from "./dom-harness.mjs";

// A Map behind request objects, so store.js runs its real code paths; the
// panic wipe's deleteDatabase empties it.
const data = new Map();
const req = (run) => {
  const r = { onsuccess: null, onerror: null };
  queueMicrotask(() => {
    r.result = run();
    r.onsuccess?.();
  });
  return r;
};
const store = {
  get: (k) => req(() => data.get(k)),
  put: (v, k) => req(() => {
    data.set(k, v);
  }),
  delete: (k) => req(() => {
    data.delete(k);
  }),
};
const db = { transaction: () => ({ objectStore: () => store }), close() {} };
globalThis.indexedDB = {
  open: () => {
    const r = { onsuccess: null, onerror: null, onupgradeneeded: null, result: db };
    queueMicrotask(() => r.onsuccess?.());
    return r;
  },
  deleteDatabase: () => {
    const r = {};
    queueMicrotask(() => {
      data.clear();
      r.onsuccess?.();
    });
    return r;
  },
};

const harness = installDom();
const { internals } = await loadApp(harness);
const state = internals.state;
const chat = internals.chat;

const { dbGet, dbSet } = await import("../app/js/store.js");
const { newVaultKey } = await import("../app/js/lock.js");
const { openGeneration } = await import("../app/js/rekey.js");
const { epochAt } = await import("../app/js/ratchet.js");
const { generateIdentity, newSeed, sealMessage, buildPost } = await import("../app/js/crypto.js");
const { b64uEncode } = await import("../app/js/wire.js");
const { chatFields, newChatKey } = await import("../app/js/chat.js");

test.after(() => {
  delete globalThis.StarlingNative;
  harness.stopTimers();
});

const pinOf = (who, name) => ({ memberId: who.memberId, alg: who.alg, pk: b64uEncode(who.pk), epk: b64uEncode(who.epk), verified: false, name });

let ana;

async function circle({ lock = false } = {}) {
  state.demo = false;
  state.locked = false;
  state.lock = lock ? { enabled: true, autolockMs: 60_000 } : null;
  state.vaultKey = lock ? newVaultKey() : null;
  state.circles = [];
  state.identity = await generateIdentity();
  state.gen = await openGeneration({ seed: new Uint8Array(newSeed()), g: 0, e0: epochAt(Date.now()) });
  state.gen.at = Date.now();
  state.genRoster = new Set();
  state.pinned = new Map();
  ana = await generateIdentity();
  state.pinned.set(ana.memberId, pinOf(ana, "Ana"));
  chat.reset();
  await internals.enterCircle();
  assert.equal(state.screen, "map");
  assert.equal(chat.loaded(), true);
}

async function pointFrom(who, msg) {
  const gen = state.gen;
  const e = epochAt(msg.ts);
  const key = await gen.ratchet.keyFor(e, who.memberId, msg.ts);
  const sealed = await sealMessage(key, gen.channelId, who.memberId, e, msg.ts, msg);
  const post = await buildPost(who, gen.channelId, e, sealed, msg.ts);
  return { m: who.memberId, alg: who.alg, pk: b64uEncode(who.pk), epk: b64uEncode(who.epk), points: [{ e: post.e, ts: post.ts, srv: post.ts, n: post.n, c: post.c, sig: post.sig }] };
}

let tsSeq = 0;
async function chatFrom(who, x, q = 1) {
  const ts = Date.now() - 1000 + tsSeq++;
  const entry = await pointFrom(who, { v: 2, ts, ...chatFields({ k: newChatKey(), q, x }) });
  await internals.roster().ingest([entry], ts + 10);
  await chat.flushed();
  return entry;
}

const msgs = () => chat.items().filter((i) => i.kind === "msg").map((i) => i.x);

test("with the lock off the archive is plaintext only, and it reads back", async () => {
  await circle();
  await chatFrom(ana, "Kod do furtki 4711");
  const plain = await dbGet("chat");
  assert.ok(JSON.stringify(plain).includes("Kod do furtki 4711"));
  assert.equal(await dbGet("vaultChat"), undefined);
  chat.reset();
  await internals.loadChat();
  assert.deepEqual(msgs(), ["Kod do furtki 4711"]);
});

test("with the lock on the archive is sealed only, and nothing of it is readable", async () => {
  await circle({ lock: true });
  await chatFrom(ana, "Kod do furtki 4711");
  assert.equal(await dbGet("chat"), undefined, "no plaintext copy");
  const sealed = await dbGet("vaultChat");
  assert.ok(sealed?.ct, "sealed blob on disk");
  assert.ok(!JSON.stringify(sealed).includes("4711"));
  assert.ok(!Buffer.from(sealed.ct).toString("latin1").includes("4711"));
  chat.reset();
  await internals.loadChat();
  assert.deepEqual(msgs(), ["Kod do furtki 4711"], "sealed chat opens back up");
});

test("a plaintext copy found under the lock is adopted and sealed, and the copy goes", async () => {
  await circle({ lock: true });
  const me = state.identity.memberId;
  const stray = { v: 1, circles: { [me]: { q: 0, read: 0, peers: {}, items: [{ kind: "msg", id: "m1", from: ana.memberId, k: "AAAAAAAAAAA", q: 1, e: 1, ts: Date.now() - 5000, x: "z czasu bez blokady", at: Date.now() - 5000, mine: false }] } } };
  await dbSet("chat", stray);
  await dbSet("vaultChat", undefined);
  chat.reset();
  await internals.loadChat();
  assert.deepEqual(msgs(), ["z czasu bez blokady"]);
  assert.equal(await dbGet("chat"), undefined);
  assert.ok((await dbGet("vaultChat"))?.ct);
});

test("turning the lock on and off moves the archive to the right form", async () => {
  await circle();
  await chatFrom(ana, "przed blokadą");
  assert.ok(await internals.enableLock("2468"));
  assert.equal(await dbGet("chat"), undefined);
  assert.ok((await dbGet("vaultChat"))?.ct);
  assert.ok(await internals.disableLock("2468"));
  assert.equal(await dbGet("vaultChat"), undefined);
  assert.ok(JSON.stringify(await dbGet("chat")).includes("przed blokadą"));
});

test("a restart rereads the relay window and the archive keeps it from showing twice", async () => {
  await circle();
  const entry = await chatFrom(ana, "tylko raz");
  // What a restart does: memory empty, archive from disk, a fresh roster
  // whose own dedup has forgotten everything.
  chat.reset();
  await internals.loadChat();
  internals.setupNet();
  await internals.roster().ingest([entry], Date.now());
  await chat.flushed();
  assert.deepEqual(msgs(), ["tylko raz"]);
});

test("loading drops the chat of a circle this device no longer holds", async () => {
  await circle();
  await chatFrom(ana, "zostaje");
  const archive = await dbGet("chat");
  const goneId = "f".repeat(32);
  archive.circles[goneId] = { q: 3, read: 0, peers: {}, items: [] };
  await dbSet("chat", archive);
  chat.reset();
  await internals.loadChat();
  assert.deepEqual(Object.keys(chat.archive().circles), [state.identity.memberId]);
});

test("locking takes every message out of memory and off the screen", async () => {
  await circle({ lock: true });
  await chatFrom(ana, "tajne");
  internals.openChat();
  internals.lockNow();
  assert.equal(state.locked, true);
  assert.equal(chat.loaded(), false);
  assert.deepEqual(chat.items(), []);
  assert.equal(chat.unread(), 0);
  assert.ok((await dbGet("vaultChat"))?.ct, "the sealed archive waits on disk for the next unlock");
  state.locked = false;
});

test("the panic wipe takes the chat with it", async () => {
  await circle();
  await chatFrom(ana, "do usunięcia");
  assert.ok(await dbGet("chat"));
  await internals.panic();
  await settle();
  assert.equal(await dbGet("chat"), undefined);
  assert.equal(await dbGet("vaultChat"), undefined);
  assert.deepEqual(chat.items(), []);
});

test("leaving the circle takes its chat along", async () => {
  await circle();
  await chatFrom(ana, "pa");
  assert.ok(await internals.leaveCircle());
  assert.equal(await dbGet("chat"), undefined, "the last circle takes the record");
  assert.deepEqual(chat.archive().circles, {});
});

// ----------------------------------------------------------- notifications

function bridge() {
  const calls = [];
  globalThis.StarlingNative = {
    windowShown: () => false,
    notify: (...a) => calls.push(["notify", ...a]),
    notifyKind: (...a) => calls.push(["kind", ...a]),
    notifyDetail: (title, body, tag, kind, member, onLock) => calls.push({ title, body, tag, kind, member, onLock }),
    cancelNotify: () => {},
  };
  return calls;
}

test("in the background a notification says neither who wrote nor what, unless the lock screen was allowed", async () => {
  await circle();
  const calls = bridge();
  harness.node("#toasts").children = [];
  state.settings = { ...state.settings, chatPreview: false, chatOnLock: false };
  document.visibilityState = "hidden";
  try {
    await chatFrom(ana, "Kod do furtki 4711");
  } finally {
    document.visibilityState = "visible";
  }
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], { title: "New message", body: "Open the app to read it.", tag: "chat", kind: "chat", member: "chat", onLock: false });
  assert.ok(!JSON.stringify(calls).includes("4711"));
  assert.ok(!JSON.stringify(calls).includes("Ana"), "no name on a notification the lock screen may show");
  assert.ok(!JSON.stringify(harness.node("#toasts").children.map((c) => c.textContent)).includes("4711"));
});

test("the name needs the lock-screen choice, and the text needs both switches", async () => {
  await circle();
  const calls = bridge();
  document.visibilityState = "hidden";
  try {
    state.settings = { ...state.settings, chatPreview: false, chatOnLock: true };
    await chatFrom(ana, "pierwsza", 1);
    state.settings = { ...state.settings, chatPreview: true, chatOnLock: false };
    await chatFrom(ana, "druga", 2);
    state.settings = { ...state.settings, chatPreview: true, chatOnLock: true };
    await chatFrom(ana, "trzecia", 3);
  } finally {
    document.visibilityState = "visible";
    state.settings = { ...state.settings, chatPreview: false, chatOnLock: false };
  }
  assert.deepEqual(calls.map((c) => [c.title, c.body, c.onLock]), [
    ["New message from Ana", "Open the app to read it.", true],
    ["New message", "Open the app to read it.", false],
    ["New message from Ana", "trzecia", true],
  ]);
  assert.ok(!JSON.stringify(calls[1]).includes("druga"), "the text switch alone shows nothing");
});

test("with the app open elsewhere a toast names the sender; with the chat open nothing interrupts", async () => {
  await circle();
  const calls = bridge();
  globalThis.StarlingNative.windowShown = () => true;
  harness.node("#toasts").children = [];
  await chatFrom(ana, "Jestem pod szkołą", 1);
  const said = harness.node("#toasts").children.map((c) => c.textContent);
  assert.deepEqual(said, ["New message from Ana"]);
  assert.deepEqual(calls, [], "no system notification while the app is on screen");
  assert.equal(chat.unread(), 1);

  internals.openChat();
  assert.equal(chat.unread(), 0, "opening the chat reads it");
  await chatFrom(ana, "Już idę", 2);
  assert.equal(harness.node("#toasts").children.length, 1, "no toast over the open chat");
  assert.equal(chat.unread(), 0);
  internals.closeChat();
});

test("a place arrival becomes a line in the chat timeline, on this phone only", async () => {
  await circle();
  state.settings = { ...state.settings, placeAlerts: true };
  state.places = [{ id: "aaaaaaaa", name: "Dom", lat: 40, lon: -75, radius: 250 }];
  await internals.savePlaces();
  internals.resetMemberAlerts();
  const realNow = Date.now;
  const t0 = realNow();
  const step = async (lat, ts) => {
    const entry = await pointFrom(ana, { v: 2, ts, t: "loc", name: "Ana", lat, lon: -75, acc: 5, mode: "precise" });
    await internals.roster().ingest([entry], ts);
    Date.now = () => ts + 500;
    try {
      internals.checkAlerts();
    } finally {
      Date.now = realNow;
    }
  };
  await step(40 + 2000 / 111320, t0);
  await step(40, t0 + 60_000);
  await chat.flushed();
  const sys = chat.items().filter((i) => i.kind === "sys");
  assert.deepEqual(sys.map((s) => [s.from, s.ev, s.place]), [[ana.memberId, "arrive", "Dom"]]);
  assert.equal(chat.unread(), 0, "a system line is not an unread message");
  state.places = [];
  await internals.savePlaces();
});
