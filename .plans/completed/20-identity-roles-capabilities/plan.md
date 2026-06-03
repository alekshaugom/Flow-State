---
slice: 20-identity-roles-capabilities
status: done
value: 9
confidence: 8
effort: M
depends_on: []
unlocks: [21-contribution-content-model, 22-bounty-system, 23-payments-marketplace, 24-trust-reputation-governance, 28-sponsor-admin-governance-console]
opened: 2026-06-02
closed: 2026-06-02
---

# Slice 20 — Identity, roles, and capabilities

## Context

Flow-State currently has a binary access model: a `WaitlistUser` record has `status: String` (`waitlist | approved | denied`), and the admin gating in `AdminAuth.ts` and `AdminWaitlist.ts` checks `status === 'approved'` — nothing more. There is no concept of roles, and there is no capability set exposed to the frontend. `Me.ts` returns only `{ user, authenticated }` with the raw `status` field. `useAuth.tsx` derives `isApproved` from `user.status === 'approved'` and `isWaitlisted` from `user.status === 'waitlist'` — two boolean flags with no extensible model.

The contribution economy (slices 21–28) needs a stable capability system: can a user fund a bounty? Claim one? See admin tools? The current binary model can't express this. We need to extend the existing auth rather than replace it — adding a `role` field to the existing `WaitlistUser` schema and computing a capability set from that role plus placeholder billing/payout flags.

Key files verified before writing this plan:

- `schemas/auth.graphql` — the `WaitlistUser` type (note: NOT `schemas/WaitlistUser.graphql`; that file does not exist). Current fields: `id`, `email`, `name`, `firstName`, `lastName`, `avatarUrl`, `provider`, `status`, `createdAt`, `grantedAt`, `grantedBy`, `lastLoginAt`. No `role` field yet.
- `resources/AdminAuth.ts` — handles credential management, invite, delete-user, login-link actions. Auth gating via `isApprovedUser()` which checks `record.status !== 'approved'`. No role concepts. Role grant/revoke should be added here as a new `action` branch.
- `resources/AdminWaitlist.ts` — handles approve/deny/revoke of `status`. This file should also expose a `grant-role` / `revoke-role` action so admin UI can assign roles.
- `resources/Me.ts` — returns `{ authenticated, user }` where `user` has `id, email, name, firstName, lastName, avatarUrl, status, createdAt`. No capabilities. Extend to return `{ authenticated, user, capabilities }`.
- `lib/utils.ts` — contains `getFlowStatus()` (river flow helper), `compositeId()`, date helpers, and fetch helpers. No auth utilities. The capability resolver should NOT go here; it should follow the existing `lib/auth/*-pure.ts` pattern.
- `app/src/hooks/useAuth.tsx` — `AuthState` interface has `isApproved`, `isWaitlisted`, `isDev`. Derived from `user.status`. Needs new `capabilities` field plus a `<RequireCapability>` gate component.
- `app/src/admin/AdminUsersPanel.tsx` — renders approve/deny/revoke + credential controls. Needs a "Grant admin" / "Revoke admin" action surfaced here for `approved` users.

## Goal

Replace the binary `approved`/admin model with a CAPABILITY model that the whole contribution economy can gate on — extending existing auth rather than replacing it. Scope is data-model + API + frontend plumbing for the five user groups AS CAPABILITIES. NO bounty/payment logic (those are epics 22/23).

The five user groups (capabilities, not exclusive tiers — one member can hold several):

| Group | Required | Can |
|---|---|---|
| **Public visitor** | no account | read public content |
| **Member** | account + `status: approved` | read + own private logs/crafts |
| **Funder/sponsor** | member + billing on file | fund bounties (stub until slice 23) |
| **Contributor** | member + payout account | claim bounties + get paid (stub until slice 23) |
| **Admin** | member + `role: admin` or `role: superadmin` | manage payments, advertise bounties, grant roles, add admins, moderate |

## Acceptance criteria

1. **Existing approved/admin behavior unchanged.** All existing auth flows (invite, login, approve, deny, revoke, credential management) continue to work without modification to their logic. No existing user data is corrupted.
2. **Existing seeded users default to `role: member`.** When `role` is absent on a `WaitlistUser` record, the capability resolver treats it as `member`. No migration script required — handled by the resolver's fallback.
3. **`Me` returns a stable capability set.** `GET /Me` response includes `{ authenticated, user, capabilities }` where `capabilities` is `{ isMember, isAdmin, canContribute, canFund, canReceivePayout }`. The `canFund` and `canReceivePayout` flags are `false` stubs until slices 22/23 add billing/payout account fields.
4. **Admin can grant and revoke `admin` role.** A new `action: 'grant-role'` / `action: 'revoke-role'` in `AdminAuth.ts` (or `AdminWaitlist.ts`) lets an admin set `role: admin` or reset it to `role: member` on any user. Only an admin can do this.
5. **Capability resolver is pure and unit-tested.** `lib/auth/capabilities-pure.ts` exports `resolveCapabilities(user)` as a pure function that takes a `WaitlistUser`-shaped object and returns the capability set. It has no side effects and no imports from Harper. Tested in `test/auth-capabilities-pure.test.ts`.
6. **Frontend exposes capabilities.** `useAuth()` returns a `capabilities` field derived from the `/Me` response. `AuthState` interface gains `capabilities: UserCapabilities | null`.
7. **`<RequireCapability>` gate component exists.** `app/src/components/RequireCapability.tsx` accepts a `capability: keyof UserCapabilities` prop and renders its children only when the current user has that capability, otherwise renders a fallback (default: `null`). Used in at least one real call site (the admin nav entry).
8. **Admin role UI in `AdminUsersPanel.tsx`.** For `approved` users, a "Grant admin" button appears (and "Revoke admin" if already admin). Calls the new `grant-role` / `revoke-role` action via a new `api.adminGrantRole` / `api.adminRevokeRole` helper.
9. **`npm test` green.** All existing tests pass. New tests in `test/auth-capabilities-pure.test.ts` pass.
10. **Build clean.** `npm run ui:build` completes with no TypeScript errors.

## Approach

### 1. Schema: add `role` to `WaitlistUser` in `schemas/auth.graphql`

Add one field:

```graphql
role: String @indexed
```

No other schema changes. Capabilities (`canFund`, `canReceivePayout`) are derived, not stored — the billing/payout flags that will drive them are stubs here and will be added as stored fields in slices 22/23.

Valid role values: `member` (default / null-coalesced), `admin`, `superadmin`.

### 2. New file: `lib/auth/capabilities-pure.ts`

A single pure function, no Harper imports, no side effects. Mirrors the style of `lib/auth/password-pure.ts` and `lib/auth/token-pure.ts`.

```ts
export interface UserCapabilities {
  isMember: boolean;
  isAdmin: boolean;
  canContribute: boolean;  // stub: false until slice 22
  canFund: boolean;        // stub: false until slice 23
  canReceivePayout: boolean; // stub: false until slice 23
}

export function resolveCapabilities(user: {
  status?: string | null;
  role?: string | null;
}): UserCapabilities {
  const approved = user.status === 'approved';
  const role = user.role ?? 'member';
  const isAdmin = approved && (role === 'admin' || role === 'superadmin');
  return {
    isMember: approved,
    isAdmin,
    canContribute: false,  // slice 22
    canFund: false,         // slice 23
    canReceivePayout: false, // slice 23
  };
}
```

### 3. Extend `resources/Me.ts`

Import `resolveCapabilities`. In `get()`, after fetching the `WaitlistUser` record, call `resolveCapabilities(record)` and include the result:

```ts
return {
  authenticated: true,
  user: { ...existing fields... },
  capabilities: resolveCapabilities(record),
};
```

### 4. New action in `resources/AdminAuth.ts`: `grant-role` / `revoke-role`

Inside the existing `post(data)` action dispatch, add a new branch:

```ts
if (action === 'grant-role') {
  const role = data?.role;
  if (!['admin', 'superadmin', 'member'].includes(role)) return new Response('Invalid role', { status: 400 });
  await tables.WaitlistUser.patch(targetUserId, { role });
  return { ok: true, userId: targetUserId, role };
}

if (action === 'revoke-role') {
  await tables.WaitlistUser.patch(targetUserId, { role: 'member' });
  return { ok: true, userId: targetUserId, role: 'member' };
}
```

Note: `isApprovedUser()` in `AdminAuth.ts` already gates the whole `post()` method, so no additional auth check is needed inside the branch — only an approved user can reach it.

### 5. Extend `app/src/hooks/useAuth.tsx`

Add `UserCapabilities` interface (mirror the pure type) and extend `AuthState`:

```ts
interface AuthState {
  // ...existing fields...
  capabilities: UserCapabilities | null;
}
```

Derive `capabilities` from `data?.capabilities ?? null` (for the real user path) or a full-admin set for `devActive`. Update the `Me` response type in `api.ts` (or wherever the `/Me` fetch return type is declared).

### 6. New component: `app/src/components/RequireCapability.tsx`

```tsx
import { useAuth } from '../hooks/useAuth';
import type { UserCapabilities } from '../hooks/useAuth';

interface RequireCapabilityProps {
  capability: keyof UserCapabilities;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function RequireCapability({ capability, fallback = null, children }: RequireCapabilityProps) {
  const { capabilities } = useAuth();
  if (!capabilities?.[capability]) return <>{fallback}</>;
  return <>{children}</>;
}
```

Apply it to at least the admin navigation entry in the sidebar/shell to gate admin-only routes.

### 7. Admin UI in `app/src/admin/AdminUsersPanel.tsx`

In the `approved` user row actions, alongside the existing "Manage credentials" and "Delete" buttons, add:

- If `u.role !== 'admin' && u.role !== 'superadmin'`: show "Grant admin" button → calls `api.adminGrantRole(u.id, 'admin')`
- If `u.role === 'admin'`: show "Revoke admin" button → calls `api.adminRevokeRole(u.id)`
- `superadmin` role is not grantable from this UI (set directly or by a future super-admin panel)

Add `api.adminGrantRole(userId, role)` and `api.adminRevokeRole(userId)` to `app/src/api.ts` (or wherever the API client lives — check `api.ts` in `app/src/`).

### 8. Tests: `test/auth-capabilities-pure.test.ts`

Follow the Node test-runner style used throughout `test/` (`import { test } from 'node:test'; import { strict as assert } from 'node:assert';`):

- `resolveCapabilities` with `status: 'approved', role: null` → `isMember: true, isAdmin: false`
- `resolveCapabilities` with `status: 'approved', role: 'member'` → `isMember: true, isAdmin: false`
- `resolveCapabilities` with `status: 'approved', role: 'admin'` → `isMember: true, isAdmin: true`
- `resolveCapabilities` with `status: 'approved', role: 'superadmin'` → `isAdmin: true`
- `resolveCapabilities` with `status: 'waitlist', role: 'admin'` → `isMember: false, isAdmin: false` (role alone doesn't grant; must be approved)
- `resolveCapabilities` with `status: 'denied', role: 'admin'` → `isMember: false, isAdmin: false`
- All three stub fields (`canContribute`, `canFund`, `canReceivePayout`) are `false` regardless of role/status

## Critical files

**Schema:**
- `schemas/auth.graphql` — add `role: String @indexed` to `WaitlistUser`

**New:**
- `lib/auth/capabilities-pure.ts` — pure `resolveCapabilities()` helper
- `test/auth-capabilities-pure.test.ts` — unit tests for the above
- `app/src/components/RequireCapability.tsx` — frontend capability gate

**Modified:**
- `resources/Me.ts` — return `capabilities` in the response
- `resources/AdminAuth.ts` — add `grant-role` / `revoke-role` action branches
- `app/src/hooks/useAuth.tsx` — add `capabilities` to `AuthState`, derive from `/Me` response
- `app/src/admin/AdminUsersPanel.tsx` — add grant/revoke admin buttons for `approved` users
- `app/src/api.ts` (or equivalent) — add `adminGrantRole` / `adminRevokeRole` API client methods

## Verification

1. **Tests.** `npm test` — new `auth-capabilities-pure` suite passes; all existing auth suites (`auth-invite-pure`, `auth-token-pure`, `auth-password-rules`, `auth-activation-pure`, etc.) still green.
2. **Build.** `npm run ui:build` clean; no TypeScript errors.
3. **Dev server.** `npm run dev` (port 9926) + `npm run ui:dev` (port 5173).
4. **`/Me` returns capabilities.** `curl http://localhost:9926/Me` while logged in as an approved user → response includes `"capabilities": { "isMember": true, "isAdmin": false, "canContribute": false, "canFund": false, "canReceivePayout": false }`.
5. **Admin grant flow in the UI.** Log in as an approved user; navigate to the admin users panel; find another approved user; click "Grant admin"; verify their row updates and a "Revoke admin" button appears. Revoke it; verify it returns to "Grant admin".
6. **Seeded users still load.** All existing seeded users (who have no `role` field) appear in the admin panel with `isMember: true, isAdmin: false` — no errors or missing data.
7. **`<RequireCapability>` gate.** Confirm that a non-admin user does not see the admin nav entry (or whichever affordance is gated) by logging in as a plain member and checking the UI.

## Open questions to resolve during work

1. **Where is the API client?** The description says `app/src/api.ts` — verify this file exists and how it exports methods (e.g. whether it's a plain object or a class) before adding `adminGrantRole` / `adminRevokeRole`. If the file is large, add the new methods near the existing admin action methods.
2. **Dev bypass capabilities.** `DEV_USER` in `useAuth.tsx` has `status: 'approved'`. Decide whether the dev bypass synthesizes full capabilities locally or fetches from `/Me`. Simplest: synthesize `resolveCapabilities(DEV_USER)` in the hook using the pure function, avoiding a fetch.
3. **`superadmin` promotion.** The UI deliberately omits granting `superadmin` from `AdminUsersPanel`. Confirm with the user whether seed data should pre-populate a `superadmin` user, or whether `superadmin` is out of scope for this slice entirely.
4. **`AdminWaitlist.ts` vs `AdminAuth.ts` for role grant.** The approve/deny/revoke of `status` lives in `AdminWaitlist.ts`, but role grant/revoke is a different concept. Adding it to `AdminAuth.ts` keeps concerns separated (credentials + role in one place, waitlist gating in another). Confirm this split is intentional before implementing.

## Slice paperwork

- This file (`20-identity-roles-capabilities/plan.md`) — created 2026-06-02
- `20-identity-roles-capabilities/status.md` — to be created when slice goes active
- No ROADMAP.md changes in this phase — slice is `queued`, not `active`
