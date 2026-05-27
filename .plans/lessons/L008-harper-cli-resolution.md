---
id: L008
title: `npm run dev` may resolve a stray parent-dir `harperdb` instead of the local one
tags: [debug, discovery]
opened: 2026-05-27
---

# L008 — `npm run dev` may resolve a stray parent-dir `harperdb` instead of the local one

## Wrong assumption / model

Running `npm run dev` in `/Users/aleks/Flow-State` will use the local `node_modules/harperdb` runtime that matches `package.json`'s `"harper": "^5.0.1"`.

## How it manifested

During slice 13c verification:
- Plain `npm run dev` (which runs `harper dev .`) crashed at schema load with:
  - `Could not load component 'graphqlSchema' for application 'Flow-State' due to: Object.defineProperty called on non-object`
  - `Cannot redefine property: upgrade`
  - Error traces pointed at `/Users/aleks/node_modules/harperdb/server/threads/threadServer.js` — note the path is `/Users/aleks/` (the home directory) not `/Users/aleks/Flow-State/`.
- `which harper` returned `/opt/homebrew/bin/harper` — a homebrew-managed global wrapper.
- `ls /Users/aleks/node_modules/` showed `harperdb`, `harper`, `k6`, `emojilib`, `node-fetch`, etc. — a long-ago stray install in `$HOME` that lives outside any project.
- Forcing the local binary via `./node_modules/.bin/harperdb dev .` boots `harperdb 4.7.19`, which is too old to load 5.x resources (`Class extends value undefined is not a constructor or null` on `resources/WorldRiverView.ts`).
- Data on disk (`/Users/aleks/hdb`) was created by harper 5.0.15; the local `harper` npm dep resolved to 5.0.14 (latest matching `^5.0.1` at the time), prompting a downgrade-confirmation; piping `yes yes |` bypassed the prompt but didn't fix the binding mismatch.

## The right model

The `harper` CLI on PATH (Homebrew) loads `harperdb` via Node's module resolution from its own location. Node walks UP the directory tree, so a `node_modules/` anywhere along the path from the binary to root is fair game. A stray `/Users/aleks/node_modules/harperdb/` will outrank the project's local one because the global `harper` binary at `/opt/homebrew/bin/` doesn't sit inside the project tree.

`package.json` semver constraints control what `npm install` puts into the project's `node_modules/`. They do NOT control what the on-PATH `harper` binary resolves at runtime when it lives outside the project.

## How to recognize the pattern

If you see any of these symptoms after touching dependencies (or unprompted on a fresh checkout):
- `Object.defineProperty called on non-object` opening LMDB / data.mdb
- `Cannot redefine property: upgrade` in `@harperfast/oauth`
- Error trace paths containing `/Users/<you>/node_modules/...` (without your project name in the path)
- The downgrade-confirmation prompt on `harper dev .` when the codebase hasn't changed harper version
- Local CLI works but `harper dev .` doesn't (or vice versa)

…suspect a stray parent-directory `node_modules/`.

## Workarounds (in order of preference)

1. **Clean up the stray.** `rm -rf /Users/aleks/node_modules/` (verify with `ls` first — make sure it's actually a stray and not something a tool you use depends on). Re-run `npm install` in the project.
2. **Bump local harper to match data.** `npm i harper@latest && npm rebuild` so the project's `node_modules/harperdb` matches the version that last wrote `~/hdb/database/data.mdb`.
3. **Skip local dev.** Verify changes via Fabric deploy (`npm run deploy`) — the deploy environment doesn't have the stray.

## Related

- L001 (deploy worktrees) — also concerns binaries / artifacts in unexpected paths
- L007 (USGS rate limit on repeat backfill) — sibling Harper-runtime gotcha

When the verification step of a slice depends on running `harper dev .` locally, check `which harper`, the contents of `/Users/<you>/node_modules/`, and the harperdb version in both `node_modules/harperdb/package.json` (project) and `/Users/<you>/node_modules/harperdb/package.json` (stray, if present) before assuming a code bug.

## CONFIRMED RESOLUTION (2026-05-27)

The real root cause was simpler than the stray-parent-dir theory: the on-PATH `harper`/`harperdb` is **4.7.8** (at `/usr/local/lib/node_modules/harperdb`), and the data in `~/hdb` was last written by **5.0.21**, so PATH-harper refused with *"Trying to downgrade major HDB versions is not supported."* The project's `node_modules/harper` is already **5.0.21**.

**Winning command — run the LOCAL 5.0.21 binary directly against the real root, bypassing PATH entirely:**

```bash
HDB_ROOT=/Users/aleks/hdb node /Users/aleks/Flow-State/node_modules/harper/dist/bin/harper.js dev /Users/aleks/Flow-State
```

This opened the real 723M database (all seeded + USGS-ingested data) cleanly on port 9926. Then `npm run ui:dev` (vite) proxies to it — real data, no mock.

Gotchas confirmed:
- Use `node_modules/harper/**dist**/bin/harper.js` — the non-dist `bin/harper.js` imports raw `.ts` (`hdbTerms.ts`) which Node 22 can't type-strip under `node_modules` (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`).
- A **fresh** `HDB_ROOT` (e.g. `.harper-dev`) gives an empty DB + got stuck in a `harper dev` reload loop (watcher re-triggering on the lock file). Use the EXISTING `~/hdb` root, which is already initialized and version-matched.
- Writes (PUT/PATCH/DELETE on tables, `Seed {action:'hierarchy'}`) need Basic auth even in dev mode: `Authorization: Basic $(printf 'HDB_ADMIN:password' | base64)`.

So: prefer **"run the local version-matched binary against the existing root"** over the earlier workarounds. The mock (`scripts/mock-corridor-server.ts`) remains only as an offline fallback.
