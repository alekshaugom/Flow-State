# Status — 12h admin-invite-user-ui

## 2026-05-18
- Promoted from queued → active immediately after creation. 12c was just-promoted to active in the post-12d shuffle, but no real work had started there — bumped 12c back to queued and ran 12h first as a polish on 12d.

### Phase 1 complete — invite-pure helpers + tests
- [lib/auth/invite-pure.ts](../../../lib/auth/invite-pure.ts):
  - `emailToUserId(email)` — deterministic `email_<sanitized>` slug; documented as lossy (two distinct emails can collapse to the same id; duplicate-by-email guard in the resource handles that).
  - `validateInviteInput(input)` — composite check covering normalized email, trimmed required name (≤80 chars), optional password (delegates to `validatePasswordRules`), and a strict `generateLink === true` toggle.
- [test/auth-invite-pure.test.ts](../../../test/auth-invite-pure.test.ts): 15 new tests covering slug determinism + case-folding + idempotence + collision documentation; valid/invalid input shapes; name-length cap; password reuse via the existing rules.
- `npm test`: **171 / 171 green** (15 new + 156 prior).

### Phase 2 complete — invite-user action on AdminAuthResource
- [resources/AdminAuth.ts](../../../resources/AdminAuth.ts):
  - Extracted reusable helpers: `findUserByEmail` (filtered search on the `email` index), `writeUserCredential` (scrypt + UserCredential write + preserves original `setAt` on update), `mintAndStoreLoginLink` (token + row + URL).
  - Existing `set-password` and `create-login-link` actions now call the helpers — no duplicated code.
  - New `invite-user` action:
    - Runs the admin gate, then `validateInviteInput`.
    - **Duplicate guard 1:** `findUserByEmail` — if any row shares this email, return 409 with `existingUserId` so the admin can switch to "Manage credentials" on the existing user.
    - **Duplicate guard 2:** `tables.WaitlistUser.get(slugId)` — protects against the lossy-slug collision (different emails canonicalizing to the same id) with a distinct 409 error.
    - Writes `WaitlistUser` with `status: 'approved'`, `provider: 'email'`, `grantedBy: <adminId>`.
    - If `password` supplied, chains `writeUserCredential`.
    - If `generateLink: true`, chains `mintAndStoreLoginLink` at 24h TTL.
    - Returns `{ ok, user, passwordSet, link }`.

### Phase 3 complete — frontend types + api
- [app/src/types.ts](../../../app/src/types.ts): `AdminInviteUserInput`, `AdminInviteUserResult`.
- [app/src/api.ts](../../../app/src/api.ts): `adminInviteUser(input)` → `POST /AdminAuthResource {action:'invite-user', ...}`.

### Phase 4 complete — invite form in admin panel
- [app/src/admin/AdminUserCredentialPanel.tsx](../../../app/src/admin/AdminUserCredentialPanel.tsx): added `+ Invite user` button at the top. Clicking it expands an inline `<InviteUserForm>` card with:
  - Email + Name fields side-by-side.
  - Optional Password field (8+ chars; client-side check mirrors server validation).
  - "Also generate a one-time login link (24h, single-use)" checkbox.
  - Helper line: "The user is created with `status: approved`. They can sign in as soon as you give them a password or login link."
  - On success: card flips to a confirmation showing the user's name + email, checkmarks for "Password set" and/or "One-time login link (expires in 24h):" with copy button, and "Invite another" + "Done" actions. The new user simultaneously appears in the approved-users list below thanks to `qc.invalidateQueries({ queryKey: ['adminWaitlist'] })`.

### Phase 5 complete — verification
- `npm test`: **171 / 171 green**.
- `npx vite build`: **green** in 144 ms.
- End-to-end curl walkthrough (`invite-user` action):
  - Invite new user with password + link → 200, returns `user` + `passwordSet: true` + `link: {token, url, expiresAt}`.
  - Re-invite same email → **409** "A user with this email already exists" + `existingUserId`.
  - Login as the new user with the password → **200** + Set-Cookie.
- End-to-end UI walkthrough:
  - `/admin → Auth → + Invite user` → form expands inline.
  - Filled email + name + password, ticked "Also generate a one-time login link" → submit.
  - Saw the confirmation card with `// USER INVITED`, "✓ Password set" check, "✓ One-time login link…" + the actual URL, **Copy link** button.
  - New user immediately appeared in the approved list below with **Manage credentials** button.
- Cleanup: deleted the test user + credential via auto-CRUD; both 200.

### Slice 12h closed — 2026-05-18
- Status: **done**. Moved to `.plans/completed/12h-admin-invite-user-ui/`.
- ROADMAP advanced: 12h → done, **12c (river-log-sharing)** restored to active (still `intent.md`; first task remains to expand into plan.md in the context of the now-shipped 12 / 12b / 12d / 12e / 12h state).
- Testing gap from 12d is closed: admins can now create email-only users entirely through the UI without curl.
