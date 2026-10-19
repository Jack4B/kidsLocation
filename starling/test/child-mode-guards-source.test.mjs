// Child mode keeps every screen that can drop the phone out of its circle
// behind the parent PIN, not only the sharing switch.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const main = readFileSync(new URL("../app/js/main.js", import.meta.url), "utf8");

function body(name) {
  const at = main.search(new RegExp(`(?:async )?function ${name}\\(`));
  assert.ok(at >= 0, `${name} exists`);
  return main.slice(at, at + 1400);
}

for (const name of ["openSettings", "openCircles", "openMembers", "promptCreate", "promptPasteInvite", "promptJoin"]) {
  test(`${name} asks for the parent PIN in child mode`, () => {
    assert.match(body(name), /await askGuardPin\(/);
  });
}

test("a right PIN opens the guarded screens only briefly, and leaving the app closes them", () => {
  assert.match(main, /if \(Date\.now\(\) < guardOpenUntil\) return Promise\.resolve\(true\);/);
  assert.match(main, /if \(r\.ok\) guardOpenUntil = Date\.now\(\) \+ GUARD_GRACE_MS;/);
  assert.match(main, /if \(document\.hidden\) guardOpenUntil = 0;/);
});

test("the sharing report says whether child mode is on", () => {
  assert.match(main, /childMode: !!shareGuard,/);
});
