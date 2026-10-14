// Family chat: the message format, the byte budget, the local archive, gap
// detection and the send queue. No DOM, no storage and no network here:
// main.js injects the sender and the at-rest writer, chatview.js draws.
//
// Spec: docs/CHAT.md (wire format and receive rules) and the kidsLocation
// ADR-001 it implements (variant A: a "chat" kind in each member's existing
// stream, envelope {v, ts, t:"chat", k, q, x}, nothing new on the relay).
//
// What this promises and what it does not:
// - A message is sealed, padded and signed exactly like a position, so the
//   relay cannot tell the two apart by type or by size.
// - The relay keeps it at most 24 hours and only while the sender's own
//   240 newest posts still include it. A phone that is offline longer than
//   its history window cannot decrypt it at all. Neither loss is silent:
//   every sender numbers their messages (q) and a hole in the numbers is
//   shown to the reader.
// - "Sent" means the relay accepted it, never that anyone read it.

import { PAD_LEN, PAD_RESERVE, b64uEncode, cleanText } from "./wire.js";

const te = new TextEncoder();
const jsonBytes = (v) => te.encode(JSON.stringify(v)).length;

// The message text is limited in two ways. The hard one is bytes: the whole
// sealed object has to stay within PAD_LEN minus the reserve every other
// message keeps, which leaves CHAT_TEXT_BUDGET bytes for the JSON-encoded
// text. The soft one is characters, a limit people can see and count.
export const CHAT_SOFT_CHARS = 280;
export const CHAT_BUDGET = PAD_LEN - PAD_RESERVE;
// The longest envelope the app can build: the largest ts and q the format
// allows and an id at its full length. Measured, not hand-counted, so a
// change to the envelope moves the budget with it.
const WORST_ENVELOPE = { v: 2, ts: Number.MAX_SAFE_INTEGER, t: "chat", k: "A".repeat(11), q: Number.MAX_SAFE_INTEGER };
export const CHAT_TEXT_BUDGET = CHAT_BUDGET - jsonBytes({ ...WORST_ENVELOPE, x: "" });
export const chatEnvelopeBytes = (x) => jsonBytes({ ...WORST_ENVELOPE, x });
// Bytes the text costs inside the JSON: quotes and backslashes count twice,
// Polish letters two bytes, emoji four.
export const chatTextBytes = (x) => jsonBytes(String(x)) - 2;

// Local keeping: how long, and how much at most per circle.
export const CHAT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const CHAT_KEEP_MAX = 3000;
// The chips under the timeline. Short on purpose: one tap, no typing.
export const QUICK_REPLIES = ["I'm here", "Back in 10 min", "Pick me up", "OK"];

const KEY_RE = /^[A-Za-z0-9_-]{11}$/;
const ID_RE = /^[0-9a-f]{32}$/;
const RECV_MAX = 1024;

// One line of text as it would be sent. Line breaks become spaces rather than
// vanishing (cleanText removes control characters, and "a\nb" read as "ab"
// is a different message), then the same cleaning every other text field
// gets, then outer spaces off.
export function normalizeChat(raw) {
  if (typeof raw !== "string") return "";
  return cleanText(raw.replace(/[\r\n\t\u2028\u2029]+/g, " "), 4096).trim();
}

// Characters as a person counts them: an emoji is one, not two.
export const charCount = (s) => Array.from(s).length;

// Everything the composer needs to know about what is in it. `limit` is the
// honest ceiling: 280, or less when the text already uses wide characters,
// because the remaining bytes would then not fit 280 of anything. A text over
// the byte budget shows a limit below its own length.
export function chatMeasure(raw) {
  const text = normalizeChat(raw);
  const chars = charCount(text);
  const bytes = chatTextBytes(text);
  const bytesLeft = CHAT_TEXT_BUDGET - bytes;
  const limit = Math.min(CHAT_SOFT_CHARS, chars + bytesLeft);
  let reason = null;
  // Over both limits, the character limit is the one to name: it is the
  // number a person can see.
  if (!chars) reason = "empty";
  else if (chars > CHAT_SOFT_CHARS) reason = "chars";
  else if (bytesLeft < 0) reason = "bytes";
  return { text, chars, bytes, bytesLeft, limit, ok: reason === null, reason };
}

// A message id: 64 random bits, fixed across retries. A retry gets a new ts
// (the sender's ts only ever goes up), so without this a post that landed
// but whose answer was lost would show twice.
export function newChatKey() {
  return b64uEncode(globalThis.crypto.getRandomValues(new Uint8Array(8)));
}

// The fields a chat message puts on the wire; the sender adds v and ts in
// front, which gives the envelope order {v, ts, t, k, q, x}. Refuses
// anything over the byte budget: the composer already said so, and a
// silently shortened message would say something its writer did not.
export function chatFields({ k, q, x }) {
  if (!KEY_RE.test(k)) throw new Error("chat: bad id");
  if (!Number.isSafeInteger(q) || q < 1) throw new Error("chat: bad sequence number");
  const m = chatMeasure(x);
  if (!m.ok) throw new Error(`chat: ${m.reason}`);
  return { t: "chat", k, q, x: m.text };
}

// A decrypted message as a receiver may believe it, or null. The signature,
// the epoch key and the sealed ts have all been checked by the roster before
// this runs; this is shape only.
export function readChat(obj) {
  if (!obj || obj.t !== "chat") return null;
  if (typeof obj.k !== "string" || !KEY_RE.test(obj.k)) return null;
  if (!Number.isSafeInteger(obj.q) || obj.q < 1) return null;
  const x = normalizeChat(typeof obj.x === "string" ? obj.x.slice(0, RECV_MAX) : "");
  if (!x) return null;
  return { k: obj.k, q: obj.q, x };
}

// ---------------------------------------------------------------- the log

// One circle's chat as it lives on this phone. Items:
//   { kind: "msg", id, from, k, q, e, ts, x, at, mine, st }
//      st is "sending", "sent" or "failed" on this device's own messages
//   { kind: "gap", id, from, lo, hi, ts, at }
//      messages lo..hi from `from` never arrived here
//   { kind: "sys", id, from, ev, place, ts, at }
//      a place arrival or departure this phone noticed; local only
// `peers` holds the highest message number seen per sender, `q` this
// device's own last number, `read` when the person last looked.
export function emptyLog() {
  return { q: 0, read: 0, items: [], peers: {} };
}

let idSeq = 0;
const localId = (p) => `${p}${Date.now().toString(36)}${(idSeq++).toString(36)}`;

// Timeline order: by time, a gap in front of the message that revealed it.
const RANK = { gap: 0, sys: 1, msg: 2 };
function order(a, b) {
  return a.ts - b.ts || RANK[a.kind] - RANK[b.kind] || (a.at || 0) - (b.at || 0);
}

function insert(log, item) {
  let i = log.items.length;
  while (i > 0 && order(log.items[i - 1], item) > 0) i--;
  log.items.splice(i, 0, item);
}

function isDup(log, from, k, e, ts) {
  return log.items.some((it) => it.kind === "msg" && it.from === from && (it.k === k || (it.e === e && it.ts === ts)));
}

// A number arrived that a gap was waiting for: shrink or split that gap.
function fillGap(log, from, q) {
  for (let i = 0; i < log.items.length; i++) {
    const g = log.items[i];
    if (g.kind !== "gap" || g.from !== from || q < g.lo || q > g.hi) continue;
    if (g.lo === g.hi) {
      log.items.splice(i, 1);
    } else if (q === g.lo) {
      g.lo += 1;
    } else if (q === g.hi) {
      g.hi -= 1;
    } else {
      const tail = { ...g, id: localId("g"), lo: q + 1 };
      g.hi = q - 1;
      log.items.splice(i + 1, 0, tail);
    }
    return true;
  }
  return false;
}

// Take in one decrypted message. Returns the stored item, or null for a
// duplicate or a malformed message.
//
// Dedup runs on two keys: (sender, epoch, ts), which is what the relay could
// replay, and (sender, id), which is what a retry with a new ts repeats.
// Both live in the archive, so a poller that rereads the whole window after
// a restart does not show anything twice.
export function ingestChat(log, { from, e, ts, obj }, now = Date.now()) {
  if (!ID_RE.test(from) || !Number.isSafeInteger(e) || !Number.isSafeInteger(ts)) return null;
  const msg = readChat(obj);
  if (!msg) return null;
  if (isDup(log, from, msg.k, e, ts)) return null;
  const peer = log.peers[from];
  if (!peer) {
    // First message from this sender on this phone: whatever came before it
    // was before we were listening, not a loss.
    log.peers[from] = { hi: msg.q };
  } else if (msg.q > peer.hi + 1) {
    insert(log, { kind: "gap", id: localId("g"), from, lo: peer.hi + 1, hi: msg.q - 1, ts, at: now });
    peer.hi = msg.q;
  } else if (msg.q === peer.hi + 1) {
    peer.hi = msg.q;
  } else if (!fillGap(log, from, msg.q) && msg.q === 1) {
    // Numbering starts over: the sender reinstalled or cleared their data.
    peer.hi = 1;
  }
  const item = { kind: "msg", id: localId("m"), from, k: msg.k, q: msg.q, e, ts, x: msg.x, at: now, mine: false };
  insert(log, item);
  return item;
}

// This device's own message, before it is sent. It goes in the timeline at
// once and its state follows the send.
export function addOwn(log, { from, x }, now = Date.now()) {
  log.q += 1;
  const item = { kind: "msg", id: localId("m"), from, k: newChatKey(), q: log.q, e: -1, ts: now, x, at: now, mine: true, st: "sending" };
  insert(log, item);
  return item;
}

export function markSent(log, id, ts) {
  const it = log.items.find((i) => i.id === id);
  if (!it) return null;
  it.st = "sent";
  if (Number.isSafeInteger(ts) && ts !== it.ts) {
    log.items.splice(log.items.indexOf(it), 1);
    it.ts = ts;
    insert(log, it);
  }
  return it;
}

export function markState(log, id, st) {
  const it = log.items.find((i) => i.id === id);
  if (it) it.st = st;
  return it || null;
}

export function addSystem(log, { from, ev, place }, now = Date.now()) {
  if (!ID_RE.test(from) || (ev !== "arrive" && ev !== "leave")) return null;
  const name = cleanText(String(place ?? ""), 64);
  if (!name) return null;
  const item = { kind: "sys", id: localId("s"), from, ev, place: name, ts: now, at: now };
  insert(log, item);
  return item;
}

// Older than the retention, or past the cap: gone. The cap keeps the newest.
export function purgeLog(log, now = Date.now(), keepMs = CHAT_RETENTION_MS, max = CHAT_KEEP_MAX) {
  const floor = now - keepMs;
  const before = log.items.length;
  log.items = log.items.filter((it) => (it.mine && it.st !== "sent" ? it.at : it.ts) >= floor);
  if (log.items.length > max) log.items.splice(0, log.items.length - max);
  return before - log.items.length;
}

export const unreadCount = (log) =>
  log ? log.items.filter((it) => it.kind === "msg" && !it.mine && it.at > log.read).length : 0;

// ------------------------------------------------------------ the archive

// What goes to disk: every circle's log under this device's member id in
// that circle. The member id is per circle and survives a re-key, so a
// circle's chat follows it through new generations and never shows up in
// another circle.
export const emptyArchive = () => ({ v: 1, circles: {} });

const str = (v, max) => (typeof v === "string" ? v.slice(0, max) : "");
const int = (v) => (Number.isSafeInteger(v) ? v : null);

function sanitizeItem(it) {
  if (!it || typeof it !== "object") return null;
  const ts = int(it.ts);
  const at = int(it.at) ?? ts;
  const from = str(it.from, 32);
  if (ts === null || !ID_RE.test(from)) return null;
  const id = str(it.id, 40) || localId("r");
  if (it.kind === "msg") {
    const k = str(it.k, 11);
    const q = int(it.q);
    const x = normalizeChat(str(it.x, RECV_MAX));
    if (!KEY_RE.test(k) || q === null || q < 1 || !x) return null;
    const out = { kind: "msg", id, from, k, q, e: int(it.e) ?? -1, ts, x, at, mine: it.mine === true };
    if (out.mine) out.st = it.st === "sent" ? "sent" : "failed";
    return out;
  }
  if (it.kind === "gap") {
    const lo = int(it.lo);
    const hi = int(it.hi);
    if (lo === null || hi === null || lo < 1 || hi < lo) return null;
    return { kind: "gap", id, from, lo, hi, ts, at };
  }
  if (it.kind === "sys") {
    const place = cleanText(str(it.place, 64), 64);
    if ((it.ev !== "arrive" && it.ev !== "leave") || !place) return null;
    return { kind: "sys", id, from, ev: it.ev, place, ts, at };
  }
  return null;
}

// A log read back from disk. Nothing in it is trusted to be well formed: a
// broken entry is dropped, not repaired. A message that was still being
// sent when the app went away comes back as failed, so the person decides
// whether it still makes sense to send, instead of it going out hours late.
export function sanitizeLog(raw) {
  const log = emptyLog();
  if (!raw || typeof raw !== "object") return log;
  log.q = Math.max(0, int(raw.q) ?? 0);
  log.read = Math.max(0, int(raw.read) ?? 0);
  for (const it of Array.isArray(raw.items) ? raw.items : []) {
    const clean = sanitizeItem(it);
    if (clean) log.items.push(clean);
  }
  log.items.sort(order);
  for (const it of log.items) if (it.mine && it.q > log.q) log.q = it.q;
  if (raw.peers && typeof raw.peers === "object") {
    for (const [id, p] of Object.entries(raw.peers)) {
      const hi = int(p?.hi);
      if (ID_RE.test(id) && hi !== null && hi >= 1) log.peers[id] = { hi };
    }
  }
  return log;
}

// `keep` lists the member ids this device still has a circle under. A log
// for any other id belongs to a circle that was left or erased, possibly by
// a leave that crashed before it could clean up, and goes.
export function sanitizeArchive(raw, keep = null) {
  const out = emptyArchive();
  const circles = raw && typeof raw === "object" && raw.circles && typeof raw.circles === "object" ? raw.circles : {};
  for (const [id, log] of Object.entries(circles)) {
    if (!ID_RE.test(id)) continue;
    if (keep && !keep.has(id)) continue;
    out.circles[id] = sanitizeLog(log);
  }
  return out;
}

// ------------------------------------------------------------- the queue

// Chat's own send line. Never the outbox: that keeps one slot per message
// type, so a second message sent while the first was being retried would
// have replaced it. This is first in, first out, the head retried until it
// lands or runs out of tries, and nothing behind it overtakes it, so the
// circle reads messages in the order they were written.
//
// RAM only, like the outbox. What survives a restart is the archive entry,
// marked failed, for the person to resend by hand.
const BACKOFF_MS = [4000, 15000, 60000];
export const CHAT_MAX_TRIES = 6;

export function createChatQueue({ send, onSent, onFailed, onRetry, backoff = BACKOFF_MS, maxTries = CHAT_MAX_TRIES }) {
  let line = [];
  let busy = false;
  let timer = 0;
  let gen = 0;

  function retryLater(wait) {
    clearTimeout(timer);
    timer = setTimeout(pump, wait);
    timer.unref?.();
  }

  async function pump() {
    if (busy || !line.length) return;
    busy = true;
    const mine = gen;
    const job = line[0];
    let ok = false;
    let ts;
    let err;
    try {
      ts = await send(job);
      ok = true;
    } catch (e) {
      err = e;
    }
    // Cleared while the post was out: this attempt speaks for nobody now.
    if (mine !== gen) return;
    busy = false;
    if (ok) {
      line.shift();
      onSent?.(job, ts);
      pump();
      return;
    }
    job.tries += 1;
    if (job.tries >= maxTries) {
      line.shift();
      onFailed?.(job, err);
      pump();
      return;
    }
    onRetry?.(job, err);
    retryLater(backoff[Math.min(job.tries - 1, backoff.length - 1)]);
  }

  return {
    enqueue(job) {
      line.push({ ...job, tries: 0 });
      pump();
    },
    // A working network showed itself: try the head now.
    flush() {
      clearTimeout(timer);
      pump();
    },
    // A lock, a wipe or a circle switch: nothing queued in one context goes
    // out in another. Returns what was dropped so it can be marked failed.
    clear() {
      gen += 1;
      clearTimeout(timer);
      const dropped = line;
      line = [];
      busy = false;
      return dropped;
    },
    pending: () => line.map((j) => j.id),
  };
}

// ------------------------------------------------------- notifications

// What a notification about a message may say. Android shows the full
// notification on a secure lock screen whenever the system's "show all
// content" switch is on (its default), so whatever goes in here can be read
// without unlocking. By default it says only that a message came: no name,
// no text. The sender's name only once the person allowed the lock screen
// (chatOnLock), and the text only when they also switched that on.
export function chatNotice({ name, text, preview = false, onLock = false, t = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v?.[k] ?? "") }) {
  if (onLock !== true) {
    return { title: t("New message"), body: t("Open the app to read it."), onLock: false };
  }
  const who = cleanText(String(name || ""), 24) || t("Someone");
  return {
    title: t("New message from {name}", { name: who }),
    body: preview === true ? cleanText(String(text || ""), 160) : t("Open the app to read it."),
    onLock: true,
  };
}

// A gap note never prints a number no phone could have missed: a sender's
// counter that jumped (a bug, a restored backup, a hostile client) would
// otherwise read as "4503599627370495 messages could not be read". Past
// GAP_SHOWN_MAX the note says only that some messages were lost.
export const GAP_SHOWN_MAX = 999;

export function gapCount(it) {
  const lo = Number(it?.lo);
  const hi = Number(it?.hi);
  if (!Number.isSafeInteger(lo) || !Number.isSafeInteger(hi) || hi < lo) return null;
  const n = hi - lo + 1;
  return Number.isSafeInteger(n) && n <= GAP_SHOWN_MAX ? n : null;
}

// --------------------------------------------------------- the controller

// One object main.js holds for the whole app's life. It owns the archive in
// memory, the queue, and the bookkeeping; main.js decides when to load and
// when to write, and hands in a send function bound to the live sender.
export function createChatController({ send, save, onChange, onIncoming, now = () => Date.now(), backoff, maxTries } = {}) {
  let archive = emptyArchive();
  let self = null;
  let loaded = false;
  let saving = Promise.resolve();
  let dirty = false;

  // Reading never creates a log: a left circle's empty log must not come
  // back to disk because something asked for its unread count.
  const log = (create = false) => {
    if (!self) return null;
    if (create && !archive.circles[self]) archive.circles[self] = emptyLog();
    return archive.circles[self] || null;
  };
  const changed = () => onChange?.();

  function persist() {
    if (!loaded || !save) return Promise.resolve();
    dirty = true;
    saving = saving.then(async () => {
      if (!dirty) return;
      dirty = false;
      try {
        await save(archive);
      } catch {
        // locked or out of quota: memory keeps it until the next write
      }
    });
    return saving;
  }

  const queue = createChatQueue({
    backoff,
    maxTries,
    send: (job) => {
      if (job.self !== self) return Promise.reject(new Error("chat: circle changed"));
      return send(chatFields(job));
    },
    onSent: (job, ts) => {
      const l = archive.circles[job.self];
      if (l) markSent(l, job.id, ts);
      persist();
      changed();
    },
    onFailed: (job) => {
      const l = archive.circles[job.self];
      if (l) markState(l, job.id, "failed");
      persist();
      changed();
    },
    onRetry: (job) => {
      const l = archive.circles[job.self];
      if (l) markState(l, job.id, "retrying");
      changed();
    },
  });

  function dropQueue() {
    for (const job of queue.clear()) {
      const l = archive.circles[job.self];
      if (l) markState(l, job.id, "failed");
    }
  }

  return {
    // The archive read off disk; drops logs of circles this device no longer has.
    adopt(raw, keep = null) {
      archive = sanitizeArchive(raw, keep);
      loaded = true;
      for (const l of Object.values(archive.circles)) purgeLog(l, now());
      changed();
    },
    archive: () => archive,
    loaded: () => loaded,
    setCircle(memberId) {
      if (memberId === self) return;
      dropQueue();
      self = memberId || null;
      changed();
    },
    circle: () => self,
    // From the roster: one decrypted chat message from a pinned member.
    receive(from, obj, e, ts) {
      const l = log(true);
      if (!l || from === self) return null;
      const item = ingestChat(l, { from, e, ts, obj }, now());
      if (!item) return null;
      persist();
      onIncoming?.(item);
      changed();
      return item;
    },
    post(raw) {
      const l = log(true);
      const m = chatMeasure(raw);
      if (!l) return { ok: false, reason: "no-circle" };
      if (!m.ok) return { ok: false, reason: m.reason, measure: m };
      const item = addOwn(l, { from: self, x: m.text }, now());
      queue.enqueue({ id: item.id, self, k: item.k, q: item.q, x: item.x });
      persist();
      changed();
      return { ok: true, item };
    },
    // A failed message, sent again with the same id and number.
    retry(id) {
      const l = log();
      const it = l?.items.find((i) => i.id === id && i.kind === "msg" && i.mine);
      if (!it || it.st === "sent" || queue.pending().includes(id)) return false;
      it.st = "sending";
      queue.enqueue({ id: it.id, self, k: it.k, q: it.q, x: it.x });
      changed();
      return true;
    },
    system(ev) {
      const l = log(true);
      if (!l) return null;
      const item = addSystem(l, ev, now());
      if (item) {
        persist();
        changed();
      }
      return item;
    },
    items: () => [...(log()?.items || [])],
    unread: () => unreadCount(log()),
    markRead() {
      const l = log();
      if (!l || !unreadCount(l)) return;
      l.read = now();
      persist();
      changed();
    },
    purge() {
      let n = 0;
      for (const l of Object.values(archive.circles)) n += purgeLog(l, now());
      if (n) {
        persist();
        changed();
      }
      return n;
    },
    flush: () => queue.flush(),
    pending: () => queue.pending(),
    // Leaving or erasing a circle takes its chat with it.
    forget(memberId) {
      if (memberId === self) {
        dropQueue();
        self = null;
      }
      if (!archive.circles[memberId]) return Promise.resolve();
      delete archive.circles[memberId];
      changed();
      return persist();
    },
    // A lock or a wipe: memory forgets everything, disk is the caller's job.
    reset() {
      dropQueue();
      archive = emptyArchive();
      self = null;
      loaded = false;
      changed();
    },
    flushed: () => saving,
  };
}
