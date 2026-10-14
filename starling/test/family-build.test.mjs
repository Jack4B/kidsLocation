// The family build talks to the family relay and nobody else. Its address is
// a build-time value (RELAY_URL), never in git; the committed fallback names
// no relay. These hold the pieces together: the build-config generator and
// the Gradle rule, the App Links host, the relay's assetlinks.json and invite
// landing page, and the shipped source's freedom from upstream hosts.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import worker from "../relay/src/index.js";
import { makeD1 } from "./d1shim.mjs";
import { RELAY_ORIGIN_RE, buildConfigSource, normalizeBuildRelay } from "../tools/gen-build-config.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(ROOT, p), "utf8");
const KT = "android/app/src/main/kotlin/app/starlingmap";

// --- build config ------------------------------------------------------------

test("the generator writes a bare https origin and nothing else", () => {
  assert.equal(normalizeBuildRelay("https://Relay.Example.org/"), "https://relay.example.org");
  assert.equal(normalizeBuildRelay("  https://relay.example.org:8443  "), "https://relay.example.org:8443");
  assert.equal(normalizeBuildRelay(""), "");
  assert.equal(normalizeBuildRelay(undefined), "");
  for (const bad of [
    "http://relay.example.org",
    "relay.example.org",
    "https://u:p@relay.example.org",
    "https://relay.example.org/path",
    "https://relay.example.org/?q=1",
    "https://relay.example.org/#x",
    'https://relay.example.org";alert(1);"',
  ]) {
    assert.throws(() => normalizeBuildRelay(bad), /bare https origin/, bad);
  }
  assert.match(buildConfigSource("https://relay.example.org"), /export const BUILD_RELAY = "https:\/\/relay\.example\.org";/);
  assert.match(buildConfigSource(""), /export const BUILD_RELAY = "";/);
});

test("the generator CLI writes the file and never prints the address", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "buildcfg-"));
  try {
    const out = path.join(dir, "js", "build-config.js");
    const secret = "https://relay.secret-family.example";
    const run = spawnSync(process.execPath, [path.join(ROOT, "tools/gen-build-config.mjs"), out], {
      env: { ...process.env, RELAY_URL: secret },
      encoding: "utf8",
    });
    assert.equal(run.status, 0, run.stderr);
    assert.ok(!run.stdout.includes("secret-family") && !run.stderr.includes("secret-family"));
    assert.ok(readFileSync(out, "utf8").includes(`"${secret}"`));

    const bad = spawnSync(process.execPath, [path.join(ROOT, "tools/gen-build-config.mjs"), out], {
      env: { ...process.env, RELAY_URL: "http://relay.secret-family.example" },
      encoding: "utf8",
    });
    assert.notEqual(bad.status, 0, "a malformed secret fails the build");
    assert.ok(!bad.stdout.includes("secret-family") && !bad.stderr.includes("secret-family"));

    const none = spawnSync(process.execPath, [path.join(ROOT, "tools/gen-build-config.mjs"), out], {
      env: { ...process.env, RELAY_URL: "" },
      encoding: "utf8",
    });
    assert.equal(none.status, 0, "no secret (forks, PRs) still builds");
    assert.match(readFileSync(out, "utf8"), /BUILD_RELAY = "";/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the generated module is what env.js imports", () => {
  const src = read("app/js/env.js");
  assert.match(src, /import \{ BUILD_RELAY \} from "\.\/build-config\.js";/);
  assert.match(src, /setDefaultRelay\(BUILD_RELAY\);/);
});

test("the build config is never committed with an address", () => {
  const tracked = execFileSync("git", ["ls-files", "--", "app/js/build-config.js"], { cwd: ROOT, encoding: "utf8" }).trim();
  if (tracked) assert.doesNotMatch(read("app/js/build-config.js"), /https?:\/\//);
});

// --- Android ------------------------------------------------------------------

const gradle = read("android/app/build.gradle.kts");

test("Gradle validates RELAY_URL with the generator's exact rule", () => {
  const m = /Regex\("([^"]+)"\)\.matches/.exec(gradle);
  assert.ok(m, "the Gradle check is a Regex(...).matches");
  // Kotlin needs no escape for these characters, so the two sources match verbatim.
  assert.equal(m[1], RELAY_ORIGIN_RE.source.replaceAll("\\/", "/"));
  assert.match(gradle, /System\.getenv\("RELAY_URL"\)/);
  assert.doesNotMatch(gradle, /println|logger\.(lifecycle|warn|info|quiet)/, "the relay value is never logged");
});

test("Gradle writes build-config.js into the web assets, not the source tree", () => {
  assert.match(gradle, /layout\.buildDirectory\.file\("webassets\/js\/build-config\.js"\)/);
  assert.match(gradle, /inputs\.property\("relayOrigin"/, "a changed relay re-runs the sync");
  assert.match(gradle, /export const BUILD_RELAY = /);
  assert.match(gradle, /"relay\.invalid"/, "no relay claims only a reserved, unresolvable host");
});

test("the App Links host comes from the build, in the manifest and in the activity", () => {
  const manifest = read("android/app/src/main/AndroidManifest.xml");
  assert.match(manifest, /android:autoVerify="true"[\s\S]*?android:host="\$\{relayHost\}"/);
  assert.match(gradle, /manifestPlaceholders\["relayHost"\] = relayHost/);
  assert.match(gradle, /buildConfigField\("String", "RELAY_HOST"/);
  assert.match(read(`${KT}/MainActivity.kt`), /val APP_HOST: String = BuildConfig\.RELAY_HOST/);
});

// --- nothing calls home ------------------------------------------------------------

const UPSTREAM = /starlingmap\.app|github\.com|gitlab|f-droid\.org|codeberg|munzzyy\.dev/;

// Credits: the author and the source link the GPL asks for. Tapped by a
// person, never fetched, and not a default anything talks to.
const CREDIT_LINES = [
  'const AUTHOR = { name: "Munzzyy", url: "https://github.com/munzzyy" };',
  'outLink(t("Source code"), "https://github.com/munzzyy/starling"),',
];

test("no app module names an upstream host outside the credits", () => {
  const hits = [];
  for (const f of readdirSync(path.join(ROOT, "app/js")).filter((n) => n.endsWith(".js"))) {
    for (const line of read(`app/js/${f}`).split("\n")) {
      if (UPSTREAM.test(line) && !CREDIT_LINES.includes(line.trim())) hits.push(`${f}: ${line.trim().slice(0, 80)}`);
    }
  }
  assert.deepEqual(hits, []);
});

test("the Android wrapper names no upstream host", () => {
  const hits = [];
  const files = [
    "android/app/src/main/AndroidManifest.xml",
    ...readdirSync(path.join(ROOT, "android/app/src/main/res/xml")).map((n) => `android/app/src/main/res/xml/${n}`),
    ...readdirSync(path.join(ROOT, KT)).map((n) => `${KT}/${n}`),
  ];
  for (const f of files) {
    for (const line of read(f).split("\n")) if (/starlingmap\.app/.test(line)) hits.push(`${f}: ${line.trim()}`);
  }
  assert.deepEqual(hits, []);
});

// Upstream's marketing page keeps its download and project links, but only in
// the sections the bundled app removes before anything paints (.web-only),
// and in <head> metadata that nothing fetches.
function upstreamLinesOutsideWebOnly(html) {
  const [head, body] = html.split("</head>");
  const hits = [];
  for (const m of head.matchAll(/<(?:script|link)\b[^>]*>/g)) {
    const tag = m[0];
    if (/\b(?:src|href)="https?:/.test(tag) && !/rel="canonical"/.test(tag)) hits.push(`head: ${tag}`);
  }
  let open = null; // { tag, depth }
  for (const line of body.split("\n")) {
    if (!open) {
      const m = /<(section|div|footer|span|p)\b[^>]*class="[^"]*\bweb-only\b[^"]*"[^>]*>/.exec(line);
      if (m) {
        open = { tag: m[1], depth: 0 };
      } else {
        if (UPSTREAM.test(line)) hits.push(line.trim().slice(0, 100));
        continue;
      }
    }
    open.depth += (line.match(new RegExp(`<${open.tag}\\b`, "g")) || []).length;
    open.depth -= (line.match(new RegExp(`</${open.tag}>`, "g")) || []).length;
    if (open.depth <= 0) open = null;
  }
  return hits;
}

test("index.html reaches upstream only from web-only sections", () => {
  const html = read("app/index.html");
  assert.deepEqual(upstreamLinesOutsideWebOnly(html), []);
  assert.ok(!html.includes('id="about-site"'), "the in-app link out to the upstream site is gone");
  // The guard itself: a link outside a web-only block is caught.
  assert.equal(upstreamLinesOutsideWebOnly('<head></head>\n<p><a href="https://starlingmap.app/">x</a></p>').length, 1);
  assert.equal(upstreamLinesOutsideWebOnly('<head></head>\n<div class="web-only">\n<a href="https://github.com/x">x</a>\n</div>').length, 0);
});

test("the only third-party origin any bundled page may load from is the OSM tile server", () => {
  for (const f of ["app/index.html", "app/help.html"]) {
    const csp = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(read(f))?.[1] ?? "";
    const hosts = [...csp.matchAll(/https:\/\/[^\s;]+/g)].map((m) => m[0]);
    assert.deepEqual([...new Set(hosts)], ["https://tile.openstreetmap.org"], f);
  }
});

// --- relay: assetlinks and the invite landing page ----------------------------

const FP = "AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89";
const env = (over = {}) => ({ DB: makeD1(), RATE_POST_MIN: "1000000", RATE_GET_MIN: "1000000", ...over });
const get = (e, p, method = "GET") =>
  worker.fetch(new Request(`https://relay.example.org${p}`, { method, headers: { "cf-connecting-ip": "10.1.2.3" } }), e);

test("assetlinks.json names the configured package and certificate", async () => {
  const res = await get(env({ ANDROID_PACKAGE: "app.kidslocation", ANDROID_CERT_SHA256: FP }), "/.well-known/assetlinks.json");
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "application/json");
  const body = await res.json();
  assert.equal(body.length, 1);
  assert.deepEqual(body[0].relation, ["delegate_permission/common.handle_all_urls"]);
  assert.deepEqual(body[0].target, {
    namespace: "android_app",
    package_name: "app.kidslocation",
    sha256_cert_fingerprints: [FP],
  });
});

test("assetlinks.json accepts fingerprints without colons, in any case, several at once", async () => {
  const bare = FP.replaceAll(":", "").toLowerCase();
  const other = "11".repeat(32);
  const res = await get(
    env({ ANDROID_PACKAGE: " app.kidslocation ", ANDROID_CERT_SHA256: ` ${bare} , ${other},` }),
    "/.well-known/assetlinks.json",
  );
  const body = await res.json();
  assert.deepEqual(body[0].target.sha256_cert_fingerprints, [FP, "11:".repeat(31) + "11"]);
});

test("assetlinks.json keeps the upstream statement when nothing is configured", async () => {
  for (const e of [env(), env({ ANDROID_PACKAGE: "", ANDROID_CERT_SHA256: "" })]) {
    const body = await (await get(e, "/.well-known/assetlinks.json")).json();
    assert.equal(body[0].target.package_name, "app.starlingmap");
  }
});

test("a half or malformed assetlinks setting is an error, never a wrong statement", async () => {
  for (const over of [
    { ANDROID_PACKAGE: "app.kidslocation" },
    { ANDROID_CERT_SHA256: FP },
    { ANDROID_PACKAGE: "kidslocation", ANDROID_CERT_SHA256: FP },
    { ANDROID_PACKAGE: "app.kids location", ANDROID_CERT_SHA256: FP },
    { ANDROID_PACKAGE: "app.kidslocation", ANDROID_CERT_SHA256: "AB:CD" },
    { ANDROID_PACKAGE: "app.kidslocation", ANDROID_CERT_SHA256: `${FP},nope` },
  ]) {
    const res = await get(env(over), "/.well-known/assetlinks.json");
    assert.equal(res.status, 500, JSON.stringify(over));
    assert.equal((await res.json()).error, "assetlinks misconfigured");
  }
});

test("a link-host relay answers its bare origin with a static Polish invite page", async () => {
  const e = env({ ANDROID_PACKAGE: "app.kidslocation", ANDROID_CERT_SHA256: FP });
  const res = await get(e, "/");
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "text/html; charset=utf-8");
  const csp = res.headers.get("content-security-policy");
  assert.match(csp, /default-src 'none'/);
  assert.doesNotMatch(csp, /script-src/, "no script may run on it");
  const html = await res.text();
  assert.match(html, /<html lang="pl">/);
  assert.match(html, /Zaproszenie/);
  assert.doesNotMatch(html, /<script|https?:\/\//, "static text, nothing loaded from anywhere");
  assert.equal((await get(e, "/", "POST")).status, 405);
  // Only the bare origin: everything else is still a 404.
  assert.equal((await get(e, "/index.html")).status, 404);
});

test("a relay that is no app's link host keeps the bare origin a 404", async () => {
  assert.equal((await get(env(), "/")).status, 404);
});

test("the plain-server relay passes the app settings through from its environment", () => {
  const src = read("relay/server.mjs");
  assert.match(src, /ANDROID_PACKAGE: process\.env\.ANDROID_PACKAGE/);
  assert.match(src, /ANDROID_CERT_SHA256: process\.env\.ANDROID_CERT_SHA256/);
});
