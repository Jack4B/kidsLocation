import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const main = readFileSync(new URL("../app/js/main.js", import.meta.url), "utf8");
const net = readFileSync(new URL("../app/js/net.js", import.meta.url), "utf8");

test("a quiet circle is read again from the start, the way a fresh page reads it", () => {
  const rewind = net.slice(net.indexOf("rewind() {"), net.indexOf("rewind() {") + 200);
  assert.match(rewind, /since = ratchet \? windowStart\(ratchet\) : 0;/);
  assert.match(rewind, /seen\.clear\(\);/);
  assert.match(rewind, /return poll\(\);/);
});

test("the rewind clears the roster first, so a lost re-key is handed over again", () => {
  const fn = main.slice(main.indexOf("function rewindIfQuiet"), main.indexOf("setInterval(() => rewindIfQuiet()"));
  assert.ok(fn.indexOf("roster.clear()") < fn.indexOf("poller.rewind()"));
  assert.match(main, /const QUIET_REWIND_MS = 20 \* 60 \* 1000;/);
  const quiet = main.slice(main.indexOf("function circleQuiet"), main.indexOf("function rewindIfQuiet"));
  for (const guard of ["state.demo", "state.locked", "circleBusy", "!state.pinned.size"]) assert.ok(quiet.includes(guard), guard);
  assert.match(quiet, /now - lastRewind > QUIET_REWIND_MS/, "at most once per window");
});
