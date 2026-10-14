#!/bin/bash
# Grep-based invariants for the two lock-screen notification leaks fixed in
# Events.kt and LocationService.kt. A grep cannot prove a notification is
# safe (it does not run the code or inspect what actually reaches the OS at
# runtime), only that specific known-vulnerable patterns are absent and that
# specific required calls are present in the right place. Treat a pass here
# as "the known regression didn't come back," not as a full audit.
set -uo pipefail
cd "$(dirname "$0")/.."

events=android/app/src/main/kotlin/app/starlingmap/Events.kt
service=android/app/src/main/kotlin/app/starlingmap/LocationService.kt
fail=0

# Events.post takes the real title/body of a circle event (a member's name,
# a place name) as arguments. Before the fix, one of the two builders fed
# those straight into a notification field, which the OS shows on the lock
# screen by default regardless of VISIBILITY_PRIVATE, since
# LOCK_SCREEN_ALLOW_PRIVATE_NOTIFICATIONS defaults to true. Both builders
# must stay generic; this pattern must never come back on either.
if grep -nE '\.setContentTitle\(title\)|setContentText\(body\)' "$events" >/dev/null; then
  echo "Events.kt feeds the real title or body into a notification field:"
  grep -nE '\.setContentTitle\(title\)|setContentText\(body\)' "$events"
  fail=1
fi

# show() takes string resource ids, so a title or body handed to post() has no way into a field.
if ! grep -qE 'private fun show\(ctx: Context, @StringRes titleRes: Int, @StringRes textRes: Int,' "$events"; then
  echo "Events.kt's notification builder no longer takes string resource ids only"
  fail=1
fi

# The Stop action on the ongoing share notification must require the device
# to be unlocked (Android 12+, Notification.Action.Builder#setAuthenticationRequired).
if ! grep -q 'setAuthenticationRequired(true)' "$service"; then
  echo "LocationService.kt's Stop action does not require authentication"
  fail=1
fi

# A stop triggered from ACTION_STOP (the notification's Stop button) must
# leave the same "share ended" trace onTaskRemoved leaves, so a lock-screen
# stop is not silent to the person relying on the share.
stop_branch=$(awk '/ACTION_STOP/,/^        }/' "$service")
if ! grep -qE 'Events\.post|postShareEnded\(' <<<"$stop_branch"; then
  echo "LocationService.kt's ACTION_STOP branch does not post a share-ended event"
  fail=1
fi

# Chat notifications (security review M1). show() fills the private version
# from `heading`/`text`, which come from detail.title/detail.body, and Android
# shows that private version on a secure lock screen whenever "show all
# notification content" is on (the default). So a chat notice without
# chatOnLock must never put the caller's words into a Detail. The grep above
# only looks for `title`/`body`; these look at what show() actually uses.

# Every content field is set from one of the four vetted locals in show().
fields=$(grep -nE 'setContent(Title|Text)\(' "$events")
bad_fields=$(grep -vE 'setContent(Title|Text)\((heading|text|publicHeading|publicText)\)' <<<"$fields")
if [ -n "$bad_fields" ]; then
  echo "Events.kt sets a notification field from something other than heading/text/publicHeading/publicText:"
  echo "$bad_fields"
  fail=1
fi

# Those locals take caller words only from a Detail, and the public ones only when onLock.
show_fn=$(awk '/private fun show\(/,/nm\.notify\(/' "$events")
for line in \
  'val heading = detail?.title ?: ctx.getString(titleRes)' \
  'val text = detail?.body ?: ctx.getString(textRes)' \
  'val publicHeading = if (detail?.onLock == true) heading else ctx.getString(titleRes)' \
  'val publicText = if (detail == null) text else if (detail.onLock) detail.body else ctx.getString(detail.lockedRes)'; do
  if ! grep -qF "$line" <<<"$show_fn"; then
    echo "Events.kt show() no longer derives its fields as reviewed: $line"
    fail=1
  fi
done

# A Detail carrying the caller's title/body is built only in postDetail, and
# only after the chat branch that, without onLock, uses resources alone.
post_detail=$(awk '/fun postDetail\(/,/^    }$/' "$events")
guard=$(grep -n 'if (kind == "chat" && !onLock) {' <<<"$post_detail" | head -1 | cut -d: -f1)
caller=$(grep -n 'Detail(title, body' <<<"$post_detail" | head -1 | cut -d: -f1)
if [ -z "$guard" ] || [ -z "$caller" ] || [ "$guard" -ge "$caller" ]; then
  echo "Events.kt postDetail lets a chat notice without onLock carry the caller's words"
  fail=1
else
  branch=$(sed -n "${guard},$((caller - 1))p" <<<"$post_detail")
  if grep -qE '\btitle\b|\bbody\b|detail\.' <<<"$(grep -v '^ *if (title' <<<"$branch")" \
    || ! grep -q 'Detail(ctx.getString(R.string.app_name), ctx.getString(R.string.notif_chat_text), member, false' <<<"$branch"; then
    echo "Events.kt postDetail's chat branch without onLock is not built from resources only:"
    echo "$branch"
    fail=1
  fi
fi
if [ "$(grep -c 'Detail(title, body' "$events")" -ne 1 ]; then
  echo "Events.kt builds a Detail from caller words in more than one place"
  fail=1
fi

# The page side: what main.js hands notifyDetail for chat comes from
# chatNotice, and chatNotice says nothing of who or what without onLock.
if ! grep -qE 'n\.notifyDetail\(note\.title, note\.body, "chat", "chat", "chat", note\.onLock\)' app/js/main.js; then
  echo "main.js no longer posts chat notifications only through chatNotice"
  fail=1
fi
if ! node --input-type=module -e '
  const { chatNotice } = await import(process.argv[1]);
  const name = "Mama", text = "Kod 4711";
  for (const preview of [false, true]) {
    const off = JSON.stringify(chatNotice({ name, text, preview, onLock: false }));
    if (off.includes(name) || off.includes("4711") || !off.includes("\"onLock\":false")) {
      console.log("chatNotice leaks without chatOnLock (preview " + preview + "): " + off);
      process.exit(1);
    }
  }
' "$PWD/app/js/chat.js"; then
  fail=1
fi

if [ "$fail" -eq 0 ]; then echo "clean: notification privacy invariants hold"; fi
exit $fail
