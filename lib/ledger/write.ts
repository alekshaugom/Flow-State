// Shared write helper — used by both LedgerResource and BountyResource.
// This IS a Harper-touching module (takes `tables` as a parameter to avoid
// a static import that would break pure-lib tests).

import { applyEntry, computeBalance, type LedgerType } from './ledger-pure.ts';
import { compositeId, isoNow } from '../utils.ts';

export interface WriteLedgerEntryOptions {
  bountyId?:            string | null;
  counterpartyUserId?:  string | null;
  note?:                string | null;
}

export type WriteLedgerEntryResult =
  | { ok: true;  entry: any }
  | { ok: false; error: string; status: number };

/**
 * Atomically read the user's current balance, validate the proposed entry,
 * and write a new LedgerEntry row with the updated balanceAfterCents.
 *
 * @param tables        Harper tables namespace
 * @param userId        Whose ledger to write to
 * @param type          LedgerType (sign must match)
 * @param amountCents   SIGNED: positive for credits, negative for debits
 * @param opts          Optional metadata (bountyId, counterpartyUserId, note)
 */
export async function writeLedgerEntry(
  tables: any,
  userId: string,
  type: LedgerType,
  amountCents: number,
  opts: WriteLedgerEntryOptions = {},
): Promise<WriteLedgerEntryResult> {
  // Read all existing entries for this user to compute the running balance.
  // We use the balanceAfterCents snapshot on the most recent entry if available
  // for the running balance.
  const existingEntries: any[] = [];
  for await (const row of tables.LedgerEntry.search({
    conditions: [
      { attribute: 'userId', value: userId, comparator: 'equals' as const },
    ],
  })) {
    existingEntries.push(row);
  }

  // Balance is the full signed sum — order-independent and self-correcting.
  // `balanceAfterCents` on each row is an audit snapshot, NOT the read path:
  // trusting the latest snapshot would propagate any single bad value and is
  // sensitive to createdAt collisions. The per-user entry count is small.
  const currentBalance = computeBalance(existingEntries);

  // Validate and compute new balance
  const result = applyEntry(currentBalance, type, amountCents);
  if (!result.ok) {
    return { ok: false, error: result.error, status: 400 };
  }

  const now = isoNow();
  const entry: Record<string, any> = {
    id:                compositeId([userId, type, String(Date.now())]),
    userId,
    type,
    amountCents,
    balanceAfterCents: result.balanceAfter,
    bountyId:          opts.bountyId          ?? null,
    counterpartyUserId: opts.counterpartyUserId ?? null,
    note:              opts.note              ?? null,
    createdAt:         now,
  };

  await tables.LedgerEntry.put(entry);
  return { ok: true, entry };
}

/**
 * Get the current balance for a user by reading their ledger entries.
 */
export async function getUserBalance(tables: any, userId: string): Promise<number> {
  const entries: any[] = [];
  for await (const row of tables.LedgerEntry.search({
    conditions: [
      { attribute: 'userId', value: userId, comparator: 'equals' as const },
    ],
  })) {
    entries.push(row);
  }
  // Full signed sum — the authoritative balance (see writeLedgerEntry note).
  return computeBalance(entries);
}
