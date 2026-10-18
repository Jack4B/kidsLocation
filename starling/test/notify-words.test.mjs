import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const main = readFileSync(new URL("../app/js/main.js", import.meta.url), "utf8");
const events = readFileSync(new URL("../android/app/src/main/kotlin/app/starlingmap/Events.kt", import.meta.url), "utf8");

test("a phone that saved the old generic defaults gets notices with words once", () => {
  const fn = main.slice(main.indexOf("function mergeSavedSettings"), main.indexOf("function noteStillDefault"));
  assert.match(fn, /if \(saved\.wordyDefault !== 1\)/);
  for (const k of ["detailAlerts", "detailOnLock", "chatPreview", "chatOnLock"]) assert.match(fn, new RegExp(`merged\\.${k} = true;`), k);
  assert.match(fn, /merged\.wordyDefault = 1;/);
});

test("every circle event goes out with its words when they are allowed, SOS included", () => {
  const fn = main.slice(main.indexOf("function notifyEvent"), main.indexOf("function cancelEventNotification"));
  assert.match(fn, /if \(state\.settings\.detailAlerts === true && typeof n\.notifyDetail === "function"\)/);
  assert.match(main, /const DETAIL_KINDS = new Set\(\["arrive", "leave", "checkin", "sos"\]\);/);
  assert.match(events, /val urgent = kind == "sos"/, "an SOS with words keeps its alarm channel");
});
