---
slice: 12i-account-activation
status: done
value: 7
confidence: 9
effort: S
depends_on: [12d-email-auth, 12h-admin-invite-user-ui]
unlocks: []
opened: 2026-05-18
closed: 2026-05-18
---

# Slice 12i — Account activation: set your own password after a one-time link

## Goal

After a one-time login link is consumed, the user is logged in but currently has no way to **set their own password** without admin intervention. This slice closes that loop with a simple account-activation flow:

1. User clicks the link → token consumed → session active.
2. If the user has no `UserCredential` yet → land on `/login/setup` with a "set your password" form.
3. If they do have one → land on `/` like today.

The user picks their own password (the admin doesn't see it). After saving, they're routed home and can log in by email + password going forward.

## Acceptance criteria

1. **Consume → setup routing.** A one-time link for a user with no `UserCredential` lands them on `/login/setup`, not `/`. A link for a user who already has a credential routes to `/` as before.
2. **Setup page** at `/login/setup`: requires an active session; redirects to `/login` if anonymous. Shows the user's name + email, a new-password field, a confirm-password field. Same `validatePasswordRules` (8+ chars).
3. **Self-service endpoint.** `POST /EmailLoginResource {action: 'set-my-password', password}` writes (or updates) the current user's `UserCredential`. `setBy` is the user's own id. 401 if no session; 403 if session is for a non-approved user.
4. **One round-trip on save.** Submit → POST → on success route to `/` (or to the originally intended destination if we threaded one — defer to a future slice).
5. **No skip.** If the user has no password, the page enforces setting one (they got here via a one-time link; without a password they can't log in again without another link). They can sign out via the top-right user menu if they really want.
6. **Tests cover** the new `setMyPassword` action validation path (using a small pure helper) and the routing decision the frontend makes from `hasPassword` in the consume response.

## Files to create

- `lib/auth/credential.ts` — `writeUserCredential(userId, password, setBy)` lifted out of `resources/AdminAuth.ts` so both `AdminAuthResource` and `EmailLoginResource` can use it without duplicating the scrypt + put sequence. Backend-only (imports `tables`).
- `lib/auth/activation-pure.ts` — `decideActivationRoute({ hasPassword })` → `'/login/setup' | '/'`. Trivial but worth keeping pure so the routing decision is testable independently of network state.
- `test/auth-activation-pure.test.ts` — coverage for `decideActivationRoute` + edge cases.
- `app/src/pages/AccountSetupPage.tsx` — the `/login/setup` form (auth-required, two password fields, validation, submit).

## Files to modify

- `resources/AdminAuth.ts` — refactor to import `writeUserCredential` from `lib/auth/credential.ts`. No behavior change.
- `resources/AuthEmail.ts`:
  - Extend `consume` to include `hasPassword: boolean` in the response (look up `UserCredential` after a successful consume).
  - Add a new action `set-my-password` that takes the password from the body, validates via `validatePasswordRules`, writes the credential via `writeUserCredential`, and returns `{ ok: true }`.
- `app/src/api.ts` — `setMyPassword(password)` → `POST /EmailLoginResource {action: 'set-my-password', password}`.
- `app/src/types.ts` — extend `EmailLoginResult` with optional `hasPassword: boolean`. Add `SetMyPasswordResult`.
- `app/src/pages/LoginPage.tsx` — on `consume.onSuccess`, read `hasPassword` from the result and navigate to `/login/setup` when false, `/` when true. Same redirect path even with the URL token stripped.
- `app/src/App.tsx` — register `/login/setup` route.

## Out of scope

- Admin "reset password" workflow (i.e. force the user to change their password on next login even if they already have one). The user can ask for that as a separate slice; this slice doesn't change the consume routing for users who *already have* a password.
- Email-based "I forgot my password" — still gated by the 12d charter of no third-party email service. Admin re-mints a one-time link.
- Password complexity rules beyond the existing 8-char min.
- Password history / rotation reminders.
- 2FA.

## Risks / edge cases

- **`/login/setup` accessed without a session.** Redirect to `/login`. The page is otherwise useless.
- **User races between two devices / windows.** Setting a password twice in quick succession just overwrites — the second write wins. No harm.
- **`hasPassword` lookup adds a roundtrip to consume.** Tiny — one indexed `tables.UserCredential.get(userId)`. Acceptable.
- **Stale-session bug from earlier.** Already fixed in the LoginPage consume guard (`hasValidSession = isAuthenticated && !!user`). Still applies here.
- **L004 / L005.** No new resources or schemas; existing patterns continue.

## Verification

1. `npm test` — green including the new `activation-pure` tests.
2. Admin invites a new user with no password and `generateLink: true`. Copies the URL.
3. Open the URL in incognito → land on `/login/setup` with the user's name and email visible.
4. Submit blank → validation error.
5. Submit a password under 8 chars → validation error.
6. Submit a valid password → land on `/`. `/Me` returns the user.
7. Sign out → `/login` → enter email + the password just set → land on `/`. Login works.
8. Mint a fresh link for the same user → click → land on `/` directly (skipping `/login/setup`) since the user now has a credential.

## Critical references

- 12d slice: [completed/12d-email-auth/](../../completed/12d-email-auth/)
- 12h slice: [completed/12h-admin-invite-user-ui/](../../completed/12h-admin-invite-user-ui/)
- Existing consume + admin pattern to reuse: [resources/AuthEmail.ts](../../../resources/AuthEmail.ts), [resources/AdminAuth.ts](../../../resources/AdminAuth.ts)
- Password rules + scrypt: [lib/auth/password-pure.ts](../../../lib/auth/password-pure.ts), [lib/auth/password.ts](../../../lib/auth/password.ts)
