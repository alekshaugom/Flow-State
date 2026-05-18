# Status — 12d email-auth

## 2026-05-18
- Promoted from queued → active after 12e shipped same day.

### Phase 1 complete — schemas + pure helpers
- [schemas/auth-email.graphql](../../../schemas/auth-email.graphql): `UserCredential` (id=userId, passwordHash, passwordSalt, algo, setBy, setAt, updatedAt) + `OneTimeLoginToken` (id=token, userId, createdBy, expiresAt, usedAt, createdAt).
- [lib/auth/password-pure.ts](../../../lib/auth/password-pure.ts): `validatePasswordRules` (min 8, max 200), `normalizeEmail` (trim + lowercase + basic shape check).
- [lib/auth/token-pure.ts](../../../lib/auth/token-pure.ts): `validateTtlMinutes` (5..7d range, default 24h), `computeExpiresAt`, `isExpired`, `isConsumed`.
- 23 new tests across [auth-password-rules.test.ts](../../../test/auth-password-rules.test.ts) + [auth-token-pure.test.ts](../../../test/auth-token-pure.test.ts). `npm test`: **145 / 145 green**.

### Phase 2 complete — scrypt + token mint
- [lib/auth/password.ts](../../../lib/auth/password.ts): `hashPassword` (scrypt, 32-byte random salt, 64-byte key), `verifyPassword` (timingSafeEqual), `constantTimeDummyHash` (constant-cost fallback for missing rows so we don't leak user-existence via timing). Algo tag `scrypt-v1`.
- [lib/auth/token.ts](../../../lib/auth/token.ts): `mintLoginToken` (32 bytes → base64url).
- 11 new tests in [auth-password-hash.test.ts](../../../test/auth-password-hash.test.ts): hash uniqueness (per-call salt), verify roundtrip, tampered hash/salt fail, invalid hex fails, wrong-length hash fails, token uniqueness across 1000 mints, consistent token length. `npm test`: **156 / 156 green**.

### Phase 3 complete — resources + vite proxy
- [resources/AuthEmail.ts](../../../resources/AuthEmail.ts) → `class EmailLoginResource` mounted at `/EmailLoginResource`:
  - `POST {email, password}` → looks up `WaitlistUser` by email (filtered search), runs `verifyPassword`, calls Harper's `session.update({ user })` to set the hdb-session cookie. Returns same generic 401 + constant-time pause for missing user, missing credential, and wrong password — no enumeration. 403 if creds match but user isn't approved.
  - `POST {action: "consume", token}` → looks up `OneTimeLoginToken`, rejects on missing/used/expired (410), marks `usedAt = now` (next concurrent consume sees the marked state and is rejected), then `session.update`.
- [resources/AdminAuth.ts](../../../resources/AdminAuth.ts) → `class AdminAuthResource` mounted at `/AdminAuthResource`, gated by `isApprovedUser` (dev-mode bypass mirrors `AdminWaitlist` pattern):
  - `set-password` → hashes via scrypt, writes `UserCredential` with `setBy = adminId`, preserves original `setAt` on update.
  - `create-login-link` → mints token + writes row with `expiresAt`, returns `{token, url, expiresAt}` (url is `<host>/login?token=...`).
  - `revoke-token` → marks `usedAt = now`.
  - `list-tokens` → returns user's tokens newest-first.
- [vite.config.ts](../../../vite.config.ts) proxy whitelist: `/EmailLoginResource`, `/AdminAuthResource`, `/UserCredential`, `/OneTimeLoginToken`.
- **Session-cookie compat verified:** Harper's built-in `request.session.update({user})` writes the canonical `hdb-session` cookie + persists to the `hdb_session` table — exactly the same path `@harperfast/oauth` uses. No reverse-engineering required.

### Phase 4 complete — frontend types + api
- [app/src/types.ts](../../../app/src/types.ts): `EmailLoginResult`, `AdminLoginLinkResult`, `AdminLoginToken`, `AdminLoginTokenList`.
- [app/src/api.ts](../../../app/src/api.ts): `emailLogin`, `consumeLoginLink`, `adminSetPassword`, `adminCreateLoginLink`, `adminRevokeLoginToken`, `adminListLoginTokens`.

### Phase 5 complete — login form + ?token= handler
- [app/src/components/EmailLoginForm.tsx](../../../app/src/components/EmailLoginForm.tsx): email + password inputs, `useMutation` against `api.emailLogin`, surfaces generic 401 error, success invalidates `['me']` so `useAuth` re-runs.
- [app/src/pages/LoginPage.tsx](../../../app/src/pages/LoginPage.tsx): embedded the form below the Google button with an `OR` divider; added `?token=` handler that consumes the link on mount, strips the param from the URL, and redirects home on success. Shows inline error if the token is invalid/used/expired.

### Phase 6 complete — admin auth panel
- [app/src/admin/AdminUserCredentialPanel.tsx](../../../app/src/admin/AdminUserCredentialPanel.tsx): lists approved users with collapsible "Manage credentials" rows. Each row exposes:
  - `// SET PASSWORD` form with 8+ char client-side check, mirrors server validation.
  - `// ONE-TIME LOGIN LINK` action — generates link, shows the URL in a copy-able mono block with a Copy button, lists active (unused) tokens with revoke buttons.
- [app/src/admin/AdminPage.tsx](../../../app/src/admin/AdminPage.tsx): added third `Auth` tab. Gated behind `isApproved` like Waitlist.

### Phase 7 complete — verification
- `npm test`: **156 / 156 green** (34 new auth tests + 122 prior).
- `npx vite build`: **green** in 146 ms.
- End-to-end curl walkthrough (auth flow proven):
  - Created `email_test123` via auto-CRUD `POST /WaitlistUser/`.
  - `POST /AdminAuthResource {set-password}` → ok, `hadPriorPassword: false`.
  - `POST /EmailLoginResource {wrong password}` → **401 Invalid email or password**.
  - `POST /EmailLoginResource {correct password}` → **200** + `Set-Cookie: localhost_9926-hdb-session=…; Path=/; HttpOnly; SameSite=None; Secure`.
  - `POST /AdminAuthResource {create-login-link, ttlMinutes:60}` → token + URL + expiresAt.
  - `POST /EmailLoginResource {consume, token}` → 200 + Set-Cookie.
  - `POST /EmailLoginResource {consume, same token}` → **410 This login link has already been used**.
  - `POST /EmailLoginResource {consume, garbage token}` → **410 Invalid login link**.
- End-to-end UI walkthrough:
  - Created another test user, set password via curl.
  - Opened `/login`, filled email + password fields, clicked **Sign in with email** — `/Me` now returns `authenticated: true` with the right user.
  - Opened `/admin`, clicked the **Auth** tab — approved-users list rendered with "Manage credentials" expander showing `// SET PASSWORD` form + `// ONE-TIME LOGIN LINK` button + "Expires in 24h, single-use." helper.

### Slice 12d closed — 2026-05-18
- Status: **done**. Moved to `.plans/completed/12d-email-auth/`.
- ROADMAP advanced: 12d → done, **12c (river-log-sharing)** promoted to active. 12c's intent already has `12d` in its `depends_on` list and the dependency is now satisfied.
- Multi-user testing unblocked: admins can now set passwords directly and mint one-time login links without any third-party email service.
