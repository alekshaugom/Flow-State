---
slice: 28-sponsor-admin-governance-console
status: queued
value: 7
confidence: 5
effort: L
depends_on: [22-bounty-system, 23-payments-marketplace, 24-trust-reputation-governance]
unlocks: []
opened: 2026-06-02
closed: null
---

# Slice 28 — Sponsor, admin, and governance console (intent)

## What success looks like

A river conservation org logs into Flow-State as a sponsor. From their dashboard they see all the bounties they have posted, which are funded, which are in review, which have paid out, and what the total spend has been this month. They can post a new bounty from the dashboard without touching the public-facing section page. They can see the contributor who completed their last bounty and leave a rating.

An admin logs into the governance console and sees: the moderation queue (flags, pending contributions), pending contributor KYC for payouts, the platform fee ledger, a user management table (all users, their trust tiers, their ban status), and tools to impersonate a user for support purposes (read-only audit mode). They can act on any item from one surface.

The old `10-admin-editorial-ui` slice — which was scoped to LLM summaries and FlowBand editing — is absorbed here into a broader, role-differentiated console.

## What's NOT it

- Not a public marketing site for sponsors — this is a logged-in dashboard, not a landing page.
- Not a full CRM for managing sponsor relationships — just the in-product controls a sponsor needs.
- Not an analytics product for sponsors (impressions, conversion rates) — the v1 dashboard is operational, not analytical.
- Not an automated billing or invoicing system beyond what Stripe Connect provides — let Stripe handle receipts.
- Not a community forum or discussion surface for sponsors — out of scope.
- Not a content management system for section descriptions or LLM summaries specifically — those admin tools remain in the existing admin page, absorbed by this console.

## Why this is intent-only

The console's shape is entirely determined by what exists upstream:

- The **sponsor dashboard** cannot be designed until the bounty system (22) and payments (23) have shipped — the controls it exposes are the controls those systems need.
- The **moderation console** cannot be designed until the trust/reputation model (24) has shipped and we know what a moderation queue actually contains.
- The **admin user management** builds on the identity model (20), which is still being planned.

Absorbs `10-admin-editorial-ui`: the FlowBand editor, LLM summary review, and ContextItem moderation tools from that slice are simply tabs in this larger console rather than a separate slice.

## Loose sketch (do not lock in)

### Role-differentiated console areas

The console serves three distinct roles from slice 20:

**Sponsor / funder view:**
- Bounty portfolio — list of all posted bounties with lifecycle status.
- Post new bounty — shortcut form attached to any section or entity.
- Payment history — charges, holds, payouts, refunds via slice 23 ledger.
- Contributor ratings — lightweight feedback on completed bounties (single 1–5 scale; no public display v1).

**Admin view (superset):**
- All sponsor views, plus:
- Moderation queue — flags + pending contributions from slice 24.
- User management — all users, trust tiers, ban/unban, impersonate (read-only audit).
- Platform ledger — aggregate payment stats, fee income, refund rate.
- Role assignment — promote a user to `trusted` or `moderator` tier.
- KYC queue — contributors pending Stripe Connect KYC review.
- Content tools — FlowBand editor (from old slice 10), LLM summary review, ContextItem moderation (from old slice 10).

### Schema

No new top-level tables. The console is a read/write surface over data owned by slices 22, 23, 24 — it does not introduce its own data model. Possible additions:

- `BountyRating` — sponsor's post-completion rating of a contributor. `bountyId`, `ratingUserId`, `score: 1-5`, `createdAt`. Feeds into the reputation model from slice 24.
- `AdminAuditLog` — immutable log of admin actions taken via the console (complement to `ModerationEvent` from slice 24). `adminId`, `action`, `targetType`, `targetId`, `timestamp`, `notes`.

### Routes

- `/sponsor/dashboard` — sponsor home.
- `/sponsor/bounties` — bounty portfolio.
- `/sponsor/payments` — payment ledger.
- `/admin` — admin console (existing route, extended with new tabs).
- `/admin/moderation` — moderation queue.
- `/admin/users` — user management.
- `/admin/ledger` — platform fee ledger.

### Resources

- Extend existing `AdminAuthResource` — add role-gated console sections.
- `resources/SponsorDashboardView.ts` — aggregate resource for sponsor home (bounties + payment summary).
- `resources/AdminConsoleView.ts` — aggregate resource for admin home (moderation queue size + flag counts + KYC queue size).

### Frontend

- `app/src/pages/SponsorDashboardPage.tsx` — sponsor home.
- `app/src/pages/AdminConsolePage.tsx` — extend existing `AdminPage.tsx` with new tabs.
- `app/src/components/BountyPortfolioTable.tsx` — tabular bounty management.
- `app/src/components/ModerationQueuePanel.tsx` — moderation worklist (may be shared with slice 24).
- `app/src/components/UserManagementPanel.tsx` — admin user table with trust-tier controls.

## Open questions for when this becomes active

- **Sponsor self-serve vs admin-assisted.** Can a new sponsor post their first bounty without admin approval? Or does the first bounty require an admin to unlock the account? Recommend: admin unlock for the first $X of funding (anti-fraud); self-serve after that.
- **Sponsor notifications.** Email notifications when a bounty is claimed or submitted? Yes — these are operational events sponsors need to know about. Wire up via slice 23's webhook flow.
- **Contributor ratings.** Should contributor ratings from sponsors be visible to other sponsors? Probably yes (transparent marketplace) but not to the rated contributor themselves (to avoid gaming). Decide at activation.
- **Admin impersonation.** Read-only impersonation for support is a useful tool but a significant security surface. Scope precisely: read-only session, logged audit entry, time-limited. Never allow write impersonation.
- **Multi-admin teams.** Can a sponsor org have multiple admin accounts? Probably yes — the identity model (slice 20) should support org-level accounts with multiple members. Design this in slice 20, not here.

## References that will matter when active

- `.plans/slices/10-admin-editorial-ui/intent.md` — the predecessor slice this absorbs; review its content tools.
- `.plans/slices/22-bounty-system/intent.md` — the bounty portfolio controls.
- `.plans/slices/23-payments-marketplace/intent.md` — the payment ledger and KYC queue.
- `.plans/slices/24-trust-reputation-governance/intent.md` — the moderation queue and trust tier management.
- `.plans/slices/20-identity-roles-capabilities/` — the funder and admin role definitions that gate console access.
- `app/src/pages/AdminPage.tsx` — the existing admin page this console extends.
- `.plans/vision/contribution-economy.md` — the governance thesis: the console is how platform operators maintain quality without bottlenecking contributions.
