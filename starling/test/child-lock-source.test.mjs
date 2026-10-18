import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const lock = read("android/app/src/main/kotlin/app/starlingmap/ChildLock.kt");

test("only a device owner applies the child locks, and release lifts them first", () => {
  assert.match(lock, /fun apply\(ctx: Context, on: Boolean\): String \{\s*if \(!isOwner\(ctx\)\) return state\(ctx\)/);
  for (const r of ["DISALLOW_CONFIG_LOCATION", "DISALLOW_APPS_CONTROL", "DISALLOW_SAFE_BOOT", "DISALLOW_FACTORY_RESET", "DISALLOW_AIRPLANE_MODE"]) {
    assert.ok(lock.includes(`UserManager.${r}`), r);
  }
  assert.match(lock, /setUninstallBlocked\(a, ctx\.packageName, on\)/);
  assert.match(lock, /fun release[\s\S]*?apply\(ctx, false\)[\s\S]*?clearDeviceOwnerApp/);
});

test("the admin receiver is guarded by the system permission", () => {
  const m = read("android/app/src/main/AndroidManifest.xml");
  assert.match(m, /android:name="\.AdminReceiver"[\s\S]*?android:permission="android\.permission\.BIND_DEVICE_ADMIN"/);
});

test("the page asks for the PIN before it releases the device owner", () => {
  const main = read("app/js/main.js");
  assert.match(main, /async function releaseChildLock\(pin\) \{\s*if \(shareGuard\) \{\s*const r = await checkPin/);
});
