// A phone that slept through a re-key must not fork the circle with one of
// its own, and should say when it looks left behind.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const main = readFileSync(new URL("../app/js/main.js", import.meta.url), "utf8");

test("the daily re-key waits for a fresh poll and another member seen on this generation", () => {
  assert.match(main, /if \(!rekeyDue\(\) \|\| !circleLiveHere\(\) \|\|/);
  assert.match(main, /return pollOkAt > netStartedAt && now - newestOtherPost\(\) < REKEY_LIVE_MS;/);
  assert.match(main, /if \(s === "ok"\) pollOkAt = Date\.now\(\);/);
  assert.match(main, /netStartedAt = Date\.now\(\);\n  pollOkAt = 0;\n  poller = createPoller\(/);
});

test("a phone that sees nobody on an old generation shows a warning", () => {
  assert.match(main, /if \(state\.stranded && !state\.missedRekey\) \{/);
  assert.match(main, /now - newestOtherPost\(\) > STRANDED_AFTER_MS/);
});
