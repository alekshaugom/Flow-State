---
slice: 12d-email-auth
status: done
value: 8
confidence: 7
effort: M
depends_on: [12-river-log-core]
unlocks: [12c-river-log-sharing, 12e-saved-crafts, 12f-trip-photos]
opened: 2026-05-18
closed: 2026-05-18
---

# Slice 12d — Email / password auth + admin password management

## Goal

A second authentication path alongside the existing Google OAuth: **email + password**. No third-party email service required — password reset is **admin-manual** (you set passwords directly, or generate one-time login links that you hand to a user out-of-band). This unblocks multi-user testing of slices 12 / 12b / 12c / 12e / 12f without each test user needing a real Google account, and gives the product a path for users who don't OAuth.

The slice is intentionally narrow: no signup flow for end users, no self-service password reset, no email delivery infrastructure. The admin creates and manages credentials through the existing `/admin` page. Users log in with the credentials they've been given.

## Acceptance criteria

1. **Admin sets a password.** From `/admin`, an admin can set or change the password for any approved (or waitlist) user. Confirmation prompt before overwriting an existing password.
2. **Admin generates a one-time login link.** From `/admin`, an admin can mint a single-use, time-limited login token for a user. The page returns a URL the admin copies and sends to the user manually. Tokens expire after 24 hours and are consumed on first use.
3. **User logs in with email + password.** `/login` shows the existing Google button **and** an email/password form. Submitting valid creds returns a session compatible with `Me.ts` (`session.user = WaitlistUser.id`).
4. **User logs in via a one-time link.** Opening `/login?token=…` consumes the token, creates a session, redirects home. A consumed or expired token shows a clear error.
5. **OAuth keeps working.** A user can have *both* an OAuth identity and an email password — both paths resolve to the same `WaitlistUser.id`. (See "Linking identities" in Known unknowns.)
6. **Password storage is safe.** scrypt (Node built-in) with a per-credential salt. Never store plaintext. Never log the hash.
7. **Cross-user blocking holds.** Admin endpoints reject non-admins. Login endpoints reject users whose `status !== 'approved'` after a successful credential check (same as OAuth's onLogin gate).
8. **No self-service flows.** No "forgot password" link, no email verification, no signup-by-email. The login form has only `email` + `password` + submit. (A separate small "I have a login link" affordance accepts a paste-the-link path for users on mobile who can't tap a long URL.)
9. **Tests cover:** password hash + verify, token consume idempotency (second use = 410 Gone), token expiry, admin-only gate on `AdminAuth`, dev-bypass still works.

## Schema additions

### `schemas/auth-email.graphql` (new file)

```graphql
type UserCredential @table @export {
  id: ID @primaryKey               # = userId (WaitlistUser.id)
  userId: ID @indexed
  user: WaitlistUser @relationship(from: "userId")
  passwordHash: String             # scrypt(password, salt, keyLen=64) hex
  passwordSalt: String             # 32 random bytes hex
  algo: String                     # "scrypt-v1"
  setBy: ID                        # admin userId who set this
  setAt: String @indexed
  updatedAt: String
}

type OneTimeLoginToken @table @export {
  id: ID @primaryKey               # = the token itself (32 random hex bytes, URL-safe)
  userId: ID @indexed
  createdBy: ID                    # admin userId who minted it
  expiresAt: String @indexed
  usedAt: String                   # null until consumed
  createdAt: String @indexed
}
```

### Notes

- `passwordSalt` could be folded into the encoded `passwordHash` (e.g. `scrypt$N=...$salt=...$hash=...`) — but keeping them split keeps the row self-describing and avoids ad-hoc parsing.
- `OneTimeLoginToken.id` is the secret itself. Generated via `crypto.randomBytes(32).toString('base64url')`. Constant-time comparison on lookup (avoid timing attacks).

## Files to create

### Backend

- `resources/AuthEmail.ts` — class `EmailLoginResource`. Exposed at `/AuthEmail/`.
  - `POST /AuthEmail/login` `{ email, password }` → looks up `WaitlistUser` by email, looks up `UserCredential`, verifies hash, creates a session, returns `{ ok: true, user }`. Rejects on bad creds (always 401, never leak whether the email exists).
  - `POST /AuthEmail/consume` `{ token }` → looks up `OneTimeLoginToken`, checks not-used and not-expired, marks used, creates a session.
- `resources/AdminAuth.ts` — class `AdminAuthResource`. Admin-only. Exposed at `/AdminAuth/`.
  - `POST /AdminAuth { action: "set-password", userId, password }` → hashes + writes `UserCredential`.
  - `POST /AdminAuth { action: "create-login-link", userId, ttlMinutes? }` → mints token, returns `{ token, url, expiresAt }`. `url` is `https://<host>/login?token=…`.
  - `POST /AdminAuth { action: "revoke-token", tokenId }` → marks `usedAt = now`.
- `lib/auth/password.ts` — `hashPassword(plain): Promise<{ hash, salt }>`, `verifyPassword(plain, hash, salt): Promise<boolean>` using `node:crypto` `scrypt`. Constant-time compare via `crypto.timingSafeEqual`.
- `lib/auth/password-pure.ts` — pure validators: `validatePasswordRules(plain) → { ok: true } | { ok: false, reason }` (min 8 chars, max 200; no other rules — KISS).
- `lib/auth/token.ts` — `mintLoginToken(): string` (32 random bytes, base64url), `isExpired(expiresAt, now)`.
- `lib/auth/session.ts` — `createSessionForUser(userId, context)`. Mirrors what `@harperfast/oauth`'s `onLogin` does so the cookie format is compatible. **Risk**: needs careful reverse-engineering — see Risks.

### Frontend

- `app/src/pages/EmailLoginForm.tsx` — extracted form component for embedding in `/login`. Email, password, submit. Error display. "Have a login link?" link → paste-the-link mode.
- `app/src/admin/AdminUserCredentialPanel.tsx` — per-user controls on the admin page: "Set password" (modal w/ confirm + minimum-length check), "Create login link" (button → returns URL → "Copy" button). "Revoke" button on the most recent unused token.
- `app/src/hooks/useEmailLogin.ts` — react-query mutation hook.

### Tests

- `test/password-rules.test.ts` — pure rules.
- `test/password-hash-verify.test.ts` — hash → verify roundtrip; tampered hash fails.
- `test/token-mint.test.ts` — uniqueness across 1000 mints; URL-safe charset.
- `test/token-expiry.test.ts` — pure `isExpired` cases.

## Files to modify

- `app/src/pages/LoginPage.tsx` — embed `<EmailLoginForm />` below the existing OAuth button. Add `?token=…` handler that calls `api.consumeLoginLink` on mount.
- `app/src/admin/AdminPage.tsx` — render `<AdminUserCredentialPanel />` per user row.
- `app/src/api.ts` — `loginEmail({ email, password })`, `consumeLoginLink(token)`, admin: `setPassword(userId, password)`, `createLoginLink(userId)`, `revokeLoginToken(tokenId)`.
- `app/src/types.ts` — `LoginLinkResponse`, `AdminAuthAction`.
- `vite.config.ts` — proxy `/AuthEmail`, `/AdminAuth`, plus auto-generated `/UserCredential`, `/OneTimeLoginToken`.
- `resources/auth-hooks.ts` (existing OAuth `onLogin`) — verify it still works alongside the new path; ensure `WaitlistUser` keyed by email so an OAuth user and an email-login user with the same email resolve to one row. (Currently OAuth uses `${provider}_${sub}` — see Known unknowns.)

## Out of scope (defer)

- Self-service password reset via email — no email service yet.
- Email verification on signup — admin gates everything.
- Signup-by-email — admin creates users.
- 2FA / TOTP — defer until measured demand.
- Rate-limiting on `/AuthEmail/login` — defer; add when we see a probe.
- Audit log of admin auth actions — defer (we have `setBy` + `createdBy` columns, that's enough for now).
- Password complexity rules beyond min-length — defer.
- Session expiry / rotation policy beyond what OAuth already enforces.

## Risks / edge cases

- **Session-cookie format compatibility.** The slice's biggest risk. `@harperfast/oauth` writes a session that `this.getContext()?.session.user` reads in our resources. We need `createSessionForUser` to write the *same* cookie shape so all the existing resources keep working unchanged. Mitigation: read the `@harperfast/oauth` source (it's an npm dep) before writing `lib/auth/session.ts`; if the API is private, fall back to setting the cookie via Set-Cookie in the response and rely on Harper's session middleware to pick it up.
- **WaitlistUser key collision with OAuth.** OAuth currently uses `${provider}_${oauthUser.sub}` as the user id. An email-login user has no provider/sub, so their userId would be… what? Two clean options:
  1. `email_${slugifiedEmail}` — clean, predictable; collides if a user later OAuths in with the same email (their OAuth-derived id won't match).
  2. Use email as a *secondary* lookup: keep `WaitlistUser.id` as whatever was created first (`google_…` or `email_…`); the email field is `@indexed` already. The login resolver looks up by email, returns the existing user's id regardless of how it was originally created.
  
  Recommend option 2 — preserves identity continuity across OAuth + email-link logins for the same human. Document in the resource code.
- **Account enumeration.** `POST /AuthEmail/login` must return the same error/timing for "no such email" vs "wrong password" vs "user not approved." Add a constant-time pause for non-existent emails to match the hash-compare cost.
- **Token reuse race.** Two simultaneous consumes of the same token must result in exactly one success. Mitigate with an atomic `tables.OneTimeLoginToken.patch(id, { usedAt: now })` that only writes if `usedAt` is currently null (read-then-write loop with conditional patch).
- **Plaintext passwords in logs.** Never log request bodies for `/AuthEmail/login` or `/AdminAuth`. Set explicit redaction in the request logger.
- **Dev bypass.** Keep working — useful for ad-hoc UI testing without creating a user. The bypass already lives only in the frontend and doesn't affect backend auth.
- **L004 / L005.** New resources are statically-imported, named `*Resource`, no module-level caches needed.

## Verification

1. `npm test` — full suite green including new auth tests.
2. `npm run dev` + `npm run ui:dev`.
3. As admin (dev_local in dev, or first ADMIN_EMAIL in prod), open `/admin`. Pick an approved user, set their password.
4. Sign out, navigate to `/login`, enter the user's email + the password you set → land on `/` as that user. Confirm `/Me` returns the right `user.id`.
5. As admin again, open `/admin`, click "Create login link" for the same user. Copy the URL.
6. In an incognito window, paste the URL → instant login.
7. Re-use the same URL in a third window → "This login link has already been used" error.
8. Set the same user's email-password again, then OAuth-login as that user via Google → `Me` returns the same `user.id` as the email-login session. (If this fails, see Known unknowns #2.)
9. Wrong-password login → generic "Invalid email or password" error.
10. Try `/AdminAuth` as a non-admin → 403.

## Critical references

- Current OAuth hook: [resources/auth-hooks.ts](../../../resources/auth-hooks.ts) — `onLogin` shows the WaitlistUser-keying pattern we need to interop with.
- Existing admin guard: [resources/AdminWaitlist.ts](../../../resources/AdminWaitlist.ts) — `isApprovedUser` (dev fallback) pattern to mirror for `AdminAuth`.
- WaitlistUser schema: [schemas/auth.graphql](../../../schemas/auth.graphql) — extend lookups by email.
- Me resource: [resources/Me.ts](../../../resources/Me.ts) — confirm the session-read pattern still works after email login.
- Frontend auth context: [app/src/hooks/useAuth.tsx](../../../app/src/hooks/useAuth.tsx) — should not need changes; both login paths land at `/Me`.
- Login page: [app/src/pages/LoginPage.tsx](../../../app/src/pages/LoginPage.tsx) — embed new form here.
- Admin page: [app/src/admin/AdminPage.tsx](../../../app/src/admin/AdminPage.tsx) — extend with credential controls.
- L004: [L004-harper-static-import-and-search-after-restart.md](../../lessons/L004-harper-static-import-and-search-after-restart.md)
- L005: [L005-harper-resource-class-name-collisions.md](../../lessons/L005-harper-resource-class-name-collisions.md) — `EmailLoginResource`, `AdminAuthResource`.
