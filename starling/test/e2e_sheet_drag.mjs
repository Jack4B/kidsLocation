// The circle panel can be dragged from anywhere on it, in real Chromium with
// real touch input: a drag may start on a header button without clicking it, a
// tap still clicks, the SOS hold is left alone, the list moves the panel at
// half and scrolls at full, and a pull down from the top of the list collapses it.
//
// Run from the repo root:  node test/e2e_sheet_drag.mjs
// Ports: 8944 (http), 9344 (devtools). Everything started here is killed.
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HTTP_PORT = 8944;
const CDP_PORT = 9344;
const BASE = `http://127.0.0.1:${HTTP_PORT}`;

const fails = [];
function check(name, cond, detail = "") {
  if (cond) console.log(`  ok   ${name}`);
  else {
    console.log(`  FAIL ${name} ${detail}`);
    fails.push(name);
  }
}

async function waitFor(fn, desc, timeout = 25000) {
  const t0 = Date.now();
  let last;
  while (Date.now() - t0 < timeout) {
    last = await fn();
    if (last) return last;
    await sleep(150);
  }
  throw new Error(`timeout waiting for ${desc}; last ${JSON.stringify(last)}`);
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
    const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.result?.exceptionDetails) {
      throw new Error(`page threw: ${r.result.exceptionDetails.exception?.description}`);
    }
    return r.result?.result?.value;
  };
  return { send, evalJs, open: new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }) };
}

let c;
const touch = (type, x, y) =>
  c.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y, id: 1 }] });

// A finger down at (x, y0), moving to y1 in steps, then up. holdMs keeps it
// stationary before lifting.
async function swipe(x, y0, y1, { steps = 14, stepMs = 16, holdMs = 0 } = {}) {
  await touch("touchStart", x, y0);
  for (let i = 1; i <= steps; i++) {
    await touch("touchMove", x, y0 + ((y1 - y0) * i) / steps);
    await sleep(stepMs);
  }
  if (holdMs) await sleep(holdMs);
  await touch("touchEnd");
  await sleep(700);
}

const tap = (x, y) => swipe(x, y, y, { steps: 0, holdMs: 60 });

const center = (sel) =>
  c.evalJs(`(() => {
    const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  })()`);

const snapOf = () =>
  c.evalJs(`(() => {
    const s = document.getElementById("sheet");
    return s.classList.contains("sheet-full") ? "full" : s.classList.contains("sheet-peek") ? "peek" : "half";
  })()`);

const expanded = () => c.evalJs(`document.querySelector(".grabber").getAttribute("aria-expanded")`);

async function fresh(snap, height = 844) {
  await c.send("Emulation.setDeviceMetricsOverride", { width: 390, height, deviceScaleFactor: 2, mobile: true });
  await c.send("Page.navigate", { url: `${BASE}/?demo=1${snap === "full" ? "&sheet=full" : ""}` });
  await waitFor(
    () => c.evalJs("window.__starlingState && window.__starlingState().demo && window.__starlingState().screen === 'map'"),
    "demo map",
  );
  await sleep(800);
  if (snap === "half") await c.evalJs(`document.querySelector(".grabber").click()`);
  await sleep(700);
  const got = await snapOf();
  if (got !== snap) throw new Error(`could not reach ${snap}, at ${got}`);
  await c.evalJs(`(() => {
    window.__clicks = {};
    for (const id of ["share-toggle", "checkin-button", "status-open"]) {
      document.querySelector('[data-testid="' + id + '"]').addEventListener("click", () => {
        window.__clicks[id] = (window.__clicks[id] || 0) + 1;
      });
    }
    window.__toasts = [];
    new MutationObserver((ms) => {
      for (const m of ms) for (const n of m.addedNodes) window.__toasts.push(n.textContent);
    }).observe(document.getElementById("toasts"), { childList: true, subtree: true });
  })()`);
}

const clicks = (id) => c.evalJs(`window.__clicks["${id}"] || 0`);
const sharing = () => c.evalJs("window.__starlingState().sharing");
const sos = () => c.evalJs("window.__starlingState().sosActive");
const scrollTop = () => c.evalJs(`document.getElementById("sheet-body").scrollTop`);

async function main() {
  const profile = mkdtempSync(path.join(tmpdir(), "starling-sheet-e2e-"));
  const server = spawn("node", [path.join(ROOT, "test", "serve_local.mjs"), String(HTTP_PORT)], {
    cwd: ROOT,
    env: { ...process.env, STARLING_TEST: "1", RATE_POST_MIN: "100000", RATE_GET_MIN: "100000" },
    stdio: "ignore",
  });
  const chromium = spawn("chromium", [
    "--headless=new",
    `--remote-debugging-port=${CDP_PORT}`,
    "--user-data-dir=" + profile,
    "--no-sandbox",
    "--disable-gpu",
    "about:blank",
  ], { stdio: "ignore" });

  try {
    await waitFor(async () => {
      const [a, b] = await Promise.all([
        fetch(`${BASE}/api/v2/health`).then((r) => r.ok).catch(() => false),
        fetch(`http://127.0.0.1:${CDP_PORT}/json/version`).then((r) => r.ok).catch(() => false),
      ]);
      return a && b;
    }, "server and devtools up");

    const tab = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?about:blank`, { method: "PUT" })).json();
    c = connect(tab.webSocketDebuggerUrl);
    await c.open;
    await c.send("Page.enable");
    await c.send("Runtime.enable");
    await c.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });

    console.log("header");
    await fresh("peek");
    const share0 = await sharing();
    let p = await center('[data-testid="share-toggle"]');
    await swipe(p.x, p.y, p.y - 320);
    const a = await snapOf();
    check("a: a drag up from the share toggle opens the panel", a !== "peek", a);
    check("a: aria-expanded follows", (await expanded()) === "true");
    check("a: the share toggle did not click", (await clicks("share-toggle")) === 0);
    check("a: sharing is unchanged", (await sharing()) === share0);
    await sleep(600);
    await c.evalJs(`document.querySelector('[data-testid="share-toggle"]').click()`);
    await sleep(200);
    check("a: a keyboard or screen reader click after the drag still lands", (await clicks("share-toggle")) === 1);

    await fresh("peek");
    p = await center('[data-testid="share-toggle"]');
    await tap(p.x, p.y);
    check("b: a tap on the share toggle clicks it once", (await clicks("share-toggle")) === 1);
    check("b: and flips sharing", (await sharing()) === !share0);
    check("b: and leaves the panel at peek", (await snapOf()) === "peek");
    p = await center('[data-testid="checkin-button"]');
    await tap(p.x, p.y);
    check("b: a tap on the check-in button clicks it once", (await clicks("checkin-button")) === 1);

    await fresh("peek");
    p = await center('[data-testid="sos-button"]');
    await swipe(p.x, p.y, p.y - 320);
    check("c: a drag from the SOS button does not move the panel", (await snapOf()) === "peek", await snapOf());
    check("c: and sends no SOS", !(await sos()));
    await fresh("peek");
    p = await center('[data-testid="sos-button"]');
    await swipe(p.x, p.y, p.y, { steps: 0, holdMs: 400 });
    check("c: a short press sends no SOS", !(await sos()));
    check(
      "c: a short press says to hold",
      (await c.evalJs("window.__toasts")).some((t) => /przytrzymaj/i.test(t)),
      JSON.stringify(await c.evalJs("window.__toasts")),
    );
    check("c: and the panel stays put", (await snapOf()) === "peek");
    await fresh("peek");
    p = await center('[data-testid="sos-button"]');
    await swipe(p.x, p.y, p.y, { steps: 0, holdMs: 1700 });
    check("c: a full hold still sends the SOS", await sos());

    console.log("body at half");
    await fresh("half");
    p = await center('[data-testid="member-card"]');
    await swipe(p.x, p.y, p.y - 320);
    check("d: a drag up on a card takes half to full", (await snapOf()) === "full", await snapOf());
    await fresh("half");
    p = await center('[data-testid="member-card"]');
    await swipe(p.x, p.y, p.y + 400);
    check("d: a drag down on a card takes half to peek", (await snapOf()) === "peek", await snapOf());
    await fresh("half");
    p = await center('[data-testid="member-card"]');
    await tap(p.x, p.y);
    check(
      "f: a tap on a card still opens its details",
      await c.evalJs(`!document.getElementById("focus-card").hidden`),
    );
    check("f: and leaves the panel at half", (await snapOf()) === "half");

    console.log("body at full");
    // Since the redesign the people sit in a sideways row above the body, so
    // the demo's body (alerts, tools) no longer overflows on its own, and a
    // 400 px screen leaves the body no room under that row. A full-height
    // screen with a spacer standing in for a long body; the gestures below
    // are what is tested.
    await fresh("full");
    await c.evalJs(`(() => { const s = document.createElement("div"); s.style.height = "600px"; document.getElementById("sheet-body").append(s); })()`);
    await sleep(100);
    const room = await c.evalJs(`(() => { const b = document.getElementById("sheet-body"); return b.scrollHeight - b.clientHeight; })()`);
    check("e: the list is long enough to scroll", room > 80, String(room));
    p = await center("#sheet-body");
    await swipe(p.x, p.y, p.y - 90);
    const up = await scrollTop();
    check("e: a drag up scrolls the list", up > 40, String(up));
    check("e: and the panel stays full", (await snapOf()) === "full");
    p = await center("#sheet-body");
    await swipe(p.x, p.y, p.y + 50);
    const back = await scrollTop();
    check("e: a pull down inside a scrolled list scrolls it back", back < up - 20, `${up} -> ${back}`);
    check("e: and the panel stays full", (await snapOf()) === "full");
    await c.evalJs(`document.getElementById("sheet-body").scrollTop = 0`);
    await sleep(100);
    p = await center("#sheet-body");
    await swipe(p.x, p.y, p.y + 420);
    const down = await snapOf();
    check("e: a pull down from the top collapses the panel", down !== "full", down);
    check("e: and the list was not scrolled meanwhile", (await scrollTop()) === 0);

    console.log("keyboard and screen reader path");
    await fresh("peek");
    await c.evalJs(`document.querySelector(".grabber").click()`);
    await sleep(600);
    check("grabber click opens", (await snapOf()) === "half" && (await expanded()) === "true");
    await c.evalJs(`document.querySelector(".grabber").click()`);
    await sleep(600);
    check("grabber click closes", (await snapOf()) === "peek" && (await expanded()) === "false");
  } finally {
    chromium.kill();
    server.kill();
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
  console.log("E2E SHEET DRAG PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
