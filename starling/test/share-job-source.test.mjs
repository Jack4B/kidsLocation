import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const kt = (name) => readFileSync(new URL(`../android/app/src/main/kotlin/app/starlingmap/${name}`, import.meta.url), "utf8");
const manifest = readFileSync(new URL("../android/app/src/main/AndroidManifest.xml", import.meta.url), "utf8");

test("a periodic job backs up the watchdog alarm and goes with it", () => {
  const sr = kt("ShareResume.kt");
  assert.match(sr, /fun armWatchdog[\s\S]*?ShareJob\.schedule\(ctx\)/);
  assert.match(sr, /fun cancelWatchdog[\s\S]*?ShareJob\.cancel\(ctx\)/);
  const job = kt("ShareJob.kt");
  assert.match(job, /ShareResume\.onWatchdog\(applicationContext\)/);
  assert.match(job, /setPersisted\(true\)/);
  assert.match(manifest, /android:name="\.ShareJob"[\s\S]*?BIND_JOB_SERVICE/);
});
