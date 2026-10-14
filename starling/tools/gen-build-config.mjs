// Writes app/js/build-config.js for a build, from the RELAY_URL environment
// variable, into a build output directory. Never into the source tree: the
// family relay's address stays out of git, and the committed build-config.js
// (no relay, the app asks on first run) is what a plain checkout ships.
//
// The Android build does the same thing itself in android/app/build.gradle.kts
// with the same rule (RELAY_ORIGIN_RE below), so both builds agree on what a
// valid value is. test/build-config.test.mjs holds the two rules together.
//
// Run: RELAY_URL=https://relay.example.org node tools/gen-build-config.mjs <out-file>
// An unset or empty RELAY_URL writes the no-relay fallback. A value that is
// not a bare https origin fails the build; the value itself is never printed,
// so a CI log never shows the address.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// A bare https origin: lowercase-insensitive host, optional port, no path,
// query, fragment or credentials. Trailing slashes are trimmed before the test.
export const RELAY_ORIGIN_RE = /^https:\/\/[A-Za-z0-9.-]+(:[0-9]{1,5})?$/;

export function normalizeBuildRelay(raw) {
  const s = String(raw ?? "").trim().replace(/\/+$/, "");
  if (!s) return "";
  if (!RELAY_ORIGIN_RE.test(s)) throw new Error("RELAY_URL must be a bare https origin, like https://relay.example.org");
  return s.toLowerCase();
}

export function buildConfigSource(raw) {
  const relay = normalizeBuildRelay(raw);
  return (
    "// Generated at build time by tools/gen-build-config.mjs. Not in git.\n" +
    `export const BUILD_RELAY = ${JSON.stringify(relay)};\n`
  );
}

function main() {
  const out = process.argv[2];
  if (!out) {
    console.error("usage: node tools/gen-build-config.mjs <out-file>");
    process.exit(2);
  }
  let src;
  try {
    src = buildConfigSource(process.env.RELAY_URL);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, src);
  console.log(process.env.RELAY_URL ? "build config: relay set" : "build config: no relay, the app asks on first run");
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) main();
