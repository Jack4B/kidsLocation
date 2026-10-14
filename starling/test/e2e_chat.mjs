// End to end: two phones in one circle chatting through the relay, in real
// headless Chromium at 390x844. Starts test/serve_local.mjs (the relay worker
// from relay/src/index.js plus the static app, one origin), creates a circle
// on A, joins it on B with the safety number checked, then sends messages
// both ways through the chat screen and screenshots it in both themes.
//
// Needs Playwright with its Chromium (PLAYWRIGHT_BROWSERS_PATH); not part of
// `node --test`, run by hand:
//   node test/e2e_chat.mjs [screenshot-dir]
// Port 8941. Everything started here is stopped before exit.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 8941;
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

  // ---- the Chat tab is in the navigation bar, and opens the chat screen
  for (const p of [a, b]) {
    const has = await p.page.evaluate(() => !!document.querySelector('[data-testid="tab-chat"]'));
    check(`${p.name}: Chat tab in the navigation bar`, has);
  }
  await a.click("tab-chat");
  await waitFor(() => a.page.evaluate(() => !document.querySelector('[data-testid="chat-screen"]').hidden), "A chat open");
  check(
    "A: the Chat tab is marked current",
    await a.page.evaluate(() => document.querySelector('[data-testid="tab-chat"]').getAttribute("aria-current") === "page"),
  );
  check("A: the honesty note is on screen", await a.page.isVisible('[data-testid="chat-note"]'));

  // ---- A writes, B reads
  await a.page.fill('[data-testid="chat-input"]', "Jestem już w domu, obiad za 20 minut.");
  await a.page.press('[data-testid="chat-input"]', "Enter");
  await waitFor(
    () => a.page.evaluate(() => [...document.querySelectorAll('[data-testid="chat-mine"] [data-testid="chat-meta"]')].some((m) => /^(Sent|Wysłano) /.test(m.textContent))),
    "A: Sent once the relay accepted it",
  );
  check("A: the input cleared after sending", (await a.page.inputValue('[data-testid="chat-input"]')) === "");

  const badge = await waitFor(
    () => b.page.evaluate(() => {
      const el = document.querySelector('[data-testid="chat-badge"]');
      return el && !el.hidden ? el.textContent : null;
    }),
    "B unread badge",
    { nudge: b.nudge },
  );
  check("B: unread badge shows 1", badge === "1", badge);
  check(
    "B: the badge is in the accent color, not SOS red",
    await b.page.evaluate(() => {
      const bg = getComputedStyle(document.querySelector('[data-testid="chat-badge"]')).backgroundColor;
      const probe = document.createElement("i");
      probe.style.color = "var(--accent)";
      document.body.append(probe);
      const accent = getComputedStyle(probe).color;
      probe.remove();
      return bg === accent;
    }),
  );
  await b.click("tab-chat");
  await waitFor(() => b.page.evaluate(() => !document.querySelector('[data-testid="chat-screen"]').hidden), "B chat open");
  const bSees = await b.page.evaluate(() => [...document.querySelectorAll('[data-testid="chat-theirs"]')].map((n) => n.innerText));
  check("B: reads A's message with A's name", bSees.length === 1 && bSees[0].includes("Marta") && bSees[0].includes("Jestem już w domu, obiad za 20 minut."), JSON.stringify(bSees));
  check(
    "B: the badge clears once the chat is open",
    await b.page.evaluate(() => document.querySelector('[data-testid="chat-badge"]').hidden),
  );

  // ---- B answers with a quick reply and a typed one; A reads both in order
  await b.page.click('[data-testid="chat-quick"] >> nth=3');
  await b.page.fill('[data-testid="chat-input"]', "Super, ja będę po siedemnastej.");
  await b.page.click('[data-testid="chat-send"]');
  await waitFor(
    () => a.page.evaluate(() => document.querySelectorAll('[data-testid="chat-theirs"]').length >= 2),
    "A receives B's two messages",
    { nudge: a.nudge },
  );
  const aSees = await a.page.evaluate(() => [...document.querySelectorAll('[data-testid="chat-theirs"] [data-testid="chat-text"]')].map((n) => n.textContent));
  check("A: B's messages arrive in the order written", JSON.stringify(aSees) === JSON.stringify(["OK", "Super, ja będę po siedemnastej."]), JSON.stringify(aSees));

  await a.page.fill('[data-testid="chat-input"]', "Dobra. Napisz, jak będziesz wychodzić.");
  await a.page.press('[data-testid="chat-input"]', "Enter");
  await waitFor(
    () => b.page.evaluate(() => document.querySelectorAll('[data-testid="chat-theirs"]').length >= 2),
    "B receives A's second message",
    { nudge: b.nudge },
  );

  // ---- the composer refuses a text that does not fit, and says why
  // Under 280 characters but over the bytes: emoji are four bytes each.
  const wide = "Sto lat! \u{1F389}\u{1F382}\u{1F973}\u{1F381}\u{1F490}\u2764\uFE0F\u{1F388}\u{1F370} ".repeat(10).trim();
  await b.page.fill('[data-testid="chat-input"]', wide);
  const refused = await b.page.evaluate(() => ({
    problem: document.querySelector('[data-testid="chat-problem"]').hidden ? null : document.querySelector('[data-testid="chat-problem"]').textContent,
    send: document.querySelector('[data-testid="chat-send"]').disabled,
    count: document.querySelector('[data-testid="chat-count"]').textContent,
  }));
  check("B: an over-long text is blocked with a message", refused.send && /too long to send|za długa/.test(refused.problem || ""), JSON.stringify(refused));
  const [used, ceiling] = refused.count.split(" / ").map(Number);
  check("B: the counter shows the text over its real ceiling, under 280", used < 280 && ceiling < used, refused.count);

  // ---- screenshots at 390x844, both themes
  const shot = async (p, file) => {
    await p.page.evaluate(() => document.getElementById("toasts").replaceChildren());
    await sleep(400);
    await p.page.screenshot({ path: path.join(SHOTS, file) });
    console.log(`  shot ${file}`);
  };
  await b.page.fill('[data-testid="chat-input"]', "");
  await b.page.evaluate(() => document.querySelector('[data-testid="chat-input"]').dispatchEvent(new Event("input")));
  for (const [p, who] of [[a, "marta"], [b, "kuba"]]) {
    await p.page.evaluate(() => (document.documentElement.dataset.theme = "dark"));
    await shot(p, `czat-${who}-ciemny.png`);
    await p.page.evaluate(() => (document.documentElement.dataset.theme = "light"));
    await shot(p, `czat-${who}-jasny.png`);
  }
  await b.page.fill('[data-testid="chat-input"]', wide);
  for (const theme of ["light", "dark"]) {
    await b.page.evaluate((th) => (document.documentElement.dataset.theme = th), theme);
    await shot(b, `czat-za-dlugi-${theme === "light" ? "jasny" : "ciemny"}.png`);
  }
  await b.page.fill('[data-testid="chat-input"]', "");
  await a.click("chat-info");
  await a.page.evaluate(() => (document.documentElement.dataset.theme = "light"));
  await shot(a, "czat-informacje-jasny.png");
  await a.page.evaluate(() => (document.documentElement.dataset.theme = "dark"));
  await shot(a, "czat-informacje-ciemny.png");
  await a.click("chat-info");

  // ---- the way back: the back arrow, and the Map tab
  await a.click("chat-close");
  await waitFor(() => a.page.evaluate(() => document.querySelector('[data-testid="chat-screen"]').hidden), "A chat closed");
  check(
    "A: the Map tab is current again",
    await a.page.evaluate(() => document.querySelector('[data-testid="tab-map"]').getAttribute("aria-current") === "page"),
  );
  await b.click("tab-map");
  await waitFor(() => b.page.evaluate(() => document.querySelector('[data-testid="chat-screen"]').hidden), "B chat closed by the Map tab");
  await a.page.evaluate(() => {
    document.documentElement.dataset.theme = "light";
  });

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

console.log(fails.length ? `\n${fails.length} failed` : "\nall chat e2e checks passed");
process.exit(fails.length ? 1 : 0);
