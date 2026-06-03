// Pure logic — NO Harper imports. Safe to test without a running Harper instance.
import type { EntityConfig, FieldDescriptor } from './entity-registry.ts';

export type VerificationState = 'pending' | 'verified' | 'disputed' | 'rejected';

// ---------------------------------------------------------------------------
// slugify
// ---------------------------------------------------------------------------
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'unnamed';
}

// ---------------------------------------------------------------------------
// validateContribution
// ---------------------------------------------------------------------------
export type ValidateResult =
  | { ok: true; clean: Record<string, any> }
  | { ok: false; error: string; status: number };

export function validateContribution(
  entityType: string,
  input: Record<string, any>,
  config: EntityConfig,
  opts: { partial?: boolean } = {},
): ValidateResult {
  // `partial` (an edit) validates only the fields actually supplied and does
  // not enforce `required` — you may change `directions` without resupplying
  // `name`. A `create` is non-partial: required fields must be present.
  const { partial = false } = opts;
  const clean: Record<string, any> = {};
  const descriptorMap = new Map<string, FieldDescriptor>(
    config.fields.map((f) => [f.key, f]),
  );

  // Whitelist: only descriptor keys pass through
  for (const [key, value] of Object.entries(input)) {
    if (!descriptorMap.has(key)) continue; // silently drop non-descriptor keys
    clean[key] = value;
  }

  // Validate each descriptor
  for (const desc of config.fields) {
    const value = clean[desc.key];
    const missing = value === undefined || value === null || value === '';

    if (desc.required && missing && !partial) {
      return { ok: false, error: `${desc.key} is required`, status: 400 };
    }
    if (missing) continue; // optional + absent: skip further checks

    switch (desc.type) {
      case 'enum': {
        if (desc.enumValues && !desc.enumValues.includes(value)) {
          return {
            ok: false,
            error: `${desc.key} must be one of: ${desc.enumValues.join(', ')}`,
            status: 400,
          };
        }
        break;
      }
      case 'number':
      case 'latlng': {
        const n = Number(value);
        if (Number.isNaN(n)) {
          return { ok: false, error: `${desc.key} must be a number`, status: 400 };
        }
        if (desc.min !== undefined && n < desc.min) {
          return { ok: false, error: `${desc.key} must be >= ${desc.min}`, status: 400 };
        }
        if (desc.max !== undefined && n > desc.max) {
          return { ok: false, error: `${desc.key} must be <= ${desc.max}`, status: 400 };
        }
        clean[desc.key] = n;
        break;
      }
      case 'boolean': {
        // Accept booleans and boolean-ish strings
        if (typeof value === 'boolean') break;
        if (value === 'true')  { clean[desc.key] = true;  break; }
        if (value === 'false') { clean[desc.key] = false; break; }
        return { ok: false, error: `${desc.key} must be a boolean`, status: 400 };
      }
      case 'text':
      case 'longtext': {
        // Validate any field whose key ends in "Json" can be JSON-parsed
        if (desc.key.endsWith('Json') || desc.key.endsWith('json')) {
          try {
            JSON.parse(value);
          } catch {
            return { ok: false, error: `${desc.key} must be valid JSON`, status: 400 };
          }
        }
        break;
      }
    }
  }

  return { ok: true, clean };
}

// ---------------------------------------------------------------------------
// buildChangeset
// ---------------------------------------------------------------------------
export interface Changeset {
  before: Record<string, any>;
  after: Record<string, any>;
}

export function buildChangeset(
  before: Record<string, any>,
  after: Record<string, any>,
  fieldKeys: string[],
): Changeset {
  const changedBefore: Record<string, any> = {};
  const changedAfter: Record<string, any> = {};

  for (const key of fieldKeys) {
    // Only consider fields actually supplied in the update — a sparse edit
    // that omits a field must leave that field untouched, not null it out.
    if (!(key in after)) continue;
    const bVal = before[key];
    const aVal = after[key];
    // Only include keys whose value differs (use JSON comparison for objects/arrays)
    const bStr = JSON.stringify(bVal ?? null);
    const aStr = JSON.stringify(aVal ?? null);
    if (bStr !== aStr) {
      changedBefore[key] = bVal ?? null;
      changedAfter[key] = aVal ?? null;
    }
  }

  return { before: changedBefore, after: changedAfter };
}

// ---------------------------------------------------------------------------
// applyChangeset
// ---------------------------------------------------------------------------
export function applyChangeset(
  _targetRow: Record<string, any>,
  changeset: Changeset,
): Record<string, any> {
  // Returns the field set from changeset.after — to be patched onto the entity
  return { ...changeset.after };
}

// ---------------------------------------------------------------------------
// nextVersion
// ---------------------------------------------------------------------------
export function nextVersion(currentMax: number | null | undefined): number {
  return (currentMax ?? 0) + 1;
}

// ---------------------------------------------------------------------------
// canTransition
// ---------------------------------------------------------------------------
// Allowed transitions:
//   pending  → verified | disputed | rejected
//   disputed → verified | rejected
//   verified → disputed
//   rejected → (terminal)
const TRANSITIONS: Record<VerificationState, ReadonlySet<VerificationState>> = {
  pending:  new Set<VerificationState>(['verified', 'disputed', 'rejected']),
  disputed: new Set<VerificationState>(['verified', 'rejected']),
  verified: new Set<VerificationState>(['disputed']),
  rejected: new Set<VerificationState>(),
};

export function canTransition(from: VerificationState, to: VerificationState): boolean {
  return TRANSITIONS[from]?.has(to) ?? false;
}
