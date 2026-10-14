// The chat screen as a module: what the composer counts and refuses, what
// the timeline draws for messages, gaps and place lines, and that nothing
// decrypted is ever handed to the page as markup.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { installDom } from "./dom-harness.mjs";

const harness = installDom({ interactive: true });
const { mountChat } = await import("../app/js/chatview.js");
const { CHAT_TEXT_BUDGET } = await import("../app/js/chat.js");

test.after(() => harness.stopTimers());

const A = "a".repeat(32);
const find = (n, id) => (n?.dataset?.testid === id ? n : (n?.children || []).reduce((hit, c) => hit || find(c, id), null));
const findAll = (n, id, out = []) => {
  if (n?.dataset?.testid === id) out.push(n);
  for (const c of n?.children || []) findAll(c, id, out);
  return out;
};
const text = (n) => (n.children?.length ? n.children.map(text).join("") : n.textContent || "");

function mount(over = {}) {
  const items = [];
  const posted = [];
  const host = document.createElement("section");
  const view = mountChat(host, {
    items: () => items,
    nameOf: (id) => (id === A ? "Marta <b>" : "?"),
    people: () => [{ id: A, name: "Marta", hue: 330 }],
    circleName: () => "Rodzina",
    post: (x) => {
      posted.push(x);
      return { ok: true, item: { x } };
    },
    retry: () => {},
    markRead: () => {},
    available: () => ({ ok: true }),
    lockOn: () => true,
    platform: () => "android",
    canNotify: () => true,
    settings: () => ({}),
    onSetting: () => {},
    now: () => Date.UTC(2026, 9, 14, 12),
    ...over,
  });
  const type = (v) => {
    view.input.value = v;
    view.input.dispatchEvent({ type: "input" });
  };
  return { host, view, items, posted, type };
}

test("the counter counts characters against the honest ceiling", () => {
  const { host, type } = mount();
  const count = find(host, "chat-count");
  const send = find(host, "chat-send");
  assert.equal(count.textContent, "0 / 280");
  assert.equal(send.disabled, true, "nothing to send");
  type("Jestem");
  assert.equal(count.textContent, "6 / 280");
  assert.equal(send.disabled, false);
  type("ż".repeat(150));
  assert.equal(count.textContent, `150 / ${150 + CHAT_TEXT_BUDGET - 300}`, "wide letters lower the ceiling");
});

test("text over the byte budget is blocked with a plain explanation, never cut", () => {
  const { host, type, posted, view } = mount();
  type("ąę".repeat(110));
  const problem = find(host, "chat-problem");
  assert.equal(problem.hidden, false);
  assert.match(problem.textContent, /too long to send/);
  assert.equal(find(host, "chat-send").disabled, true);
  assert.ok(find(host, "chat-count").classList.contains("cht-count-over"));
  find(host, "chat-send").parentNode.dispatchEvent({ type: "submit", preventDefault() {} });
  assert.deepEqual(posted, [], "nothing was sent");
  assert.equal(view.input.value, "ąę".repeat(110), "and nothing was removed from what they wrote");
  type("a".repeat(281));
  assert.match(problem.textContent, /at most 280 characters/);
  type("ok");
  assert.equal(problem.hidden, true);
});

test("a quick reply sends at once", () => {
  const { host, posted } = mount();
  const chips = findAll(host, "chat-quick");
  assert.deepEqual(chips.map(text), ["I'm here", "Back in 10 min", "Pick me up", "OK"]);
  chips[2].dispatchEvent({ type: "click" });
  assert.deepEqual(posted, ["Pick me up"]);
});

test("the timeline draws messages, a gap and a place line, all as text", () => {
  const { host, items, view } = mount();
  const ts = Date.UTC(2026, 9, 14, 7, 42);
  items.push(
    { kind: "sys", id: "s1", from: A, ev: "arrive", place: "Dom", ts, at: ts },
    { kind: "gap", id: "g1", from: A, lo: 2, hi: 3, ts: ts + 1000, at: ts },
    { kind: "msg", id: "m1", from: A, k: "AAAAAAAAAAA", q: 4, e: 1, ts: ts + 1000, x: '<img src=x onerror="alert(1)">', at: ts, mine: false },
    { kind: "msg", id: "m2", from: "c".repeat(32), k: "BBBBBBBBBBB", q: 1, e: 1, ts: ts + 2000, x: "Super", at: ts, mine: true, st: "sent" },
    { kind: "msg", id: "m3", from: "c".repeat(32), k: "CCCCCCCCCCC", q: 2, e: 1, ts: ts + 3000, x: "Halo?", at: ts, mine: true, st: "failed" },
  );
  view.update();
  assert.match(text(find(host, "chat-sys")), /^Marta <b> arrived at Dom, /);
  assert.match(text(find(host, "chat-gap")), /^Marta <b>: 2 messages could not be read\. This phone was probably offline for too long\.$/);
  const theirs = find(host, "chat-theirs");
  assert.equal(find(theirs, "chat-text").textContent, '<img src=x onerror="alert(1)">', "the message is text, not markup");
  const mine = findAll(host, "chat-mine");
  assert.match(text(find(mine[0], "chat-meta")), /^Sent /, "the last delivered message says Sent");
  assert.ok(find(mine[1], "chat-retry"), "a failed one offers to try again");
  assert.equal(find(host, "chat-note").textContent, "The server keeps messages for at most 24 hours. This phone keeps them for 30 days.");
});

test("the info panel is honest about the platform and offers the notification switches on Android", () => {
  const ios = mount({ platform: () => "ios", canNotify: () => false, lockOn: () => false });
  find(ios.host, "chat-info").dispatchEvent({ type: "click" });
  const said = text(find(ios.host, "chat-info-panel"));
  assert.match(said, /On iPhone you hear about new messages only while the app is open\./);
  assert.match(said, /stored unencrypted/);
  assert.equal(find(ios.host, "chat-preview-toggle"), null);

  const changes = [];
  const android = mount({ onSetting: (k, v) => changes.push([k, v]) });
  find(android.host, "chat-info").dispatchEvent({ type: "click" });
  const toggle = find(android.host, "chat-preview-toggle");
  assert.equal(toggle.checked, false, "off by default");
  toggle.checked = true;
  toggle.dispatchEvent({ type: "change" });
  assert.deepEqual(changes, [["chatPreview", true]]);
});

test("a demo or a missing circle disables the composer and says why", () => {
  const { host } = mount({ available: () => ({ ok: false, why: "Chat is off in the demo." }) });
  assert.equal(find(host, "chat-off").textContent, "Chat is off in the demo.");
  assert.equal(find(host, "chat-input").disabled, true);
});

test("the chat modules never hand anything to the page as markup", () => {
  for (const f of ["chat.js", "chatview.js"]) {
    const src = readFileSync(new URL(`../app/js/${f}`, import.meta.url), "utf8");
    assert.doesNotMatch(src, /innerHTML|outerHTML|insertAdjacentHTML|document\.write/, f);
  }
});
