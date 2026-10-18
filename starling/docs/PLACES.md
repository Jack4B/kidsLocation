# Places

A place is a named circle on the map (Home, School) with a radius of 100, 250 or
500 m. Every phone tracks arrivals and departures on its own, from the positions
it already decrypts. Code: `app/js/places.js`.

## Private and shared

- A private place lives only on the phone that made it. Places made before shared
  places existed stay private after the update; nothing is sent until someone turns
  on "Share with the circle".
- A new place is shared by default. A shared place reaches everyone in the circle.
  Anyone in the circle can rename it, change its radius or remove it.
- Fence and alert choices are local: each phone decides for itself, and they never
  travel.

## Wire format

A shared place travels in the member's own stream, sealed, padded and signed
like a position or a chat message. The relay cannot tell it apart by type or size.
After the sender's `v` and `ts`:

    { t: "place", op: "set", id, w, n, la, lo, r }
    { t: "place", op: "del", id, w }

- `id`: 8 hex characters, random.
- `w`: time of the write, in milliseconds. A local change always uses a `w` above
  the one it replaces.
- `n`: name, at most 24 characters. `la`, `lo`: rounded to 5 decimal places.
  `r`: one of 100, 250, 500.

The longest message fits the 512-byte pad with the usual 24-byte reserve
(`test/places-shared.test.mjs`).

## Receive rules

- The newest write wins, ordered by `(w, writer)`. A tie on `w` goes to the larger
  member id, so every phone reaches the same list whatever the order of arrival.
- A removal leaves a tombstone for 7 days, so an older `set` served late cannot
  bring the place back.
- A private place is never changed from outside. A new place beyond the
  10-place cap is ignored on that phone.

## Keeping late phones up to date

The relay keeps a message for 24 hours at most. Every phone re-sends its own
writes (and its own removals) every 6 hours, so a phone that was off longer, or
joined later, catches up within a few hours. A re-send keeps its `w`, so it never
overrides a newer change.

## What this changes in the threat model

A shared place leaves the phone, encrypted end to end for the circle. The relay
learns nothing new: it sees one more padded post. Tombstones are stored on the phone
without encryption at rest, because they hold only an id, a time and a member id.
