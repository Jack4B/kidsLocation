// Host-environment routing: relay normalization, API base selection, and the
// wrappers' invite origin, which is the family relay built in at build time
// (build-config.js) or, in a build without one, nothing until the user types one. The Android wrapper is simulated by
// planting a fake StarlingNative bridge on globalThis; the iOS wrapper by a
// location whose protocol is the starling: scheme.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeRelay, setApiBase, apiUrl, getApiBase, customRelayInUse, shareUrlBase, isWrapped, isIOSWrapped, isBundled, shareCapable, debugHooks, setDefaultRelay, getDefaultRelay, relayConfigured, helpUrlBase } from "../app/js/env.js";
import { BUILD_RELAY } from "../app/js/build-config.js";
const envExports = { shareCapable };

function withBridge(bridge, fn) {
  globalThis.StarlingNative = bridge;
  try {
    return fn();
  } finally {
    delete globalThis.StarlingNative;
  }
}

function withLocation(loc, fn) {
  const had = "location" in globalThis;
  const prev = globalThis.location;
  globalThis.location = loc;
  try {
    return fn();
  } finally {
    if (had) globalThis.location = prev;
    else delete globalThis.location;
  }
}

// The iOS wrapper's origin as the page sees it: the scheme is the signal,
// and the hostname is "localhost" for WebKit's secure-context rule, which
// is exactly why hostname checks alone are not allowed to mean "dev".
const IOS_WRAP = {
  protocol: "starling:",
  hostname: "localhost",
  origin: "starling://localhost",
  pathname: "/index.html",
};

test("normalizeRelay accepts https origins and strips trailing slashes", () => {
  assert.equal(normalizeRelay("https://relay.example.org"), "https://relay.example.org");
  assert.equal(normalizeRelay("https://relay.example.org/"), "https://relay.example.org");
  assert.equal(normalizeRelay("  https://relay.example.org//  "), "https://relay.example.org");
  assert.equal(normalizeRelay("https://relay.example.org:8443"), "https://relay.example.org:8443");
});

test("normalizeRelay keeps a path but trims its trailing slash", () => {
  assert.equal(normalizeRelay("https://x.example/starling/"), "https://x.example/starling");
});

test("normalizeRelay rejects junk", () => {
  assert.equal(normalizeRelay("http://relay.example.org"), null);
  assert.equal(normalizeRelay("https://user:pw@relay.example.org"), null);
  assert.equal(normalizeRelay("https://relay.example.org/?q=1"), null);
  assert.equal(normalizeRelay("https://relay.example.org/#frag"), null);
  assert.equal(normalizeRelay("relay.example.org"), null);
  assert.equal(normalizeRelay(""), null);
  assert.equal(normalizeRelay("   "), null);
  assert.equal(normalizeRelay(null), null);
  assert.equal(normalizeRelay(42), null);
});

const FAMILY = "https://relay.family.example";

// Every test that pins a built-in relay puts the shipped one back.
function withDefaultRelay(value, fn) {
  setDefaultRelay(value);
  try {
    return fn();
  } finally {
    setDefaultRelay(BUILD_RELAY);
    setApiBase(null);
  }
}

test("the committed build config names no relay at all", () => {
  assert.equal(BUILD_RELAY, "");
  assert.equal(getDefaultRelay(), "");
  const src = readFileSync(new URL("../app/js/build-config.js", import.meta.url), "utf8");
  assert.doesNotMatch(src, /https?:\/\//, "the fallback must not carry any address");
});

test("api base is same-origin on the web and the built-in relay in the wrapper", () => {
  withDefaultRelay(FAMILY, () => {
    setApiBase(null);
    assert.equal(getApiBase(), "");
    assert.equal(apiUrl("/api/v1/health"), "/api/v1/health");
    withBridge({}, () => {
      setApiBase(null);
      assert.equal(getApiBase(), FAMILY);
      assert.equal(apiUrl("/api/v1/health"), `${FAMILY}/api/v1/health`);
      assert.equal(relayConfigured(), true);
    });
    setApiBase(null);
    assert.equal(getApiBase(), "");
  });
});

test("a wrapper built without a relay talks to nobody until one is typed in", () => {
  withDefaultRelay("", () => {
    withBridge({}, () => {
      setApiBase(null);
      assert.equal(getApiBase(), "");
      assert.equal(relayConfigured(), false);
      assert.equal(customRelayInUse(), "");
      assert.equal(shareUrlBase(), "", "no invite base to hand out");
      setApiBase("https://relay.example.org");
      assert.equal(relayConfigured(), true);
      assert.equal(apiUrl("/api/v2/health"), "https://relay.example.org/api/v2/health");
      assert.equal(customRelayInUse(), "https://relay.example.org", "invites carry the typed relay");
      assert.equal(shareUrlBase(), "https://relay.example.org/");
    });
    // The web is same-origin and always has a relay: the page's own server.
    setApiBase(null);
    assert.equal(relayConfigured(), true);
  });
});

test("a junk build value counts as no relay, never as a half address", () => {
  for (const junk of ["http://relay.example.org", "relay.example.org", "https://u:p@x.example", "  "]) {
    withDefaultRelay(junk, () => {
      assert.equal(getDefaultRelay(), "");
      withBridge({}, () => {
        setApiBase(null);
        assert.equal(relayConfigured(), false);
      });
    });
  }
  withDefaultRelay(`${FAMILY}/`, () => assert.equal(getDefaultRelay(), FAMILY));
});

test("a custom relay overrides the default on both hosts", () => {
  setApiBase("https://relay.example.org/");
  assert.equal(apiUrl("/api/v1/x"), "https://relay.example.org/api/v1/x");
  withBridge({}, () => {
    setApiBase("https://relay.example.org");
    assert.equal(apiUrl("/api/v1/x"), "https://relay.example.org/api/v1/x");
  });
  // Junk falls back to the host default instead of poisoning the base.
  setApiBase("http://nope");
  assert.equal(getApiBase(), "");
  setApiBase(null);
});

test("customRelayInUse names a custom relay and nothing else", () => {
  withDefaultRelay(FAMILY, () => {
    setApiBase(null);
    assert.equal(customRelayInUse(), "", "same-origin web");
    withBridge({}, () => {
      setApiBase(null);
      assert.equal(customRelayInUse(), "", "the wrapper's built-in relay");
      setApiBase(`${FAMILY}/`);
      assert.equal(customRelayInUse(), "", "the built-in relay typed in by hand");
      setApiBase("https://relay.example.org/starling/");
      assert.equal(customRelayInUse(), "https://relay.example.org/starling");
    });
  });
});

test("shareUrlBase names the built-in relay's origin only in the wrapper", () => {
  withDefaultRelay(FAMILY, () => {
    withBridge({}, () => {
      setApiBase(null);
      assert.equal(shareUrlBase(), `${FAMILY}/`);
      // The App Links host stays the link base even on another relay: the
      // link carries that relay in its fragment and still opens the app.
      setApiBase("https://relay.example.org");
      assert.equal(shareUrlBase(), `${FAMILY}/`);
      assert.equal(helpUrlBase(), "https://relay.example.org/help");
      assert.equal(isWrapped(), true);
    });
  });
  assert.equal(isWrapped(), false);
  const hadLocation = "location" in globalThis;
  globalThis.location = { origin: "https://example.test", pathname: "/app/" };
  try {
    assert.equal(shareUrlBase(), "https://example.test/app/");
  } finally {
    if (!hadLocation) delete globalThis.location;
  }
});

test("shareCapable: wrappers always, dev servers on the web, hosted origin never", () => {
  const { shareCapable } = envExports;
  const hadLocation = "location" in globalThis;
  const prev = globalThis.location;
  try {
    globalThis.location = { protocol: "https:", hostname: "starlingmap.app" };
    assert.equal(shareCapable(), false);
    assert.equal(withBridge({}, () => shareCapable()), true);
    for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
      globalThis.location = { protocol: "http:", hostname: host };
      assert.equal(shareCapable(), true);
    }
    // A dev HOSTNAME alone is not a dev server: the protocol is part of the
    // claim, or the iOS wrapper's localhost would count as one.
    globalThis.location = { hostname: "localhost" };
    assert.equal(shareCapable(), false);
    globalThis.location = { protocol: "https:", hostname: "evil.example" };
    assert.equal(shareCapable(), false);
    delete globalThis.location;
    assert.equal(shareCapable(), false);
  } finally {
    if (hadLocation) globalThis.location = prev;
    else delete globalThis.location;
  }
});

test("the iOS wrapper is bundled but never the bridge", () => {
  withLocation(IOS_WRAP, () => {
    assert.equal(isIOSWrapped(), true);
    assert.equal(isWrapped(), false, "no StarlingNative on iOS, ever");
    assert.equal(isBundled(), true);
  });
  withLocation({ protocol: "https:", hostname: "starlingmap.app" }, () => {
    assert.equal(isIOSWrapped(), false);
    assert.equal(isBundled(), false);
  });
});

test("iOS wrapper routes api and invites to the built-in relay", () => {
  withDefaultRelay(FAMILY, () => {
    withLocation(IOS_WRAP, () => {
      setApiBase(null);
      assert.equal(getApiBase(), FAMILY);
      assert.equal(apiUrl("/api/v1/health"), `${FAMILY}/api/v1/health`);
      assert.equal(shareUrlBase(), `${FAMILY}/`);
    });
    setApiBase(null);
    assert.equal(getApiBase(), "");
  });
});

test("iOS wrapper opens the circle gate but never the debug surface", () => {
  withLocation(IOS_WRAP, () => {
    assert.equal(shareCapable(), true, "an app bundle beats a hosted tab");
    assert.equal(
      debugHooks(),
      false,
      "starling://localhost has a dev hostname and must still not expose test hooks",
    );
  });
  // The dev server keeps both, which is what the protocol check preserves.
  withLocation({ protocol: "http:", hostname: "localhost" }, () => {
    assert.equal(shareCapable(), true);
    assert.equal(debugHooks(), true);
  });
});
