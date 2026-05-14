# L001 — Deploy must exclude worktree build artifacts

**Date:** 2025-11-18 (original incident); 2026-05-13 (ported to .plans)
**Tags:** deploy, surprise
**Slice:** pre-v2 (foundation)
**Severity:** high (full debug session lost; user saw stale frontend)

## The wrong assumption / model

We assumed `harper deploy_component .` would respect `.gitignore` and skip directories listed there, the same way most modern build tools do.

## How it manifested

Fabric was serving `index-mwTkDxHD.js` (from worktree `nervous-golick-658266`) instead of the current `index-CpfDf09F.js` from the main repo root. The user saw none of the frontend updates we had shipped. A full debugging session was burned tracing the wrong commit hash, the wrong build pipeline, and the wrong cache layer before realizing Harper had simply included a stale `web/` from a worktree directory and was serving it instead of the project-root `web/`.

## The right model

`harper deploy_component .` packages the **entire** directory tree under the deploy path. It skips only `node_modules`. It does **not** respect `.gitignore`. Any `web/` directory anywhere under the deploy root — including in `.claude/worktrees/*/web/` — gets bundled into the deploy and may be served in place of the intended one.

## How to recognize the pattern

- Fabric is serving an unexpected JS bundle hash
- `curl -s 'https://flow.state.harperfabric.com/' | grep 'index-'` shows a hash that doesn't match the current `web/` build
- `.claude/worktrees/*/web/` directories exist on the deploying machine
- The deploy succeeded but the user reports "I don't see my changes"

## Mitigation

- Always run `npm run predeploy` before `npm run deploy` — the predeploy script clears worktree `web/` dirs:
  ```bash
  find .claude/worktrees -name "web" -type d -exec rm -rf {} + 2>/dev/null
  ```
- Always deploy from `/Users/aleks/Flow-State` (main repo root), **never** from a worktree — worktree deploys use the worktree directory name as the component name and cause additional confusion
- After deploy, verify the correct bundle hash with: `curl -s 'https://flow.state.harperfabric.com/' | grep 'index-'`
- The `.env` file IS included in deploys (not excluded by gitignore); `.env` edits take effect on next deploy

## References

- Predeploy script: [package.json](../../package.json) — `predeploy` lifecycle hook
- Vision: this is a deploy-infra constraint, not a product principle — no vision doc references needed
