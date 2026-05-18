---
slice: 12c-river-log-sharing
status: queued
value: 7
confidence: 6
effort: M
depends_on: [12-river-log-core, 12b-river-log-watershed-browse]
unlocks: []
opened: 2026-05-17
closed: null
---

# Slice 12c — River log: invite-only sharing (intent)

## What success looks like

A user can mark a specific log as shareable, generate a single-use invite link that expires in 7 days, and send it out-of-band (text/email) to a friend who is also an approved waitlist user. The friend clicks, accepts, and the log appears on their `/logs/shared-with-me` page filed under the original user's name with a `// SHARED BY <user>` eyebrow.

The author can revoke at any time, after which the log instantly disappears from the friend's view.

A user can also graduate a one-off share into a standing **friendship** — both parties consent — at which point all logs marked `visibility: "friends"` become visible across the friendship. Friendships are bidirectional and explicit; never inferred from share history.

The **system invariant**, enforced at the schema and resource layer, is that **no `"public"` visibility value ever exists**. A log is visible only to its author, to people the author has explicitly granted access to per-log, or to consented friends.

## What's NOT it

- Not public profiles or discoverability.
- Not search by user.
- Not comments, likes, reactions, ratings.
- Not a friend feed or activity stream.
- Not group co-authorship — always one author per log.
- Not "friends of friends" — transitive trust doesn't exist.
- Never a `"public"` visibility value in the schema or in any API surface.
- Not in-app messaging — sharing is a link you paste, no DM primitive.

## Why this is intent-only (not a plan yet)

Privacy primitives are easy to get wrong. By the time this slice promotes to active, slice 12 + 12b will be shipped and the user will have lived with private logs for weeks. That experience will inform the friction tolerance, invite UX, revocation semantics, and what "friend" actually means in practice. Don't lock the design in now.

## Loose sketch (do not lock in)

### Schema additions

- `Friendship` table — bidirectional consenting pair (`userAId`, `userBId`, `status: pending|accepted|revoked`, `requestedAt`, `acceptedAt`). Stored canonically (lowest userId first) to dedupe.
- `LogShare` table — invite token table. Fields: id (token), logId, createdBy, expiresAt, acceptedBy, acceptedAt, revokedAt. Decide single-use vs reusable at activation time.
- Extended `visibility` enum on `RiverLog`: `"private"` | `"shared"` (per-log token-granted) | `"friends"` (visible to friend set).

### Routes

- `/logs/shared-with-me` — list of logs others have shared with you.
- `/share/:token` — invite acceptance page.
- `/friends` — manage friendships (pending invites, active friends, revoked).
- Per-log "Share" button → generates token → copy-to-clipboard shareable link.

### Resources

- `resources/LogShare.ts` — token CRUD with privacy enforcement.
- `resources/Friendship.ts` — invite/accept/revoke.
- Modify slice 12's `resources/RiverLog.ts` — extend ownership check to also allow read access to: (a) friends if `log.visibility === "friends"`, (b) accepted LogShare recipients.

## Open questions for when this becomes active

- Out-of-band invite delivery: do we send the email/SMS, or just show the user a copy-link they paste themselves? (Recommend latter for first ship — no infrastructure needed.)
- Single-use vs reusable invite tokens — single-use is safer, but adds friction when the recipient loses the link.
- What happens when an author revokes after a friend has read+screenshotted? (Nothing we can do; revocation is forward-only.)
- Should profile (background, skill, prior-trip-count) be visible to friends only, or to anyone who has any log shared with them? (Likely friends-only.)
- What happens to friendships when one party is reverted from approved to waitlist? (Auto-pause; logs invisible until restored.)
- Surfaces for the friend's logs on a section page where I have logs too: do I see them next to mine? (Probably yes — under a `// FRIEND TRIPS` eyebrow, clearly separated.)

## Privacy invariant (must hold)

At no point can a log be visible to a user the author has not explicitly granted access to (via a per-log token OR via friendship). No `"public"` value ever exists in the schema as a permitted write. This is the boundary that distinguishes Flow-State from any social platform. Enforce in:

- Schema constraint or validator on `visibility`
- Resource-layer guard in `RiverLog.ts` (`GET`, `POST`, `PATCH` all reject `"public"`)
- Sharing surfaces never expose discovery — no `/users`, no `/feed`, no `/explore`

## References that will matter when active

- RiverLog schema from slice 12 — extend `visibility` column allowed values
- MyLogs aggregate resource from slice 12b — extend to include friends' logs in `/logs/shared-with-me`
- [vision/product-vision.md](../../vision/product-vision.md) — "Bounded social" line (amended in slice 12)
- WaitlistUser status gating — sharing is scoped to approved users only
