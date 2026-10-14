// The installed app is the app, not the website. This drives the REAL page in
// headless Chromium twice over CDP: once with window.StarlingNative injected
// before any page script runs (exactly what the Android WebView's
// addJavascriptInterface does), once bare. Inside the wrapper the marketing
// sections must be gone from the DOM entirely and the one link out to the
// site revealed; on the web every section stays and the link never shows.
//
// Chromium because only CDP's Page.addScriptToEvaluateOnNewDocument can plant
// the bridge before module scripts execute; Marionette cannot. Node's
// built-in WebSocket keeps this dependency-free.
//
// Run from the repo root:  node test/e2e_wrapper.mjs
// Ports: 8933 (http), 9334 (devtools). Everything started here is killed.
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HTTP_PORT = 8933;
const CDP_PORT = 9334;
const BASE = `http://127.0.0.1:${HTTP_PORT}`;
// The relay the served page has built in (serve_local writes build-config.js from it).
const E2E_RELAY = "https://relay.e2e.test";
const SHOTS = path.join(ROOT, "test", "screenshots");

const fails = [];
function check(name, cond, detail = "") {
  if (cond) console.log(`  ok   ${name}`);
  else {
    console.log(`  FAIL ${name} ${detail}`);
    fails.push(name);
  }
}

const BRIDGE_STUB = `window.StarlingNative = {
  platform: () => "android",
  version: () => "e2e",
  torSupported: () => false,
  bioSupported: () => false,
  startLocation: () => {},
  stopLocation: () => {},
};`;

async function waitFor(fn, desc, timeout = 20000) {
  const t0 = Date.now();
  let last;
  while (Date.now() - t0 < timeout) {
    last = await fn();
    if (last) return last;
    await sleep(300);
  }
  throw new Error(`timeout waiting for ${desc}; last: ${JSON.stringify(last)}`);
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  const pending = new Map();
  let id = 0;
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const myId = ++id;
      pending.set(myId, resolve);
      ws.send(JSON.stringify({ id: myId, method, params }));
    });
  const evalJs = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, returnByValue: true });
    if (r.result?.exceptionDetails) {
      throw new Error(`page threw: ${JSON.stringify(r.result.exceptionDetails.exception?.description)}`);
    }
    return r.result?.result?.value;
  };
  return {
    send,
    evalJs,
    open: new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    }),
    close: () => ws.close(),
  };
}

async function newTab() {
  const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?about:blank`, { method: "PUT" });
  const tab = await res.json();
  const c = connect(tab.webSocketDebuggerUrl);
  await c.open;
  await c.send("Page.enable");
  await c.send("Runtime.enable");
  return c;
}

async function bootAndRead(c, { wrapper }) {
  if (wrapper) await c.send("Page.addScriptToEvaluateOnNewDocument", { source: BRIDGE_STUB });
  await c.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await c.send("Page.navigate", { url: BASE + "/" });
  await waitFor(
    () => c.evalJs("!!window.__starlingApi && !document.getElementById('screen-onboarding').hidden"),
    "onboarding on screen",
  );
  return c.evalJs(`(() => {
    const about = document.getElementById("ob-about");
    return {
      webOnly: document.querySelectorAll(".web-only").length,
      landingApp: !!document.getElementById("landing-app"),
      installCard: (() => { const c = document.getElementById("install-card"); return !!c && !c.hidden; })(),
      faq: !!document.querySelector(".lnd-faq"),
      footer: !!document.querySelector(".land-footer"),
      aboutShown: !!about && !about.hidden,
      aboutHref: document.getElementById("about-site")?.getAttribute("href") ?? null,
      createShown: !document.querySelector('[data-testid="onboarding-create"]').hidden,
      demoShown: !document.querySelector('[data-testid="onboarding-demo"]').hidden,
      errs: (window.__starlingErrors || []).slice(0, 5),
    };
  })()`);
}

async function readCredit(c) {
  await c.evalJs(`document.querySelector('[data-testid="onboarding-demo"]').click()`);
  await waitFor(() => c.evalJs("window.__starlingApi.state.demo === true"), "demo running");
  await c.evalJs(`document.querySelector('[data-testid="tab-circle"]').click(); document.querySelector('[data-testid="settings-open"]').click()`);
  return waitFor(
    () => c.evalJs(`(() => {
      const p = document.querySelector('[data-testid="about-credit"]');
      if (!p) return null;
      return {
        text: p.textContent,
        links: [...p.querySelectorAll("a")].map((a) => [a.textContent, a.getAttribute("href"), a.target, a.rel].join(" ")),
      };
    })()`),
    "the credit line in Settings",
  );
}

// The sharing notification's Check in button: the wrapper pushes {"checkin":true}
// through the same function that carries fixes and expects a result back.
const CHECKIN_BRIDGE = `${BRIDGE_STUB.replace(/};$/, "")}
  shareCheckin: () => !!window.__ci,
  setShareCheckin: (on) => { window.__ci = !!on; (window.__ciSet ||= []).push(!!on); },
  shareCheckinResult: (r) => (window.__ciResults ||= []).push(r),
};
{
  const real = window.fetch.bind(window);
  window.__posts = 0;
  window.fetch = (input, init) => {
    const url = String(input?.url || input).replace("${E2E_RELAY}", location.origin);
    if ((init?.method || "GET") === "POST" && url.includes("/api/v2/f/")) window.__posts++;
    return real(url, init);
  };
}`;

async function checkinScenario() {
  const c = await newTab();
  await c.send("Page.addScriptToEvaluateOnNewDocument", { source: CHECKIN_BRIDGE });
  await c.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await c.send("Page.navigate", { url: BASE + "/" });
  await waitFor(
    () => c.evalJs("!!window.__starlingApi && !document.getElementById('screen-onboarding').hidden"),
    "onboarding on screen",
  );
  await c.evalJs(`document.querySelector('[data-testid="onboarding-create"]').click()`);
  await waitFor(() => c.evalJs(`!!document.querySelector('[data-testid="identity-sheet"]')`), "identity sheet");
  await c.evalJs(`(() => {
    const sheet = document.querySelector('[data-testid="identity-sheet"]');
    [...sheet.querySelectorAll("input[type=text], input:not([type])")].forEach((el, i) => {
      el.value = i === 0 ? "Probe" : "Probe circle";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
  })()`);
  await c.evalJs(`document.querySelector('[data-testid="identity-save"]').click()`);
  await waitFor(() => c.evalJs("window.__starlingState && window.__starlingState().screen === 'map'"), "map after create");
  await c.evalJs(`document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))`);
  await sleep(500);

  await c.evalJs(`document.querySelector('[data-testid="tab-circle"]').click(); document.querySelector('[data-testid="settings-open"]').click()`);
  await waitFor(() => c.evalJs(`!!document.querySelector('[data-testid="settings-share-checkin"]')`), "the check-in row in Settings");
  const row = await c.evalJs(`(() => {
    const r = document.querySelector('[data-testid="settings-share-checkin"]');
    const sw = r.querySelector('[role="switch"]');
    const first = sw.getAttribute("aria-checked");
    sw.click();
    return { text: r.textContent, first, after: sw.getAttribute("aria-checked"), set: window.__ciSet };
  })()`);
  check(
    "check-in: the Settings row says what it does",
    row.text.includes("Check in from the sharing notification") && row.text.includes("It cannot cancel an SOS."),
    row.text,
  );
  check("check-in: it starts off and a tap turns it on in the wrapper", row.first === "false" && row.after === "true" && JSON.stringify(row.set) === "[true]", JSON.stringify(row));
  await c.evalJs(`document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))`);
  await sleep(400);

  await c.evalJs(`(() => {
    setInterval(() => window.__starlingFix && window.__starlingFix(JSON.stringify({
      lat: 45.06, lon: 13.23, ts: Date.now(), acc: 8,
    })), 1000);
    document.querySelector('[data-testid="share-toggle"]').click();
  })()`);
  await waitFor(() => c.evalJs("window.__starlingApi.state.sharing === true"), "sharing on");
  await sleep(1500);

  const before = await c.evalJs("window.__posts");
  await c.evalJs(`window.__starlingFix('{"checkin":true}')`);
  await waitFor(() => c.evalJs("(window.__ciResults || []).length >= 1"), "a result for the check-in");
  const done = await c.evalJs(`({ results: window.__ciResults, posts: window.__posts, sos: window.__starlingApi.state.sosActive })`);
  check("check-in: the notification button checks in and reports ok", JSON.stringify(done.results) === '["ok"]', JSON.stringify(done.results));
  check("check-in: and a post went to the relay for it", done.posts > before, `${before} -> ${done.posts}`);

  await c.evalJs(`window.__starlingInternals.fireSos()`);
  await waitFor(() => c.evalJs("window.__starlingApi.state.sosActive === true"), "SOS active");
  await c.evalJs(`window.__starlingFix('{"checkin":true}')`);
  await waitFor(() => c.evalJs("(window.__ciResults || []).length >= 2"), "a result during the SOS");
  const sos = await c.evalJs(`({ results: window.__ciResults, sos: window.__starlingApi.state.sosActive, errs: (window.__starlingErrors || []).slice(0, 5) })`);
  check("check-in: during an SOS it reports sos", sos.results.at(-1) === "sos", JSON.stringify(sos.results));
  check("check-in: and the SOS stays active", sos.sos === true);
  check("check-in: console clean", sos.errs.length === 0, JSON.stringify(sos.errs));
  c.close();
}

async function main() {
  const profile = mkdtempSync(path.join(tmpdir(), "starling-wrapper-e2e-"));
  const server = spawn("node", [path.join(ROOT, "test", "serve_local.mjs"), String(HTTP_PORT)], {
    cwd: ROOT,
    env: { ...process.env, STARLING_TEST: "1", RATE_POST_MIN: "100000", RATE_GET_MIN: "100000", RELAY_URL: E2E_RELAY },
    stdio: "ignore",
  });
  const chromium = spawn(
    "chromium",
    [
      "--headless=new",
      `--remote-debugging-port=${CDP_PORT}`,
      "--user-data-dir=" + profile,
      "--no-sandbox",
      "--disable-gpu",
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  try {
    await waitFor(async () => {
      try {
        const [a, b] = await Promise.all([
          fetch(`${BASE}/api/v2/health`).then((r) => r.ok).catch(() => false),
          fetch(`http://127.0.0.1:${CDP_PORT}/json/version`).then((r) => r.ok).catch(() => false),
        ]);
        return a && b;
      } catch {
        return false;
      }
    }, "server and devtools up");

    const wrap = await newTab();
    const w = await bootAndRead(wrap, { wrapper: true });
    check("wrapper: every web-only section removed from the DOM", w.webOnly === 0, String(w.webOnly));
    check("wrapper: no APK download card inside the app", !w.landingApp);
    check("wrapper: no install-yourself nudge inside the app", !w.installCard);
    check("wrapper: no FAQ, no site footer", !w.faq && !w.footer);
    check("wrapper: relay button shown, no link out to the upstream site", w.aboutShown && w.aboutHref === null, w.aboutHref);
    check("wrapper: create and demo buttons present", w.createShown && w.demoShown);
    check("wrapper: console clean", w.errs.length === 0, JSON.stringify(w.errs));
    const shot = await wrap.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(path.join(SHOTS, "22-wrapper-start.png"), Buffer.from(shot.result.data, "base64"));
    const credit = await readCredit(wrap);
    check("wrapper: Settings says who made it", credit.text.startsWith("Made by Munzzyy"), credit.text);
    check(
      "wrapper: the credit links leave the app instead of navigating it",
      credit.links.join("|") ===
        "Munzzyy https://github.com/munzzyy _blank noopener noreferrer|Source code https://github.com/munzzyy/starling _blank noopener noreferrer",
      credit.links.join("|"),
    );
    wrap.close();

    const web = await newTab();
    const v = await bootAndRead(web, { wrapper: false });
    // Seven sections plus the subline's platform-note span.
    check("web: all eight web-only nodes still present", v.webOnly === 8, String(v.webOnly));
    check("web: download card still exists", v.landingApp);
    check("web: about link never shows", !v.aboutShown);
    check("web: console clean", v.errs.length === 0, JSON.stringify(v.errs));

    // The demo tours Places with invented spots: two rings, off-grid, banner up.
    await web.send("Page.navigate", { url: BASE + "/?demo=1" });
    await waitFor(
      () => web.evalJs("!!window.__starlingApi && window.__starlingApi.state.demo === true"),
      "demo running",
    );
    await waitFor(
      () => web.evalJs("document.querySelectorAll('.place-ring').length === 2"),
      "two demo place rings",
    );
    const demoState = await web.evalJs(`(() => ({
      offgrid: document.getElementById("map").classList.contains("offgrid"),
      banner: !document.getElementById("banner-demo").hidden,
      tags: [...document.querySelectorAll(".place-tag")].map((t) => t.textContent).sort().join(","),
      errs: (window.__starlingErrors || []).slice(0, 5),
    }))()`);
    check("demo: forced off-grid with the banner up", demoState.offgrid && demoState.banner);
    check("demo: the invented places are Home and The fountain", demoState.tags === "Home,The fountain", demoState.tags);
    check("demo: console clean", demoState.errs.length === 0, JSON.stringify(demoState.errs));
    web.close();

    // A Spanish system boots a Spanish app: bridge stub plus a language
    // override, before any page script runs.
    const esTab = await newTab();
    await esTab.send("Page.addScriptToEvaluateOnNewDocument", { source: BRIDGE_STUB });
    await esTab.send("Page.addScriptToEvaluateOnNewDocument", {
      source: 'Object.defineProperty(navigator, "languages", { get: () => ["es-MX", "es"] });',
    });
    await esTab.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await esTab.send("Page.navigate", { url: BASE + "/" });
    await waitFor(
      () => esTab.evalJs("!!window.__starlingApi && !document.getElementById('screen-onboarding').hidden"),
      "es onboarding on screen",
    );
    const esState = await esTab.evalJs(`(() => ({
      lang: document.documentElement.lang,
      create: document.querySelector('[data-testid="onboarding-create"]').textContent,
      tagline: document.querySelector("#screen-onboarding .ob-tagline").textContent,
      errs: (window.__starlingErrors || []).slice(0, 3),
    }))()`);
    check("es: document language follows the system", esState.lang === "es", esState.lang);
    check("es: the start screen speaks Spanish", esState.create === "Crear un círculo" && esState.tagline === "Tu gente, en tu mapa. Nadie más.", JSON.stringify([esState.create, esState.tagline]));
    const esCredit = await readCredit(esTab);
    check("es: the credit line is translated", esCredit.text === "Hecho por Munzzyy \u00b7 Código fuente", esCredit.text);
    check("es: console clean", esState.errs.length === 0, JSON.stringify(esState.errs));
    esTab.close();

    await checkinScenario();
  } finally {
    chromium.kill();
    server.kill();
    // Chromium flushes its profile on the way down; a leftover temp dir is
    // harmless, a teardown throw masking real results is not.
    await sleep(400);
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch {
      // still shutting down; the OS temp cleaner owns it now
    }
  }
  if (fails.length) {
    console.log("FAILS:", fails.join("; "));
    process.exit(1);
  }
  console.log("E2E WRAPPER PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
