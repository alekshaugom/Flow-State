---
slice: 24-trust-reputation-governance
status: active
value: 8
confidence: 5
effort: L
depends_on: [21-contribution-content-model, 22-bounty-system]
unlocks: [28-sponsor-admin-governance-console]
opened: 2026-06-02
closed: null
---

# Slice 24 — Trust, reputation, and governance (intent)

## What success looks like

A first-time contributor submits an access-point record. It enters a moderation queue. A trusted contributor — someone with a history of accepted, accurate contributions — reviews it, marks a few fields as verified, and it publishes. The contributor gains reputation. Over time, that contributor's submissions skip the manual review queue and publish with provisional acceptance. If a bad record slips through, community flags surface it quickly; the moderation queue catches it before it misleads anyone on the water.

No single admin is the bottleneck for all data quality. The system is self-policing at scale, with human admins as a backstop and dispute resolution layer — not a data-entry bottleneck.

## What's NOT it

- Not a star-rating system for contributors. Trust is earned by the quality of accepted contributions, not by votes or follows.
- Not a public leaderboard or gamification layer — reputation is a trust signal, not a competitive ranking.
- Not automatic AI-based content moderation — LLM review is a future enhancement; the v1 system is human-driven.
- Not community forums or comment threads on entity pages — that is a different product direction entirely.
- Not karma-based voting on platform decisions (DAO-style governance) — admins make platform decisions.
- Not a ban-appeal process — keep that simple; admin discretion.

## Why this is intent-only

The right trust model depends on how much contribution volume the bounty system (slice 22) actually generates. A platform with 10 contributors needs different moderation tooling than one with 1,000. Designing moderation queues, trust thresholds, and auto-acceptance rules before seeing real contribution patterns risks building the wrong levers. After slices 21 and 22 have shipped and real contributions are flowing, we will have the data to calibrate this correctly.

## Loose sketch (do not lock in)

### Schema

- `ContributorReputation` — per-user trust state. Fields: `userId`, `acceptedContributions`, `rejectedContributions`, `flagsReceived`, `flagsSubmitted`, `trustTier: new | established | trusted | moderator`, `lastTierChangeAt`, `bannedAt`.
- `ContentFlag` — a community member's report on a contribution or entity. Fields: `flaggedEntityType`, `flaggedEntityId`, `flaggedContributionId`, `reportedBy`, `reason: inaccurate | outdated | harmful | duplicate | spam`, `status: open | reviewed | dismissed | actioned`, `reviewedBy`, `reviewedAt`, `notes`.
- `ModerationEvent` — immutable audit log of every moderation action. Fields: `moderatorId`, `action: accepted | rejected | flagged | auto_accepted | trust_tier_changed | banned`, `entityType`, `entityId`, `timestamp`, `reason`.

### Trust tier logic (rough, do not lock in)

- `new` — first N contributions go to moderation queue regardless.
- `established` — after M accepted contributions with low rejection rate: submissions get provisional acceptance (visible immediately, flaggable by community).
- `trusted` — after extended track record: submissions auto-accept without queue; user gains review capability.
- `moderator` — admin-promoted; can action flags and accept/reject any submission.

Thresholds (N, M, rejection rate) should be tuned empirically once real data exists.

### Routes

- `GET /moderation/queue` — pending contributions for moderator/admin review.
- `POST /ContentFlag/` — any member can flag a contribution or entity.
- `GET /ContentFlag/?status=open` — admin/moderator flag queue.
- `PATCH /ContentFlag/:id/review` — moderator disposition (dismiss / action).
- `GET /ContributorReputation/:userId` — contributor's trust profile (visible to admins).

### Resources

- `resources/ContributorReputation.ts` — read-only for most; write-only via internal events from `Contribution` accept/reject actions.
- `resources/ContentFlag.ts` — flag submission + moderation queue.
- `resources/ModerationEvent.ts` — append-only audit log.
- Internal hook in `resources/Contribution.ts` — on every accept/reject, emit a reputation update event.

### Frontend

- `app/src/pages/ModerationQueuePage.tsx` — moderator worklist with accept/reject/request-changes actions.
- `app/src/components/FlagButton.tsx` — unobtrusive flag affordance on every contribution-powered entity.
- `app/src/components/TrustBadge.tsx` — contributor trust tier indicator (visible on contribution provenance strips).
- `app/src/components/ReputationSummary.tsx` — admin view of a contributor's trust history.

## Open questions for when this becomes active

- **Trust tier thresholds.** These should be data-driven, not guessed. Instrument the moderation queue from day one to measure how many contributions from `new` contributors are accepted vs rejected. Use that to set the `established` threshold.
- **Auto-acceptance risk.** If a `trusted` contributor submits something inaccurate (a river-mile that changed post-flood, an AP that was gated off), the flag system is the backstop. How quickly do flags surface? Need to measure time-to-flag on bad records.
- **Moderator compensation.** Moderation is labor. Should moderators earn bounty-adjacent rewards for review work? This is a strategic question — cheap to defer, important to get right.
- **Banning and appeals.** At what point does a contributor get banned? After N flags actioned against their work? After one egregiously bad record? Admin discretion v1; automate later.
- **Reputation portability.** If we expand to multiple domains (slice 27), does a contributor's river reputation transfer to snow/dam domains? Probably yes — the trust signal is about the person, not the domain.
- **Conflict of interest.** Can an outfitter submit access-point data about their home run? Yes — transparency of attribution is the mitigation; the community can flag obvious self-promotion.

## References that will matter when active

- `.plans/slices/21-contribution-content-model/intent.md` — the `Contribution` entity whose lifecycle this slice scores.
- `.plans/slices/22-bounty-system/intent.md` — bounty submission review is one trigger for reputation updates.
- `.plans/slices/20-identity-roles-capabilities/` — the role model this slice decorates with trust tiers.
- `.plans/vision/contribution-economy.md` — the self-policing thesis: why the community is the moderation layer, not the admin team.
- `.plans/vision/product-vision.md` — quality / trust as the core competitive differentiator vs free-text user reviews.
