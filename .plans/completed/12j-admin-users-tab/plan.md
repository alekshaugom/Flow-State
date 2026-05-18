---
slice: 12j-admin-users-tab
status: done
value: 7
confidence: 9
effort: M
depends_on: [12d-email-auth, 12h-admin-invite-user-ui, 12i-account-activation]
unlocks: []
opened: 2026-05-18
closed: 2026-05-18
---

# Slice 12j — Merged "Users" admin tab + first/last-name invite + user deletion

## Goal

Collapse the separate **Waitlist** and **Auth** tabs into a single **Users** tab that handles the full lifecycle: invite new users, promote waitlist signups to approved, manage credentials, mint login links, and delete users along with their data. Simplify the invite form to email + first name + last name only (no password) and always return a one-time login link the admin can copy and send. With slice 12i shipped, the invited user sets their own password after clicking the link, so admin-side password entry is no longer needed.

## Acceptance criteria

1. **One Users tab.** `/admin` shows `Data | Users` (no more `Waitlist` or `Auth`).
2. **Unified user list.** Table shows every `WaitlistUser` regardless of status with a single status pill. Search filters by name or email.
3. **Per-row actions by status:**
   - `waitlist` → **Approve** / **Deny**
   - `approved` → **Manage credentials** (expandable: set password, generate login link, revoke active tokens) + **Delete**
   - `denied` → **Approve** (re-instate)
4. **Invite form** (top of tab, collapsed by default): email + first name + last name. No password. No "generate link" toggle. On submit:
   - Creates the user with `status: 'approved'`, `provider: 'email'`, name derived as `"{firstName} {lastName}".trim()`.
   - Always mints a one-time login link (24h, single-use).
   - The confirmation card shows the link in a copyable block with a **Copy link** button (with success state) and an **Invite another** action.
5. **Hard delete user.** Approved users have a **Delete** button (red, confirm prompt). On confirm, the backend removes the user **and all of their data**:
   - `WaitlistUser` (the row itself)
   - `UserCredential`
   - All `OneTimeLoginToken` rows where `userId === target`
   - `UserProfile`
   - All `UserCraft` rows where `userId === target`
   - All `RiverLog` rows where `userId === target`
   - Returns a deletion summary (counts per table) for the admin's confirmation toast.
6. **Schema.** Additive only — `firstName: String` and `lastName: String` added to `WaitlistUser`. Existing rows with only `name` continue to work; the table renders `name` if `firstName`/`lastName` aren't set.
7. **No regressions.** Existing approve/deny actions still work. Existing per-user credential controls (set password, login link generation, revoke) still work. Profile/Log dashboards still gate on `isAuthenticated && isApproved` for the current user.
8. **Tests cover** the pure invite-input changes (first/last → name) and the pure summary builder for the delete-user action.

## Schema additions

### `schemas/auth.graphql`

```graphql
type WaitlistUser @table @export {
  id: ID @primaryKey
  email: String @indexed
  name: String           # existing — still authoritative for display
  firstName: String      # new (nullable)
  lastName: String       # new (nullable)
  avatarUrl: String
  provider: String
  status: String @indexed
  createdAt: String @indexed
  grantedAt: String
  grantedBy: String
  lastLoginAt: String
}
```

## Files to create

- `lib/auth/user-name-pure.ts` — `joinFirstLast(firstName, lastName)` + `splitName(fullName)` helpers. Pure, no Harper.
- `test/auth-user-name-pure.test.ts` — coverage for both directions.
- `app/src/admin/AdminUsersPanel.tsx` — the new unified panel. Replaces both `WaitlistPanel` and `AdminUserCredentialPanel`. Reuses the per-user credential collapse logic from `AdminUserCredentialPanel`.

## Files to modify

- `schemas/auth.graphql` — add `firstName` + `lastName`.
- `lib/auth/invite-pure.ts` — extend `InviteInput` and `NormalizedInvite` to include `firstName` + `lastName`. `validateInviteInput` accepts both as required strings (each ≤ 80 chars), derives `name = "{firstName} {lastName}".trim()` for display. **Removes** `password` from input (no longer accepted from this surface — clients that still send it get a 400).
- `resources/AdminAuth.ts`:
  - `invite-user` action: accept the new shape, drop password, **always** mint a login link (no `generateLink` flag).
  - New `delete-user` action: scoped purge across `WaitlistUser`/`UserCredential`/`OneTimeLoginToken`/`UserProfile`/`UserCraft`/`RiverLog`. Returns `{ ok, deleted: { user, credential, tokens, profile, crafts, logs } }`.
- `app/src/types.ts`:
  - `AdminInviteUserInput`: replace `name` with `firstName` + `lastName`; remove `password` + `generateLink`.
  - `AdminInviteUserResult`: `link` becomes non-nullable (always present); drop `passwordSet`.
  - New `AdminDeleteUserResult` with the deletion counts.
- `app/src/api.ts`:
  - Update `adminInviteUser` signature to the new input shape.
  - Add `adminDeleteUser(userId)`.
- `app/src/admin/AdminPage.tsx`:
  - Replace tab list `('data', 'waitlist', 'auth')` with `('data', 'users')`.
  - Render `<AdminUsersPanel />` for the users tab.
  - Drop the no-longer-used `WaitlistPanel` and `AdminUserCredentialPanel` imports.
- Delete `app/src/admin/WaitlistPanel.tsx` and `app/src/admin/AdminUserCredentialPanel.tsx` once the merged panel is in place (their functionality moves into `AdminUsersPanel`).

## Out of scope

- Editing user fields (firstName/lastName/email) post-invite — defer until requested. Admin can delete + re-invite.
- Bulk actions (multi-select approve/delete).
- Audit log of admin actions beyond the existing `setBy` / `grantedBy` fields.
- Restoring a deleted user (delete is permanent; this is intentional).
- Soft-delete with a "deleted users" tab — explicit "hard delete with data wipe" was the ask.
- Surfacing deletion in any frontend other than the admin tab.

## Risks / edge cases

- **Cascade ordering.** Delete dependent rows before the WaitlistUser row so that if a downstream delete fails partway, the user still appears in the admin UI for retry. The resource returns the deletion summary so the admin sees what cleared and what didn't.
- **Self-delete.** Admin can technically delete their own row. Don't bother forbidding — it logs them out cleanly. Document in the confirm prompt.
- **OneTimeLoginToken purge.** Active tokens for a deleted user become orphaned but the consume endpoint already checks `WaitlistUser.get(userId)` and returns 410 "Invalid login link" when the user is gone. We delete them anyway for hygiene.
- **Concurrent invite for the same email.** The existing `findUserByEmail` guard in `invite-user` continues to apply. Returns 409 with `existingUserId`.
- **Existing rows missing firstName/lastName.** Display falls back to `name`. The unified table shows `firstName + lastName` when available, otherwise `name`.
- **L004/L005.** No new resources or schema classes; existing static-import + `*Resource` patterns continue.

## Verification

1. `npm test` — green including the new pure-helper tests.
2. `/admin` shows two tabs (`Data | Users`), no longer `Waitlist` or `Auth`.
3. Click `+ Invite user`, fill email + first + last, submit → confirmation card with the login link + Copy button.
4. Paste the link in incognito → user lands on `/login/setup` (12i flow) → sets password → home.
5. Back at `/admin → Users` → search by part of the email → the user appears with the right status pill and credential controls.
6. Use the Manage credentials expander to mint a fresh login link → confirm the URL is copyable.
7. Click **Delete** on the user → confirm prompt → deletion succeeds → user no longer visible in the table. Confirm deletion of underlying data by calling `/RiverLog/?userId=…`, `/UserProfile/{id}`, etc. and seeing empties.
8. A waitlist user (created via OAuth onboarding or `POST /WaitlistUser/`) shows Approve/Deny in the row.
9. After approve, the row's actions switch to Manage credentials + Delete.
10. Mobile 320px — the unified table renders cleanly; per-row actions wrap to a second line if needed.

## Critical references

- 12d/12h/12i shipped state: [completed/12d-email-auth/](../../completed/12d-email-auth/), [completed/12h-admin-invite-user-ui/](../../completed/12h-admin-invite-user-ui/), [completed/12i-account-activation/](../../completed/12i-account-activation/)
- Existing waitlist UI to fold in: [app/src/admin/WaitlistPanel.tsx](../../../app/src/admin/WaitlistPanel.tsx)
- Existing credentials UI to fold in: [app/src/admin/AdminUserCredentialPanel.tsx](../../../app/src/admin/AdminUserCredentialPanel.tsx)
- Existing invite endpoint to extend: [resources/AdminAuth.ts](../../../resources/AdminAuth.ts) — `inviteUser`
- Credential helper: [lib/auth/credential.ts](../../../lib/auth/credential.ts)
- Tables that hold per-user data (delete scope): `WaitlistUser`, `UserCredential`, `OneTimeLoginToken`, `UserProfile`, `UserCraft`, `RiverLog`
