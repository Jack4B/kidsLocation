// Family chat on the receive path and the send path: the roster's chat
// branch, which runs before the position kinds and touches nothing of the
// member's record, and the shared sender, whose strictly rising ts keeps a
// chat message and a position from colliding even in one millisecond.
import test from "node:test";
import assert from "node:assert/strict";

import { createRoster, createSender, statusOf } from "../app/js/net.js";
import { openGeneration } from "../app/js/rekey.js";
import { generateIdentity, newSeed, sealMessage, buildPost } from "../app/js/crypto.js";
import { EPOCH_MS, epochAt } from "../app/js/ratchet.js";
import { b64uEncode } from "../app/js/wire.js";
import { chatFields, createChatController, newChatKey } from "../app/js/chat.js";

const RE0 = 2980471;
const rAt = (e) => e * EPOCH_MS;
const RSELF = "0".repeat(32);

async function circle({ historyEpochs = 200 } = {}) {
  const seed = newSeed();
  const send = await openGeneration({ seed: new Uint8Array(seed), g: 0, e0: RE0, historyEpochs });
  const recv = await openGeneration({ seed: new Uint8Array(seed), g: 0, e0: RE0, historyEpochs });
  return { send, recv, channelId: send.channelId };
}

async function point(c, identity, e, msg) {
  const key = await c.send.ratchet.keyFor(e, identity.memberId, rAt(e));
  const sealed = await sealMessage(key, c.channelId, identity.memberId, e, msg.ts, msg);
  const post = await buildPost(identity, c.channelId, e, sealed, msg.ts);
  return { e: post.e, ts: post.ts, srv: post.ts, n: post.n, c: post.c, sig: post.sig };
}

async function entry(c, identity, msgs) {
  const points = [];
  for (const { e, msg } of msgs) points.push(await point(c, identity, e, msg));
  return { m: identity.memberId, alg: identity.alg, pk: b64uEncode(identity.pk), epk: b64uEncode(identity.epk), points };
}

const loc = (ts, extra = {}) => ({ v: 2, t: "loc", ts, lat: 44.98, lon: -93.27, ...extra });
const chatMsg = (ts, q, x, k = newChatKey()) => ({ v: 2, ts, ...chatFields({ k, q, x }) });

function rosterWith(c, chats, opts = {}) {
  return createRoster({
    channelId: c.channelId,
    ratchet: c.recv.ratchet,
    selfId: RSELF,
    pinned: new Map(),
    onChat: (from, obj, e, ts) => chats.push({ from, x: obj.x, q: obj.q, k: obj.k, e, ts }),
    ...opts,
  });
}

test("a chat message reaches onChat and never touches the sender's record", async () => {
  const c = await circle();
  const alice = await generateIdentity();
  const chats = [];
  const roster = rosterWith(c, chats);
  const t0 = rAt(RE0) + 1000;
  await roster.ingest([await entry(c, alice, [{ e: RE0, msg: loc(t0, { t: "sos", name: "Alice" }) }])], t0);
  assert.equal(statusOf(roster.get(alice.memberId), t0), "sos");

  await roster.ingest([await entry(c, alice, [{ e: RE0, msg: chatMsg(t0 + 3000, 1, "Jestem cała") }])], t0 + 3000);
  assert.deepEqual(chats.map((m) => [m.from, m.x, m.q, m.e, m.ts]), [[alice.memberId, "Jestem cała", 1, RE0, t0 + 3000]]);
  const rec = roster.get(alice.memberId);
  assert.equal(rec.type, "sos", "a chat is not a position: the SOS stands");
  assert.equal(rec.ts, t0, "the record's time did not move");

  // Earlier than the chat: had the chat moved the replay mark, this would be refused.
  await roster.ingest([await entry(c, alice, [{ e: RE0, msg: loc(t0 + 2000) }])], t0 + 4000);
  assert.equal(roster.get(alice.memberId).ts, t0 + 2000, "the chat left the position watermark alone");
});

test("a chat from a member seen for the first time is believed like a position, not like a control message", async () => {
  const c = await circle();
  const stranger = await generateIdentity();
  const chats = [];
  const control = [];
  const pinned = new Map();
  const roster = rosterWith(c, chats, { pinned, onControl: (from, obj) => control.push(obj.t) });
  const t0 = rAt(RE0) + 1000;
  await roster.ingest([await entry(c, stranger, [
    { e: RE0, msg: chatMsg(t0, 1, "hej") },
    { e: RE0, msg: { v: 2, t: "rekey", ts: t0 + 1, g: 1, to: RSELF, rm: [] } },
  ])], t0 + 10);
  assert.equal(chats.length, 1, "trust on first use, the same as a position");
  assert.ok(pinned.has(stranger.memberId));
  assert.deepEqual(control, [], "while the re-key from the same pass is not honoured");
});

test("the same chat point twice is handed over once", async () => {
  const c = await circle();
  const alice = await generateIdentity();
  const chats = [];
  const roster = rosterWith(c, chats);
  const t0 = rAt(RE0) + 1000;
  const e1 = await entry(c, alice, [{ e: RE0, msg: chatMsg(t0, 1, "raz") }]);
  await roster.ingest([e1], t0);
  await roster.ingest([e1], t0 + 10);
  assert.equal(chats.length, 1);
});

test("past the window a held chain opens re-keys only, never chat", async () => {
  const c = await circle({ historyEpochs: 6 });
  const alice = await generateIdentity();
  const now = rAt(RE0 + 12) + 1000;
  c.recv.ratchet.holdForBacklog(now);
  await c.recv.ratchet.syncToClock(now);
  const chats = [];
  const pinned = new Map([[alice.memberId, { alg: alice.alg, pk: b64uEncode(alice.pk), epk: b64uEncode(alice.epk), verified: false }]]);
  const roster = rosterWith(c, chats, { pinned });
  await roster.ingest([await entry(c, alice, [{ e: RE0 + 2, msg: chatMsg(rAt(RE0 + 2) + 5, 1, "stara") }])], now);
  assert.deepEqual(chats, [], "the backlog keys do not reveal an old message");
  await roster.ingest([await entry(c, alice, [{ e: RE0 + 7, msg: chatMsg(rAt(RE0 + 7) + 5, 2, "nowa") }])], now);
  assert.deepEqual(chats.map((m) => m.x), ["nowa"]);
});

test("a message from outside the key window is dropped, the forward secrecy working", async () => {
  const c = await circle({ historyEpochs: 1 });
  const alice = await generateIdentity();
  const now = rAt(RE0 + 20);
  await c.recv.ratchet.syncToClock(now);
  const chats = [];
  const roster = rosterWith(c, chats);
  await roster.ingest([await entry(c, alice, [{ e: RE0 + 1, msg: chatMsg(rAt(RE0 + 1) + 5, 1, "za stara") }])], now);
  assert.deepEqual(chats, []);
});

test("a broken chat handler does not stop the rest of the feed", async () => {
  const c = await circle();
  const alice = await generateIdentity();
  const t0 = rAt(RE0) + 1000;
  const roster = createRoster({
    channelId: c.channelId,
    ratchet: c.recv.ratchet,
    selfId: RSELF,
    pinned: new Map(),
    onChat: () => {
      throw new Error("disk full");
    },
  });
  await roster.ingest([await entry(c, alice, [
    { e: RE0, msg: chatMsg(t0, 1, "a") },
    { e: RE0, msg: loc(t0 + 1) },
  ])], t0 + 2);
  assert.equal(roster.get(alice.memberId).ts, t0 + 1);
});

test("an older roster without onChat skips chat as an unknown kind", async () => {
  const c = await circle();
  const alice = await generateIdentity();
  const t0 = rAt(RE0) + 1000;
  const roster = createRoster({ channelId: c.channelId, ratchet: c.recv.ratchet, selfId: RSELF, pinned: new Map() });
  await roster.ingest([await entry(c, alice, [{ e: RE0, msg: loc(t0, { t: "sos" }) }, { e: RE0, msg: chatMsg(t0 + 1, 1, "x") }])], t0 + 2);
  assert.equal(roster.get(alice.memberId).type, "sos");
});

// ------------------------------------------------------------- the sender

function stubFetch(log) {
  const prev = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    log.push(JSON.parse(init.body));
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  };
  return () => {
    globalThis.fetch = prev;
  };
}

test("a chat and a position in the same millisecond get ts and ts + 1, and the receiver takes both", async () => {
  const identity = await generateIdentity();
  const e = epochAt(Date.now());
  // The sender's generation has to reach today's epoch, since the sender keys by the clock.
  const gen = await openGeneration({ seed: newSeed(), g: 0, e0: e - 2, historyEpochs: 6 });
  let last = 0;
  const posts = [];
  const sender = createSender({
    identity,
    channelId: gen.channelId,
    ratchet: gen.ratchet,
    getLastTs: async () => last,
    setLastTs: async (ts) => {
      last = ts;
    },
  });
  const restore = stubFetch(posts);
  const frozen = Date.now();
  const realNow = Date.now;
  Date.now = () => frozen;
  let a, b;
  try {
    [a, b] = await Promise.all([
      sender.send({ t: "loc", lat: 1, lon: 2 }),
      sender.send(chatFields({ k: newChatKey(), q: 1, x: "Jestem" })),
    ]);
  } finally {
    Date.now = realNow;
    restore();
  }
  assert.equal(a, frozen);
  assert.equal(b, frozen + 1, "strictly rising, so the relay's 409 cannot happen");
  assert.deepEqual(posts.map((p) => p.ts), [frozen, frozen + 1]);

  // A receiver on the same generation accepts both.
  const chats = [];
  const roster = createRoster({
    channelId: gen.channelId,
    ratchet: gen.ratchet,
    selfId: RSELF,
    pinned: new Map(),
    onChat: (from, obj) => chats.push(obj.x),
  });
  await roster.ingest([{ m: identity.memberId, alg: identity.alg, pk: b64uEncode(identity.pk), epk: b64uEncode(identity.epk), points: posts.map((p) => ({ e: p.e, ts: p.ts, srv: p.ts, n: p.n, c: p.c, sig: p.sig })) }], frozen + 5);
  assert.deepEqual(chats, ["Jestem"]);
  assert.equal(roster.get(identity.memberId).ts, frozen, "and the position landed too");
});

test("messages go out in the order they were written, through the one shared sender", async () => {
  const identity = await generateIdentity();
  const e = epochAt(Date.now());
  const gen = await openGeneration({ seed: newSeed(), g: 0, e0: e - 2, historyEpochs: 6 });
  let last = 0;
  const posts = [];
  const sender = createSender({
    identity,
    channelId: gen.channelId,
    ratchet: gen.ratchet,
    getLastTs: async () => last,
    setLastTs: async (ts) => {
      last = ts;
    },
  });
  const restore = stubFetch(posts);
  const ctl = createChatController({ send: (f) => sender.send(f), save: async () => {} });
  ctl.adopt(null);
  ctl.setCircle("c".repeat(32));
  try {
    for (const x of ["jeden", "dwa", "trzy", "cztery"]) ctl.post(x);
    sender.send({ t: "loc", lat: 1, lon: 1 });
    for (let i = 0; i < 50 && posts.length < 5; i++) await new Promise((r) => setTimeout(r, 5));
  } finally {
    restore();
  }
  assert.equal(posts.length, 5);
  for (let i = 1; i < posts.length; i++) assert.ok(posts[i].ts > posts[i - 1].ts, "ts strictly rising across chat and positions");
  // Decrypt to read the order back.
  const roster = createRoster({ channelId: gen.channelId, ratchet: gen.ratchet, selfId: RSELF, pinned: new Map(), onChat: (f, o) => order.push([o.q, o.x]) });
  const order = [];
  await roster.ingest([{ m: identity.memberId, alg: identity.alg, pk: b64uEncode(identity.pk), epk: b64uEncode(identity.epk), points: posts.map((p) => ({ e: p.e, ts: p.ts, n: p.n, c: p.c, sig: p.sig })) }]);
  assert.deepEqual(order, [[1, "jeden"], [2, "dwa"], [3, "trzy"], [4, "cztery"]]);
  assert.ok(ctl.items().every((i) => i.st === "sent"));
});
