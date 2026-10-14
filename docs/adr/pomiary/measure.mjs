// F3-0 measurements. Imports the fork's modules READ ONLY; writes nothing to the repo.
// Run: STARLING_DIR=/path/to/starling node measure.mjs   (Node 22+)
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
// Path to a local clone of the fork, from STARLING_DIR or the current directory.
const R = pathToFileURL(resolve(process.env.STARLING_DIR || ".", "app/js")).href + "/";
const W = await import(R + "wire.js");
const C = await import(R + "crypto.js");
const RT = await import(R + "ratchet.js");
const { PAD_LEN, PAD_RESERVE, MAX_BODY, TRAIL_CAP, TTL_MS, cleanText } = W;
const te = new TextEncoder();
const bytes = (o) => te.encode(JSON.stringify(o)).length;
const MAXTS = Number.MAX_SAFE_INTEGER;            // 16 digits, worst case like the test
const REALTS = 1788282959714;                     // 13 digits, a real ts in 2026
const H = "漢";                               // 3-byte char, as in test/crypto.test.mjs

console.log("== Stale z wire.js ==");
console.log({ PAD_LEN, PAD_RESERVE, MAX_BODY, TRAIL_CAP, TTL_h: TTL_MS / 3600000, budget: PAD_LEN - PAD_RESERVE });

// 1. Worst case of the current app, copied from test/crypto.test.mjs worstCase()
const LONGEST_DOUBLE = -0.0000012345678901234567;
const worst = {
  v: 2, ts: MAXTS, t: "checkin", name: cleanText(H.repeat(24), 24), emoji: cleanText(H.repeat(8), 8),
  hue: 359, mode: "precise", cadence: 300, st: cleanText(H.repeat(24), 24), due: MAXTS,
  lat: LONGEST_DOUBLE, lon: LONGEST_DOUBLE, acc: LONGEST_DOUBLE, bat: 0.99, ask: "ffffffff",
  ak: MAXTS, ok: MAXTS, act: "d",
};
console.log("\n== Najwiekszy obecny komunikat (worstCase z testu) ==");
console.log("bajty:", bytes(worst), "wolne do PAD_LEN:", PAD_LEN - bytes(worst));
// Field variant: chat text riding as a field "x" on the largest existing message
const fieldEnv = bytes({ ...worst, x: "" });
console.log("wariant 'pole x na istniejacym komunikacie': narzut pola", fieldEnv - bytes(worst),
  "B; miejsce na tekst do PAD_LEN-PAD_RESERVE:", PAD_LEN - PAD_RESERVE - fieldEnv, "B; do PAD_LEN:", PAD_LEN - fieldEnv, "B");

// 2. Chat envelopes
const envs = {
  "E1 minimalna {v,ts,t,x}": { v: 2, ts: MAXTS, t: "chat", x: "" },
  "E2 + name/emoji/hue (najdluzsze)": { v: 2, ts: MAXTS, t: "chat", name: cleanText(H.repeat(24), 24), emoji: cleanText(H.repeat(8), 8), hue: 359, x: "" },
  "E3 = E1 + odpowiedz re (8 hex + ts)": { v: 2, ts: MAXTS, t: "chat", re: "ffffffff." + MAXTS, x: "" },
  "E4 = E2 + re": { v: 2, ts: MAXTS, t: "chat", name: cleanText(H.repeat(24), 24), emoji: cleanText(H.repeat(8), 8), hue: 359, re: "ffffffff." + MAXTS, x: "" },
};
console.log("\n== Koperty czatu (pusty tekst) ==");
const envBytes = {};
for (const [k, o] of Object.entries(envs)) {
  envBytes[k] = bytes(o);
  console.log(k.padEnd(40), "narzut", bytes(o), "B; na tekst:", PAD_LEN - PAD_RESERVE - bytes(o), "B (z rezerwa),", PAD_LEN - bytes(o), "B (bez rezerwy)");
}

// 3. Capacity per text kind
const plAll = "ąęłóśćżźńĄĘŁÓŚĆŻŹŃ";
const sample = "Cześć! Odbiorę Cię spod szkoły o 15:30, czekaj przy bramie od strony boiska. Jeśli lekcje się przedłużą, napisz. Mama kupiła już bilety na sobotę, więc nie planuj nic na wieczór. Weź kurtkę, bo ma padać. Zadzwoń, gdy dojedziesz do babci, dobrze? Buziaki, tata 🙂 ";
const gens = {
  "ASCII (a)": (n) => "a".repeat(n),
  "polskie same diakrytyki": (n) => Array.from({ length: n }, (_, i) => plAll[i % plAll.length]).join(""),
  "typowy polski tekst (probka)": (n) => sample.repeat(Math.ceil(n / sample.length) + 1).slice(0, n),
  "emoji (2 jednostki UTF-16, 4 B)": (n) => "\u{1F600}".repeat(Math.ceil(n / 2)).slice(0, n - (n % 2)),
  "cudzyslow \" (escape 2 B)": (n) => "\"".repeat(n),
  "CJK 3 B": (n) => H.repeat(n),
};
function maxFit(env, gen, limit) {
  let lo = 0, hi = 1000;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const x = cleanText(gen(mid), mid);
    if (bytes({ ...env, x }) <= limit) lo = mid; else hi = mid - 1;
  }
  return lo;
}
const sampleBody = sample.slice(0, 260);
const plRatio = [...sampleBody].filter((ch) => /[ąęłóśćżźńĄĘŁÓŚĆŻŹŃ]/.test(ch)).length / [...sampleBody].length;
console.log("\nudzial liter z diakrytykami w probce:", (plRatio * 100).toFixed(1) + "%", "bajtow/znak w probce:", (te.encode(sampleBody).length / sampleBody.length).toFixed(3));
for (const [ek, env] of Object.entries(envs)) {
  console.log(`\n== Pojemnosc (jednostki UTF-16 .length) dla ${ek} ==`);
  for (const [gk, gen] of Object.entries(gens)) {
    console.log(gk.padEnd(36), "z rezerwa (488):", String(maxFit(env, gen, PAD_LEN - PAD_RESERVE)).padStart(4), "  do PAD_LEN (512):", String(maxFit(env, gen, PAD_LEN)).padStart(4));
  }
}

// 4. 280 characters
console.log("\n== 280 znakow w kopercie E1 (ts realny 13 cyfr i MAX_SAFE 16 cyfr) ==");
for (const [gk, gen] of Object.entries(gens)) {
  const x = cleanText(gen(280), 280);
  const b1 = bytes({ v: 2, ts: MAXTS, t: "chat", x });
  const b2 = bytes({ v: 2, ts: REALTS, t: "chat", x });
  console.log(gk.padEnd(36), "len", x.length, "bajty:", b1, "/", b2, b1 <= PAD_LEN - PAD_RESERVE ? "MIESCI SIE" : b1 <= PAD_LEN ? "tylko kosztem rezerwy" : "NIE MIESCI SIE");
}
// cleanText strips \n (Cc): show it
console.log("\ncleanText usuwa nowa linie:", JSON.stringify(cleanText("a\nb", 10)));

// 5. Real seal + post size
const id = await C.generateIdentity();
const E = Math.floor(REALTS / RT.EPOCH_MS);
const ratchet = RT.createRatchet({ e0: E, ck0: await RT.chainInit(new Uint8Array(32).fill(7)), historyEpochs: 6 });
const CH = "00112233445566778899aabbccddeeff";
const key = await ratchet.keyFor(E, id.memberId, REALTS);
const msg = { v: 2, ts: REALTS, t: "chat", x: cleanText(gens["typowy polski tekst (probka)"](maxFit(envs["E1 minimalna {v,ts,t,x}"], gens["typowy polski tekst (probka)"], PAD_LEN - PAD_RESERVE)), 1000) };
const sealed = await C.sealMessage(key, CH, id.memberId, E, REALTS, msg);
const post = await C.buildPost(id, CH, E, sealed, REALTS);
console.log("\n== Szyfrowanie prawdziwym sealMessage/buildPost ==");
console.log("alg", id.alg, "plaintext JSON", bytes(msg), "B; szyfrogram", sealed.c.length, "B; c w b64u", post.c.length, "znakow (limit checkPostShape 720); cialo POST", JSON.stringify(post).length, "B (MAX_BODY", MAX_BODY + ")");
console.log("checkPostShape przyjmuje:", !!W.checkPostShape(post), "; klucze widoczne dla relaya:", Object.keys(post).join(","));
const opened = await C.openMessage(key, CH, id.memberId, E, REALTS, sealed.n, sealed.c);
console.log("openMessage odtwarza t:", opened.t, "len x:", opened.x.length);
// a location message of the same family is the same size on the wire
const loc = { v: 2, ts: REALTS + 1, t: "loc", lat: 52.2297, lon: 21.0122, acc: 12, name: "Ola", emoji: "🦊", hue: 210, mode: "precise", cadence: 15, st: "" };
const sealedLoc = await C.sealMessage(key, CH, id.memberId, E, REALTS + 1, loc);
console.log("rozmiar szyfrogramu pozycji:", sealedLoc.c.length, "B, czatu:", sealed.c.length, "B: relay nie odroznia typow po rozmiarze");

// 6. Feed row size and since=0 read cost
const row = { e: E, ts: REALTS, srv: REALTS + 40, n: post.n, c: post.c, sig: post.sig };
const rowB = JSON.stringify(row).length + 1;
console.log("\n== Koszt odczytu since=0 (wiersz w GET ~", rowB, "B) ==");
for (const members of [4, 6, 16]) for (const cap of [240, 960, 1440, 5760]) {
  console.log(`czlonkow ${String(members).padStart(2)}, cap ${String(cap).padStart(4)}: ~${(members * cap * rowB / 1e6).toFixed(2)} MB`);
}

// 7. TRAIL_CAP horizon
console.log("\n== Ile czasu trwa 240 wpisow nadawcy na relayu ==");
const scen = [
  ["samochod/rower, 1 wpis co 3 s (dolny prog sendLoc)", 3],
  ["rower ~5 m/s: 25 m co 5 s + timer 15 s (~16/min)", 60 / 16],
  ["pieszo ~1,4 m/s: 25 m co ~18 s + timer 15 s (~7/min)", 60 / 7.3],
  ["kadencja 15 s (domyslna, takze w bezruchu bez stillSave)", 15],
  ["kadencja 60 s", 60],
  ["kadencja 300 s / tryb bezruchu Androida", 300],
];
for (const [k, s] of scen) {
  const min = (TRAIL_CAP * s) / 60;
  const eff = Math.min(min, TTL_MS / 60000);
  console.log(k.padEnd(58), `${min.toFixed(0).padStart(5)} min`, min * 60000 > TTL_MS ? `(ograniczone TTL do ${eff / 60} h)` : `(${(min / 60).toFixed(2)} h)`);
}
// trim runs on 1 post in TRIM_EVERY=16, so between trims a member can hold more than TRAIL_CAP
console.log("TRIM_EVERY=16: trim co ~16 postow (losowo); po trimie zostaje dokladnie 240 najnowszych, wiec czat moze przezyc srednio do ~16 wpisow dluzej, ale nie wolno na tym polegac.");
