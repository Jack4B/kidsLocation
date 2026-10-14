// Family chat, the pure half: the envelope and its byte budget, what the
// composer allows, how a receiver reads a message, dedup, gap detection,
// local retention, the send queue, and what a notification may say.
//
// Spec: docs/CHAT.md; kidsLocation ADR-001 (variant A, envelope E6).
import test from "node:test";
import assert from "node:assert/strict";

import { PAD_LEN, PAD_RESERVE, b64uEncode } from "../app/js/wire.js";
import { sealMessage, openMessage } from "../app/js/crypto.js";
import {
  CHAT_BUDGET,
  CHAT_SOFT_CHARS,
  CHAT_TEXT_BUDGET,
  CHAT_RETENTION_MS,
  CHAT_KEEP_MAX,
  QUICK_REPLIES,
  addOwn,
  addSystem,
  chatEnvelopeBytes,
  chatFields,
  chatMeasure,
  chatNotice,
  gapCount,
  GAP_SHOWN_MAX,
  chatTextBytes,
  createChatController,
  createChatQueue,
  emptyLog,
  ingestChat,
  markSent,
  newChatKey,
  normalizeChat,
  purgeLog,
  readChat,
  sanitizeArchive,
  sanitizeLog,
  unreadCount,
} from "../app/js/chat.js";

const te = new TextEncoder();
const A = "a".repeat(32);
const B = "b".repeat(32);
const C = "c".repeat(32);
const CHANNEL = "d".repeat(32);
const MEMBER = "e".repeat(32);
const E = 1000;
const TS = E * 600_000 + 1234;

async function keyAt() {
  return crypto.subtle.importKey("raw", new Uint8Array(32).fill(7), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

// A message parent to child, the kind the chat is for. 7 to 8 percent of its
// letters carry diacritics, about what everyday Polish has.
const POLISH =
  "Wracam ze szkoły o piętnastej, potem idę na trening. Zjem obiad u babci i będę w domu koło osiemnastej. " +
  "Nie zapomnij wziąć kluczy, bo mama wraca później. Jakby co, dzwoń albo pisz tutaj. ";
const polish280 = () => POLISH.repeat(4).slice(0, 280).trim().padEnd(280, ".");
const DIACRITICS = "ąćęłńóśźżĄĆĘŁŃÓŚŹŻ";
const allDiacritics = (n) => Array.from({ length: n }, (_, i) => DIACRITICS[i % DIACRITICS.length]).join("");

// The largest chat object the app can build: every field at its longest.
function worstChat(x) {
  return { v: 2, ts: Number.MAX_SAFE_INTEGER, t: "chat", k: "A".repeat(11), q: Number.MAX_SAFE_INTEGER, x };
}

// ------------------------------------------------------------- the budget

test("the chat budget is the one every message keeps, and the text gets what the envelope leaves", () => {
  assert.equal(CHAT_BUDGET, PAD_LEN - PAD_RESERVE);
  assert.equal(CHAT_BUDGET, 488);
  // ADR-001 3.1 measured 86 bytes of envelope and 402 for the text; a change
  // to the envelope has to show up here.
  assert.equal(chatEnvelopeBytes(""), 86);
  assert.equal(CHAT_TEXT_BUDGET, 402);
  assert.equal(chatEnvelopeBytes(""), te.encode(JSON.stringify(worstChat(""))).length);
});

test("the largest chat message the app accepts fits PAD_LEN with the reserve to spare", async () => {
  const key = await keyAt();
  for (const x of ["a".repeat(CHAT_TEXT_BUDGET), allDiacritics(CHAT_TEXT_BUDGET / 2), "\u{1F98A}".repeat(CHAT_TEXT_BUDGET / 4), '"'.repeat(CHAT_TEXT_BUDGET / 2), "漢".repeat(134)]) {
    const m = chatMeasure(x);
    if (m.chars > CHAT_SOFT_CHARS) {
      assert.equal(m.ok, false);
      continue;
    }
    assert.ok(m.ok, `accepted: ${x.slice(0, 8)}`);
    const msg = worstChat(m.text);
    const bytes = te.encode(JSON.stringify(msg)).length;
    assert.ok(bytes <= PAD_LEN - PAD_RESERVE, `${bytes} bytes, the budget is ${PAD_LEN - PAD_RESERVE}`);
    const sealed = await sealMessage(key, CHANNEL, MEMBER, E, TS, msg);
    assert.equal(sealed.c.length, PAD_LEN + 16, "a chat message is the size of every other message");
    const opened = await openMessage(key, CHANNEL, MEMBER, E, TS, sealed.n, sealed.c);
    assert.equal(opened.x, m.text);
  }
});

test("one byte over the budget is refused by the composer and by the envelope builder", () => {
  const over = "a".repeat(CHAT_TEXT_BUDGET - 1) + "ą";
  assert.equal(chatTextBytes(over), CHAT_TEXT_BUDGET + 1);
  const m = chatMeasure(over);
  assert.equal(m.ok, false);
  assert.equal(m.reason, "chars", "403 characters is over the soft limit first");
  const wide = allDiacritics(202);
  assert.equal(chatMeasure(wide).reason, "bytes");
  assert.throws(() => chatFields({ k: newChatKey(), q: 1, x: wide }), /chat: bytes/);
});

test("280 characters of everyday Polish fit, with room to spare", () => {
  const text = polish280();
  assert.equal(Array.from(text).length, 280);
  const share = [...text].filter((c) => DIACRITICS.includes(c)).length / 280;
  assert.ok(share > 0.04 && share < 0.12, `diacritics share ${share}`);
  const m = chatMeasure(text);
  assert.ok(m.ok, JSON.stringify({ reason: m.reason, bytes: m.bytes }));
  assert.equal(m.limit, 280, "the counter says 280 when the bytes would allow more");
  assert.ok(m.bytesLeft > 0);
  const fields = chatFields({ k: newChatKey(), q: 7, x: text });
  assert.equal(fields.x, text, "nothing is cut");
});

test("a text of nothing but Polish letters with diacritics is refused, with an honest count", () => {
  const fits = chatMeasure(allDiacritics(201));
  assert.equal(fits.ok, true, "201 two-byte letters are exactly the 402 bytes");
  assert.equal(fits.limit, 201, "the counter shows the real ceiling, not 280");
  const text = allDiacritics(280);
  const m = chatMeasure(text);
  assert.equal(m.ok, false);
  assert.equal(m.reason, "bytes");
  assert.ok(m.limit < m.chars, "the counter shows the text is over");
  assert.equal(m.limit, 280 + CHAT_TEXT_BUDGET - 560);
  // Never silently shortened: the builder refuses rather than truncating.
  assert.throws(() => chatFields({ k: newChatKey(), q: 1, x: text }), /bytes/);
});

test("the counter's ceiling falls as wide characters go in", () => {
  assert.equal(chatMeasure("").limit, 280);
  assert.equal(chatMeasure("").reason, "empty");
  assert.equal(chatMeasure("abc").limit, 280);
  // 150 two-byte letters use 300 bytes; 102 bytes are left, so at most 252 characters in all.
  assert.equal(chatMeasure(allDiacritics(150)).limit, 252);
  // An emoji counts as one character and four bytes.
  const m = chatMeasure("\u{1F600}".repeat(100));
  assert.equal(m.chars, 100);
  assert.equal(m.bytes, 400);
  assert.equal(m.limit, 102);
});

test("text is one line: breaks become spaces, controls go, outer space trims", () => {
  assert.equal(normalizeChat("a\nb"), "a b");
  assert.equal(normalizeChat("a\r\n\r\nb"), "a b");
  assert.equal(normalizeChat("  hi\u0007 "), "hi");
  assert.equal(normalizeChat("x\ud800y"), "xy");
  assert.equal(normalizeChat(null), "");
  assert.equal(chatMeasure("\n\n  ").reason, "empty");
});

test("the envelope is {v, ts, t, k, q, x} once the sender adds v and ts, and ids are 64 random bits", () => {
  const k = newChatKey();
  assert.match(k, /^[A-Za-z0-9_-]{11}$/);
  assert.notEqual(newChatKey(), k);
  const msg = { v: 2, ts: TS, ...chatFields({ k, q: 3, x: "Jestem" }) };
  assert.deepEqual(Object.keys(msg), ["v", "ts", "t", "k", "q", "x"]);
  assert.throws(() => chatFields({ k: "short", q: 1, x: "a" }), /bad id/);
  assert.throws(() => chatFields({ k, q: 0, x: "a" }), /sequence/);
  assert.throws(() => chatFields({ k, q: 1, x: "   " }), /empty/);
});

test("a receiver believes only a well-formed message", () => {
  const k = b64uEncode(new Uint8Array(8));
  assert.deepEqual(readChat({ t: "chat", k, q: 1, x: "hi" }), { k, q: 1, x: "hi" });
  assert.equal(readChat({ t: "loc", k, q: 1, x: "hi" }), null);
  assert.equal(readChat({ t: "chat", k: "x", q: 1, x: "hi" }), null);
  assert.equal(readChat({ t: "chat", k, q: 1.5, x: "hi" }), null);
  assert.equal(readChat({ t: "chat", k, q: -1, x: "hi" }), null);
  assert.equal(readChat({ t: "chat", k, q: 1, x: 42 }), null);
  assert.equal(readChat({ t: "chat", k, q: 1, x: "\u0000\u0001" }), null);
  assert.equal(readChat({ t: "chat", k, q: 1, x: "a\nb" }).x, "a b");
  assert.equal(readChat({ t: "chat", k, q: 1, x: "z".repeat(5000) }).x.length, 1024, "a peer's oversize text is bounded");
});

// --------------------------------------------------- dedup and gap detection

const obj = (q, x = `m${q}`, k = `k${String(q).padStart(10, "0")}`) => ({ t: "chat", k, q, x });

test("the same message twice is one message: by (member, e, ts) and by (member, id)", () => {
  const log = emptyLog();
  assert.ok(ingestChat(log, { from: A, e: E, ts: TS, obj: obj(1) }));
  assert.equal(ingestChat(log, { from: A, e: E, ts: TS, obj: obj(1) }), null, "a replayed point");
  assert.equal(ingestChat(log, { from: A, e: E, ts: TS + 50, obj: obj(1) }), null, "a retry with a new ts");
  assert.equal(ingestChat(log, { from: A, e: E, ts: TS, obj: obj(2) }), null, "a different message under a seen (e, ts)");
  assert.ok(ingestChat(log, { from: B, e: E, ts: TS, obj: obj(1) }), "another member's id space is their own");
  assert.equal(log.items.filter((i) => i.kind === "msg").length, 2);
});

test("a hole in a sender's numbers becomes a gap, and late arrivals fill it", () => {
  const log = emptyLog();
  ingestChat(log, { from: A, e: E, ts: TS + 1, obj: obj(4) });
  assert.equal(log.items.filter((i) => i.kind === "gap").length, 0, "the first number seen is a start, not a loss");
  ingestChat(log, { from: A, e: E, ts: TS + 2, obj: obj(5) });
  ingestChat(log, { from: A, e: E, ts: TS + 9, obj: obj(9) });
  let gaps = log.items.filter((i) => i.kind === "gap");
  assert.deepEqual(gaps.map((g) => [g.from, g.lo, g.hi]), [[A, 6, 8]]);
  const at = log.items.indexOf(gaps[0]);
  assert.equal(log.items[at + 1].q, 9, "the gap stands right in front of the message that revealed it");

  ingestChat(log, { from: A, e: E, ts: TS + 7, obj: obj(7) });
  gaps = log.items.filter((i) => i.kind === "gap");
  assert.deepEqual(gaps.map((g) => [g.lo, g.hi]), [[6, 6], [8, 8]], "a number from the middle splits the gap");
  ingestChat(log, { from: A, e: E, ts: TS + 6, obj: obj(6) });
  ingestChat(log, { from: A, e: E, ts: TS + 8, obj: obj(8) });
  assert.equal(log.items.filter((i) => i.kind === "gap").length, 0, "every hole filled");
  assert.deepEqual(
    log.items.filter((i) => i.kind === "msg").map((i) => i.q),
    [4, 5, 6, 7, 8, 9],
    "the timeline is in the sender's order",
  );
});

test("numbering that starts over is a reinstall, not a thousand lost messages", () => {
  const log = emptyLog();
  ingestChat(log, { from: A, e: E, ts: TS, obj: obj(40) });
  ingestChat(log, { from: A, e: E, ts: TS + 10, obj: obj(1, "again", "kAAAAAAAAAA") });
  ingestChat(log, { from: A, e: E, ts: TS + 20, obj: obj(2, "two", "kBBBBBBBBBB") });
  assert.equal(log.items.filter((i) => i.kind === "gap").length, 0);
  assert.equal(log.peers[A].hi, 2);
});

test("gaps are per sender", () => {
  const log = emptyLog();
  ingestChat(log, { from: A, e: E, ts: TS, obj: obj(1) });
  ingestChat(log, { from: B, e: E, ts: TS + 1, obj: obj(1) });
  ingestChat(log, { from: B, e: E, ts: TS + 2, obj: obj(3) });
  ingestChat(log, { from: A, e: E, ts: TS + 3, obj: obj(2) });
  assert.deepEqual(log.items.filter((i) => i.kind === "gap").map((g) => [g.from, g.lo, g.hi]), [[B, 2, 2]]);
});

test("own messages are numbered from the log and move to their sent ts", () => {
  const log = emptyLog();
  const a = addOwn(log, { from: C, x: "one" }, TS);
  const b = addOwn(log, { from: C, x: "two" }, TS + 1);
  assert.deepEqual([a.q, b.q], [1, 2]);
  assert.equal(a.st, "sending");
  markSent(log, a.id, TS + 500);
  assert.equal(a.st, "sent");
  assert.deepEqual(log.items.map((i) => i.x), ["two", "one"], "a sent message sits at the ts the relay has");
});

// ---------------------------------------------------------- retention

test("the phone keeps 30 days, and the cap keeps the newest", () => {
  const now = Date.UTC(2026, 9, 14);
  const day = 24 * 60 * 60 * 1000;
  const log = emptyLog();
  ingestChat(log, { from: A, e: 1, ts: now - 31 * day, obj: obj(1) }, now - 31 * day);
  ingestChat(log, { from: A, e: 2, ts: now - 29 * day, obj: obj(2) }, now - 29 * day);
  addSystem(log, { from: A, ev: "arrive", place: "Dom" }, now - 40 * day);
  const old = addOwn(log, { from: C, x: "old" }, now - 35 * day);
  markSent(log, old.id, now - 35 * day);
  assert.equal(CHAT_RETENTION_MS, 30 * day);
  const n = purgeLog(log, now);
  assert.equal(n, 3);
  assert.deepEqual(log.items.map((i) => i.q ?? i.kind), [2]);

  const big = emptyLog();
  for (let i = 1; i <= 30; i++) ingestChat(big, { from: A, e: 1, ts: now - 1000 + i, obj: obj(i) }, now);
  purgeLog(big, now, CHAT_RETENTION_MS, 10);
  assert.deepEqual(big.items.map((i) => i.q), [21, 22, 23, 24, 25, 26, 27, 28, 29, 30]);
  assert.ok(CHAT_KEEP_MAX >= 1000);
});

test("unread counts other people's messages after the last look", () => {
  const log = emptyLog();
  ingestChat(log, { from: A, e: E, ts: TS, obj: obj(1) }, 100);
  addOwn(log, { from: C, x: "mine" }, 150);
  ingestChat(log, { from: B, e: E, ts: TS + 1, obj: obj(1) }, 200);
  assert.equal(unreadCount(log), 2);
  log.read = 150;
  assert.equal(unreadCount(log), 1);
});

// ---------------------------------------------------------- the archive

test("an archive read back keeps only well-formed entries of circles still here", () => {
  const log = emptyLog();
  ingestChat(log, { from: A, e: E, ts: TS, obj: obj(1) }, TS);
  ingestChat(log, { from: A, e: E, ts: TS + 5, obj: obj(3) }, TS);
  const mine = addOwn(log, { from: C, x: "pending" }, TS + 6);
  const json = JSON.parse(JSON.stringify({ v: 1, circles: { [C]: log, [B]: emptyLog(), junk: log } }));
  json.circles[C].items.push({ kind: "msg", from: "zz", ts: 1 }, { kind: "evil", from: A, ts: 1 }, null);
  const back = sanitizeArchive(json, new Set([C]));
  assert.deepEqual(Object.keys(back.circles), [C], "a left circle and a junk key are gone");
  const items = back.circles[C].items;
  assert.equal(items.length, 4);
  assert.deepEqual(items.map((i) => i.kind), ["msg", "gap", "msg", "msg"]);
  assert.equal(items.find((i) => i.id === mine.id).st, "failed", "a send cut short comes back for the person to retry");
  assert.equal(back.circles[C].q, 1);
  assert.deepEqual(back.circles[C].peers, { [A]: { hi: 3 } });
  assert.deepEqual(sanitizeLog("garbage"), emptyLog());
});

// --------------------------------------------------------------- the queue

const tick = () => new Promise((r) => setTimeout(r, 0));

test("the queue is first in, first out, and a failing head holds the line", async () => {
  const sent = [];
  let fail = 2;
  const settled = [];
  const q = createChatQueue({
    backoff: [5, 5],
    send: async (job) => {
      if (job.id === "a" && fail-- > 0) throw new Error("offline");
      sent.push(job.id);
      return 1000 + sent.length;
    },
    onSent: (job, ts) => settled.push([job.id, ts]),
    onRetry: (job) => settled.push([job.id, "retry"]),
  });
  q.enqueue({ id: "a" });
  q.enqueue({ id: "b" });
  q.enqueue({ id: "c" });
  for (let i = 0; i < 20 && sent.length < 3; i++) await new Promise((r) => setTimeout(r, 10));
  assert.deepEqual(sent, ["a", "b", "c"], "b never overtook the failing a");
  assert.deepEqual(settled, [["a", "retry"], ["a", "retry"], ["a", 1001], ["b", 1002], ["c", 1003]]);
  assert.deepEqual(q.pending(), []);
});

test("a head that keeps failing is given up as failed, and the line moves on", async () => {
  const failed = [];
  const sent = [];
  const q = createChatQueue({
    backoff: [1],
    maxTries: 3,
    send: async (job) => {
      if (job.id === "a") throw new Error("nope");
      sent.push(job.id);
      return 1;
    },
    onFailed: (job) => failed.push(job.id),
  });
  q.enqueue({ id: "a" });
  q.enqueue({ id: "b" });
  for (let i = 0; i < 20 && !sent.length; i++) await new Promise((r) => setTimeout(r, 5));
  assert.deepEqual(failed, ["a"]);
  assert.deepEqual(sent, ["b"]);
});

test("clearing the queue drops everything, and a post in flight speaks for nobody", async () => {
  let release;
  const settled = [];
  const q = createChatQueue({
    send: () => new Promise((r) => (release = r)),
    onSent: (job) => settled.push(job.id),
  });
  q.enqueue({ id: "a" });
  q.enqueue({ id: "b" });
  await tick();
  const dropped = q.clear();
  assert.deepEqual(dropped.map((j) => j.id), ["a", "b"]);
  release(5);
  await tick();
  assert.deepEqual(settled, []);
  assert.deepEqual(q.pending(), []);
});

// ------------------------------------------------------- notifications

test("without the lock-screen choice a notification says neither who wrote nor what", () => {
  // Android shows the private version on a secure lock screen by default, so
  // without chatOnLock nothing of the sender or the message may go in at all.
  for (const preview of [false, true]) {
    const off = chatNotice({ name: "Marta", text: "Kod do furtki to 4711", preview });
    assert.deepEqual(off, { title: "New message", body: "Open the app to read it.", onLock: false }, `preview ${preview}`);
    assert.ok(!JSON.stringify(off).includes("Marta"), "no name");
    assert.ok(!JSON.stringify(off).includes("4711"), "no word of the message");
  }
  // Only true counts: a stray truthy value from a damaged settings record does not open it.
  assert.equal(chatNotice({ name: "Marta", text: "x", preview: true, onLock: "yes" }).title, "New message");
});

test("with the lock-screen choice the name goes in, and the text only when that is switched on too", () => {
  const named = chatNotice({ name: "Marta", text: "Kod 4711", onLock: true });
  assert.deepEqual(named, { title: "New message from Marta", body: "Open the app to read it.", onLock: true });
  assert.ok(!JSON.stringify(named).includes("4711"));

  const full = chatNotice({ name: "Marta", text: "Kod 4711", preview: true, onLock: true });
  assert.deepEqual(full, { title: "New message from Marta", body: "Kod 4711", onLock: true });
  assert.equal(chatNotice({ name: "", text: "x", onLock: true }).title, "New message from Someone");
  assert.equal(chatNotice({ name: "M", text: "y".repeat(500), preview: true, onLock: true }).body.length, 160);
});

test("a gap note counts only what a phone could plausibly have missed", () => {
  assert.equal(gapCount({ lo: 3, hi: 3 }), 1);
  assert.equal(gapCount({ lo: 3, hi: 7 }), 5);
  assert.equal(gapCount({ lo: 1, hi: GAP_SHOWN_MAX }), GAP_SHOWN_MAX);
  assert.equal(gapCount({ lo: 1, hi: GAP_SHOWN_MAX + 1 }), null, "past the bound: no number");
  assert.equal(gapCount({ lo: 2, hi: Number.MAX_SAFE_INTEGER }), null);
  assert.equal(gapCount({ lo: 1, hi: Number.MAX_SAFE_INTEGER }), null, "the count itself is not a safe integer");
  assert.equal(gapCount({ lo: 5, hi: 4 }), null);
  assert.equal(gapCount({ lo: "x", hi: 4 }), null);
  assert.equal(gapCount(null), null);
});

test("quick replies are the four from the mockup, each a valid message", () => {
  assert.deepEqual(QUICK_REPLIES, ["I'm here", "Back in 10 min", "Pick me up", "OK"]);
  for (const pl of ["Jestem", "Wracam za 10 min", "Odbierz mnie", "OK"]) assert.ok(chatMeasure(pl).ok);
});

// ------------------------------------------------------- the controller

test("the controller ties post, send, receive and unread together", async () => {
  const wire = [];
  const saved = [];
  const incoming = [];
  let clock = TS;
  const ctl = createChatController({
    now: () => clock,
    send: async (fields) => {
      wire.push(fields);
      return (clock += 10);
    },
    save: async (archive) => saved.push(JSON.parse(JSON.stringify(archive))),
    onIncoming: (item) => incoming.push(item.x),
  });
  assert.deepEqual(ctl.post("hi"), { ok: false, reason: "no-circle" });
  ctl.adopt(null, new Set([C]));
  ctl.setCircle(C);
  const bad = ctl.post(allDiacritics(250));
  assert.equal(bad.ok, false);
  assert.equal(bad.reason, "bytes");
  assert.equal(ctl.items().length, 0, "nothing over budget even enters the timeline");

  const r = ctl.post("  Jestem w szkole\n");
  assert.ok(r.ok);
  await tick();
  await tick();
  assert.deepEqual(wire, [{ t: "chat", k: r.item.k, q: 1, x: "Jestem w szkole" }]);
  assert.equal(ctl.items()[0].st, "sent");

  ctl.receive(A, obj(1, "OK"), E, TS + 3);
  ctl.receive(A, obj(1, "OK"), E, TS + 3);
  assert.deepEqual(incoming, ["OK"], "told once");
  assert.equal(ctl.unread(), 1);
  clock += 100;
  ctl.markRead();
  assert.equal(ctl.unread(), 0);
  assert.equal(ctl.receive(C, obj(2), E, TS + 4), null, "never our own echo");
  await ctl.flushed();
  assert.ok(saved.length >= 2);
  assert.equal(saved.at(-1).circles[C].items.length, 2);

  await ctl.forget(C);
  assert.deepEqual(ctl.archive().circles, {});
  ctl.reset();
  assert.equal(ctl.loaded(), false);
  assert.deepEqual(ctl.items(), []);
});

test("a circle switch drops the old circle's queue and marks it failed there", async () => {
  let release;
  const ctl = createChatController({ send: () => new Promise((r) => (release = r)), save: async () => {} });
  ctl.adopt(null);
  ctl.setCircle(C);
  ctl.post("one");
  ctl.post("two");
  await tick();
  ctl.setCircle(B);
  release(1);
  await tick();
  const left = ctl.archive().circles[C].items;
  assert.deepEqual(left.map((i) => i.st), ["failed", "failed"], "nothing crosses into the other circle");
  assert.deepEqual(ctl.pending(), []);
  ctl.setCircle(C);
  assert.equal(ctl.retry(left[0].id), true);
  assert.equal(ctl.retry(left[0].id), false, "already queued");
});
