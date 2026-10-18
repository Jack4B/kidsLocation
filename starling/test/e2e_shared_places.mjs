// End to end: shared places between two phones in one circle, through the
// relay, in headless Chromium. Same setup as e2e_chat.mjs: A creates the
// circle, B joins with the safety number checked. Then A adds a place, B gets
// it, B renames it, A gets that, A removes it, B loses it, and the relay's
// feed never shows the place's name.
//
// Needs Playwright with its Chromium (PLAYWRIGHT_BROWSERS_PATH); not part of
// `node --test`, run by hand:
//   node test/e2e_shared_places.mjs
// Port 8943. Everything started here is stopped before exit.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 8943;
const BASE = `http://127.0.0.1:${PORT}`;
const SHOTS = path.resolve(process.argv[2] || path.join(ROOT, "test", "screenshots"));
mkdirSync(SHOTS, { recursive: true });

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  for (const where of ["playwright", "/opt/node22/lib/node_modules/playwright", "/usr/lib/node_modules/playwright"]) {
    try {
      return require(where);
    } catch {
      // try the next place
    }
  }
  throw new Error("playwright not found");
}
const { chromium } = loadPlaywright();

const fails = [];
function check(name, cond, detail = "") {
  if (cond) console.log(`  ok   ${name}`);
  else {
    console.log(`  FAIL ${name} ${detail}`);
    fails.push(name);
  }
}

async function waitFor(fn, desc, { timeout = 30000, nudge } = {}) {
  const t0 = Date.now();
  let last;
  while (Date.now() - t0 < timeout) {
    last = await fn();
    if (last) return last;
    if (nudge) await nudge();
    await sleep(300);
  }
  throw new Error(`timeout waiting for ${desc}; last: ${JSON.stringify(last)}`);
}

const server = spawn(process.execPath, [path.join(ROOT, "test", "serve_local.mjs"), String(PORT)], {
  cwd: ROOT,
  env: { ...process.env, STARLING_TEST: "1", RATE_POST_MIN: "100000", RATE_GET_MIN: "100000" },
  stdio: "ignore",
});

let browser;
try {
  await waitFor(async () => {
    try {
      return (await fetch(`${BASE}/api/v2/health`)).ok;
    } catch {
      return false;
    }
  }, "relay health");
  console.log(`server up on ${BASE}`);

  browser = await chromium.launch();
  const phone = async (name) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "dark" });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`);
    });
    const state = () => page.evaluate(() => window.__starlingState?.() ?? null);
    const nudge = () => page.evaluate(() => window.dispatchEvent(new Event("online")));
    const click = (testid) => page.evaluate((id) => document.querySelector(`[data-testid="${id}"]`).click(), testid);
    return { name, ctx, page, errors, state, nudge, click };
  };

  const a = await phone("A");
  const b = await phone("B");

  // ---- A creates the circle
  await a.page.goto(`${BASE}/`);
  await waitFor(async () => (await a.state())?.screen === "onboarding", "A onboarding");
  await a.click("onboarding-create");
  await a.page.fill('[data-testid="identity-name"]', "Marta");
  await a.click("identity-save");
  const invite = await waitFor(
    () => a.page.evaluate(() => {
      const el = document.querySelector('[data-testid="invite-link"]');
      return el && el.textContent.includes("#j=") ? el.textContent : null;
    }),
    "A invite link",
  );
  await a.page.keyboard.press("Escape");
  await waitFor(() => a.page.evaluate(() => !document.querySelector(".ov-wrap")), "A sheet closed");
  console.log("A created the circle");

  // ---- B asks to join, A checks the number and accepts
  await b.page.goto(invite);
  await waitFor(() => b.page.evaluate(() => !!document.querySelector('[data-testid="join-sheet"]')), "B join sheet");
  await b.page.fill('[data-testid="identity-name"]', "Kuba");
  await b.click("join-confirm");
  const bSafety = await waitFor(
    () => b.page.evaluate(() => {
      const e = document.querySelector('[data-testid="join-waiting-safety"]');
      return e && /\d{5}/.test(e.textContent) ? e.textContent.trim() : null;
    }),
    "B safety number",
  );
  await waitFor(async () => ((await a.state())?.joinRequests || 0) > 0, "A sees the request", { timeout: 60000, nudge: a.nudge });
  await a.click("alert-review");
  await waitFor(() => a.page.evaluate(() => !!document.querySelector('[data-testid="join-review"]')), "A review");
  const aSafety = await a.page.evaluate(() => document.querySelector('[data-testid="join-safety"]').textContent.trim());
  check("safety numbers match", aSafety === bSafety, `${aSafety} vs ${bSafety}`);
  await a.click("join-accept");
  await waitFor(async () => (await a.state())?.pinned === 1, "A pinned B", { timeout: 40000 });
  await waitFor(async () => (await b.state())?.pinned === 1, "B admitted", { timeout: 60000, nudge: b.nudge });
  await waitFor(async () => (await a.state())?.channel === (await b.state())?.channel, "same channel", { timeout: 30000, nudge: a.nudge });
  for (const p of [a, b]) {
    await p.page.keyboard.press("Escape").catch(() => {});
    await waitFor(() => p.page.evaluate(() => !document.querySelector(".ov-wrap")), `${p.name} no sheet`);
  }
  console.log("B joined; both on one channel");

  // ---- A adds a place: it is shared by default and reaches B
  const places = (p) => p.page.evaluate(() => window.__starlingInternals.state.places.map((x) => ({ id: x.id, name: x.name, r: x.radius, sh: !!x.sh })));
  await a.page.evaluate(() => window.__starlingInternals.addPlace("Szkoła", 52.2297, 21.0122));
  const aList = await places(a);
  check("A: the new place is shared", aList.length === 1 && aList[0].sh, JSON.stringify(aList));
  const id = aList[0].id;
  await waitFor(async () => (await places(b)).some((x) => x.id === id && x.name === "Szkoła"), "B got the place", { timeout: 40000, nudge: b.nudge });
  check("B: the place arrived with its name", true);

  // ---- B renames it, A sees the change
  await b.page.evaluate((pid) => window.__starlingInternals.editPlace(pid, { name: "Szkoła Kuby", radius: 500 }), id);
  await waitFor(async () => (await places(a)).some((x) => x.id === id && x.name === "Szkoła Kuby" && x.r === 500), "A got the rename", { timeout: 40000, nudge: a.nudge });
  check("A: B's rename and radius arrived", true);

  // ---- the relay never saw the name: its feed holds only sealed posts
  const channel = (await a.state())?.channel;
  const feed = await (await fetch(`${BASE}/api/v2/f/${channel}?since=0`)).text();
  check("the relay feed has posts and no place name", feed.length > 100 && !/Szko/.test(feed), `${feed.length} bytes`);

  // ---- A removes it, B loses it too
  await a.page.evaluate((pid) => window.__starlingInternals.unsharePlace(pid, false), id);
  await waitFor(async () => !(await places(b)).some((x) => x.id === id), "B lost the place", { timeout: 40000, nudge: b.nudge });
  check("B: the removal arrived", true);

  for (const p of [a, b]) {
    const errs = await p.page.evaluate(() => window.__starlingErrors || []);
    check(`${p.name}: no app errors`, errs.length === 0 && p.errors.length === 0, JSON.stringify([...errs, ...p.errors]));
  }
} catch (e) {
  console.log(`  FAIL ${e.message}`);
  fails.push(e.message);
} finally {
  await browser?.close();
  server.kill();
}

console.log(fails.length ? `\n${fails.length} failed` : "\nall shared places e2e checks passed");
process.exit(fails.length ? 1 : 0);
