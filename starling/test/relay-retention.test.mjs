// A family relay may keep data longer than the 24 hour TTL, so a phone that
// was off for days can still read the re-key it slept through.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { retentionMs } from "../relay/src/index.js";
import { TTL_MS } from "../app/js/wire.js";

const DAY = 24 * 60 * 60 * 1000;

test("retention is the TTL unless a longer one is set", () => {
  assert.equal(retentionMs({}), TTL_MS);
  assert.equal(retentionMs({ RETENTION_MS: "0" }), TTL_MS);
  assert.equal(retentionMs({ RETENTION_MS: "nonsense" }), TTL_MS);
  assert.equal(retentionMs({ RETENTION_MS: String(DAY / 2) }), TTL_MS);
  assert.equal(retentionMs({ RETENTION_MS: String(7 * DAY) }), 7 * DAY);
});

test("retention never passes the ratchet's 30 day catch-up", () => {
  assert.equal(retentionMs({ RETENTION_MS: String(90 * DAY) }), 30 * DAY);
});

test("the self-hosted server keeps a week unless told otherwise, and both sweeps use it", () => {
  const server = readFileSync(new URL("../relay/server.mjs", import.meta.url), "utf8");
  const worker = readFileSync(new URL("../relay/src/index.js", import.meta.url), "utf8");
  assert.match(server, /RETENTION_MS: process\.env\.RETENTION_MS \?\? String\(7 \* 24 \* 60 \* 60 \* 1000\)/);
  assert.equal((server.match(/now - retentionMs\(env\)/g) || []).length, 2);
  assert.equal((worker.match(/now - retentionMs\(env\)/g) || []).length, 2);
});
