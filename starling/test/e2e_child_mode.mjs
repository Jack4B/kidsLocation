// End to end: child mode on one phone, in headless Chromium. A parent turns
// it on with a PIN; then turning sharing off asks for the PIN, a wrong one
// keeps the share, the right one ends it, and the guard survives a reload.
//
// Needs Playwright with its Chromium (PLAYWRIGHT_BROWSERS_PATH); not part of
// `node --test`, run by hand:
//   node test/e2e_child_mode.mjs
// Port 8947. Everything started here is stopped before exit.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 8947;
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
    const ctx = await browser.newContext({ geolocation: { latitude: 52.23, longitude: 21.01 }, permissions: ["geolocation"], viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "dark" });
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
  await a.page.goto(`${BASE}/`);
  await waitFor(async () => (await a.state())?.screen === "onboarding", "onboarding");
  await a.click("onboarding-create");
  await a.page.fill('[data-testid="identity-name"]', "Ola");
  await a.click("identity-save");
  await waitFor(() => a.page.evaluate(() => !!document.querySelector('[data-testid="invite-link"]')), "invite sheet");
  await a.page.keyboard.press("Escape");
  await waitFor(() => a.page.evaluate(() => !document.querySelector(".ov-wrap")), "sheet closed");

  // ---- a parent turns child mode on from settings
  await a.page.evaluate(() => window.__starlingInternals.openSettings());
  await waitFor(() => a.page.evaluate(() => !!document.querySelector('[data-testid="settings-child-mode"]')), "child mode row");
  await a.page.evaluate(() => document.querySelector('[data-testid="settings-child-mode"] .switch').click());
  await waitFor(() => a.page.evaluate(() => !!document.querySelector('[data-testid="passcode-sheet"]')), "PIN sheet");
  await a.page.fill('[data-testid="passcode-input"]', "2468");
  await a.page.fill('[data-testid="passcode-confirm"]', "2468");
  await a.click("passcode-save");
  await waitFor(() => a.page.evaluate(() => !document.querySelector('[data-testid="passcode-sheet"]')), "PIN sheet closed");
  check("the child mode switch is on", await a.page.evaluate(() => document.querySelector('[data-testid="settings-child-mode"] .switch').classList.contains("on")));
  for (let i = 0; i < 3; i++) await a.page.keyboard.press("Escape").catch(() => {});
  await waitFor(() => a.page.evaluate(() => !document.querySelector(".ov-wrap")), "settings closed");

  // ---- sharing on needs nothing; off needs the PIN
  await a.click("share-toggle");
  await waitFor(async () => (await a.state())?.sharing === true, "sharing on");
  check("turning sharing on asks for nothing", !(await a.page.evaluate(() => document.querySelector('[data-testid="passcode-sheet"]'))));
  await a.click("share-toggle");
  await waitFor(() => a.page.evaluate(() => !!document.querySelector('[data-testid="passcode-sheet"]')), "PIN asked");
  await a.page.fill('[data-testid="passcode-input"]', "1111");
  await a.click("passcode-save");
  await sleep(800);
  check("a wrong PIN keeps sharing on", (await a.state())?.sharing === true);
  await a.page.fill('[data-testid="passcode-input"]', "2468");
  await a.click("passcode-save");
  await waitFor(async () => (await a.state())?.sharing === false, "sharing off after the PIN");
  check("the right PIN turns sharing off", true);

  // ---- it survives a reload, and closing the sheet keeps sharing on
  await a.click("share-toggle");
  await waitFor(async () => (await a.state())?.sharing === true, "sharing on again");
  await a.page.reload();
  await waitFor(async () => (await a.state())?.screen === "map", "map after reload");
  if (!(await a.state()).sharing) {
    await a.click("share-toggle");
    await waitFor(async () => (await a.state())?.sharing === true, "sharing on after reload");
  }
  await a.click("share-toggle");
  await waitFor(() => a.page.evaluate(() => !!document.querySelector('[data-testid="passcode-sheet"]')), "PIN asked after reload");
  await a.page.keyboard.press("Escape");
  await sleep(500);
  check("after a reload the PIN is still asked, and closing it keeps sharing", (await a.state())?.sharing === true);

  await a.page.evaluate(() => {
    window.__starlingInternals.openSettings();
  });
  await waitFor(() => a.page.evaluate(() => !!document.querySelector('[data-testid="passcode-sheet"]')), "PIN asked for settings");
  check("settings ask for the PIN first", !(await a.page.evaluate(() => document.querySelector('[data-testid="settings-child-mode"]'))));
  await a.page.keyboard.press("Escape");
  await sleep(500);
  check("closing the PIN keeps settings shut", !(await a.page.evaluate(() => document.querySelector('[data-testid="settings-child-mode"]'))));
  await a.page.evaluate(() => {
    window.__starlingInternals.openSettings();
  });
  await waitFor(() => a.page.evaluate(() => !!document.querySelector('[data-testid="passcode-sheet"]')), "PIN asked again");
  await a.page.fill('[data-testid="passcode-input"]', "2468");
  await a.click("passcode-save");
  await waitFor(() => a.page.evaluate(() => !!document.querySelector('[data-testid="settings-child-mode"]')), "settings after the right PIN");
  check("the right PIN opens settings", true);

  const errs = await a.page.evaluate(() => window.__starlingErrors || []);
  check("no app errors", errs.length === 0 && a.errors.length === 0, JSON.stringify([...errs, ...a.errors]));
} catch (e) {
  console.log(`  FAIL ${e.message}`);
  fails.push(e.message);
} finally {
  await browser?.close();
  server.kill();
}

console.log(fails.length ? `\n${fails.length} failed` : "\nall child mode e2e checks passed");
process.exit(fails.length ? 1 : 0);
