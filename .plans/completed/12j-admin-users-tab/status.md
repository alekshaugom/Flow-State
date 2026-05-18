# Status — 12j admin-users-tab

## 2026-05-18
- Promoted from queued → active. Carved off 12c again to ship this admin-UX reshape.

### Phase 1 complete — schema + name helpers + invite-pure refactor
- [schemas/auth.graphql](../../../schemas/auth.graphql): `WaitlistUser` gains nullable `firstName` + `lastName`. Existing rows with only `name` keep working.
- [lib/auth/user-name-pure.ts](../../../lib/auth/user-name-pure.ts): `joinFirstLast(first, last)` + `splitName(full)` + `displayName(user)`. Pure, no Harper.
- [lib/auth/invite-pure.ts](../../../lib/auth/invite-pure.ts) rewritten: `InviteInput` is now `{email, firstName, lastName}`. Each name part required (≤80 chars). Derives `name` via `joinFirstLast`. Removed `password` + `generateLink` from this surface entirely.
- [test/auth-user-name-pure.test.ts](../../../test/auth-user-name-pure.test.ts) — 13 new tests covering join/split/displayName edge cases.
- [test/auth-invite-pure.test.ts](../../../test/auth-invite-pure.test.ts) — rewritten to match the new shape (9 cases).
- `npm test`: **185 / 185 green** (14 new + previously 171).

### Phase 2 complete — backend invite reshape + delete-user
- [resources/AdminAuth.ts](../../../resources/AdminAuth.ts):
  - `invite-user` action now: validates `{email, firstName, lastName}`, dedup-guards by email + slug-collision, writes the user with `provider: 'email'`, `status: 'approved'`, both name parts plus `name = "{firstName} {lastName}"`. **Always** mints a one-time login link at 24h TTL (no toggle). Returns `{ ok, user, link }`.
  - New `delete-user` action: hard purge in dependent-first order. Deletes `UserCredential`, all `OneTimeLoginToken` rows for the user, `UserProfile`, all `UserCraft` rows, all `RiverLog` rows, then the `WaitlistUser` itself. Returns `{ ok, userId, deleted: { user, credential, tokens, profile, crafts, logs } }`. Order means a partial failure leaves the user visible in admin for retry.
- Smoke-tested via curl:
  - `POST {action:'invite-user', email, firstName, lastName}` → 200 with user + link. Confirmed `name` is the joined form, `firstName` + `lastName` present.
  - `POST {action:'delete-user', userId}` → 200 with deletion counts.
  - `GET /WaitlistUser/{id}` after delete → 404.

### Phase 3 complete — frontend types + api
- [app/src/types.ts](../../../app/src/types.ts):
  - `AdminInviteUserInput`: `{email, firstName, lastName}` (no password, no generateLink).
  - `AdminInviteUserResult`: `user` now carries `firstName` + `lastName`; `link` is non-nullable; `passwordSet` dropped.
  - New `AdminDeleteUserResult`.
- [app/src/api.ts](../../../app/src/api.ts): `adminInviteUser` signature updated; new `adminDeleteUser(userId)`.

### Phase 4 complete — AdminUsersPanel
- [app/src/admin/AdminUsersPanel.tsx](../../../app/src/admin/AdminUsersPanel.tsx) (new): unified table that handles everything the old WaitlistPanel + AdminUserCredentialPanel did, plus delete.
  - Summary tiles: `Total users`, `Approved`, `Waitlist`.
  - Top-level `+ Invite user` button → inline form (email + first + last only, no password). On success: confirmation card with the login link prominently surfaced + Copy / Invite another / Done. Helper text: "Send this one-time login link to the user — they'll pick their own password on first click."
  - Search bar narrows by name/email across all statuses.
  - Single user list (no separate tab per status). Per-row actions follow status:
    - `waitlist` → Approve + Deny
    - `approved` → Manage credentials (expandable: set password + generate link + revoke active tokens) + Delete (red, confirm prompt)
    - `denied` → Approve
  - Display: prefers `firstName + lastName`, falls back to `name`. Last-seen ago. Status pill.
  - Delete prompt explicitly warns: "purges their account AND all of their data — logs, profile, saved crafts, credentials, and any active login links. Cannot be undone."
  - On delete success: inline toast lists the counts from the backend response.

### Phase 5 complete — AdminPage tab restructure
- [app/src/admin/AdminPage.tsx](../../../app/src/admin/AdminPage.tsx): tab type narrowed from `'data' | 'waitlist' | 'auth'` to `'data' | 'users'`. Imports `AdminUsersPanel`, drops the old two.
- Deleted `app/src/admin/WaitlistPanel.tsx` and `app/src/admin/AdminUserCredentialPanel.tsx` — their content folded into `AdminUsersPanel`.

### Phase 6 complete — verification
- `npm test`: **185 / 185 green**.
- `npx vite build`: **green** in 141 ms.
- End-to-end browser walkthrough (1280×900):
  - `/admin` shows exactly two tabs: `Data | Users`.
  - Users tab: 3 summary tiles, `+ Invite user`, search bar, list of users.
  - Existing approved user (`Aleks Test`) shows with Manage credentials + Delete.
  - Click `+ Invite user` → form opens with **email + first name + last name only**. No password field, no generate-link checkbox.
  - Filled `flow@example.com / Flow / State Tester` → submit.
  - Confirmation card: `// USER INVITED · Flow State Tester · flow@example.com` + helper text + the actual link in a copyable block + **Copy link** button + Invite another + Done.
  - New user appears in the list below immediately (Total users 1 → 2, Approved 1 → 2).
  - Clicked **Delete** on the new user → confirm → user vanishes, counters revert to 1/1/0, toast at the bottom reads `Deleted user + 0 logs, 0 crafts, 1 tokens, no credential, no profile.` — confirms the active invite-link was purged along with the user.
- Mobile 320×568: all sections render cleanly. Summary tiles, invite button, search, user row controls all wrap legibly.

### Slice 12j closed — 2026-05-18
- Status: **done**. Moved to `.plans/completed/12j-admin-users-tab/`.
- ROADMAP: 12j → done, **12c (river-log-sharing)** restored to active.
- Admin UX is now unified: invite → copy link → delete (with full data purge), all in one tab with one form.
