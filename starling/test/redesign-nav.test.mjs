// The redesigned map screen, held to the real main.js and map.js: where the
// map opens (F2-2), and the four tabs at the bottom (F2-1).
import test from "node:test";
import assert from "node:assert/strict";

import { installDom, loadApp, settle } from "./dom-harness.mjs";

const harness = installDom({ listen: true });

// A fake map that records where it was told to look.
const fakeMap = globalThis.L.map();
const views = [];
const fits = [];
const handlers = new Map();
fakeMap.setView = function (center, zoom) {
  views.push({ center, zoom });
  return this;
};
fakeMap.fitBounds = (bounds, opts) => fits.push(opts);
fakeMap.project = (ll) => ({ x: ll[1], y: -ll[0] });
fakeMap.unproject = (p) => ({ lat: -p.y, lng: p.x });
fakeMap.on = function (type, fn) {
  if (!handlers.has(type)) handlers.set(type, []);
  handlers.get(type).push(fn);
  return this;
};
const fire = (type) => {
  for (const fn of handlers.get(type) || []) fn({});
};

const { internals } = await loadApp(harness);
const ui = await import("../app/js/ui.js");
const { DEFAULT_VIEW, STREET_ZOOM } = await import("../app/js/map.js");
const state = internals.state;
const overlays = harness.node("#overlays");
// Closing takes the "open" class off at once; the node itself goes a moment later.
const pageOpen = (testid) =>
  overlays.children.some((wrap) => wrap.children?.[1]?.dataset?.testid === testid && wrap.classList.contains("open"));
const reset = () => {
  ui.closeAllOverlays();
  overlays.children = [];
};
const ME = { lat: 50.06, lon: 19.94 };

test.after(() => harness.stopTimers());

test("a circle's map screen", () => {
  state.gen = { fake: true };
  internals.startDemo();
  internals.exitDemo();
  assert.equal(state.screen, "map");
  state.places = [];
});

test("before any fix the map shows Poland, not the far side of the world", () => {
  assert.ok(
    views.some((v) => v.zoom === DEFAULT_VIEW.zoom && v.center[0] === DEFAULT_VIEW.lat && v.center[1] === DEFAULT_VIEW.lon),
    JSON.stringify(views.slice(0, 3)),
  );
  assert.equal(DEFAULT_VIEW.zoom, 6);
});

test("the first fix moves the map onto you, at street zoom", () => {
  views.length = 0;
  state.me = { ...ME, ts: Date.now() };
  internals.render();
  const street = views.filter((v) => v.zoom === STREET_ZOOM);
  assert.equal(street.length, 1, JSON.stringify(views));
  assert.equal(street[0].center.lng, ME.lon, "centered on you (shifted up, clear of the sheet, but not sideways)");
  assert.ok(street[0].center.lat < ME.lat, "the point sits above the map's center, where the sheet does not cover it");

  views.length = 0;
  state.me = { lat: ME.lat + 0.01, lon: ME.lon, ts: Date.now() };
  internals.render();
  assert.equal(views.filter((v) => v.zoom === STREET_ZOOM).length, 0, "only the first fix moves the map; later ones leave it be");
});

test("a person who moved the map before the first fix keeps their view", () => {
  internals.startDemo();
  internals.exitDemo();
  state.places = [];
  fire("dragstart");
  views.length = 0;
  state.me = { ...ME, ts: Date.now() };
  internals.render();
  assert.equal(views.filter((v) => v.zoom === STREET_ZOOM).length, 0, JSON.stringify(views));
});

test("with saved places and no fix yet, the map opens on the places", () => {
  internals.startDemo();
  internals.exitDemo();
  state.me = null;
  state.places = [
    { id: "a", name: "Home", lat: 50.06, lon: 19.94, radius: 150 },
    { id: "b", name: "School", lat: 50.07, lon: 19.95, radius: 150 },
  ];
  fits.length = 0;
  internals.openingView();
  assert.equal(fits.length, 1);
  assert.ok(fits[0].maxZoom <= 15, "framed, not zoomed into one of them");
  state.places = [];
});

test("the four tabs: Map is current until another is chosen", () => {
  reset();
  assert.equal(internals.activeTab(), "map");
  assert.equal(harness.node('[data-testid="tab-map"]').getAttribute("aria-current"), "page");
});

test("the Circle tab is a page in the overlay layer, and All settings opens Settings", async () => {
  reset();
  internals.openTab("circle");
  await settle();
  assert.equal(internals.activeTab(), "circle");
  assert.ok(pageOpen("circle-page"));
  assert.equal(harness.node('[data-testid="tab-circle"]').getAttribute("aria-current"), "page");
  assert.equal(harness.node('[data-testid="tab-map"]').getAttribute("aria-current"), null);
  await internals.openSettings();
  await settle();
  assert.ok(pageOpen("settings-sheet"), "Settings opens over the Circle page");
  assert.ok(pageOpen("circle-page"), "and the page stays under it");
});

test("choosing Map closes the page and marks Map current again", async () => {
  internals.openTab("map");
  assert.equal(internals.activeTab(), "map");
  assert.ok(!pageOpen("circle-page"));
  assert.ok(!pageOpen("settings-sheet"));
  assert.equal(harness.node('[data-testid="tab-map"]').getAttribute("aria-current"), "page");
});

test("Places is a tab page too, and one tab page replaces another", async () => {
  reset();
  internals.openTab("places");
  await settle();
  assert.equal(internals.activeTab(), "places");
  assert.ok(pageOpen("places-sheet"));
  internals.openTab("circle");
  await settle();
  assert.ok(!pageOpen("places-sheet"));
  assert.ok(pageOpen("circle-page"));
  internals.openTab("map");
});

test("Escape closes a tab page and the navigation follows", () => {
  reset();
  internals.openTab("places");
  assert.ok(ui.closeTopOverlay());
  assert.equal(internals.activeTab(), "map");
  assert.equal(harness.node('[data-testid="tab-places"]').getAttribute("aria-current"), null);
});
