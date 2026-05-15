# L005 — Harper custom Resource class names must not collide with schema `@export` types

**Date:** 2026-05-14
**Tags:** debug, discovery, surprise
**Slice:** 02-watershed-corridor-ia
**Severity:** medium (server failed to load until renamed; obvious once the error surfaced)

## The wrong assumption / model

We assumed that a custom `Resource` subclass exported from `resources/X.ts` lives in a separate namespace from the auto-generated table resources Harper builds from `@table @export` GraphQL types. So we wrote:

```ts
// schemas/watershed.graphql
type Watershed @table @export { ... }

// resources/Watershed.ts
export class Watershed extends Resource {
  async get(target?: any) { /* custom rollup */ }
}
```

…expecting Harper to mount the auto-generated CRUD endpoint at one path and the custom rollup at another.

## How it manifested

Harper boot logs reported:

```
ServerError: Conflicting paths for Watershed
    at Resources.set (.../resources/Resources.ts:46:18)
    at recurseForResources (.../resources/jsResource.ts:80:20)
```

The conflict propagated to multiple HTTP worker threads and prevented the affected route from being served. Hot-reload picked up subsequent file edits but kept reporting the conflict until the class was renamed.

`RiverCorridor` did **not** conflict with our `resources/Corridor.ts` class (different names), so the problem only surfaced for `Watershed`. We renamed both for consistency.

## The right model

The auto-generated REST resource Harper mounts for a `@table @export` schema type uses the **type name** as the mount path. A custom JS `Resource` subclass uses its **export name** as the mount path. Both share a single registry keyed by name. They collide.

The existing codebase already encodes this: `resources/RiverDetail.ts` is named `RiverDetail`, not `RiverSection` (the table) or `River` (the table). The pattern is "custom rollups get a distinct, descriptive name."

## How to recognize the pattern

- Harper boot log contains `ServerError: Conflicting paths for X` where `X` matches both a `@table @export` schema type AND a `Resource` class you wrote
- Your custom resource doesn't respond on `GET /X/:id` after a deploy
- The error appears at server-start time, not at request time, so it can be diagnosed without hitting the endpoint

## Mitigation

- **Never give a custom `Resource` class the same name as a `@table @export` schema type.** Use a "view"/"detail" suffix:
  - `resources/WatershedView.ts` → `export class WatershedView extends Resource { ... }`
  - `resources/CorridorView.ts` → `export class CorridorView extends Resource { ... }`
  - `resources/RiverDetail.ts` is already the established pattern (custom rollup for `RiverSection`).
- Frontend `api.ts` paths follow the class name (`/WatershedView/...`), and the Vite dev proxy whitelist must include them (see `vite.config.ts`).
- **If you forget and Harper errors out**, rename the class only (not the schema). The schema-generated `/Watershed/`, `/RiverCorridor/`, etc. CRUD endpoints stay as they are — they're useful for direct table access from the admin UI or for debugging.

## References

- Rollup endpoints: [resources/WatershedView.ts](../../resources/WatershedView.ts), [resources/CorridorView.ts](../../resources/CorridorView.ts), [resources/RiverDetail.ts](../../resources/RiverDetail.ts)
- Schema definitions: [schemas/watershed.graphql](../../schemas/watershed.graphql), [schemas/corridor.graphql](../../schemas/corridor.graphql)
- Vite proxy whitelist: [vite.config.ts](../../vite.config.ts) — `/WatershedView`, `/CorridorView`, plus the auto-generated `/Watershed`, `/RiverCorridor`, `/FlowBand`
- Related lesson: [L003](L003-harper-resource-post-signature.md) (Harper `Resource.post()` signature) — same family of "read the existing pattern before writing new resources."

## Vision implications

Worth adding a one-line principle to [vision/data-model-philosophy.md](../../vision/data-model-philosophy.md) §"When to add a new table":
> *Custom rollup resources must be named distinctly from any `@export`-ed schema type they aggregate (e.g., `WatershedView`, `CorridorView`, `RiverDetail`). Schema types own their `/Name/` REST path; custom resources need a different name.*

Will fold this in when the next slice touches that file.
