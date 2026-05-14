# L003 — Harper `Resource.post()` takes `data` as the first argument

**Date:** 2026-05-13
**Tags:** debug, discovery
**Slice:** 01-flowband-browns-fix
**Severity:** medium (one failed seed call, easy fix once spotted)

## The wrong assumption / model

We assumed Harper `Resource` lifecycle methods share the same signature as `get(target?: any)` — namely, `post(target?: any, data?: any)`, with `target` always being the first positional argument carrying URL/path info and `data` being the body.

## How it manifested

`Seed.ts` was written as `async post(target?: any, data?: any)`. Calling `POST /Seed` with `{"action":"flow-bands"}` returned `{"ok":true,"message":"Already seeded","skipped":true}` instead of running the `flow-bands` branch. The `data?.action` check was reading `undefined` because the body actually arrived in the first positional slot.

## The right model

In Harper, `Resource.post()` takes the request **body as the first argument** — `async post(data?: any)`. There is no `target` argument for `post` (unlike `get`).

The existing `resources/Ingestion.ts` already uses this pattern: `async post(data: any)` followed by `data?.action`.

## How to recognize the pattern

- A POST handler that's silently falling through to the default branch
- `data` parameter is always `undefined` even though the curl includes a JSON body
- The handler was hand-written by mirroring a `get()` signature

## Mitigation

- For Harper `Resource` subclasses, use these signatures:
  - `async get(target?: any)` — first arg is the URL target (with `.id` for path params)
  - `async post(data?: any)` — first arg is the parsed request body
  - `async put(target?: any, data?: any)` — both, for resource-by-id semantics
  - `async patch(target?: any, data?: any)` — same as put
  - `async delete(target?: any)` — target only
- When in doubt, check `node_modules/harper/types` or grep for the same verb in other resources in this repo (`resources/Ingestion.ts` is the canonical reference for `post`)

## References

- Fixed in [resources/Seed.ts](../../resources/Seed.ts)
- Pattern reference: [resources/Ingestion.ts](../../resources/Ingestion.ts) — `async post(data: any)`
