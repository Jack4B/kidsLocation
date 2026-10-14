# Family chat

This describes the `chat` message type as implemented in `app/js/chat.js`,
`app/js/chatview.js` and the `chat` branch of `ingest` in `app/js/net.js`. It is an
addendum to `PROTOCOL.md`, which is left unchanged; folding it into `PROTOCOL.md` is a
decision for the project owner. The design record (in Polish) is
`docs/adr/ADR-001-czat.md` in the kidsLocation repository.

Nothing in the cryptography, the wire format or the relay changes. A chat message is one
more post in the sender's existing per-member stream: same ratchet, same signature, same
frame, same padding. The relay cannot tell a chat message from a position; both
ciphertexts are 528 bytes.

## Envelope

The plaintext inside the sealed post:

```
{"v":2,"ts":<ms>,"t":"chat","k":"<11 base64url chars>","q":<integer >= 1>,"x":"<text>"}
```

| Field | Meaning |
|---|---|
| `v` | Envelope version, 2, as for every post |
| `ts` | Set by `createSender`: `max(now, last + 1)`. A chat and a position sent in the same millisecond get `ts` and `ts + 1`, so the relay never answers 409 |
| `t` | `"chat"` |
| `k` | Message id: 8 random bytes, base64url. Retries resend the same `k` |
| `q` | This device's chat sequence number in this circle, starting at 1. Used to detect gaps. Kept in the local archive, so it starts again at 1 after a reinstall |
| `x` | The text: one line, passed through `cleanText`, at most 402 bytes once JSON encoded |

There is no sender name in the message. The receiver takes it from the roster.

### Length

Padding is to 512 bytes with a reserve of 24, so the envelope may take 488 bytes. The
envelope without text costs 86 bytes with the largest `ts` and `q` the format allows
(`Number.MAX_SAFE_INTEGER`, measured in code rather than hand counted), which leaves
`CHAT_TEXT_BUDGET = 402` bytes for `x` as it appears in the JSON (escapes included).

The composer shows a soft limit of 280 characters. The counter reads
`characters / ceiling`, where the ceiling is the smaller of 280 and the number of
characters that actually fit in the bytes left. Everyday Polish text of 280 characters
fits; text made only of letters with diacritics or of emoji does not. Text over either
limit is refused with a plain message. It is never cut. `chatFields` throws on text over
the budget, so no caller can send it by mistake.

The receiver cuts `x` at 1024 characters before looking at it, normalizes it the same
way and drops a message with no text.

## Receiving

In `ingest`, after the post is decrypted and its signature checked exactly as for a
position:

1. The `t === "chat"` branch comes **before** the position kinds are skipped. It does not
   go through `accepted()`, and it does not touch `rec.ts`, the status or the map marker.
   A chat message older than the sender's last position is still taken.
2. Backlog rule: a post from an epoch below `ratchet.backlogFloor` (backlog from before
   this device joined) is skipped, as for control messages.
3. Dedup in memory by `(member, epoch, ts)` in a bounded set, cleared by `clear()`. Then
   dedup in the archive by `(member, k)` and by `(member, epoch, ts)`. The archive is what
   keeps a reload, which reads the relay window again, from showing a message twice.
4. `readChat` checks the shape (`k`, `q`, non-empty `x`). A malformed message is skipped
   silently.
5. Gaps: per sender the archive keeps `hi`, the highest `q` seen. `q > hi + 1` records a
   gap `hi + 1 .. q - 1`. A late message shrinks or splits the gap it falls in. `q === 1`
   below `hi` that fills no gap means the sender started over (reinstall or cleared
   data). The first message ever seen from a sender reports nothing before it.
6. A sender not pinned before this pass is handled as for positions (trust on first
   use). Chat has no trust path of its own.

## Re-key

Chat rides the channel of the current generation. The grace roster that keeps reading the
previous generation for a while after a re-key has no chat handler, so a chat message
still sent on the old channel during the race is not shown; the receiver sees it as a gap
when the next message from that sender arrives. The archive is keyed by this device's
member id in the circle, which a re-key does not change.

## Sending

`chatFields` builds the fields and `sender.send` seals and posts them. Chat never goes
through the position `outbox`. It has its own FIFO queue: one message at a time, the next
only after the relay accepted the previous one. Retries wait 4 s, 15 s and 60 s and give
up after 6 tries; the message is then marked failed with a retry button. A message still
unsent when the app closed comes back as failed and waits for a tap.

"Sent" means the relay accepted the post (a 2xx answer). It says nothing about anyone
having read it.

## Storage

One log per circle, keyed by this device's member id, holding messages, gaps and local
place lines (arrivals and departures this phone noticed; never sent). It is written
through `atRestForm`: sealed under the vault key when the app lock is on, plain otherwise,
with the plain copy swept on load after the lock is turned on. Entries older than 30 days
are purged, with a hard cap of 3000 entries per circle. Panic wipe, the duress code, clear
data, leaving a circle and a destroyed circle all remove it.

The relay keeps a post for at most 24 hours, and only while it is among the sender's 240
newest posts. A phone offline for longer than its key history window cannot decrypt it at
all. Both losses show up as gaps. The chat screen states the 24 hours in one line.

## Notifications

Android posts chat on its own channel, `events_chat` ("Messages"). By default a notice
says only "New message": no name, no text, in both the private and the public version,
because Android shows the private version on a secure lock screen whenever "show all
notification content" is on, which is its default. The sender's name goes in only after the
person turns on `chatOnLock` ("Show who wrote in notifications"), and the text only when
`chatPreview` is on as well; both then show on the lock screen too. The page (`chatNotice`)
and the wrapper (`Events.postDetail`) each enforce this, and
`tools/check-notification-privacy.sh` checks both. On iOS and on the web a notice
appears only while the app is open, and the chat screen says so.

## Compatibility

Clients that predate the `chat` type may treat it as an unknown kind. The family runs only
our own builds; a capability field in `loc` is planned but not implemented.
