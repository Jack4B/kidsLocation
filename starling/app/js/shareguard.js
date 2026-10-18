// Child mode: a PIN that a parent sets so the phone it guards cannot turn
// sharing off by a stray tap. It guards against a child, not an attacker: the
// record sits in this phone's storage, and Android settings can still revoke
// location or force-stop the app. The circle then sees the last sighting age.

const ITER = 120000;
// Wrong tries before a wait, and the longest wait.
const FREE_TRIES = 3;
const MAX_WAIT_MS = 15 * 60 * 1000;

const b64 = (u8) => btoa(String.fromCharCode(...u8));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(pin, salt, iter) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iter }, key, 256);
  return new Uint8Array(bits);
}

export function validPin(pin) {
  return typeof pin === "string" && /^\d{4,8}$/.test(pin);
}

export async function makeGuard(pin) {
  if (!validPin(pin)) throw new Error("bad pin");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { v: 1, iter: ITER, salt: b64(salt), hash: b64(await derive(pin, salt, ITER)), fails: 0, until: 0 };
}

export function sanitizeGuard(g) {
  if (!g || g.v !== 1 || typeof g.salt !== "string" || typeof g.hash !== "string") return null;
  const iter = Number.isInteger(g.iter) && g.iter >= 1000 ? g.iter : ITER;
  const fails = Number.isInteger(g.fails) && g.fails > 0 ? g.fails : 0;
  const until = Number.isFinite(g.until) && g.until > 0 ? g.until : 0;
  return { v: 1, iter, salt: g.salt, hash: g.hash, fails, until };
}

// How long until the next try is allowed, 0 when it is allowed now.
export function waitLeft(g, now = Date.now()) {
  return g && g.until > now ? g.until - now : 0;
}

export function waitAfter(fails) {
  if (fails < FREE_TRIES) return 0;
  return Math.min(MAX_WAIT_MS, 30000 * 2 ** (fails - FREE_TRIES));
}

// Returns { ok, guard }: guard is the record to store (fail count moved on).
export async function checkPin(g, pin, now = Date.now()) {
  if (!g) return { ok: true, guard: null };
  if (waitLeft(g, now) > 0) return { ok: false, guard: g, wait: waitLeft(g, now) };
  let ok = false;
  if (validPin(pin)) {
    const got = await derive(pin, unb64(g.salt), g.iter);
    const want = unb64(g.hash);
    let diff = got.length ^ want.length;
    for (let i = 0; i < Math.min(got.length, want.length); i++) diff |= got[i] ^ want[i];
    ok = diff === 0;
  }
  if (ok) return { ok: true, guard: { ...g, fails: 0, until: 0 } };
  const fails = g.fails + 1;
  const wait = waitAfter(fails);
  return { ok: false, guard: { ...g, fails, until: wait ? now + wait : 0 }, wait };
}
