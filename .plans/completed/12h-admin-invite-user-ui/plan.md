---
slice: 12h-admin-invite-user-ui
status: done
value: 6
confidence: 9
effort: S
depends_on: [12d-email-auth]
unlocks: []
opened: 2026-05-18
closed: 2026-05-18
---

# Slice 12h — Admin: invite a new email user from the UI

## Goal

Close the gap left after 12d: the admin can manage credentials for **existing** approved users, but there's no UI path to **create** a brand-new email-only user. Today the only paths to a new email user are (a) the user signs in via Google OAuth first (which defeats the email-only goal) or (b) admin curls `POST /WaitlistUser/` directly.

This slice adds a small **+ Invite user** form to the `/admin → Auth` tab that lets the admin create an approved user in one click, with the option to set a password and/or generate a one-time login link in the same submission. After invite, the user appears in the existing user list with the "Manage credentials" controls.

## Acceptance criteria

1. **One-step invite.** Admin can submit `email` + `name` (required) and the system creates a `WaitlistUser` with `status: 'approved'`, `provider: 'email'`, and a deterministic, human-readable id.
2. **Optional password.** Admin can supply a password in the same form. On submit, the user is created and `UserCredential` is written — login works immediately.
3. **Optional one-time link.** Admin can toggle "Generate login link instead" and the form mints a `OneTimeLoginToken` and returns the URL for copy.
4. **Both at once.** Admin can submit "set password AND generate link" if they want — either is independently optional.
5. **Duplicate guard.** If a `WaitlistUser` already exists with the supplied email (case-insensitive), return 409 with a clear error and **do not** overwrite the existing row or its credential.
6. **Validation.** Email is normalized via `normalizeEmail` (server-side); blank/malformed → 400. Name required non-empty. Password (when supplied) follows existing `validatePasswordRules`.
7. **Surfacing.** After a successful invite, the new user appears at the top of the approved-users list. If a link was generated, it's shown inline with a Copy button. If a password was set, a "Password set" confirmation appears.
8. **Auth gate.** Admin-only — same `isApprovedUser` check that gates the other `AdminAuthResource` actions.

## Schema additions

None. Existing `WaitlistUser`, `UserCredential`, and `OneTimeLoginToken` tables cover everything.

## Files to create

- `lib/auth/invite-pure.ts` — `emailToUserId(email)` (deterministic `email_<sanitized>` slug), `validateInviteInput(data)` (composite check covering email + name + optional password). Pure, fully tested.
- `test/auth-invite-pure.test.ts` — slug determinism, idempotent slugging, email-normalization integration, edge cases (uppercase, dots, plus-tags, spaces).

## Files to modify

- `resources/AdminAuth.ts` — add a new `invite-user` action.
  - Validates email + name; rejects with the appropriate 4xx.
  - Computes deterministic userId via `emailToUserId(email)`.
  - Pre-flight lookup: any existing `WaitlistUser` row with this email (via filtered search) AND/OR with this id → return 409 with `{ error: 'A user with this email already exists', existingUserId: <id> }`.
  - Writes the user as `status: 'approved'`, `provider: 'email'`, fresh `createdAt`.
  - Optionally chains the existing `set-password` and/or `create-login-link` paths internally (reuse the same hashing / mint / store code, do not duplicate).
  - Returns `{ ok: true, user, passwordSet: boolean, link?: { token, url, expiresAt } }`.
- `app/src/types.ts` — `AdminInviteUserInput`, `AdminInviteUserResult`.
- `app/src/api.ts` — `adminInviteUser(input)`.
- `app/src/admin/AdminUserCredentialPanel.tsx` — add a collapsible `+ Invite user` form above the approved-users list. Fields: email, name, optional password, "Generate login link" toggle. On success, show the inline link copy block (if generated) and trigger an `adminWaitlist` invalidate so the new user renders below.

## Out of scope

- Bulk import (CSV / pasted list of emails) — defer until needed.
- Sending an actual invite email — out of scope by the 12d charter ("no third-party email service yet"). Admin hand-delivers the password or link.
- Editing email/name after invite — defer; admin can re-invite under a new email if needed.
- Soft-delete / disable account — defer.

## Risks / edge cases

- **Same email re-invite.** Must not silently overwrite or quietly fail. Return 409 with a clear message; admin can manage that user via the existing controls.
- **Email collision in slug.** Two distinct emails sanitizing to the same id (e.g. `alice.foo@x.com` and `alice_foo@x.com`) — both produce `email_alice_foo_x_com`. Mitigated by the duplicate-by-email guard before insert (the second invite fails). Document this in `invite-pure.ts`.
- **Login by ID vs by email.** Existing `EmailLoginResource.login()` looks up the user by `email` (filtered search), not by id. ID format changes only affect the admin UI's display and the auto-generated `GET /WaitlistUser/{id}` endpoint. No login-side changes needed.
- **Approved-by-default.** Admin invites are inherently trusted — `status: 'approved'`. Users that come in through OAuth still land as `waitlist` and need the existing approve flow.

## Verification

1. `npm test` — green including new invite-pure tests.
2. Admin UI: open `/admin → Auth`, click **+ Invite user**, fill in email + name + password, submit. Expect the new user to appear at the top of the list with "Password set" confirmation.
3. Open `/login` in incognito, sign in with the new email + password → land on `/` as that user.
4. Back at `/admin → Auth`, click **+ Invite user** again with the same email → see 409 error.
5. Invite a different user with only "Generate login link" → copy the URL, paste in incognito → instant login.
6. Mobile 320px — form, password input, link result block all render cleanly.

## Critical references

- 12d slice plan & status: [completed/12d-email-auth/](../../completed/12d-email-auth/)
- Existing admin gate pattern: [resources/AdminAuth.ts](../../../resources/AdminAuth.ts) — `isApprovedUser`
- Existing admin user-listing pattern: [resources/AdminWaitlist.ts](../../../resources/AdminWaitlist.ts)
- Existing UI: [app/src/admin/AdminUserCredentialPanel.tsx](../../../app/src/admin/AdminUserCredentialPanel.tsx)
- Email + password pure helpers (reuse): [lib/auth/password-pure.ts](../../../lib/auth/password-pure.ts)
- L004 / L005 still apply — static `tables` import, class name distinct from any `@export` schema type (already true for `AdminAuthResource`).
