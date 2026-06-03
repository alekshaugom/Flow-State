// Pure logic — NO Harper imports. Safe to test without a running Harper instance.

export type BountyStatus = 'open' | 'awarded' | 'settled' | 'cancelled' | 'expired';

export const ALLOWED_ENTITY_TYPES = [
  'access-point',
  'rapid',
  'shuttle-business',
  'outfitter',
  'photo',
  'other',
] as const;

// ---------------------------------------------------------------------------
// validateBountyInput
// ---------------------------------------------------------------------------
export interface BountyInputClean {
  title: string;
  description?: string;
  acceptanceCriteria: string;
  sectionId: string;
  entityType: string;
  entityId?: string;
  corridorId?: string;
  fundCents: number;
  expiresAt?: string;
}

export function validateBountyInput(
  input: Record<string, any>,
): { ok: true; clean: BountyInputClean } | { ok: false; error: string; status: 400 } {
  const title = input?.title?.trim?.() ?? '';
  if (!title) {
    return { ok: false, error: 'title is required', status: 400 };
  }

  const acceptanceCriteria = input?.acceptanceCriteria?.trim?.() ?? '';
  if (!acceptanceCriteria) {
    return { ok: false, error: 'acceptanceCriteria is required', status: 400 };
  }

  const entityType = input?.entityType?.trim?.() ?? '';
  if (!entityType) {
    return { ok: false, error: 'entityType is required', status: 400 };
  }
  if (!(ALLOWED_ENTITY_TYPES as readonly string[]).includes(entityType)) {
    return {
      ok: false,
      error: `entityType must be one of: ${ALLOWED_ENTITY_TYPES.join(', ')}`,
      status: 400,
    };
  }

  const sectionId = input?.sectionId?.trim?.() ?? '';
  if (!sectionId) {
    return { ok: false, error: 'sectionId is required (display anchor)', status: 400 };
  }

  const fundCents = input?.fundCents;
  if (!Number.isInteger(fundCents) || fundCents <= 0) {
    return { ok: false, error: 'fundCents must be a positive integer', status: 400 };
  }

  const clean: BountyInputClean = {
    title,
    acceptanceCriteria,
    sectionId,
    entityType,
    fundCents,
  };

  if (input?.description) clean.description = String(input.description);
  if (input?.entityId)    clean.entityId    = String(input.entityId);
  if (input?.corridorId)  clean.corridorId  = String(input.corridorId);
  if (input?.expiresAt)   clean.expiresAt   = String(input.expiresAt);

  return { ok: true, clean };
}

// ---------------------------------------------------------------------------
// canTransitionBounty
// ---------------------------------------------------------------------------
//   open     → awarded | settled | cancelled | expired
//   awarded  → settled
//   settled  | cancelled | expired → terminal (no further transitions)
const BOUNTY_TRANSITIONS: Record<BountyStatus, ReadonlySet<BountyStatus>> = {
  open:      new Set<BountyStatus>(['awarded', 'settled', 'cancelled', 'expired']),
  awarded:   new Set<BountyStatus>(['settled']),
  settled:   new Set<BountyStatus>(),
  cancelled: new Set<BountyStatus>(),
  expired:   new Set<BountyStatus>(),
};

export function canTransitionBounty(from: BountyStatus, to: BountyStatus): boolean {
  return BOUNTY_TRANSITIONS[from]?.has(to) ?? false;
}

// ---------------------------------------------------------------------------
// canAward
// ---------------------------------------------------------------------------
/**
 * Returns false if reviewerId === submitterId (reviewer must not approve own work).
 * Self-fulfillment (funder == awardee) is permitted at the economics level —
 * this only guards the review integrity.
 */
export function canAward(reviewerId: string, submitterId: string): boolean {
  return reviewerId !== submitterId;
}

// ---------------------------------------------------------------------------
// isExpired
// ---------------------------------------------------------------------------
export function isExpired(
  expiresAt: string | null | undefined,
  nowIso: string,
): boolean {
  if (!expiresAt) return false;
  return expiresAt <= nowIso;
}
