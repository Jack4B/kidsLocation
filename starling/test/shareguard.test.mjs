import { test } from "node:test";
import assert from "node:assert/strict";
import { makeGuard, checkPin, sanitizeGuard, waitAfter, waitLeft, validPin } from "../app/js/shareguard.js";

test("only 4 to 8 digits make a PIN", () => {
  assert.ok(validPin("1234") && validPin("12345678"));
  assert.ok(!validPin("123") && !validPin("123456789") && !validPin("12a4") && !validPin(1234));
});

test("the right PIN passes and resets the count, a wrong one counts", async () => {
  const g = await makeGuard("2468");
  assert.equal(JSON.stringify(g).includes("2468"), false);
  let r = await checkPin(g, "1111", 1000);
  assert.equal(r.ok, false);
  assert.equal(r.guard.fails, 1);
  r = await checkPin(r.guard, "2468", 2000);
  assert.equal(r.ok, true);
  assert.equal(r.guard.fails, 0);
});

test("after three wrong tries the PIN waits, even when right", async () => {
  let g = await makeGuard("2468");
  for (let i = 0; i < 3; i++) g = (await checkPin(g, "0000", 1000)).guard;
  assert.equal(waitLeft(g, 1000), 30000);
  assert.equal((await checkPin(g, "2468", 2000)).ok, false);
  assert.equal((await checkPin(g, "2468", 31001)).ok, true);
  assert.equal(waitAfter(20), 15 * 60 * 1000);
});

test("no guard lets everything through; junk records read as none", async () => {
  assert.equal((await checkPin(null, "")).ok, true);
  assert.equal(sanitizeGuard({ v: 2 }), null);
  assert.equal(sanitizeGuard("x"), null);
  const g = sanitizeGuard({ ...(await makeGuard("1234")), fails: -3, until: "x" });
  assert.equal(g.fails, 0);
  assert.equal(g.until, 0);
});
