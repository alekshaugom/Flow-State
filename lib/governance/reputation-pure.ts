// Pure logic — NO Harper imports. Safe to test without a running Harper instance.
//
// Trust tier thresholds are deliberately conservative and empirically tunable.
// Recalibrate ESTABLISHED_MIN_ACCEPTED and TRUSTED_MIN_ACCEPTED after launch
// once real acceptance/rejection distributions are available.

export type TrustTier = 'new' | 'established' | 'trusted' | 'moderator';

// ---------------------------------------------------------------------------
// Tunable constants (documented as recalibration targets)
// ---------------------------------------------------------------------------

/** Minimum accepted contributions to graduate from 'new' to 'established'. */
export const ESTABLISHED_MIN_ACCEPTED = 3;

/** Minimum accepted contributions to graduate from 'established' to 'trusted'. */
export const TRUSTED_MIN_ACCEPTED = 15;

/**
 * Maximum rejection rate (rejections / total decisions) allowed to maintain
 * an elevated tier. Contributors above this threshold stay at 'new' regardless
 * of their accepted count.
 */
export const MAX_REJECTION_RATE = 0.25;

// ---------------------------------------------------------------------------
// Partial reputation shape (loose — accepts table rows or zeroed defaults)
// ---------------------------------------------------------------------------
export interface ReputationRecord {
  acceptedContributions?: number | null;
  rejectedContributions?: number | null;
  flagsReceived?: number | null;
  flagsSubmitted?: number | null;
  manualTier?: string | null;
  bannedAt?: string | null;
  lastTierChangeAt?: string | null;
  updatedAt?: string | null;
}

// ---------------------------------------------------------------------------
// resolveTrustTier
// ---------------------------------------------------------------------------
/**
 * Derive a contributor's trust tier from their reputation record.
 *
 * Banned status is handled by the caller (via isBanned) — this function still
 * returns the earned tier so callers can decide how to surface it.
 *
 * Precedence:
 *   1. manualTier === 'moderator' → 'moderator' (admin promotion overrides everything)
 *   2. accepted >= TRUSTED_MIN and rejectionRate <= MAX → 'trusted'
 *   3. accepted >= ESTABLISHED_MIN and rejectionRate <= MAX → 'established'
 *   4. everything else → 'new'
 */
export function resolveTrustTier(rep: ReputationRecord): TrustTier {
  const accepted = rep.acceptedContributions ?? 0;
  const rejected = rep.rejectedContributions ?? 0;
  const total = accepted + rejected;
  const rejectionRate = total > 0 ? rejected / total : 0;

  if (rep.manualTier === 'moderator') return 'moderator';

  if (accepted >= TRUSTED_MIN_ACCEPTED && rejectionRate <= MAX_REJECTION_RATE) {
    return 'trusted';
  }
  if (accepted >= ESTABLISHED_MIN_ACCEPTED && rejectionRate <= MAX_REJECTION_RATE) {
    return 'established';
  }
  return 'new';
}

// ---------------------------------------------------------------------------
// canReview
// ---------------------------------------------------------------------------
/**
 * Returns true if the user is permitted to verify or reject contributions.
 * Admins always can; 'trusted' and 'moderator' tier contributors can too.
 * 'new' and 'established' cannot.
 */
export function canReview(isAdmin: boolean, tier: TrustTier): boolean {
  return isAdmin || tier === 'trusted' || tier === 'moderator';
}

// ---------------------------------------------------------------------------
// applyReputationDelta
// ---------------------------------------------------------------------------
export interface ReputationDelta {
  accepted?: number;
  rejected?: number;
  flagsReceived?: number;
  flagsSubmitted?: number;
}

/**
 * Apply a delta to a reputation record. Pure — returns a new record with
 * updated counts; does not mutate the input.
 */
export function applyReputationDelta(
  rep: ReputationRecord,
  delta: ReputationDelta,
): ReputationRecord {
  return {
    ...rep,
    acceptedContributions: (rep.acceptedContributions ?? 0) + (delta.accepted ?? 0),
    rejectedContributions: (rep.rejectedContributions ?? 0) + (delta.rejected ?? 0),
    flagsReceived: (rep.flagsReceived ?? 0) + (delta.flagsReceived ?? 0),
    flagsSubmitted: (rep.flagsSubmitted ?? 0) + (delta.flagsSubmitted ?? 0),
  };
}

// ---------------------------------------------------------------------------
// isBanned
// ---------------------------------------------------------------------------
/** Returns true if the reputation record has a bannedAt timestamp set. */
export function isBanned(rep: ReputationRecord | null | undefined): boolean {
  return !!(rep?.bannedAt);
}
