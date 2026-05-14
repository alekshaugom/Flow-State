# L002 — Always verify .env edits with hex dump

**Date:** 2025-11-19 (original incident); 2026-05-13 (ported to .plans)
**Tags:** debug, surprise
**Slice:** pre-v2 (foundation)
**Severity:** medium (multiple debug cycles; OAuth fell back to localhost default)

## The wrong assumption / model

We assumed appending a new variable to `.env` would result in it being parsed as a separate variable, the way most text editors and even basic shell appends work.

## How it manifested

Added `OAUTH_REDIRECT_BASE_URI` to `.env` without a trailing newline on the previous line. The new variable's name and value got concatenated onto the previous line's `ADMIN_EMAILS` value. `dotenv` parsed the whole concatenated mess as one variable — `OAUTH_REDIRECT_BASE_URI` was effectively undefined, and the OAuth plugin silently fell back to its `localhost:9953` default.

Took multiple debug cycles to find: the env var "looked right" in the file when read with normal tools, but the bytes were wrong.

## The right model

`.env` files are line-oriented. A missing `\n` between two variables silently concatenates them. `dotenv` doesn't warn — it just produces a malformed key. Tools that "look fine" in normal display can hide the missing newline.

## How to recognize the pattern

- An env var that should be set appears undefined or has the wrong value
- The value contains characters that look like another env var's contents
- A previous edit appended to the end of `.env`
- The OAuth plugin (or any other env-driven plugin) falls back to defaults that suggest the variable wasn't read

## Mitigation

- After any `.env` edit, verify with `xxd .env | tail -6` — look for the `0a` byte (newline) between variable lines
- Prefer the Read + Edit tool over `cat <<EOF >>` style appends, since Edit shows surrounding context and is less likely to produce missing-newline bugs
- Both `/Users/aleks/Flow-State/.env` and any worktree `.env` must stay in sync
- If you must append via shell, use `printf '%s\n' "NEW_VAR=value" >> .env` (the `%s\n` ensures a trailing newline)

## References

- This is a tooling constraint, not a product principle
- Related: deploy lesson L001 — `.env` is included in deploys, so a malformed `.env` ships
