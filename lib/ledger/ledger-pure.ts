// Pure logic — NO Harper imports. Safe to test without a running Harper instance.
//
// deposit / extraction types are RESERVED for slice 23 (Stripe on/off ramps).
// Do not implement them here; they will be added as new LedgerType values in 23.

export type LedgerType =
  | 'grant'
  | 'bounty_fund'
  | 'bounty_refund'
  | 'bounty_award'
  | 'platform_fee';
// Reserved for slice 23: 'deposit' | 'extraction'

/** Maximum grant / fund amount we'll accept (100,000 USD in cents). */
export const MAX_AMOUNT_CENTS = 100_000_00;

// ---------------------------------------------------------------------------
// computeBalance
// ---------------------------------------------------------------------------
/** Signed sum of all entries for a user. Positive = credit balance. */
export function computeBalance(entries: { amountCents: number }[]): number {
  return entries.reduce((sum, e) => sum + e.amountCents, 0);
}

// ---------------------------------------------------------------------------
// applyEntry
// ---------------------------------------------------------------------------
/**
 * Validate a proposed ledger entry and return the new balance.
 *
 * Sign convention:
 *   credits (positive amountCents): grant, bounty_refund, bounty_award
 *   debits  (negative amountCents): bounty_fund, platform_fee
 *
 * Invariants:
 *   - amountCents must be a nonzero integer
 *   - sign must match type
 *   - debits must not drive balance below 0 (no-overdraft)
 */
export function applyEntry(
  currentBalance: number,
  type: LedgerType,
  amountCents: number,
): { ok: true; balanceAfter: number } | { ok: false; error: string } {
  // Must be a nonzero integer
  if (!Number.isInteger(amountCents) || amountCents === 0) {
    return { ok: false, error: 'amountCents must be a nonzero integer' };
  }

  const isCredit = type === 'grant' || type === 'bounty_refund' || type === 'bounty_award';
  const isDebit  = type === 'bounty_fund' || type === 'platform_fee';

  if (isCredit && amountCents < 0) {
    return { ok: false, error: `${type} must be a positive amount (credit)` };
  }
  if (isDebit && amountCents > 0) {
    return { ok: false, error: `${type} must be a negative amount (debit)` };
  }

  const balanceAfter = currentBalance + amountCents;

  // No-overdraft: debit must not push balance below 0
  if (isDebit && balanceAfter < 0) {
    return {
      ok: false,
      error: `Insufficient balance: current ${currentBalance}, debit ${Math.abs(amountCents)}`,
    };
  }

  return { ok: true, balanceAfter };
}

// ---------------------------------------------------------------------------
// bountyEscrow
// ---------------------------------------------------------------------------
/**
 * Compute the escrow currently held for a single bounty from its ledger entries.
 *
 *   escrow = Σ |bounty_fund| − Σ bounty_refund − Σ bounty_award
 *
 * Entries passed here should be filtered to one bounty's entries.
 * bounty_fund entries have negative amountCents so we take abs().
 */
export function bountyEscrow(
  entries: { type: LedgerType; amountCents: number }[],
): number {
  let funded   = 0;
  let refunded = 0;
  let awarded  = 0;

  for (const e of entries) {
    if (e.type === 'bounty_fund')   funded   += Math.abs(e.amountCents);
    if (e.type === 'bounty_refund') refunded += e.amountCents;
    if (e.type === 'bounty_award')  awarded  += e.amountCents;
  }

  return funded - refunded - awarded;
}

// ---------------------------------------------------------------------------
// summarizeForProfile
// ---------------------------------------------------------------------------
export interface ProfileSummary {
  putInCents:       number; // grant + (deposit when it exists in slice 23)
  collectedCents:   number; // bounty_award received
  extractedCents:   number; // extraction (slice 23) — always 0 here
  fundedCents:      number; // |bounty_fund| amounts posted to bounties
  balanceCents:     number; // current balance
}

export function summarizeForProfile(
  entries: { type: LedgerType; amountCents: number }[],
): ProfileSummary {
  let putIn     = 0;
  let collected = 0;
  let funded    = 0;

  for (const e of entries) {
    if (e.type === 'grant')        putIn     += e.amountCents;
    // 'deposit' (slice 23) will also add to putIn; reserved here
    if (e.type === 'bounty_award') collected += e.amountCents;
    if (e.type === 'bounty_fund')  funded    += Math.abs(e.amountCents);
  }

  return {
    putInCents:     putIn,
    collectedCents: collected,
    extractedCents: 0, // extraction is slice 23
    fundedCents:    funded,
    balanceCents:   computeBalance(entries),
  };
}

// ---------------------------------------------------------------------------
// validateAmount
// ---------------------------------------------------------------------------
/** Validate that a given amount is a positive integer within the sane max. */
export function validateAmount(
  cents: number,
): { ok: true } | { ok: false; error: string } {
  if (!Number.isInteger(cents) || cents <= 0) {
    return { ok: false, error: 'amountCents must be a positive integer' };
  }
  if (cents > MAX_AMOUNT_CENTS) {
    return {
      ok: false,
      error: `amountCents must be ≤ ${MAX_AMOUNT_CENTS} (${MAX_AMOUNT_CENTS / 100} USD)`,
    };
  }
  return { ok: true };
}
