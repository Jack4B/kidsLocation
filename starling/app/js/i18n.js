// Translation, gettext style: the English source string is the key. That
// keeps English as the always-complete baseline (an untranslated string
// degrades to English instead of to a key or a blank), keeps every test
// asserting real copy valid, and makes extraction mechanical. Catalogs map
// normalized English to the target language; {name}-style placeholders are
// substituted after lookup, so translators can reorder them freely.
//
// No build step, no external service: catalogs are plain modules, shipped
// with the app like everything else.

// Loaded on demand: a help link on a weak connection should not pull every language.
const CODES = ["pl", "es", "de", "fr", "pt"];

// This build is Polish first: a fresh install, and any preference that names
// no language this build knows, opens in Polish whatever the phone is set to.
export const DEFAULT_LOCALE = "pl";

// The name people see. Source strings still say Starling (the upstream
// project this is built on); t() rebrands every template before any value
// is substituted, so a member's own words are never touched.
export const BRAND = "Blisko";
const CATALOGS = {};

// Direction by locale, for the day an RTL catalog lands. The engine and the
// document wiring are ready for it; the CSS keeps earning it separately.
const DIR = { ar: "rtl", fa: "rtl", he: "rtl", ur: "rtl" };

export const LOCALE_CHOICES = [
  { id: "pl", label: "Polski" },
  { id: "en", label: "English" },
  { id: "es", label: "Español" },
  { id: "de", label: "Deutsch" },
  { id: "fr", label: "Français" },
  { id: "pt", label: "Português (Brasil)" },
];

let active = null; // null means English source text passes through
let activeCode = "en";
let plural = null; // Intl.PluralRules for the active catalog

export const norm = (s) => String(s).replace(/\s+/g, " ").trim();

// Which locale a preference resolves to. An explicit choice of a language
// this build has wins; anything else, including the "auto" an older install
// may have stored, is the default, never the phone's language.
export function resolveLocale(pref) {
  return pref === "en" || CODES.includes(pref) ? pref : DEFAULT_LOCALE;
}

export async function loadLocale(code) {
  if (!CODES.includes(code) || CATALOGS[code]) return;
  const mod = await import(`./strings-${code}.js`);
  CATALOGS[code] = mod[code];
}

// A catalog that is not loaded yet leaves the page in English, never half way.
export function setLocale(code) {
  activeCode = code === "en" || CATALOGS[code] ? code : "en";
  active = activeCode === "en" ? null : CATALOGS[activeCode];
  plural = typeof Intl === "object" && Intl.PluralRules ? new Intl.PluralRules(activeCode) : null;
  if (globalThis.document) {
    document.documentElement.lang = activeCode;
    document.documentElement.dir = DIR[activeCode] || "ltr";
  }
}

export const currentLocale = () => activeCode;

// A catalog entry is a string, or, for a language with more plural forms than
// English, an object keyed by Intl.PluralRules category ({ one, few, many }).
// The count is the n variable, else the first numeric one. Polish needs this:
// 1 miejsce, 2 miejsca, 5 miejsc, where English only picks between two keys.
function pick(entry, vars) {
  if (typeof entry === "string") return entry;
  const raw = !vars ? undefined : "n" in vars ? vars.n : Object.values(vars).find((v) => typeof v === "number");
  const n = typeof raw === "number" || (typeof raw === "string" && raw.trim() !== "") ? Number(raw) : NaN;
  const cat = Number.isFinite(n) && plural ? plural.select(n) : "other";
  return entry[cat] ?? entry.other ?? entry.many ?? Object.values(entry)[0];
}

export function t(text, vars) {
  let out = text;
  if (active) {
    if (active[text] !== undefined) {
      out = pick(active[text], vars);
    } else {
      // Catalog keys are whitespace-normalized; a source string carrying
      // deliberate leading or trailing space (glue for composed sentences)
      // keeps that space around the translation.
      const hit = active[norm(text)];
      if (hit !== undefined) out = text.match(/^\s*/)[0] + pick(hit, vars) + text.match(/\s*$/)[0];
    }
  }
  // The Polish catalog is written with the brand already, and may name the
  // upstream project on purpose; English and the upstream catalogs are not.
  if (activeCode !== DEFAULT_LOCALE) out = out.replace(/\bStarling\b/g, BRAND);
  if (vars) {
    // One pass over the TEMPLATE, never over substituted output: a member
    // who names themselves "{gone}" must not have another variable's value
    // re-substituted into their slot. Sequential replaceAll had exactly
    // that hole, in the who-removed-whom strings of all places.
    out = out.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  }
  return out;
}

// Translate the static page: every [data-i18n] element's text is looked up
// by its normalized English source. The source is stashed on first touch so
// a later locale switch translates from English again, not from the last
// translation.
export function translateDom(root) {
  // Node imports these modules for tests; no document means nothing to do.
  const scope = root || globalThis.document;
  if (!scope?.querySelectorAll) return;
  for (const node of scope.querySelectorAll("[data-i18n]")) {
    if (!node.dataset.i18nSrc) node.dataset.i18nSrc = norm(node.textContent);
    node.textContent = t(node.dataset.i18nSrc);
  }
  for (const node of scope.querySelectorAll("[data-i18n-attr]")) {
    for (const attr of node.dataset.i18nAttr.split(",")) {
      // Plain attributes, not dataset: attr names like "aria-label" are not
      // legal DOMStringMap property names.
      const stash = `data-i18n-src-${attr}`;
      if (!node.hasAttribute(stash)) node.setAttribute(stash, norm(node.getAttribute(attr) || ""));
      node.setAttribute(attr, t(node.getAttribute(stash)));
    }
  }
}
