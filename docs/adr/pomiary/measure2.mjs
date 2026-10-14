// Dodatkowa koperta: E2 + identyfikator ponowien k (8 b64u) + numer kolejny q.
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
// Path to a local clone of the fork, from STARLING_DIR or the current directory.
const R = pathToFileURL(resolve(process.env.STARLING_DIR || ".", "app/js")).href + "/";
const { PAD_LEN, PAD_RESERVE, cleanText } = await import(R + "wire.js");
const te = new TextEncoder();
const bytes = (o) => te.encode(JSON.stringify(o)).length;
const H = "漢", MAXTS = Number.MAX_SAFE_INTEGER;
const sample = "Cześć! Odbiorę Cię spod szkoły o 15:30, czekaj przy bramie od strony boiska. Jeśli lekcje się przedłużą, napisz. Mama kupiła już bilety na sobotę, więc nie planuj nic na wieczór. Weź kurtkę, bo ma padać. Zadzwoń, gdy dojedziesz do babci, dobrze? Buziaki, tata 🙂 ";
const plAll = "ąęłóśćżźńĄĘŁÓŚĆŻŹŃ";
const E5 = { v: 2, ts: MAXTS, t: "chat", name: cleanText(H.repeat(24), 24), emoji: cleanText(H.repeat(8), 8), hue: 359, k: "AAAAAAAAAAA", q: MAXTS, x: "" };
const E6 = { v: 2, ts: MAXTS, t: "chat", k: "AAAAAAAAAAA", q: MAXTS, x: "" };
const gens = {
  "typowy polski": (n) => sample.repeat(Math.ceil(n / sample.length) + 1).slice(0, n),
  "same diakrytyki": (n) => Array.from({ length: n }, (_, i) => plAll[i % plAll.length]).join(""),
  "ASCII": (n) => "a".repeat(n),
  "CJK 3 B": (n) => H.repeat(n),
  "emoji 4 B": (n) => "\u{1F600}".repeat(Math.ceil(n / 2)).slice(0, n - (n % 2)),
  "cudzyslow": (n) => "\"".repeat(n),
};
function maxFit(env, gen, limit) { let lo = 0, hi = 1000; while (lo < hi) { const m = Math.ceil((lo + hi) / 2); if (bytes({ ...env, x: cleanText(gen(m), m) }) <= limit) lo = m; else hi = m - 1; } return lo; }
for (const [name, env] of [["E5 = E2 + k(11 b64u, 64 bity) + q", E5], ["E6 = E1 + k + q (bez nazwy)", E6]]) {
  console.log(name, "narzut", bytes(env), "B, na tekst", PAD_LEN - PAD_RESERVE - bytes(env), "B");
  for (const [g, f] of Object.entries(gens)) console.log("  ", g.padEnd(16), "max dlugosc z rezerwa:", maxFit(env, f, PAD_LEN - PAD_RESERVE));
}
