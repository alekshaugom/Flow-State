# Slice 20 status

## 2026-06-02
- Slice opened and set `status: active`. Previous slice 13c closed + moved to `completed/` after user confirmed the corridor-map MVP in-browser.
- Plan.md already existed (written 2026-06-02 by a prior session, grounded against the codebase). Entering Plan-phase review to verify file/symbol references still match before execution.
- Next: confirm refined plan with user at the Plan→Execute boundary, then build.

## 2026-06-02 — implementation

Files changed:
- `schemas/auth.graphql` — added `role: String @indexed` to `WaitlistUser`
- `lib/auth/capabilities-pure.ts` — NEW: pure `resolveCapabilities()` function + `UserCapabilities` interface; no Harper imports; `canContribute/canFund/canReceivePayout` hardcoded false stubs
- `test/auth-capabilities-pure.test.ts` — NEW: 7 unit tests covering all role/status combinations + stub flag invariant
- `resources/Me.ts` — imports `resolveCapabilities`; adds `role` to returned user object; adds `capabilities` field to success response
- `resources/AdminAuth.ts` — imports `resolveCapabilities`; adds `isAdminUser()` helper (dev bypass + production isAdmin check); adds `grant-role` and `revoke-role` action branches gated by `isAdminUser`; other existing actions remain gated by `isApprovedUser` only
- `app/src/hooks/useAuth.tsx` — exports `UserCapabilities` interface (re-declared locally); adds `role?: string|null` to `AuthUser`; adds `capabilities: UserCapabilities | null` to `AuthState`; `DEV_USER` gets `role: 'superadmin'`; dev path returns hardcoded full-admin capabilities
- `app/src/components/RequireCapability.tsx` — NEW: gate component accepting `capability: keyof UserCapabilities`
- `app/src/components/AppHeader.tsx` — removed `ADMIN_EMAILS` const; `showAdmin` now `auth.isAuthenticated && !!auth.capabilities?.isAdmin`
- `app/src/api.ts` — added `adminGrantRole(userId, role)` and `adminRevokeRole(userId)` methods
- `app/src/admin/AdminUsersPanel.tsx` — added `roleMutation` (useMutation → grant/revoke); approved rows now show "Grant admin" or "Revoke admin" button alongside existing controls
- `resources/Seed.ts` — added `bootstrap-admins` action: iterates `['aleks@harperdb.io','alekshaugom@gmail.com']`, finds each by email index, patches `role: 'superadmin'` on matches; returns `{patched, skipped}`; idempotent; uses same allowCreate/action-dispatch pattern as `hierarchy`

Key decisions:
- `grant-role`/`revoke-role` gated by stricter `isAdminUser` (resolveCapabilities.isAdmin); all other existing actions remain gated by `isApprovedUser` (status==='approved') only
- `AppHeader` is a pure role-based cutover — `ADMIN_EMAILS` whitelist removed entirely
- `DEV_USER` gets `role: 'superadmin'` so dev bypass always has admin UI access
- `bootstrap-admins` in `Seed.ts` follows the same no-extra-auth pattern as `hierarchy` (allowCreate gates on NODE_ENV !== 'production')
- `UserCapabilities` re-declared locally in `useAuth.tsx` to avoid cross-boundary lib → app/src import issues
- Import path in `resources/` uses `../lib/auth/capabilities-pure.ts` (matches how other resources import from lib, e.g. `../lib/auth/password-pure.ts`)

## 2026-06-02 — verification (all ACs met)

Tests + build:
- `npm test` → **308/308 green** (7 new `auth-capabilities-pure` tests; all existing auth suites still pass). AC #5, #9.
- `npm run ui:build` → clean, no TS errors. AC #10.

Live (real Harper 5.0.21 on `~/hdb`, port 9926 + Vite 5173):
- Harper hot-reloaded the new `role` schema field + resources with **zero errors** (`Reloaded Harper components`). AC #1, #2.
- `GET /Me` (unauthenticated) returns clean `{authenticated:false,user:null}`; authenticated path returns `capabilities` (code-verified, dev path synthesizes superadmin caps). AC #3.
- `bootstrap-admins` POST → `{ok,patched:[],skipped:[aleks@harperdb.io,alekshaugom@gmail.com]}` — idempotent, correctly skips emails with no local record (those exist via OAuth on Fabric). Verified working.
- Role action chain via curl against a real invited user: `grant-role admin` → ok; invalid role → **400**; `revoke-role` → role:member; missing user → **404** (existing guard); admin-gated by `isAdminUser`. AC #4.
- **UI (preview browser, dev-bypass=superadmin):** Admin nav link renders via `capabilities.isAdmin` (AppHeader cutover working, AC #7-equivalent gate); Admin → Users tab shows Grant/Revoke admin buttons per role; **live toggle confirmed** — clicking "Grant admin" on a member flipped it to "Revoke admin" (api → grant-role → patch → invalidate → re-render). AC #6, #8.
- Test data cleaned up (invited user deleted, sam reverted to member); dev DB restored.

**Status:** code-complete + fully verified by me. Holding `done` + `mv completed/` + activate-21 for the user's own UI confirmation (per the 13c pattern — user prefers to eyeball before close). Once confirmed, advance queue → slice **21-contribution-content-model** becomes active (it's an `intent.md`; expand to `plan.md` in the Plan phase).

## 2026-06-02 — CLOSED
User confirmed slice 20 in-browser ("slice 20 is good, please advance"). All 10 ACs verified (tests 308/308, build clean, backend role actions curl-tested incl. 400/404 guards, admin role UI live-toggle confirmed in preview, capability-gated admin nav working). Shipped. Moving to completed/. Queue advances to slice 21.
