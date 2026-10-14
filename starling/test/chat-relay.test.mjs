// Two members of one circle chatting through the real relay code.
//
// The relay worker runs in-process against the D1 shim (the real SQL from
// relay/schema.sql on node:sqlite), and everything on the device side is the
// app's own: createSender seals, signs and POSTs, createPoller GETs the
// channel feed, createRoster verifies and decrypts, and the chat controller
// queues, dedups and keeps the archive. Only fetch is pointed at the worker
// instead of a socket.
import test from "node:test";
import assert from "node:assert/strict";

import worker from "../relay/src/index.js";
import { makeD1 } from "./d1shim.mjs";
import { createPoller, createRoster, createSender } from "../app/js/net.js";
import { openGeneration } from "../app/js/rekey.js";
import { epochAt } from "../app/js/ratchet.js";
import { generateIdentity, newSeed } from "../app/js/crypto.js";
import { chatFields, createChatController } from "../app/js/chat.js";

const ORIGIN = "http://127.0.0.1:8899";
const env = { DB: makeD1(), RATE_POST_MIN: "1000000", RATE_GET_MIN: "1000000" };

// Every request the app makes goes to the worker, as it would through serve_local.mjs.
const prevFetch = globalThis.fetch;
const prevDoc = Object.getOwnPropertyDescriptor(globalThis, "document");
const relayLog = [];
globalThis.fetch = async (url, init = {}) => {
  const headers = { "cf-connecting-ip": "10.1.2.3", ...(init.headers || {}) };
  const res = await worker.fetch(new Request(`${ORIGIN}${url}`, { method: init.method || "GET", headers, body: init.body }), env);
  relayLog.push({ method: init.method || "GET", status: res.status, at: relayLog.length });
  return res;
};
globalThis.document = { visibilityState: "visible", addEventListener() {}, removeEventListener() {} };

const pollers = [];
test.after(() => {
  for (const p of pollers) p.stop();
  globalThis.fetch = prevFetch;
  if (prevDoc) Object.defineProperty(globalThis, "document", prevDoc);
  else delete globalThis.document;
});

const seed = newSeed();
const E0 = epochAt(Date.now()) - 1;

// One phone: its identity, its own copy of the generation, and the app's
// network and chat pieces wired the way main.js wires them.
async function phone(name, { identity, archive = null } = {}) {
  const born = relayLog.length ? relayLog.at(-1).at + 1 : 0;
  const me = identity || (await generateIdentity());
  const gen = await openGeneration({ seed: new Uint8Array(seed), g: 0, e0: E0, historyEpochs: 6 });
  let last = 0;
  const disk = { archive };
  const incoming = [];
  const sender = createSender({
    identity: me,
    channelId: gen.channelId,
    ratchet: gen.ratchet,
    getLastTs: async () => last,
    setLastTs: async (ts) => {
      last = ts;
    },
  });
  const chat = createChatController({
    send: (fields) => sender.send(fields),
    save: async (a) => {
      disk.archive = JSON.parse(JSON.stringify(a));
    },
    onIncoming: (item) => incoming.push(item.x),
  });
  chat.adopt(disk.archive, new Set([me.memberId]));
  chat.setCircle(me.memberId);
  const roster = createRoster({
    channelId: gen.channelId,
    ratchet: gen.ratchet,
    selfId: me.memberId,
    pinned: new Map(),
    onChat: (from, obj, e, ts) => chat.receive(from, obj, e, ts),
  });
  const poller = createPoller({ channelId: gen.channelId, roster, ratchet: gen.ratchet });
  pollers.push(poller);
  // Started the way setupNet starts it: the first read goes out at once. The
  // tests then read again by hand with pollNow instead of waiting ten seconds.
  let done;
  const first = new Promise((r) => (done = r));
  poller.start();
  const wait = setInterval(() => {
    if (relayLog.some((r) => r.method === "GET" && r.at >= born)) {
      clearInterval(wait);
      done();
    }
  }, 2);
  await first;
  await new Promise((r) => setTimeout(r, 10));
  return { name, me, gen, sender, chat, roster, poller, disk, incoming };
}

async function settle(p) {
  for (let i = 0; i < 100 && p.chat.pending().length; i++) await new Promise((r) => setTimeout(r, 5));
  await p.chat.flushed();
}

const texts = (p) => p.chat.items().filter((i) => i.kind === "msg").map((i) => [i.mine ? "me" : i.from.slice(0, 4), i.x]);

let alice;
let bob;

test("two members exchange messages both ways through the relay", async () => {
  alice = await phone("alice");
  bob = await phone("bob");
  const a = alice.me.memberId.slice(0, 4);
  const b = bob.me.memberId.slice(0, 4);

  assert.ok(alice.chat.post("Cześć, jestem już w domu").ok);
  await alice.sender.send({ t: "loc", lat: 52.23, lon: 21.01, name: "Alice" });
  assert.ok(alice.chat.post("Obiad za 20 minut").ok);
  await settle(alice);
  assert.deepEqual(alice.chat.items().map((i) => i.st), ["sent", "sent"], "Sent once the relay said 200");

  await bob.poller.pollNow();
  assert.deepEqual(texts(bob), [[a, "Cześć, jestem już w domu"], [a, "Obiad za 20 minut"]]);
  assert.deepEqual(bob.incoming, ["Cześć, jestem już w domu", "Obiad za 20 minut"]);
  assert.equal(bob.roster.get(alice.me.memberId).lat, 52.23, "the position between them landed as a position");
  assert.equal(bob.chat.unread(), 2);

  assert.ok(bob.chat.post("OK, będę po siedemnastej").ok);
  await settle(bob);
  await alice.poller.pollNow();
  assert.deepEqual(texts(alice), [["me", "Cześć, jestem już w domu"], ["me", "Obiad za 20 minut"], [b, "OK, będę po siedemnastej"]]);
  assert.ok(relayLog.some((r) => r.method === "POST" && r.status === 200));
  assert.ok(!relayLog.some((r) => r.status === 409), "no ts conflict between chat and positions");
});

test("the relay stores a chat message as an opaque row, the same size as a position", async () => {
  const rows = await env.DB.prepare("SELECT member, length(c) AS len FROM points_v3").bind().all();
  const lens = new Set(rows.results.map((r) => r.len));
  assert.equal(lens.size, 1, `one ciphertext length for every row: ${[...lens]}`);
  const dump = JSON.stringify(rows.results);
  assert.ok(!dump.includes("chat") && !dump.includes("obiad"), "no type, no text");
});

test("a restarted phone rereads the whole window and shows nothing twice", async () => {
  // A new roster and poller start the cursor at the window again, exactly as
  // after an app restart; the archive written to disk is all that remembers.
  const again = await phone("bob", { identity: bob.me, archive: bob.disk.archive });
  const before = texts(again).length;
  await again.poller.pollNow();
  assert.equal(texts(again).length, before);
  assert.deepEqual(again.incoming, [], "nobody is told about old messages again");
  bob = again;
});

test("a retry whose first post did land shows once: the id is the same, the ts is not", async () => {
  // The answer to the first POST was lost, so the queue sent it again with a
  // new ts. The relay now holds two rows of one message.
  const fields = chatFields({ k: "RetryRetry1", q: 3, x: "Weź klucze" });
  const t1 = await alice.sender.send(fields);
  const t2 = await alice.sender.send(fields);
  assert.ok(t2 > t1);
  await bob.poller.pollNow();
  assert.equal(texts(bob).filter(([, x]) => x === "Weź klucze").length, 1);
});

test("a message the relay never delivered shows up as an honest gap", async () => {
  // q 4 and 5 never reach Bob (trimmed off the relay, or under a key his
  // phone no longer has); q 6 does.
  await alice.sender.send(chatFields({ k: "GapGapGap06", q: 6, x: "Jesteś?" }));
  await bob.poller.pollNow();
  const gaps = bob.chat.items().filter((i) => i.kind === "gap");
  assert.deepEqual(gaps.map((g) => [g.from, g.lo, g.hi]), [[alice.me.memberId, 4, 5]]);
  const order = bob.chat.items().map((i) => i.kind);
  assert.equal(order[order.length - 2], "gap", "the note stands right before the message that revealed it");
});

test("the circle's own messages never come back as incoming", async () => {
  const mine = alice.chat.items().filter((i) => i.mine).length;
  await alice.poller.pollNow();
  assert.equal(alice.chat.items().filter((i) => i.mine).length, mine);
  assert.ok(alice.incoming.every((x) => !["Cześć, jestem już w domu", "Obiad za 20 minut"].includes(x)));
});
