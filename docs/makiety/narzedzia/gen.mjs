// Generator statycznych makiet F2-9. Wynik: ../makiety-F2-9.html (jeden plik, bez zasobow zewnetrznych).
// Uruchom: node gen.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "makiety-F2-9.html");

// ---------------------------------------------------------------- ikony
const P = {
  home: '<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/>',
  pin: '<path d="M12 21s-6-5.5-6-10a6 6 0 0 1 12 0c0 4.5-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z"/>',
  shieldOk: '<path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  chev: '<path d="M9 6l6 6-6 6"/>',
  chevDown: '<path d="M6 9l6 6 6-6"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  warn: '<path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18v.01"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.8 2.8L16 10"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  battery: '<rect x="3" y="8" width="16" height="8" rx="2"/><path d="M21 11v2"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  share: '<path d="M12 15V4M8 8l4-4 4 4"/><path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  chat: '<path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/>',
  map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/>',
  people: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.8 0 4.5 2.2 4.5 5"/>',
  target: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
  server: '<rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 7v.01M7 17v.01"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
  qr: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2M20 14v.01M14 20h.01M17 17h3v3"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
};
const ic = (n, size = 20, sw = 1.8, color = "currentColor") =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;

// ---------------------------------------------------------------- mapa (jak w Main.dc.html)
const MAP_INNER = `
<rect x="-400" y="-400" width="1200" height="1700" style="fill:var(--m-land)"/>
<ellipse cx="350" cy="56" rx="84" ry="46" style="fill:var(--m-water)"/>
<path d="M-20 410 C70 450 120 490 160 650" style="fill:none;stroke:var(--m-water);stroke-width:34;stroke-linecap:round"/>
<rect x="232" y="392" width="116" height="96" rx="18" style="fill:var(--m-park)"/>
<rect x="14" y="62" width="120" height="82" rx="18" style="fill:var(--m-park)"/>
<rect x="40" y="610" width="140" height="90" rx="18" style="fill:var(--m-park)"/>
<g style="fill:none;stroke:var(--m-casing);stroke-linecap:round">
<path d="M-10 318 L400 286" stroke-width="18"/><path d="M196 -10 L212 860" stroke-width="16"/>
<path d="M-10 170 L400 440" stroke-width="13"/><path d="M-10 520 L400 480" stroke-width="12"/>
<path d="M60 -10 L90 860" stroke-width="10"/><path d="M300 -10 L330 860" stroke-width="10"/>
<path d="M-10 92 L400 62" stroke-width="10"/><path d="M-10 720 L400 690" stroke-width="12"/>
</g>
<g style="fill:none;stroke:var(--m-road);stroke-linecap:round">
<path d="M-10 318 L400 286" stroke-width="14"/><path d="M196 -10 L212 860" stroke-width="12"/>
<path d="M-10 170 L400 440" stroke-width="9"/><path d="M-10 520 L400 480" stroke-width="8"/>
<path d="M60 -10 L90 860" stroke-width="6"/><path d="M300 -10 L330 860" stroke-width="6"/>
<path d="M-10 92 L400 62" stroke-width="6"/><path d="M-10 720 L400 690" stroke-width="8"/>
</g>
<g style="fill:var(--m-bld)">
<rect x="108" y="212" width="34" height="26" rx="3"/><rect x="150" y="224" width="30" height="22" rx="3"/>
<rect x="104" y="332" width="40" height="30" rx="3"/><rect x="152" y="356" width="30" height="24" rx="3"/>
<rect x="228" y="222" width="38" height="28" rx="3"/><rect x="272" y="246" width="26" height="22" rx="3"/>
<rect x="236" y="330" width="34" height="26" rx="3"/><rect x="104" y="402" width="44" height="30" rx="3"/>
<rect x="340" y="330" width="40" height="34" rx="3"/><rect x="20" y="236" width="30" height="40" rx="3"/>
<rect x="230" y="540" width="40" height="30" rx="3"/><rect x="110" y="560" width="36" height="28" rx="3"/>
<rect x="340" y="560" width="36" height="40" rx="3"/><rect x="236" y="610" width="30" height="24" rx="3"/>
</g>
<text x="104" y="311" transform="rotate(-4 104 311)" style="fill:var(--m-label);font:600 10px Figtree,Inter,sans-serif">ul. Polna</text>
<text x="205" y="470" transform="rotate(86 205 470)" style="fill:var(--m-label);font:600 10px Figtree,Inter,sans-serif">ul. Leśna</text>`;
const mapSvg = (h, vx = 0, vy = 0) =>
  `<svg class="map" width="390" height="${h}" viewBox="${vx} ${vy} 390 ${h}" aria-hidden="true">${MAP_INNER}</svg>`;

// ---------------------------------------------------------------- drobne elementy
const PERSON = { M: "#F29BB8", K: "#F5C04A", H: "#B7A6F5" };
const ava = (l, size = 36, fs = 16, extra = "") =>
  `<span class="ava h" style="width:${size}px;height:${size}px;font-size:${fs}px;background:${PERSON[l]};${extra}" aria-hidden="true">${l}</span>`;

const chip = (x, y, html, extra = "") =>
  `<div class="mchip" style="left:${x}px;top:${y}px;${extra}">${html}</div>`;

function nav(active) {
  const items = [
    ["map", "Mapa"],
    ["chat", "Czat"],
    ["pin", "Miejsca"],
    ["people", "Krąg"],
  ];
  return `<nav class="nav" aria-label="Nawigacja główna">${items
    .map(([i, l]) => {
      const on = l === active;
      const badge = l === "Czat" ? '<span class="badge">2</span>' : "";
      return `<button ${on ? 'aria-current="page" class="on"' : ""}><span class="ind">${ic(i, 24, on ? 2 : 1.8)}${badge}</span>${l}</button>`;
    })
    .join("")}</nav>`;
}

const roundBtn = (x, y, icon, label) =>
  `<button class="rbtn" style="left:${x}px;top:${y}px" aria-label="${label}">${ic(icon, 22, 2)}</button>`;

const sw = (on, label) =>
  `<button class="sw ${on ? "on" : ""}" role="switch" aria-checked="${on}" aria-label="${label}"><span class="knob"></span></button>`;

const seg = (label, opts, sel) =>
  `<div class="seg" role="radiogroup" aria-label="${label}">${opts
    .map((o) => `<button role="radio" aria-checked="${o === sel}">${o}</button>`)
    .join("")}</div>`;

const safety = (digits) =>
  `<div class="safety" aria-label="Numer bezpieczeństwa ${digits}">${digits
    .split(" ")
    .map((g) => `<span>${g}</span>`)
    .join(" ")}</div>`;

// Pseudolosowy wzór QR: tylko ilustracja, nie da się go odczytać.
function qrSvg(size = 196) {
  const N = 29;
  let s = 7;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const m = Array.from({ length: N }, () => Array(N).fill(0));
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) m[y][x] = rnd() > 0.52 ? 1 : 0;
  const finder = (ox, oy) => {
    for (let y = -1; y < 8; y++)
      for (let x = -1; x < 8; x++) {
        const X = ox + x, Y = oy + y;
        if (X < 0 || Y < 0 || X >= N || Y >= N) continue;
        const ring = Math.max(Math.abs(x - 3), Math.abs(y - 3));
        m[Y][X] = ring === 4 ? 0 : ring === 2 ? 0 : 1;
      }
  };
  finder(0, 0); finder(N - 7, 0); finder(0, N - 7);
  for (let i = 8; i < N - 8; i++) { m[6][i] = i % 2 === 0 ? 1 : 0; m[i][6] = i % 2 === 0 ? 1 : 0; }
  const q = 4; // cicha strefa
  const u = Math.floor(size / (N + 2 * q)); size = u * (N + 2 * q);
  let r = "";
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (m[y][x]) r += `<rect x="${((x + q) * u).toFixed(2)}" y="${((y + q) * u).toFixed(2)}" width="${u}" height="${u}"/>`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="Kod QR zaproszenia (przykład, nie działa)"><rect width="${size}" height="${size}" fill="#FFFFFF"/><g fill="#14201C" shape-rendering="crispEdges">${r}</g></svg>`;
}

const DIGITS = "79320 91948 00309 34269 25169 66015";

// ---------------------------------------------------------------- ekrany
// Każda funkcja zwraca wnętrze telefonu 390x844.

// A. Miejsca: lista i dodawanie
function scrPlacesList() {
  const row = (icon, name, sub, extra, who) => `
  <button class="lrow">
    <span class="licon">${ic(icon, 22, 2)}</span>
    <span class="ltext"><span class="lname">${name}</span><span class="lsub">${sub}</span>${extra}</span>
    ${who ? `<span class="here" aria-label="Teraz tutaj: ${who.name}">${ava(who.l, 30, 14, "border:2px solid var(--surface)")}</span>` : ""}
    <span class="lchev">${ic("chev", 18, 2)}</span>
  </button>`;
  const fence = `<span class="lfence">${ic("shield", 15, 2)}Strefa prywatności</span>`;
  return `
<div class="scr">
  <div class="title h">Miejsca</div>
  <div class="note-card">${ic("lock", 18, 2)}<span>Miejsca są zapisane tylko na tym telefonie. Serwer i reszta kręgu nie wiedzą, że istnieją.</span></div>
  <div class="card list">
    ${row("home", "Dom", "250 m · wejście i wyjście", fence, { l: "M", name: "Marta" })}
    ${row("pin", "Szkoła", "250 m · wejście i wyjście", "", { l: "K", name: "Kuba" })}
    ${row("pin", "Basen", "100 m · tylko wejście", "", null)}
    ${row("pin", "Babcia", "500 m · bez powiadomień", "", null)}
  </div>
  <label class="lbl" for="np">Dodaj kolejne</label>
  <input id="np" class="inp" type="text" placeholder="Np. Trening" style="margin-top:-6px">
  <div class="row2">
    <button class="btn btn-o">${ic("target", 18, 2)}Moja pozycja</button>
    <button class="btn btn-o">${ic("map", 18, 2)}Wskaż na mapie</button>
  </div>
  <p class="foot">4 z 10 miejsc. Powiadomienia o wejściu i wyjściu przychodzą tylko na ten telefon. Na iPhonie tylko przy otwartej aplikacji.</p>
</div>
${nav("Miejsca")}`;
}

// A2. Edycja miejsca z promieniem
function scrPlaceEdit() {
  // mapa przesunięta tak, by szkoła (250,170 w Main) była w (195,118)
  return `
${mapSvg(260, 55, 52)}
<div class="ring-exit" style="left:${195 - 104}px;top:${118 - 104}px;width:208px;height:208px"></div>
<div class="ring" style="left:${195 - 64}px;top:${118 - 64}px;width:128px;height:128px"></div>
${chip(195, 34, `${ic("pin", 14, 2, "var(--accent)")}Szkoła`, "transform:translateX(-50%)")}
<div style="position:absolute;left:173px;top:96px">${ava("K", 44, 18, "border:3px solid var(--surface);box-shadow:0 2px 6px rgba(0,0,0,.35)")}</div>
${chip(195, 146, "Kuba, teraz", "transform:translateX(-50%)")}
${roundBtn(16, 16, "back", "Wróć do listy miejsc")}
<div class="legend" style="right:16px;top:16px">
  <span><i class="lg-in"></i>Wejście: 250 m</span>
  <span><i class="lg-out"></i>Wyjście: od 410 m</span>
</div>
<div class="sheet" style="top:222px;bottom:80px">
  <div class="grab"></div>
  <div class="sbody">
    <div class="field"><label class="lbl" for="pn">Nazwa</label>
      <div class="inpwrap"><input id="pn" class="inp" type="text" value="Szkoła" maxlength="24"><span class="cnt">6 z 24</span></div></div>
    <div class="field"><span class="lbl">Promień</span>
      ${seg("Promień miejsca Szkoła", ["100 m", "250 m", "500 m"], "250 m")}
      <p class="hint">Wejście liczy się w okręgu 250 m, wyjście dopiero od około 410 m. Dzięki temu drgania GPS nie wysyłają fałszywych powiadomień.</p></div>
    <div class="field"><span class="lbl">Powiadomienia</span>
      ${seg("Powiadomienia dla miejsca Szkoła", ["Oba", "Wejście", "Wyjście", "Wyłączone"], "Oba")}</div>
    <div class="swrow">
      <span class="swtext"><span class="swl">Strefa prywatności</span><span class="hint">Gdy tu jesteś, krąg widzi tylko środek miejsca. SOS zawsze wysyła dokładną pozycję.</span></span>
      ${sw(false, "Strefa prywatności dla miejsca Szkoła")}
    </div>
    <button class="btn btn-sos-o">${ic("trash", 18, 2)}Usuń miejsce</button>
  </div>
</div>
${nav("Miejsca")}`;
}

// A3. Wskazanie miejsca na mapie
function scrPlacePick() {
  return `
${mapSvg(764, 0, 40)}
<div class="ring" style="left:46px;top:170px;width:104px;height:104px;opacity:.6"></div>
${chip(98, 156, `${ic("home", 14, 2, "var(--accent)")}Dom`, "transform:translateX(-50%)")}
<div class="ring ring-new" style="left:${195 - 70}px;top:${430 - 70}px;width:140px;height:140px"></div>
<div class="cross" style="left:${195 - 22}px;top:${430 - 22}px">${ic("target", 44, 2)}</div>
${chip(195, 340, `${ic("pin", 14, 2, "var(--accent)")}Basen, 250 m`, "transform:translateX(-50%)")}
<div class="banner">
  <p class="bt">Dotknij mapy tam, gdzie jest Basen.</p>
  <p class="bs">Albo przesuń mapę i użyj jej środka.</p>
  <div class="row2">
    <button class="btn btn-p">Użyj środka mapy</button>
    <button class="btn btn-o">Anuluj</button>
  </div>
</div>
<div class="toastcard" style="top:688px">${ic("pin", 18, 2, "var(--accent)")}<span>Promień 250 m. Zmienisz go po zapisaniu.</span></div>
${nav("Miejsca")}`;
}

// B. SOS u osoby wysyłającej
function scrSosSender() {
  return `
${mapSvg(764, 0, 90)}
<div class="sosring" style="left:${195 - 70}px;top:${236 - 70}px;width:140px;height:140px"></div>
<div class="acc" style="left:${195 - 40}px;top:${236 - 40}px;width:80px;height:80px"></div>
<div class="me" style="left:184px;top:225px"></div>
${chip(195, 262, `${ic("warn", 14, 2.2)}Ty, SOS`, "transform:translateX(-50%);background:var(--sos);color:var(--sosInk)")}
<div class="sosbar" role="status">
  <span class="sosic">${ic("warn", 22, 2.2)}</span>
  <span><span class="sb1">SOS aktywny od 14:32</span><span class="sb2">Krąg widzi Twoją pozycję na żywo</span></span>
</div>
<div class="sheet" style="top:350px;bottom:80px">
  <div class="grab"></div>
  <div class="sbody">
    <div class="shead h">${ic("warn", 22, 2.2, "var(--sos)")}SOS jest aktywny</div>
    <p class="txt">Krąg dostał alarm i widzi, gdzie jesteś. Gdy wszystko jest w porządku, odwołaj SOS. Krąg dostanie wtedy wiadomość, że wszystko u Ciebie w porządku.</p>
    <div class="facts">
      <div>${ic("checkCircle", 20, 2, "var(--accent)")}<span>Dostarczono do kręgu o 14:32</span></div>
      <div>${ic("clock", 20, 1.9, "var(--ink2)")}<span>Pozycja idzie co 15 sekund, także przy wygaszonym ekranie</span></div>
    </div>
    <button class="btn btn-p btn-big">${ic("check", 22, 2.4)}Wszystko w porządku, odwołaj SOS</button>
    <button class="btn btn-o">${ic("link", 18, 2)}Pomoc spoza kręgu</button>
    <p class="hint" style="text-align:center;margin-top:-4px">Link dla kogoś obok, bez aplikacji. Działa 6 godzin.</p>
  </div>
</div>
${nav("Mapa")}`;
}

// B2. SOS u odbiorcy, w aplikacji
function scrSosReceiver() {
  return `
${mapSvg(764, 20, 60)}
<div class="ring" style="left:${300 - 60}px;top:${520 - 60}px;width:120px;height:120px;opacity:.55"></div>
<div class="sosring" style="left:${195 - 62}px;top:${210 - 62}px;width:124px;height:124px"></div>
<div style="position:absolute;left:171px;top:186px">${ava("K", 48, 20, "border:3px solid var(--sos);box-shadow:0 2px 6px rgba(0,0,0,.35)")}</div>
<span class="sosbadge" style="left:206px;top:178px" aria-hidden="true">${ic("warn", 13, 2.6)}</span>
${chip(195, 242, `${ic("warn", 14, 2.2)}Kuba, SOS, 10 s temu`, "transform:translateX(-50%);background:var(--sos);color:var(--sosInk)")}
<div class="me" style="left:90px;top:330px"></div>
${chip(101, 358, "Ty", "transform:translateX(-50%);background:var(--accent);color:var(--accentInk)")}
<button class="pill" aria-label="Zmień krąg: Rodzina, 4 osoby">${ic("lock", 18, 2, "var(--accent)")}<span class="h" style="font-size:17px;font-weight:700">Rodzina</span><span class="sub">4 osoby</span>${ic("chevDown", 18, 2, "var(--ink2)")}</button>
<div class="sheet" style="top:392px;bottom:80px">
  <div class="grab"></div>
  <div class="sbody">
    <div class="alert" role="alert">
      <div class="ahead">${ic("warn", 22, 2.2)}<span class="h">Kuba wysyła SOS</span></div>
      <div class="abody">
        <p class="txt" style="margin:0">Od 14:32. Pozycja na żywo jest na mapie i zostaje tam, dopóki Kuba nie odwoła SOS.</p>
        <div class="meta"><span>${ic("clock", 16, 1.9)}Ostatni sygnał 10 s temu</span><span>${ic("battery", 16, 1.9)}41%</span></div>
      </div>
    </div>
    <div class="row2">
      <button class="btn btn-p" style="flex:1.4">${ic("target", 18, 2)}Pokaż na mapie</button>
      <button class="btn btn-o">${ic("chat", 18, 2)}Napisz</button>
    </div>
    <button class="btn btn-g">Rozumiem, ukryj kartę</button>
    <p class="hint" style="text-align:center;margin-top:-6px">Ukrycie karty nie wyłącza alarmu. Znacznik SOS zostaje na mapie.</p>
  </div>
</div>
${nav("Mapa")}`;
}

// B3. SOS u odbiorcy, ekran blokady
function scrSosLock() {
  return `
<div class="lockbg"></div>
<div class="lockclock h">14:32</div>
<div class="lockdate">wtorek, 14 października</div>
<div class="notif" role="alert">
  <div class="nh"><span class="nicon">${ic("warn", 14, 2.4)}</span>Starling · Alarmy · teraz</div>
  <div class="nt">Starling</div>
  <div class="nb">Otwórz Starling teraz.</div>
</div>
<div class="lockcap">
  <p><b>Bez imienia i bez miejsca na ekranie blokady.</b> Powiadomienie SOS ma dźwięk dzwonka i przechodzi przez tryb Nie przeszkadzać. Szczegóły widać dopiero w aplikacji.</p>
</div>
<div class="lockhint">${ic("lock", 18, 2)}Przesuń w górę, aby odblokować</div>`;
}

// C. Zaproszenie: pokazanie kodu
function scrInviteShow() {
  return `
<div class="scr" style="gap:10px">
  <div class="hdr">${'<button class="rbtn flat" aria-label="Wróć do kręgu">' + ic("back", 22, 2) + "</button>"}<span class="h">Zaproś osobę</span></div>
  <div class="qrcard">${qrSvg(188)}</div>
  <p class="hint" style="text-align:center;margin:0 12px">Pokaż kod osobie obok. Zeskanuje go w aplikacji, w ekranie Dołącz do kręgu.</p>
  <div class="tag">${ic("clock", 16, 2)}Jednorazowy, wygasa za 58 min</div>
  <code class="linkbox">https://relay.example/#j=Xk3vQ9mT2pLwZr8Hc4…</code>
  <div class="row2">
    <button class="btn btn-p">${ic("share", 18, 2)}Wyślij link</button>
    <button class="btn btn-o">${ic("copy", 18, 2)}Kopiuj link</button>
  </div>
  <p class="hint">Wyślij przez coś zaufanego, na przykład Signal. Kto otworzy link, poprosi o dołączenie. Ta osoba wejdzie dopiero, gdy porównacie numer i ją wpuścisz.</p>
  <div class="waitrow"><span class="dot"></span>Nikt jeszcze nie użył tego linku. Prośba pojawi się tutaj.</div>
  <button class="btn btn-sos-o">${ic("close", 18, 2)}Anuluj ten link</button>
</div>
${nav("Krąg")}`;
}

// C2. Dołączanie: skan kamerą albo wklejenie
function scrJoin() {
  return `
<div class="scr full" style="gap:12px">
  <div class="hdr">${'<button class="rbtn flat" aria-label="Zamknij">' + ic("close", 22, 2) + "</button>"}<span class="h">Dołącz do kręgu</span></div>
  <div class="cam" role="img" aria-label="Podgląd z aparatu">
    <div class="camqr">${qrSvg(150)}</div>
    <span class="cc tl"></span><span class="cc tr"></span><span class="cc bl"></span><span class="cc br"></span>
    <div class="camstat">${ic("camera", 16, 2)}Szukam kodu</div>
  </div>
  <p class="hint" style="text-align:center;margin:0 8px">Skieruj aparat na kod zaproszenia na ekranie drugiej osoby.</p>
  <div class="or"><span></span>albo wklej link<span></span></div>
  <label class="lbl" for="il">Link zaproszenia</label>
  <input id="il" class="inp" type="text" placeholder="https://…/#j=…" style="margin-top:-6px">
  <button class="btn btn-p">Dalej</button>
  <div class="note-card">${ic("lock", 18, 2)}<span>Sekret kręgu jest w końcówce linku i nie trafia na żaden serwer. Po dołączeniu ktoś z kręgu musi porównać z Tobą numer.</span></div>
</div>`;
}

// C3. Prośba o dołączenie, u zapraszającego
function scrJoinRequest() {
  return `
<div class="scr" style="gap:12px">
  <div class="hdr">${'<button class="rbtn flat" aria-label="Wróć do kręgu">' + ic("back", 22, 2) + "</button>"}<span class="h">Prośba o dołączenie</span></div>
  <div class="who">${ava("H", 56, 24)}<div><div class="h" style="font-size:22px;font-weight:700;line-height:28px">Hela chce dołączyć</div><div class="sub" style="font-size:14px">Przez Twój link z 14:05</div></div></div>
  <p class="txt" style="margin:0">Imię może wpisać każdy. Tylko numer poniżej pokazuje, kto naprawdę prosi.</p>
  <div class="sbox">
    <span class="lbl" style="color:var(--ink2)">Numer bezpieczeństwa</span>
    ${safety(DIGITS)}
    <button class="btn btn-g" style="height:48px;margin:-4px 0 -8px;color:var(--ink)">${ic("eye", 18, 2)}Pokaż duży numer do porównania</button>
  </div>
  <div class="facts">
    <div>${ic("phone", 20, 1.9, "var(--ink2)")}<span>Zadzwoń albo spotkaj się i porównaj ten numer z ekranem nowej osoby. Każda cyfra musi się zgadzać.</span></div>
    <div>${ic("lock", 20, 1.9, "var(--ink2)")}<span>Wpuszczenie daje całemu kręgowi nowe klucze. Nowa osoba nie przeczyta niczego, co wysłano wcześniej.</span></div>
  </div>
  <button class="btn btn-p">${ic("shieldOk", 20, 2)}Numery się zgadzają, wpuść</button>
  <button class="btn btn-sos-o">Odrzuć</button>
</div>
${nav("Krąg")}`;
}

// D. Pierwsze uruchomienie: powitanie
function scrWelcome() {
  return `
<div class="scr full" style="gap:14px;padding-top:40px">
  <div class="hero" aria-hidden="true">
    <div class="hring"></div>
    <div class="me" style="left:89px;top:89px"></div>
    <div style="position:absolute;left:12px;top:22px">${ava("M", 40, 17, "border:3px solid var(--bg)")}</div>
    <div style="position:absolute;left:148px;top:40px">${ava("K", 40, 17, "border:3px solid var(--bg)")}</div>
    <div style="position:absolute;left:118px;top:150px">${ava("H", 40, 17, "border:3px solid var(--bg)")}</div>
  </div>
  <div class="title h" style="text-align:center;font-size:28px;line-height:34px;margin-top:6px">Twoi bliscy<br>na jednej mapie</div>
  <p class="txt" style="text-align:center;margin:0 8px;font-size:15.5px;line-height:22px">Widzą Cię tylko osoby, które zaprosisz. Nikt poza kręgiem nie wie, gdzie jesteś.</p>
  <div class="trust">
    <div>${ic("lock", 20, 2, "var(--accent)")}<span>Szyfrowane end-to-end. Serwer widzi tylko szyfrogram.</span></div>
    <div>${ic("user", 20, 2, "var(--accent)")}<span>Bez kont, bez numeru telefonu, bez <span style="white-space:nowrap">e-maila</span>.</span></div>
    <div>${ic("clock", 20, 2, "var(--accent)")}<span>Serwer usuwa wszystko po 24 godzinach.</span></div>
  </div>
  <div style="flex:1"></div>
  <button class="btn btn-p btn-big">Utwórz krąg</button>
  <button class="btn btn-o btn-big">${ic("qr", 20, 2)}Mam zaproszenie</button>
  <button class="btn btn-g" style="margin-bottom:12px">${ic("server", 18, 2)}Użyj własnego serwera</button>
</div>`;
}

// D2. Pierwsze uruchomienie: lokalizacja
function scrPermission() {
  return `
<div class="scr full" style="gap:12px;padding-top:24px">
  <div class="mini" aria-hidden="true">${mapSvg(150, 20, 250)}
    <div class="acc" style="left:${179 - 44}px;top:${75 - 44}px;width:88px;height:88px"></div>
    <div class="me" style="left:168px;top:64px"></div>
  </div>
  <div class="title h" style="font-size:28px;line-height:34px">Pozwól na lokalizację</div>
  <p class="txt" style="margin:0">Krąg widzi Cię tylko wtedy, gdy udostępniasz. Pozycja jest szyfrowana na tym telefonie, zanim go opuści.</p>
  <div class="steps">
    <div>${ic("pin", 22, 2, "var(--accent)")}<span><b>Teraz: dokładna lokalizacja</b><span class="sub">Android zapyta za chwilę. Wybierz „Dokładna” i „Podczas korzystania z aplikacji”.</span></span></div>
    <div>${ic("bell", 22, 2, "var(--accent)")}<span><b>Przy pierwszym udostępnianiu: powiadomienia</b><span class="sub">Bez nich SOS nie zadzwoni przy wygaszonym ekranie.</span></span></div>
    <div>${ic("battery", 22, 2, "var(--accent)")}<span><b>Później, jeśli zechcesz: praca w tle</b><span class="sub">Wznawia udostępnianie po restarcie telefonu. Zapytamy dopiero przy tym ustawieniu.</span></span></div>
  </div>
  <div class="warnbox">${ic("warn", 20, 2, "var(--warn)")}<span><b style="color:var(--warn)">iPhone:</b> udostępnianie, SOS i powiadomienia działają tylko przy otwartej aplikacji.</span></div>
  <div style="flex:1"></div>
  <button class="btn btn-p btn-big">Zezwól na lokalizację</button>
  <button class="btn btn-g" style="margin-top:-4px">Nie teraz</button>
  <p class="hint" style="text-align:center;margin:-6px 0 10px">Bez lokalizacji widzisz krąg, ale krąg nie widzi Ciebie.</p>
</div>`;
}

// D3. Pierwsze uruchomienie: utworzenie kręgu
function scrCreate() {
  return `
<div class="scr full" style="gap:12px">
  <div class="hdr">${'<button class="rbtn flat" aria-label="Wróć">' + ic("back", 22, 2) + "</button>"}<span class="h">Utwórz krąg</span></div>
  <p class="txt" style="margin:0">Tak zobaczą Cię osoby, które zaprosisz. Te dane nie wychodzą poza krąg.</p>
  <div class="avprev">${ava("M", 72, 30)}<span class="sub">Inicjał z imienia. Kolor dostajesz automatycznie.</span></div>
  <div class="field"><label class="lbl" for="yn">Twoje imię</label>
    <div class="inpwrap"><input id="yn" class="inp" type="text" value="Marta" maxlength="24"><span class="cnt">5 z 24</span></div></div>
  <div class="field"><label class="lbl" for="cn">Nazwa kręgu</label>
    <input id="cn" class="inp" type="text" value="Rodzina">
    <p class="hint">Nazwę dostaje każda osoba, którą zaprosisz. Każdy może ją zmienić u siebie.</p></div>
  <button class="card srow">${ic("server", 22, 1.9, "var(--ink2)")}<span class="ltext"><span class="lname">Serwer</span><span class="lsub">relay.example</span></span><span class="ok">${ic("checkCircle", 18, 2)}Działa</span>${ic("chev", 18, 2, "var(--ink2)")}</button>
  <p class="hint" style="margin-top:-4px">Wszyscy w kręgu muszą używać tego samego serwera. Jego adres jedzie w zaproszeniu.</p>
  <div style="flex:1"></div>
  <button class="btn btn-p btn-big">Utwórz krąg</button>
  <p class="hint" style="text-align:center;margin:-4px 0 10px">Potem zaprosisz pierwszą osobę linkiem albo kodem QR.</p>
</div>`;
}

// D4. Pierwsze uruchomienie: czekanie na wpuszczenie
function scrWaiting() {
  return `
<div class="scr full" style="gap:14px;padding-top:40px">
  <div class="hero" style="width:150px;height:150px" aria-hidden="true">
    <div class="hring" style="width:150px;height:150px"></div>
    <div style="position:absolute;left:47px;top:47px">${ava("H", 56, 24, "border:3px solid var(--bg)")}</div>
    <span class="hclock">${ic("clock", 20, 2.2)}</span>
  </div>
  <div class="title h" style="text-align:center;font-size:28px;line-height:34px">Czekasz na wpuszczenie</div>
  <p class="txt" style="text-align:center;margin:0">Prośba czeka na serwerze, aż osoba, która Cię zaprosiła, otworzy aplikację i ją zaakceptuje.</p>
  <div class="sbox">
    <span class="lbl" style="color:var(--ink2)">Twój numer</span>
    ${safety(DIGITS)}
  </div>
  <p class="txt" style="margin:0">Przeczytaj te cyfry osobie, która Cię zaprosiła. Ten sam numer widzi przy Twojej prośbie. Tak wie, że to naprawdę Ty.</p>
  <div class="note-card">${ic("server", 18, 2)}<span>Ten krąg używa serwera relay.example.</span></div>
  <div style="flex:1"></div>
  <button class="btn btn-o" style="margin-bottom:12px">Anuluj prośbę</button>
</div>`;
}

// ---------------------------------------------------------------- plansze
const BOARDS = [
  {
    id: "miejsca",
    title: "1 Miejsca",
    lead: "Lista miejsc z dodawaniem, edycja z promieniem i wskazanie miejsca na mapie. Miejsca żyją tylko w telefonie, który je zapisał (fork: app/js/places.js).",
    screens: [
      ["Lista i dodawanie", "Zakładka Miejsca. Kto jest teraz w miejscu, pokazuje awatar z literą (etykieta: Teraz tutaj).", scrPlacesList],
      ["Edycja miejsca", "Promień 100, 250 albo 500 m. Okrąg wejścia przerywany, wyjście kropkowane. Zmiany zapisują się od razu.", scrPlaceEdit],
      ["Wskazanie na mapie", "Po wybraniu Wskaż na mapie. Domyślny promień 250 m.", scrPlacePick],
    ],
  },
  {
    id: "sos",
    title: "2 Aktywny SOS",
    lead: "SOS wysłany przytrzymaniem przycisku (1,2 s). Widok u osoby, która wysłała, i u odbiorcy: w aplikacji oraz na ekranie blokady.",
    screens: [
      ["Telefon Kuby: SOS wysłany", "Odwołanie to zgłoszenie, że wszystko w porządku (check-in). Pomoc spoza kręgu to osobny link na 6 godzin.", scrSosSender],
      ["Telefon Marty: alarm w aplikacji", "Karta alarmu nad listą osób. Gdy telefon Kuby przestanie nadawać, tekst mówi, ile minut temu był ostatni sygnał.", scrSosReceiver],
      ["Telefon Marty: ekran blokady", "Powiadomienie systemowe na kanale Alarmy. Tekst jest ogólny, tak jak w forku.", scrSosLock],
    ],
  },
  {
    id: "zaproszenie",
    title: "3 Zaproszenie i kod QR",
    lead: "Jednorazowe zaproszenie ważne godzinę: kod QR i link. Druga osoba skanuje kod albo wkleja link, a zapraszający porównuje numer i wpuszcza.",
    screens: [
      ["Telefon Marty: pokaż kod", "Otwiera się z Krąg, Zaproś osobę. Kod znika, gdy ktoś czeka na decyzję.", scrInviteShow],
      ["Telefon Heli: zeskanuj lub wklej", "Ekran dla przycisku Mam zaproszenie. Skan tylko w aplikacji na telefonie.", scrJoin],
      ["Telefon Marty: prośba o dołączenie", "Ten sam numer widzi Hela na swoim ekranie (plansza 4, ostatni telefon).", scrJoinRequest],
    ],
  },
  {
    id: "start",
    title: "4 Pierwsze uruchomienie",
    lead: "Powitanie, wyjaśnienie uprawnień przed systemowym pytaniem, utworzenie kręgu albo oczekiwanie na wpuszczenie po zaproszeniu.",
    screens: [
      ["Powitanie", "Dwie drogi: Utwórz krąg albo Mam zaproszenie.", scrWelcome],
      ["Lokalizacja", "Ekran przed systemowym pytaniem Androida. Kolejność pytań jak w forku.", scrPermission],
      ["Utworzenie kręgu", "Imię, nazwa kręgu, serwer. Dalej: zaproszenie (plansza 3).", scrCreate],
      ["Czekanie na wpuszczenie", "Po wklejeniu lub zeskanowaniu zaproszenia i wpisaniu imienia.", scrWaiting],
    ],
  },
];

// ---------------------------------------------------------------- style
const CSS = `
*{box-sizing:border-box}
html,body{margin:0}
body{font-family:'Figtree','Inter',Roboto,'Segoe UI',system-ui,sans-serif;background:#B9C1BD;color:#14201C}
button{font:inherit;color:inherit;border:0;background:none;padding:0;cursor:pointer;text-align:inherit}
input{font:inherit}
p{margin:0}
.h{font-family:'Bricolage Grotesque','Inter Display','Figtree','Inter',Roboto,system-ui,sans-serif}
.page{padding:40px;max-width:none}
.page>header{max-width:900px;margin-bottom:28px}
.page>header h1{font:700 30px/36px 'Bricolage Grotesque','Inter Display','Inter',system-ui,sans-serif;margin:0 0 8px}
.page>header p{font-size:15px;line-height:22px;margin:0 0 6px;color:#14201C}
.board{margin:0 0 56px}
.board>h2{font:700 24px/30px 'Bricolage Grotesque','Inter Display','Inter',system-ui,sans-serif;margin:0 0 6px}
.board>p{font-size:15px;line-height:22px;margin:0 0 20px;max-width:900px}
.states{display:flex;flex-wrap:wrap;gap:40px}
figure{margin:0}
figcaption{max-width:820px;margin:0 0 12px}
figcaption b{display:block;font-size:17px;line-height:24px}
figcaption span{display:block;font-size:14px;line-height:20px;color:#26332E}
.pair{display:flex;gap:40px}

.ph[data-theme="light"]{--bg:#F1F4F2;--surface:#FFFFFF;--surface2:#E8EDEA;--ink:#14201C;--ink2:#4B5A54;--line:#D3DBD7;--accent:#0B7A64;--accentInk:#FFFFFF;--accentSoft:#D6EFE8;--sos:#C62B22;--sosInk:#FFFFFF;--warn:#A85A00;--m-land:#E9EEEA;--m-water:#BDD8E6;--m-park:#CDE5D2;--m-road:#FFFFFF;--m-casing:#D0D8D4;--m-bld:#DCE3DF;--m-label:#5B6B65}
.ph[data-theme="dark"]{--bg:#12141C;--surface:#1C2030;--surface2:#272C41;--ink:#EEF1F6;--ink2:#A9B1C4;--line:#30364C;--accent:#45D9B5;--accentInk:#06251D;--accentSoft:#17372F;--sos:#FF7A6E;--sosInk:#2A0705;--warn:#F0B35A;--m-land:#1A1E2B;--m-water:#17283A;--m-park:#1B3027;--m-road:#2D3450;--m-casing:#12141C;--m-bld:#232839;--m-label:#8C95AD}
.ph{width:390px;height:844px;position:relative;overflow:hidden;border-radius:32px;background:var(--bg);color:var(--ink);box-shadow:0 0 0 1px var(--line);flex:none;font-size:15px}
.ph .map{position:absolute;left:0;top:0}
.thm{font-size:13px;font-weight:600;color:#26332E;margin:0 0 6px 4px}

.scr{position:absolute;left:0;top:0;right:0;bottom:80px;padding:20px 16px 12px;display:flex;flex-direction:column;gap:12px;overflow:hidden}
.scr.full{bottom:0;padding-bottom:16px}
.title{font-size:30px;font-weight:700;line-height:36px}
.txt{font-size:15px;line-height:21px;color:var(--ink)}
.sub{font-size:13px;color:var(--ink2);line-height:18px}
.hint{font-size:13px;line-height:18px;color:var(--ink2);margin:0}
.foot{font-size:13px;line-height:18px;color:var(--ink2);margin:0}
.lbl{font-size:14px;font-weight:600;color:var(--ink);line-height:18px}
.field{display:flex;flex-direction:column;gap:6px}

.note-card{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:16px;background:var(--surface2);font-size:13.5px;line-height:19px;color:var(--ink2)}
.note-card svg{flex:none;margin-top:1px}
.card{background:var(--surface);border-radius:20px;box-shadow:0 0 0 1px var(--line)}
.list{overflow:hidden;flex:none}
.lrow{width:100%;min-height:64px;display:flex;align-items:center;gap:12px;padding:10px 12px 10px 14px}
.lrow+.lrow{border-top:1px solid var(--line)}
.licon{width:40px;height:40px;border-radius:50%;background:var(--accentSoft);color:var(--accent);display:flex;align-items:center;justify-content:center;flex:none}
.ltext{flex:1;display:flex;flex-direction:column;min-width:0}
.lname{font-size:15px;font-weight:600;line-height:20px}
.lsub{font-size:13px;color:var(--ink2);line-height:18px}
.lfence{display:flex;align-items:center;gap:5px;font-size:13px;font-weight:600;color:var(--accent);line-height:18px;margin-top:2px}
.lchev{color:var(--ink2);display:flex}
.here{display:flex}
.ava{border-radius:50%;color:#14201C;display:inline-flex;align-items:center;justify-content:center;font-weight:700;flex:none}

.inp{height:48px;width:100%;border:0;border-radius:14px;background:var(--surface2);box-shadow:inset 0 0 0 1px var(--line);padding:0 14px;font-size:15.5px;color:var(--ink);outline:none}
.inp::placeholder{color:var(--ink2);opacity:1}
.inpwrap{position:relative}
.inpwrap .inp{padding-right:70px}
.cnt{position:absolute;right:14px;top:15px;font-size:13px;color:var(--ink2)}
.row2{display:flex;gap:8px}
.row2>.btn{flex:1}

.btn{height:48px;border-radius:24px;display:flex;align-items:center;justify-content:center;gap:8px;font-size:15px;font-weight:700;padding:0 14px;white-space:nowrap;flex:none}
.btn-big{height:52px;border-radius:26px;font-size:16px}
.btn-p{background:var(--accent);color:var(--accentInk)}
.btn-o{box-shadow:inset 0 0 0 1.5px var(--line);color:var(--ink);font-weight:600}
.btn-sos-o{box-shadow:inset 0 0 0 1.5px var(--sos);color:var(--sos)}
.btn-g{color:var(--accent)}

.seg{display:flex;height:48px;border-radius:24px;background:var(--surface2);box-shadow:inset 0 0 0 1px var(--line)}
.seg button{flex:1;height:48px;border-radius:24px;font-size:14px;font-weight:600;color:var(--ink);text-align:center}
.seg button[aria-checked="true"]{background:var(--accent);color:var(--accentInk);font-weight:700}

.swrow{display:flex;align-items:center;gap:12px;min-height:48px}
.swtext{flex:1;display:flex;flex-direction:column;gap:2px}
.swl{font-size:15px;font-weight:600}
.sw{width:56px;height:48px;position:relative;flex:none}
.sw::before{content:"";position:absolute;left:2px;top:8px;width:52px;height:32px;border-radius:16px;background:var(--surface2);box-shadow:inset 0 0 0 1.5px var(--ink2)}
.sw .knob{position:absolute;left:8px;top:14px;width:20px;height:20px;border-radius:50%;background:var(--ink2)}
.sw.on::before{background:var(--accent);box-shadow:none}
.sw.on .knob{left:30px;top:12px;width:24px;height:24px;background:var(--accentInk)}

.nav{position:absolute;left:0;top:764px;width:390px;height:80px;background:var(--surface);border-top:1px solid var(--line);display:flex}
.nav button{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding-top:12px;font-size:12.5px;font-weight:500;color:var(--ink2);text-align:center}
.nav button.on{font-weight:700;color:var(--ink)}
.nav .ind{position:relative;width:64px;height:32px;border-radius:16px;display:flex;align-items:center;justify-content:center}
.nav button.on .ind{background:var(--accentSoft);color:var(--accent)}
.badge{position:absolute;left:34px;top:-2px;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:var(--sos);color:var(--sosInk);font-size:11.5px;font-weight:700;line-height:18px;text-align:center}

.rbtn{position:absolute;width:44px;height:44px;border-radius:50%;background:var(--surface);color:var(--ink);box-shadow:0 2px 8px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center}
.rbtn.flat{position:static;width:48px;height:48px;box-shadow:none;background:transparent;margin-left:-8px}
.hdr{display:flex;align-items:center;gap:6px;min-height:48px}
.hdr .h{font-size:24px;font-weight:700;line-height:30px}
.pill{position:absolute;left:16px;top:16px;height:48px;padding:0 14px 0 16px;border-radius:24px;background:var(--surface);color:var(--ink);box-shadow:0 2px 8px rgba(0,0,0,.25);display:flex;align-items:center;gap:8px}

.mchip{position:absolute;display:flex;align-items:center;gap:5px;background:var(--surface);color:var(--ink);font:600 12.5px/1 'Figtree','Inter',sans-serif;padding:6px 10px 6px 8px;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.28);white-space:nowrap}
.ring{position:absolute;border-radius:50%;border:2px dashed var(--accent);background:color-mix(in srgb,var(--accentSoft) 70%,transparent)}
.ring-new{border-width:2.5px}
.ring-exit{position:absolute;border-radius:50%;border:2px dotted var(--ink2);opacity:.8}
.cross{position:absolute;color:var(--accent);filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))}
.legend{position:absolute;display:flex;flex-direction:column;gap:6px;align-items:flex-end}
.legend span{white-space:nowrap;display:flex;align-items:center;gap:6px;background:var(--surface);color:var(--ink);font-size:12.5px;font-weight:600;padding:6px 10px;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.28)}
.legend i{display:inline-block;width:18px;height:0}
.lg-in{border-top:2px dashed var(--accent)}
.lg-out{border-top:2px dotted var(--ink2)}
.me{position:absolute;width:22px;height:22px;border-radius:50%;background:var(--accent);border:4px solid var(--surface);box-shadow:0 2px 6px rgba(0,0,0,.35)}
.acc{position:absolute;border-radius:50%;border:1.5px solid var(--accent);background:var(--accentSoft);opacity:.85}
.sosring{position:absolute;border-radius:50%;border:3px solid var(--sos);background:color-mix(in srgb,var(--sos) 16%,transparent)}
.sosbadge{position:absolute;width:22px;height:22px;border-radius:50%;background:var(--sos);color:var(--sosInk);display:flex;align-items:center;justify-content:center;border:2px solid var(--surface)}

.sheet{position:absolute;left:0;right:0;background:var(--surface);border-radius:28px 28px 0 0;box-shadow:0 -2px 12px rgba(0,0,0,.2)}
.grab{position:absolute;left:177px;top:10px;width:36px;height:4px;border-radius:2px;background:var(--line)}
.sbody{padding:26px 16px 12px;display:flex;flex-direction:column;gap:14px}
.shead{display:flex;align-items:center;gap:10px;font-size:20px;font-weight:700}

.banner{position:absolute;left:16px;top:16px;width:358px;padding:14px 14px 14px;border-radius:22px;background:var(--surface);box-shadow:0 2px 10px rgba(0,0,0,.25);display:flex;flex-direction:column;gap:4px}
.banner .bt{font-size:16px;font-weight:700;line-height:22px}
.banner .bs{font-size:13.5px;color:var(--ink2);line-height:19px;margin-bottom:8px}
.toastcard{position:absolute;left:16px;width:358px;min-height:52px;padding:12px 14px;border-radius:18px;background:var(--surface);box-shadow:0 2px 10px rgba(0,0,0,.25);display:flex;align-items:center;gap:10px;font-size:14px;font-weight:600}

.sosbar{position:absolute;left:16px;top:16px;width:358px;min-height:64px;padding:10px 14px;border-radius:22px;background:var(--sos);color:var(--sosInk);display:flex;align-items:center;gap:12px;box-shadow:0 3px 10px rgba(0,0,0,.35)}
.sosbar .sosic{display:flex}
.sb1{display:block;font-size:16px;font-weight:700;line-height:22px}
.sb2{display:block;font-size:13.5px;line-height:19px;font-weight:500}
.facts{display:flex;flex-direction:column;gap:10px}
.facts>div{display:flex;gap:10px;align-items:flex-start;font-size:14px;line-height:20px}
.facts svg{flex:none}

.alert{border-radius:20px;overflow:hidden;box-shadow:0 0 0 1.5px var(--sos)}
.ahead{display:flex;align-items:center;gap:10px;background:var(--sos);color:var(--sosInk);padding:10px 14px;font-size:18px;font-weight:700}
.abody{padding:12px 14px;display:flex;flex-direction:column;gap:10px;background:var(--surface)}
.meta{display:flex;gap:16px;font-size:13px;color:var(--ink2)}
.meta span{display:flex;align-items:center;gap:5px}

.lockbg{position:absolute;inset:0;background:linear-gradient(170deg,var(--surface2),var(--bg) 70%)}
.lockclock{position:absolute;left:0;right:0;top:96px;text-align:center;font-size:76px;font-weight:500;line-height:84px}
.lockdate{position:absolute;left:0;right:0;top:184px;text-align:center;font-size:16px;font-weight:600}
.notif{position:absolute;left:16px;top:262px;width:358px;padding:14px 16px;border-radius:24px;background:var(--surface);box-shadow:0 2px 10px rgba(0,0,0,.25)}
.nh{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600;color:var(--ink2)}
.nicon{width:22px;height:22px;border-radius:50%;background:var(--sos);color:var(--sosInk);display:flex;align-items:center;justify-content:center}
.nt{font-size:16px;font-weight:700;margin-top:8px}
.nb{font-size:14.5px;margin-top:2px}
.lockcap{position:absolute;left:16px;top:400px;width:358px;padding:14px 16px;border-radius:18px;border:1.5px dashed var(--ink2);font-size:13.5px;line-height:19px;color:var(--ink)}
.lockcap b{font-weight:700}
.lockhint{position:absolute;left:0;right:0;bottom:40px;display:flex;justify-content:center;align-items:center;gap:8px;font-size:14px;color:var(--ink2);font-weight:600}

.qrcard{align-self:center;padding:10px;border-radius:20px;background:#FFFFFF;box-shadow:0 0 0 1px var(--line);display:flex}
.tag{align-self:center;display:flex;align-items:center;gap:6px;height:36px;padding:0 14px 0 12px;border-radius:18px;background:var(--surface2);font-size:14px;font-weight:600}
.linkbox{display:block;padding:10px 12px;border-radius:12px;background:var(--surface2);font:13px/18px ui-monospace,'DejaVu Sans Mono',Menlo,Consolas,monospace;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.waitrow{display:flex;align-items:center;gap:10px;font-size:13.5px;line-height:19px;color:var(--ink2)}
.waitrow .dot{width:10px;height:10px;border-radius:50%;border:2px solid var(--ink2);flex:none}

.cam{position:relative;height:300px;border-radius:24px;background:#0E1110;overflow:hidden;flex:none}
.camqr{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%) rotate(-6deg);opacity:.85;border-radius:6px;overflow:hidden;display:flex}
.cc{position:absolute;width:44px;height:44px;border:4px solid #FFFFFF}
.cc.tl{left:72px;top:40px;border-right:0;border-bottom:0;border-radius:14px 0 0 0}
.cc.tr{right:72px;top:40px;border-left:0;border-bottom:0;border-radius:0 14px 0 0}
.cc.bl{left:72px;top:196px;border-right:0;border-top:0;border-radius:0 0 0 14px}
.cc.br{right:72px;top:196px;border-left:0;border-top:0;border-radius:0 0 14px 0}
.camstat{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);display:flex;align-items:center;gap:6px;padding:7px 12px;border-radius:16px;background:#000000;color:#FFFFFF;font-size:13.5px;font-weight:600;white-space:nowrap}
.or{display:flex;align-items:center;gap:10px;font-size:13.5px;color:var(--ink2);font-weight:600}
.or span{flex:1;height:1px;background:var(--line)}

.who{display:flex;align-items:center;gap:14px}
.sbox{display:flex;flex-direction:column;gap:8px;padding:14px 16px;border-radius:20px;background:var(--surface2)}
.safety{display:grid;grid-template-columns:repeat(3,auto);justify-content:space-between;row-gap:4px;font:700 25px/32px ui-monospace,'DejaVu Sans Mono',Menlo,Consolas,monospace;letter-spacing:.5px;color:var(--ink)}

.hero{position:relative;width:200px;height:200px;align-self:center;flex:none}
.hring{position:absolute;left:0;top:0;width:200px;height:200px;border-radius:50%;border:2.5px dashed var(--accent);background:var(--accentSoft)}
.hero .me{width:22px;height:22px}
.hclock{position:absolute;right:4px;top:4px;width:36px;height:36px;border-radius:50%;background:var(--surface);color:var(--ink);display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,.28)}
.trust{display:flex;flex-direction:column;gap:12px;padding:16px;border-radius:20px;background:var(--surface);box-shadow:0 0 0 1px var(--line)}
.trust>div{display:flex;gap:12px;align-items:center;font-size:14.5px;line-height:20px}
.trust svg{flex:none}
.mini{position:relative;height:150px;border-radius:24px;overflow:hidden;flex:none;box-shadow:0 0 0 1px var(--line)}
.steps{display:flex;flex-direction:column;gap:14px}
.steps>div{display:flex;gap:12px;align-items:flex-start}
.steps svg{flex:none;margin-top:1px}
.steps b{display:block;font-size:15px;line-height:20px;font-weight:700}
.steps .sub{display:block;font-size:13.5px;line-height:19px}
.warnbox{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:16px;background:var(--surface);box-shadow:inset 0 0 0 1.5px var(--warn);font-size:13.5px;line-height:19px}
.warnbox svg{flex:none}
.avprev{display:flex;align-items:center;gap:14px}
.srow{display:flex;align-items:center;gap:12px;min-height:60px;padding:8px 14px;width:100%}
.ok{display:flex;align-items:center;gap:5px;font-size:13.5px;font-weight:700;color:var(--accent)}
`;

// ---------------------------------------------------------------- składanie
const themes = [
  ["light", "Motyw jasny"],
  ["dark", "Motyw ciemny"],
];
const html = `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Makiety F2-9</title>
<style>${CSS}</style>
</head>
<body>
<main class="page">
<header>
<h1>Makiety F2-9: Miejsca, aktywny SOS, zaproszenie i QR, pierwsze uruchomienie</h1>
<p>Telefon 390 na 844, obok siebie motyw jasny i ciemny. Tokeny, typografia i nawigacja jak w planszach z <code>docs/makiety/zrodla</code>. Osoby, godziny, adres serwera i kod QR są przykładowe; kod QR to sam wzór, nie da się go zeskanować.</p>
<p>Czcionki: makieta prosi o Bricolage Grotesque i Figtree, ale niczego nie pobiera. Bez nich przeglądarka bierze czcionkę systemową, więc szerokości tekstu mogą się nieco różnić.</p>
</header>
${BOARDS.map(
  (b) => `<section class="board" id="${b.id}">
<h2>${b.title}</h2>
<p>${b.lead}</p>
<div class="states">
${b.screens
  .map(
    ([name, desc, fn], i) => `<figure id="${b.id}-${i + 1}">
<figcaption><b>${name}</b><span>${desc}</span></figcaption>
<div class="pair">
${themes
  .map(
    ([t, l]) => `<div><div class="thm">${l}</div><div class="ph" data-theme="${t}" role="group" aria-label="${name}, ${l.toLowerCase()}">${fn()}</div></div>`,
  )
  .join("\n")}
</div>
</figure>`,
  )
  .join("\n")}
</div>
</section>`,
).join("\n")}
</main>
</body>
</html>
`;

if (/[\u2013\u2014]/.test(html)) {
  throw new Error("W wyniku jest półpauza lub pauza");
}
writeFileSync(OUT, html);
console.log("zapisano", OUT, html.length, "B");
