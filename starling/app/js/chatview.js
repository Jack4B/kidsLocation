// The chat screen: header, timeline, quick replies and the composer. No app
// state lives here; main.js passes the controller's views and callbacks in,
// and the same mount works inside a full-screen layer today and inside a
// bottom-navigation tab later.
//
// Every name and every message reaches the page through textContent or
// createElement. Nothing decrypted is ever parsed as markup.

import { t, currentLocale } from "./i18n.js";
import { fmtClock } from "./fmt.js";
import { chatMeasure, gapCount, CHAT_SOFT_CHARS, QUICK_REPLIES } from "./chat.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const PAGE = 200;

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function icon(paths, size = 20, stroke = 2) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", String(stroke));
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  for (const d of paths) {
    const p = document.createElementNS(SVG_NS, "path");
    p.setAttribute("d", d);
    svg.append(p);
  }
  return svg;
}

const ICON_LOCK = ["M7 11h10a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2z", "M8 11V8a4 4 0 0 1 8 0v3"];
const ICON_SEND = ["M22 2L11 13", "M22 2l-7 20-4-9-9-4 20-7z"];
const ICON_BACK = ["M15 5l-7 7 7 7"];
const ICON_INFO = ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 11v5", "M12 8h.01"];
const ICON_HOME = ["M4 11l8-7 8 7v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"];
const ICON_WARN = ["M12 3l9.5 17h-19z", "M12 10v4", "M12 17h.01"];

function startOfDay(ms) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dayLabel(ms, now) {
  const today = startOfDay(now);
  const day = startOfDay(ms);
  if (day === today) return t("Today");
  if (day === startOfDay(today - 1)) return t("Yesterday");
  try {
    return new Intl.DateTimeFormat(currentLocale(), { weekday: "long", day: "numeric", month: "long" }).format(ms);
  } catch {
    return new Date(ms).toDateString();
  }
}

const initial = (name) => (Array.from(String(name || "").trim())[0] || "?").toUpperCase();

// The switch row the settings sheet uses, rebuilt here so the chat does not
// reach into ui.js internals that are about to be redesigned.
function toggleRow({ label, note, value, onChange, testid }) {
  const row = el("label", "cht-toggle");
  const text = el("span", "cht-toggle-text");
  text.append(el("span", "cht-toggle-label", label));
  if (note) text.append(el("span", "cht-toggle-note", note));
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("role", "switch");
  input.className = "cht-switch";
  input.checked = !!value;
  if (testid) input.dataset.testid = testid;
  input.addEventListener("change", () => onChange(input.checked));
  row.append(text, input);
  return row;
}

export function mountChat(container, deps) {
  const now = () => (deps.now ? deps.now() : Date.now());
  container.classList.add("cht");
  container.replaceChildren();

  // ---------------------------------------------------------------- header
  const head = el("header", "cht-head");
  if (deps.onClose) {
    const back = el("button", "cht-iconbtn cht-back");
    back.type = "button";
    back.setAttribute("aria-label", t("Back to the map"));
    back.dataset.testid = "chat-close";
    back.append(icon(ICON_BACK, 22));
    back.addEventListener("click", () => deps.onClose());
    head.append(back);
  }
  const titles = el("div", "cht-titles");
  const title = el("h2", "cht-title");
  title.dataset.testid = "chat-title";
  const e2e = el("div", "cht-e2e");
  e2e.append(icon(ICON_LOCK, 14, 2.2), el("span", null, t("End-to-end encrypted")));
  titles.append(title, e2e);
  const avas = el("div", "cht-avas");
  avas.setAttribute("aria-hidden", "true");
  const infoBtn = el("button", "cht-iconbtn cht-infobtn");
  infoBtn.type = "button";
  infoBtn.setAttribute("aria-label", t("About chat"));
  infoBtn.setAttribute("aria-expanded", "false");
  infoBtn.dataset.testid = "chat-info";
  infoBtn.append(icon(ICON_INFO, 22, 1.8));
  head.append(titles, avas, infoBtn);

  // ------------------------------------------------------------ info panel
  const info = el("div", "cht-info");
  info.dataset.testid = "chat-info-panel";
  info.hidden = true;
  infoBtn.addEventListener("click", () => {
    info.hidden = !info.hidden;
    infoBtn.setAttribute("aria-expanded", String(!info.hidden));
    if (!info.hidden) paintInfo();
  });

  function paintInfo() {
    info.replaceChildren();
    const lines = [
      t("Messages are end-to-end encrypted. The server sees only that something was sent."),
      t("The server keeps a message for at most 24 hours, and less when the sender is moving and posting often. A phone that was offline for longer than its history setting may miss messages. You see a note when that happens."),
      t("Sent means the server accepted the message. It does not mean anyone has read it."),
    ];
    if (deps.lockOn && !deps.lockOn()) lines.push(t("Without the app lock, messages on this phone are stored unencrypted."));
    const plat = deps.platform ? deps.platform() : "web";
    if (plat === "ios") lines.push(t("On iPhone you hear about new messages only while the app is open."));
    else if (plat !== "android") lines.push(t("Here you hear about new messages only while this page is open."));
    for (const line of lines) info.append(el("p", "cht-info-line", line));
    if (deps.canNotify && deps.canNotify()) {
      const s = deps.settings ? deps.settings() : {};
      info.append(
        // Android shows a notification's content on a secure lock screen by
        // default, so the name is a lock-screen choice, and the text rides on it.
        toggleRow({
          label: t("Show who wrote in notifications"),
          note: t("Off, a notification says only that a message came. On, the name also shows on the lock screen, where anyone holding the phone can read it without unlocking."),
          value: s.chatOnLock === true,
          testid: "chat-onlock-toggle",
          onChange: (v) => deps.onSetting?.("chatOnLock", v),
        }),
        toggleRow({
          label: t("Also show the message text"),
          note: t("Only matters when the switch above is on. The text then shows on the lock screen too."),
          value: s.chatPreview === true,
          testid: "chat-preview-toggle",
          onChange: (v) => deps.onSetting?.("chatPreview", v),
        }),
      );
    }
  }

  // ------------------------------------------------------------- timeline
  const scroller = el("div", "cht-scroll");
  scroller.dataset.testid = "chat-timeline";
  const log = el("div", "cht-log");
  log.setAttribute("role", "log");
  log.setAttribute("aria-live", "polite");
  log.setAttribute("aria-label", t("Messages"));
  const note = el("p", "cht-note", t("The server keeps messages for at most 24 hours. This phone keeps them for 30 days."));
  note.dataset.testid = "chat-note";
  const more = el("button", "cht-more", t("Show earlier messages"));
  more.type = "button";
  more.hidden = true;
  let shown = PAGE;
  more.addEventListener("click", () => {
    shown += PAGE;
    paint({ keepScroll: true });
  });
  const empty = el("p", "cht-empty", t("No messages yet. Write the first one."));
  empty.hidden = true;
  const list = el("div", "cht-list");
  log.append(note, more, empty, list);
  scroller.append(log);

  // --------------------------------------------------------------- chips
  const chips = el("div", "cht-chips");
  chips.setAttribute("role", "group");
  chips.setAttribute("aria-label", t("Quick replies"));
  for (const q of QUICK_REPLIES) {
    const b = el("button", "cht-chip");
    b.type = "button";
    b.dataset.testid = "chat-quick";
    b.append(el("span", "cht-chip-face", t(q)));
    b.addEventListener("click", () => send(t(q)));
    chips.append(b);
  }

  // ------------------------------------------------------------ composer
  const form = el("form", "cht-compose");
  form.setAttribute("novalidate", "");
  const field = el("div", "cht-field");
  const input = document.createElement("input");
  input.type = "text";
  input.className = "cht-input";
  input.dataset.testid = "chat-input";
  input.autocomplete = "off";
  input.setAttribute("enterkeyhint", "send");
  input.setAttribute("autocapitalize", "sentences");
  input.placeholder = t("Write to your circle");
  input.setAttribute("aria-label", t("Message to your circle"));
  const counter = el("span", "cht-count");
  counter.dataset.testid = "chat-count";
  counter.id = `cht-count-${Math.random().toString(36).slice(2, 8)}`;
  input.setAttribute("aria-describedby", counter.id);
  field.append(input, counter);
  const sendBtn = el("button", "cht-send");
  sendBtn.type = "submit";
  sendBtn.dataset.testid = "chat-send";
  sendBtn.setAttribute("aria-label", t("Send message"));
  sendBtn.append(icon(ICON_SEND, 22));
  form.append(field, sendBtn);
  const problem = el("p", "cht-problem");
  problem.dataset.testid = "chat-problem";
  problem.setAttribute("role", "alert");
  problem.hidden = true;
  const off = el("p", "cht-off");
  off.dataset.testid = "chat-off";
  off.hidden = true;

  const foot = el("div", "cht-foot");
  foot.append(chips, problem, form, off);
  container.append(head, info, scroller, foot);

  function problemText(m) {
    if (m.reason === "bytes") return t("This message is too long to send. Letters with accents and emoji take more space, so shorten it a little.");
    if (m.reason === "chars") return t("A message can have at most {n} characters.", { n: CHAT_SOFT_CHARS });
    return "";
  }

  function paintComposer() {
    const m = chatMeasure(input.value);
    counter.textContent = `${m.chars} / ${Math.max(0, m.limit)}`;
    const over = m.reason === "bytes" || m.reason === "chars";
    counter.classList.toggle("cht-count-over", over);
    field.classList.toggle("cht-field-over", over);
    problem.hidden = !over;
    problem.textContent = over ? problemText(m) : "";
    const avail = deps.available ? deps.available() : { ok: true };
    sendBtn.disabled = !m.ok || !avail.ok;
    return m;
  }

  function send(text) {
    const avail = deps.available ? deps.available() : { ok: true };
    if (!avail.ok) return;
    const res = deps.post(text);
    if (res?.ok) {
      if (text === input.value || chatMeasure(input.value).text === res.item?.x) input.value = "";
      paintComposer();
      stick = true;
      paint();
    } else if (res && res.reason !== "empty") {
      problem.hidden = false;
      problem.textContent = problemText(res.measure || { reason: res.reason });
    }
  }

  input.addEventListener("input", paintComposer);
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const m = paintComposer();
    if (!m.ok) {
      if (m.reason !== "empty") problem.hidden = false;
      return;
    }
    send(input.value);
    input.focus?.();
  });

  // --------------------------------------------------------------- paint
  const nodes = new Map();
  let stick = true;

  scroller.addEventListener("scroll", () => {
    stick = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 48;
    if (stick) deps.markRead?.();
  });

  function bubbleNode(it, ctx) {
    const wrap = el("div", `cht-msg ${it.mine ? "cht-mine" : "cht-theirs"}`);
    wrap.dataset.testid = it.mine ? "chat-mine" : "chat-theirs";
    if (!it.mine && ctx.showName) {
      wrap.append(el("div", "cht-from", deps.nameOf(it.from)));
    } else if (it.mine) {
      const who = el("span", "vh", t("You"));
      wrap.append(who);
    }
    const bubble = el("div", "cht-bubble", it.x);
    bubble.dir = "auto";
    bubble.dataset.testid = "chat-text";
    wrap.append(bubble);
    const meta = el("div", "cht-meta");
    meta.dataset.testid = "chat-meta";
    wrap.append(meta);
    wrap.chtMeta = meta;
    return wrap;
  }

  function paintMeta(node, it, ctx) {
    const meta = node.chtMeta;
    meta.replaceChildren();
    node.classList.toggle("cht-failed", it.mine && it.st === "failed");
    if (!it.mine) {
      meta.textContent = fmtClock(it.ts);
      return;
    }
    if (it.st === "sent") {
      meta.textContent = ctx.lastSent ? t("Sent {time}", { time: fmtClock(it.ts) }) : fmtClock(it.ts);
    } else if (it.st === "failed") {
      const retry = el("button", "cht-retry", t("Not sent. Tap to try again."));
      retry.type = "button";
      retry.dataset.testid = "chat-retry";
      retry.addEventListener("click", () => {
        deps.retry?.(it.id);
        paint();
      });
      meta.append(retry);
    } else if (it.st === "retrying") {
      meta.textContent = t("Not sent yet. Trying again.");
    } else {
      meta.textContent = t("Sending...");
    }
  }

  function gapNode(it) {
    const n = el("div", "cht-gap");
    n.dataset.testid = "chat-gap";
    n.setAttribute("role", "note");
    n.append(icon(ICON_WARN, 16, 2));
    const count = gapCount(it);
    const name = deps.nameOf(it.from);
    let said;
    if (count === null) said = t("{name}: some messages could not be read. This phone was probably offline for too long.", { name });
    else if (count === 1) said = t("{name}: 1 message could not be read. This phone was probably offline for too long.", { name });
    else said = t("{name}: {n} messages could not be read. This phone was probably offline for too long.", { name, n: count });
    n.append(el("span", null, said));
    return n;
  }

  function sysNode(it) {
    const n = el("div", "cht-sys");
    n.dataset.testid = "chat-sys";
    n.append(icon(ICON_HOME, 14, 2));
    const who = deps.nameOf(it.from);
    const said = it.ev === "arrive" ? t("{who} arrived at {place}", { who, place: it.place }) : t("{who} left {place}", { who, place: it.place });
    n.append(el("span", null, `${said}, ${fmtClock(it.ts)}`));
    return n;
  }

  function paintHead() {
    title.textContent = deps.circleName ? deps.circleName() : t("Chat");
    avas.replaceChildren();
    const people = deps.people ? deps.people() : [];
    for (const p of people.slice(0, 4)) {
      const a = el("span", "cht-ava", initial(p.name));
      a.style.background = `hsl(${Number(p.hue) || 0} 70% 78%)`;
      avas.append(a);
    }
  }

  function paint({ keepScroll = false } = {}) {
    paintHead();
    const all = deps.items();
    const from = Math.max(0, all.length - shown);
    const items = all.slice(from);
    more.hidden = from === 0;
    empty.hidden = all.length > 0;
    const prevHeight = scroller.scrollHeight;
    const prevTop = scroller.scrollTop;
    const t0 = now();
    let lastSentId = null;
    for (const it of items) if (it.kind === "msg" && it.mine && it.st === "sent") lastSentId = it.id;
    const out = [];
    let day = null;
    let prev = null;
    const live = new Set();
    for (const it of items) {
      const d = startOfDay(it.ts);
      if (d !== day) {
        day = d;
        const sep = el("div", "cht-day", dayLabel(it.ts, t0));
        sep.dataset.testid = "chat-day";
        out.push(sep);
        prev = null;
      }
      let node = nodes.get(it.id);
      if (it.kind === "msg") {
        const showName = !(prev && prev.kind === "msg" && !prev.mine && prev.from === it.from && it.ts - prev.ts < 5 * 60 * 1000);
        const key = `${it.id}|${showName ? 1 : 0}`;
        if (!node || node.dataset.key !== key) {
          node = bubbleNode(it, { showName });
          node.dataset.key = key;
        }
        paintMeta(node, it, { lastSent: it.id === lastSentId });
      } else if (it.kind === "gap") {
        const key = `${it.id}|${it.lo}|${it.hi}`;
        if (!node || node.dataset.key !== key) {
          node = gapNode(it);
          node.dataset.key = key;
        }
      } else if (it.kind === "sys") {
        if (!node) node = sysNode(it);
      } else {
        continue;
      }
      nodes.set(it.id, node);
      live.add(it.id);
      out.push(node);
      prev = it;
    }
    for (const id of [...nodes.keys()]) if (!live.has(id)) nodes.delete(id);
    list.replaceChildren(...out);
    if (keepScroll) {
      scroller.scrollTop = prevTop + (scroller.scrollHeight - prevHeight);
    } else if (stick) {
      scroller.scrollTop = scroller.scrollHeight;
      if (deps.isVisible ? deps.isVisible() : true) deps.markRead?.();
    }
    const avail = deps.available ? deps.available() : { ok: true };
    off.hidden = avail.ok;
    off.textContent = avail.ok ? "" : avail.why || "";
    input.disabled = !avail.ok;
    chips.hidden = !avail.ok;
    for (const b of chips.children) b.disabled = !avail.ok;
    if (!info.hidden) paintInfo();
    paintComposer();
  }

  paint();

  return {
    update: () => paint(),
    focus: () => input.focus?.(),
    scrollToEnd() {
      stick = true;
      scroller.scrollTop = scroller.scrollHeight;
    },
    destroy() {
      nodes.clear();
      container.replaceChildren();
      container.classList.remove("cht");
    },
    // For tests and the lead's tab wiring: what the composer would send.
    measure: () => chatMeasure(input.value),
    input,
  };
}
