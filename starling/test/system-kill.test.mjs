// F5-22: HyperOS (Xiaomi, Redmi, POCO) force-stops the app with its cleaners
// ("LockScreenClean", "SwipeUpClean", "OneKeyClean") even with every setting on.
// The Kotlin half is pinned by reading the source, like share-auto-resume.test.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { killLines, shareReport } from "../app/js/sharehealth.js";

const kt = (name) =>
  readFileSync(new URL(`../android/app/src/main/kotlin/app/starlingmap/${name}`, import.meta.url), "utf8");
const js = (name) => readFileSync(new URL(`../app/js/${name}`, import.meta.url), "utf8");
const code = (body) => body.replace(/\/\/[^\n]*/g, "");

function fn(src, name) {
  const at = src.search(new RegExp(`fun ${name}\\([^)]*\\)(: [\\w?<>, .]+)? \\{`));
  assert.ok(at >= 0, `fun ${name} exists`);
  const open = src.indexOf("{", at);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) return src.slice(at, i + 1);
  }
  throw new Error(`unbalanced ${name}`);
}

// Mirrors SystemKill.cleaner.
const CLEANERS = ["LockScreenClean", "SwipeUpClean", "OneKeyClean"];
const cleaner = (reason, d) => ([10, 13].includes(reason) && d ? CLEANERS.find((c) => d.includes(c)) ?? null : null);

test("point 1: a HyperOS cleaner's stop is told apart from a person's", () => {
  const src = kt("SystemKill.kt");
  assert.match(src, /val CLEANERS = listOf\("LockScreenClean", "SwipeUpClean", "OneKeyClean"\)/);
  assert.match(src, /private val REASONS = setOf\(10, 13\)/);
  assert.match(code(fn(src, "cleaner")), /if \(reason !in REASONS\) return null[\s\S]*CLEANERS\.firstOrNull \{ d\.contains\(it\) \}/);
  assert.equal(cleaner(10, "FORCE STOP stop app.kidslocation due to LockScreenClean"), "LockScreenClean");
  assert.equal(cleaner(10, "SwipeUpClean"), "SwipeUpClean");
  assert.equal(cleaner(13, "OneKeyClean"), "OneKeyClean");
  assert.equal(cleaner(10, "stop by user"), null, "a plain force stop in Settings is the person's");
  assert.equal(cleaner(10, null), null);
  assert.equal(cleaner(3, "LockScreenClean"), null, "a crash or a low-memory kill is not a cleaner");
});

test("point 1: every process start reads the last exit once, and resumes only a share that was on", () => {
  const src = kt("SystemKill.kt");
  const app = src.slice(src.indexOf("class StarlingApp"));
  assert.match(app, /val appScope = CoroutineScope\(SupervisorJob\(\) \+ Dispatchers\.IO\)/, "one shared scope for the process");
  assert.match(app, /appScope\.launch \{ runCatching \{ SystemKill\.onProcessStart\(this@StarlingApp\) \} \}/, "the exit history is read off the main thread");
  const manifest = readFileSync(new URL("../android/app/src/main/AndroidManifest.xml", import.meta.url), "utf8");
  assert.match(manifest, /<application[^>]*android:name="\.StarlingApp"/);
  const start = code(fn(src, "onProcessStart"));
  assert.match(start, /if \(Build\.VERSION\.SDK_INT < 30\) return/);
  assert.match(start, /getHistoricalProcessExitReasons\(app\.packageName, 0, 1\)/);
  assert.match(start, /if \(exit\.timestamp <= p\.getLong\(PREF_SEEN_AT, 0L\)\) return/, "one exit counts once");
  assert.ok(start.indexOf("PREF_SEEN_AT, exit.timestamp") < start.indexOf("cleaner(exit.reason"), "seen before judged");
  assert.match(start, /if \(!ShareResume\.sharingWhenKilled\(app, exit\.timestamp\)\) return/, "a share that was off stays off");
  assert.match(start, /Events\.postKilled\(app\)/);
  assert.match(start, /ShareResume\.onKilled\(app\)/);
  const was = code(fn(kt("ShareResume.kt"), "sharingWhenKilled"));
  assert.match(was, /if \(armedAt <= 0L \|\| armedAt > exitAt\) return false/, "armed before the kill");
  assert.match(was, /killedBySystem\(/, "no newer stop by a person");
  const killed = code(fn(kt("ShareResume.kt"), "onKilled"));
  assert.match(killed, /if \(LocationService\.running \|\| starting \|\| PageHost\.alive\) return/);
  assert.match(killed, /resumeOrOffer\(ctx, "boot", R\.string\.notif_resume_killed_text, anySwitch = true\)/);
});

test("point 1 and 9: the report says the cleaner, when, the gap, and the background refusals", () => {
  const at = Date.UTC(2026, 9, 24, 21, 5);
  const lines = killLines({
    systemKill: { why: "LockScreenClean", at, gapMs: 47 * 60000, notice: true },
    fgsDenied: { count: 2, agoMs: 5 * 60000 },
    resumeSkip: { why: "background", agoMs: 60000 },
    batteryIgnoring: false,
  });
  assert.equal(lines[0], "Zabite przez system Xiaomi: LockScreenClean, 2026-10-24 21:05Z, przerwa 47 min");
  assert.match(lines[1], /^Background service start refused: 2 times, last /);
  assert.match(lines[2], /^Last resume skipped: /);
  assert.equal(lines[3], "Battery optimization ignored: no");
  assert.deepEqual(killLines({}), []);
  assert.equal(killLines({ fgsDenied: { count: 0, agoMs: null } })[0], "Background service start refused: never");
  assert.deepEqual(killLines({ systemKill: { why: "<b>secret</b>", at } }), [], "only a known cleaner name gets in");
  const report = shareReport({ h: { systemKill: { why: "SwipeUpClean", at, gapMs: 0 } }, page: {}, now: at });
  assert.match(report, /Zabite przez system Xiaomi: SwipeUpClean/);
  const health = code(fn(kt("Health.kt"), "snapshot"));
  assert.match(health, /isIgnoringBatteryOptimizations/);
  assert.match(health, /SystemKill\.fgsDenied/);
});

test("point 4: a new install shares on by default, and resume comes back with either switch", () => {
  const sr = kt("ShareResume.kt");
  assert.match(sr, /fun autoBoot\(ctx: Context\): Boolean = prefs\(ctx\)\.getBoolean\(PREF_AUTO_BOOT, true\)/);
  assert.match(sr, /fun autoUpdate\(ctx: Context\): Boolean = prefs\(ctx\)\.getBoolean\(PREF_AUTO_UPDATE, true\)/);
  assert.match(kt("PageHost.kt"), /getBoolean\(MainActivity\.PREF_KEEP_SHARING, true\)/);
  assert.match(code(fn(sr, "resumeOrOffer")), /val autoOn = if \(anySwitch\) autoBoot\(ctx\) \|\| autoUpdate\(ctx\)/);
});

// Mirrors ShareResume.settleDefaults.
function settle(prefs, fresh) {
  if (prefs.defaults_settled) return prefs;
  const out = { ...prefs };
  for (const k of ["keep_sharing", "resume_auto_boot", "resume_auto_update"]) if (!(k in out)) out[k] = fresh;
  out.defaults_settled = true;
  return out;
}

test("point 4: the on defaults reach a new install only, never an update", () => {
  assert.deepEqual(settle({}, true), { keep_sharing: true, resume_auto_boot: true, resume_auto_update: true, defaults_settled: true });
  assert.deepEqual(settle({}, false), { keep_sharing: false, resume_auto_boot: false, resume_auto_update: false, defaults_settled: true }, "an update keeps a switch nobody touched off");
  assert.deepEqual(settle({ keep_sharing: true, resume_auto_boot: false }, false), { keep_sharing: true, resume_auto_boot: false, resume_auto_update: false, defaults_settled: true }, "a choice already made stays");
  assert.deepEqual(settle({ defaults_settled: true }, true), { defaults_settled: true }, "once per install");
  const sr = kt("ShareResume.kt");
  const fn2 = code(fn(sr, "settleDefaults"));
  assert.match(fn2, /if \(p\.getBoolean\(PREF_DEFAULTS, false\)\) return/);
  assert.match(fn2, /val fresh = info != null && info\.firstInstallTime == info\.lastUpdateTime/);
  assert.match(sr, /val DEFAULT_KEYS = listOf\(MainActivity\.PREF_KEEP_SHARING, PREF_AUTO_BOOT, PREF_AUTO_UPDATE\)/);
  assert.match(fn2, /for \(\(k, v\) in settled\(saved, fresh\)\) e\.putBoolean\(k, v\)/);
  assert.match(sr, /DEFAULT_KEYS\.associateWith \{ saved\[it\] \?: fresh \}/, "the rule the Kotlin unit test (SettleDefaultsTest) pins");
  assert.match(sr, /PREF_DEFAULTS = "defaults_settled"/);
  const app = kt("SystemKill.kt").slice(kt("SystemKill.kt").indexOf("class StarlingApp"));
  assert.ok(app.indexOf("settleDefaults") >= 0 && app.indexOf("settleDefaults") < app.indexOf("appScope.launch"), "settled first, on the main thread, before any receiver");
});

test("a cleaner's kill and a restart's broadcast never start the share twice", () => {
  const sr = kt("ShareResume.kt");
  assert.match(code(fn(sr, "onKilled")), /^[^]*?\{\s*if \(LocationService\.running \|\| starting \|\| PageHost\.alive\) return/);
  assert.match(code(fn(sr, "onSystemStart")), /if \(LocationService\.running \|\| starting\) return/);
  assert.match(code(fn(sr, "resumeOrOffer")), /Path\.HEADLESS -> try \{\s*starting = true/, "the first to start marks it before the second looks");
  assert.match(kt("SystemKill.kt"), /Handler\(Looper\.getMainLooper\(\)\)\.postDelayed\(\{ ShareResume\.onKilled\(app\) \}/, "both run on the main thread, one after the other");
});

test("point 5: a grant missing for a moment skips the resume and says why, the switches stay", () => {
  const sr = kt("ShareResume.kt");
  const start = code(fn(sr, "resumeOrOffer"));
  assert.doesNotMatch(start, /autoOff\(/);
  assert.match(start, /if \(due && missing != null\) noteSkip\(ctx, missing\)/);
  const skip = sr.slice(sr.indexOf("fun skipReason("), sr.indexOf("fun skipReason(") + 300);
  assert.match(skip, /!keep -> "keepSharing"/);
  assert.match(skip, /!background -> "background"/);
  assert.match(skip, /"notifications"/);
  // The only autoOff left is the person turning Keep sharing off.
  const callers = ["ShareResume.kt", "PageHost.kt", "StarlingBridge.kt", "MainActivity.kt", "LocationService.kt"]
    .flatMap((f) => [...code(kt(f)).matchAll(/autoOff\(/g)].map(() => f));
  assert.deepEqual(callers.sort(), ["PageHost.kt", "ShareResume.kt"], "its definition and setKeepSharing(false)");
});

test("point 7: a sticky restart goes through ShareResume, never a bare start", () => {
  const svc = code(fn(kt("LocationService.kt"), "onStartCommand"));
  assert.match(svc, /if \(intent == null\) \{[\s\S]*?ShareResume\.onSticky\(this\)\s*return START_NOT_STICKY/);
  const sticky = code(fn(kt("ShareResume.kt"), "onSticky"));
  assert.match(sticky, /killedBySystem\(/);
  assert.match(sticky, /resumeOrOffer\(app, "boot", R\.string\.notif_resume_sticky_text, anySwitch = true\)/, "a refused start leaves the tap to resume");
  assert.match(readFileSync(new URL("../android/app/src/main/res/values/strings.xml", import.meta.url), "utf8"), /name="notif_resume_sticky_text">Dotknij, aby wznowić udostępnianie\.</);
});

test("points 2, 3, 6, 8: the page side", () => {
  const main = js("main.js");
  const toggle = main.slice(main.indexOf("async function toggleAutoResume"), main.indexOf("\n}\n", main.indexOf("async function toggleAutoResume")));
  assert.doesNotMatch(toggle, /st\.lock \|\|/, "the app lock does not block turning resume on");
  assert.match(main, /notifyEvent\(msg, t\("Their phone may have closed Blisko\. The last position is on the map\."\), `silent-\$\{rec\.id\}`, "other"\)/);
  assert.match(main, /silentTold\.add\(rec\.id\)/, "one notification per silence");
  assert.match(js("net.js"), /export const SILENT_MS = 20 \* 60 \* 1000;/);
  assert.match(js("ui.js"), /"No signal for \{n\} min"/);
  const ui = js("ui.js");
  const sheet = ui.slice(ui.indexOf("export function openKillHelpSheet"));
  for (const which of ["autostart", "battery", "app"]) assert.match(sheet, new RegExp(`step\\([^\\n]*"${which}"\\)`));
  assert.match(sheet, /POCO X5 5G does not/, "the padlock is not promised");
  const help = code(fn(kt("SystemKill.kt"), "openHelp"));
  assert.match(help, /com\.miui\.permcenter\.autostart\.AutoStartManagementActivity/);
  assert.match(help, /com\.miui\.powerkeeper\.ui\.HiddenAppsConfigActivity/);
  assert.match(help, /ACTION_APPLICATION_DETAILS_SETTINGS/, "falls back to the app's own settings");
});

test("the new notifications speak every language, not English copies", () => {
  for (const l of ["de", "es", "fr", "pt"]) {
    const x = readFileSync(new URL(`../android/app/src/main/res/values-${l}/strings.xml`, import.meta.url), "utf8");
    for (const name of ["notif_killed_title", "notif_killed_text", "notif_resume_sticky_text"]) {
      const v = x.match(new RegExp(`name="${name}">([^<]*)<`))?.[1];
      assert.ok(v, `${l} ${name}`);
      assert.doesNotMatch(v, /^(The phone|Your family|Tap to)/, `${l} ${name} is translated`);
    }
  }
});
