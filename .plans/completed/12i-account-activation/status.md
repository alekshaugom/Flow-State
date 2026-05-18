# Status — 12i account-activation

## 2026-05-18
- Promoted from queued → active. Carved off 12c temporarily to ship this UX fix surfaced during 12h testing.
- Earlier same day: shipped two latent 12d bugs as part of debugging the user's reported failed login link (now part of the 12i polish):
  - **URL scheme bug**: `buildLoginUrl` defaulted to `https` even for `localhost`. Fixed to `http` for localhost-shaped hosts; still honors `x-forwarded-proto`.
  - **Consume guard bug**: LoginPage's consume-on-mount guard checked `!isAuthenticated`. A session pointing at a deleted/missing user is still "authenticated" by that check, which silently blocked consume forever. Replaced the guard with "always consume when a token is present" — backend's `session.update` already overwrites cleanly.

### Phase 1 complete — shared credential helper + activation-pure
- [lib/auth/credential.ts](../../../lib/auth/credential.ts): exports `writeUserCredential(userId, password, setBy)` and `userHasPassword(userId)`. Used by both `AdminAuthResource.invite-user`/`set-password` and `EmailLoginResource.set-my-password`. Backend-only (imports `tables`).
- [lib/auth/activation-pure.ts](../../../lib/auth/activation-pure.ts): `decideActivationRoute({hasPassword}) → '/login/setup' | '/'`. Trivial but kept pure so the routing decision is testable.
- [test/auth-activation-pure.test.ts](../../../test/auth-activation-pure.test.ts): 5 new tests covering all truthy/falsy/null/missing combinations.
- Refactored [resources/AdminAuth.ts](../../../resources/AdminAuth.ts) to import `writeUserCredential` from the new shared helper — no behavior change.
- `npm test`: **176 / 176 green**.

### Phase 2 complete — set-my-password endpoint + hasPassword in consume
- [resources/AuthEmail.ts](../../../resources/AuthEmail.ts):
  - Extended `consume()` to call `userHasPassword(userId)` after a successful consume and return `hasPassword: boolean` in the response.
  - New action `set-my-password`: requires an active session (401 if missing), 403 if the user isn't approved, validates the password via `validatePasswordRules`, writes the credential via the shared `writeUserCredential` with `setBy = userId` (self-set).
- Curl end-to-end:
  - Created user via invite → `passwordSet: false`.
  - Consumed token → `{ ok, user, hasPassword: false }`.
  - With the consume session cookie: `POST {action:'set-my-password', password:'self-chosen-pw'}` → 200.
  - Login as the same user with the self-set password → 200.
  - `set-my-password` without a session → 401.

### Phase 3 complete — frontend types + api + LoginPage routing
- [app/src/types.ts](../../../app/src/types.ts): added optional `hasPassword?: boolean` to `EmailLoginResult`, new `SetMyPasswordResult`.
- [app/src/api.ts](../../../app/src/api.ts): `setMyPassword(password)`.
- [app/src/pages/LoginPage.tsx](../../../app/src/pages/LoginPage.tsx):
  - Inline `decideActivationRoute` mirror (kept inline to avoid Vite cross-root import concerns; flagged for hoisting to `app/src/lib/` if logic grows).
  - `consume.onSuccess` reads `result.hasPassword` and `navigate(target, { replace: true })` to either `/login/setup` (no password) or `/` (has password).
  - Removed the stale-session guard from the consume effect; always consume when a token is present (overwrites any existing session cleanly).

### Phase 4 complete — AccountSetupPage
- [app/src/pages/AccountSetupPage.tsx](../../../app/src/pages/AccountSetupPage.tsx): `/login/setup` form. Redirects to `/login` for anonymous users. Shows the user's name + email card, two password fields with min-8 + match validation, "Save password and continue" primary, "Sign out instead" tertiary. On submit: `api.setMyPassword`, invalidate `['me']`, navigate `/`.
- [app/src/App.tsx](../../../app/src/App.tsx): registered `/login/setup` lazily.

### Phase 5 complete — verification
- `npm test`: **176 / 176 green** (5 new activation-pure tests; the rest unchanged).
- `npx vite build`: **green** in 153 ms.
- Curl walkthrough:
  - Fresh invite link → consume → `hasPassword: false`.
  - `set-my-password` → 200.
  - Normal email/password login as the new user → 200.
- Browser walkthrough (1280×900):
  - Opened the activation link → URL stripped of `?token=` → page is `/login/setup`.
  - Form shows `// ONE LAST STEP`, "Set your password", greeting with the user's name, a card with name + email, two password fields, helper warning about needing a new link if the password isn't set.
  - Filled the two fields and submitted → routed to `/`, `/Me` returns the user.
  - Minted a second link for the same user (who now has a password) → clicking it routed straight to `/` (no setup page).
- Browser walkthrough (320×568, mobile):
  - All chrome renders cleanly: title wraps, user card visible, both password fields stack, primary button full-width, helper + sign-out link readable.

### Slice 12i closed — 2026-05-18
- Status: **done**. Moved to `.plans/completed/12i-account-activation/`.
- ROADMAP: 12i → done, **12c (river-log-sharing)** restored to active. The 12d testing/onboarding loop is now complete:
  - Admin invites email user → password optional in invite form.
  - User receives a one-time link.
  - User clicks → consume sets session → if no password, redirected to `/login/setup` to pick one.
  - From now on, normal email + password login works.
