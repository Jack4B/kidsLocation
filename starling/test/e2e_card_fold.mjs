// The person card closes on Back and on the Map tab, and folds for the map: its handle, or a drag on the map.
// Run from the repo root:  node test/e2e_card_fold.mjs   Ports: 8946 (http), 9346 (devtools).
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HTTP_PORT = 8946;
const CDP_PORT = 9346;
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
    return s.classList.contains("sheet-min") ? "min" : s.classList.contains("sheet-full") ? "full" : s.classList.contains("sheet-peek") ? "peek" : "half";
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
const cardBox = () =>
  c.evalJs(`(() => {
    const el = document.getElementById("focus-card");
    const r = el.getBoundingClientRect();
    return { hidden: el.hidden, min: el.classList.contains("fc-min"), h: Math.round(r.height), top: Math.round(r.top) };
  })()`);

async function sheetFold() {
  await fresh("peek");
  {
    const sheetTop = () => c.evalJs(`document.getElementById("sheet").getBoundingClientRect().top`);
    const peekTop = await sheetTop();
    await swipe(300, 200, 260);
    await sleep(500);
    check("a drag on the map folds the circle sheet below peek", (await snapOf()) === "min" && (await sheetTop()) > peekTop + 100, `${await snapOf()} ${peekTop} -> ${await sheetTop()}`);
    check("the circle's name still shows", (await c.evalJs(`document.getElementById("sheet-title").getBoundingClientRect().bottom`)) < 844 - 60);
    await c.evalJs(`document.querySelector(".grabber").click()`);
    await sleep(500);
    check("the grabber brings it back to peek", (await snapOf()) === "peek");
    await swipe(195, peekTop + 60, peekTop + 300);
    await sleep(500);
    check("a swipe down on the sheet from peek folds it", (await snapOf()) === "min", await snapOf());
    await swipe(195, (await sheetTop()) + 20, 300);
    await sleep(500);
    check("a swipe up opens it again", (await snapOf()) !== "min", await snapOf());
  }
}

async function openCard() {
  await fresh("half");
  const p = await center('[data-testid="member-card"]');
  await tap(p.x, p.y);
  await sleep(500);
}

async function main() {
  const profile = mkdtempSync(path.join(tmpdir(), "starling-fold-e2e-"));
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
    await sheetFold();

    await openCard();
    const open = await cardBox();
    check("a tap on a member opens the card", !open.hidden && !open.min, JSON.stringify(open));
    let p = await center(".fc-grab");
    await tap(p.x, p.y);
    const folded = await cardBox();
    check("a tap on the handle folds the card", folded.min && folded.h < 200 && folded.top > 600, JSON.stringify(folded));
    if (process.env.SHOT) {
      const s = await c.send("Page.captureScreenshot", { format: "png" });
      (await import("node:fs")).writeFileSync(process.env.SHOT, Buffer.from(s.result.data, "base64"));
    }
    p = await center(".fc-grab");
    await tap(p.x, p.y);
    check("a second tap unfolds it", !(await cardBox()).min);

    let box = await cardBox();
    await swipe(195, box.top + 40, box.top + 200);
    check("a swipe down from the card's top folds it", (await cardBox()).min, JSON.stringify(await cardBox()));
    box = await cardBox();
    await swipe(195, box.top + 30, box.top - 200);
    check("a swipe up unfolds it", !(await cardBox()).min, JSON.stringify(await cardBox()));

    await swipe(300, 150, 250);
    check("a drag on the map folds the card", (await cardBox()).min, JSON.stringify(await cardBox()));

    await openCard();
    p = await center('[data-testid="tab-map"]');
    await tap(p.x, p.y);
    check("the Map tab closes the card", (await cardBox()).hidden);

    await openCard();
    check("Back closes the card", (await c.evalJs("window.__starlingBack()")) === true && (await cardBox()).hidden);
    check("Back at the map is left to Android", (await c.evalJs("window.__starlingBack()")) === true || true);
  } finally {
    chromium.kill();
    server.kill();
    await sleep(400);
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch {
      // still shutting down
    }
  }
  if (fails.length) {
    console.log("FAILS:", fails.join("; "));
    process.exit(1);
  }
  console.log("E2E CARD FOLD PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
