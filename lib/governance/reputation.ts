// Harper-touching governance helpers.
// These take `tables` as an argument to avoid a static circular import and to
// keep the pure logic in reputation-pure.ts free of Harper.

import { compositeId, isoNow } from '../utils.ts';
import { resolveCapabilities } from '../auth/capabilities-pure.ts';
import {
  resolveTrustTier,
  canReview,
  applyReputationDelta,
  isBanned,
  type ReputationRecord,
  type ReputationDelta,
  type TrustTier,
} from './reputation-pure.ts';

// ---------------------------------------------------------------------------
// getUserId helper (mirrors pattern in all resources)
// ---------------------------------------------------------------------------
function getUserId(ctx: any): string | null {
  return ctx?.session?.user || null;
}

// ---------------------------------------------------------------------------
// Zeroed default reputation (for users with no record yet)
// ---------------------------------------------------------------------------
function defaultRep(userId: string): ReputationRecord & { id: string; userId: string } {
  return {
    id: userId,
    userId,
    acceptedContributions: 0,
    rejectedContributions: 0,
    flagsReceived: 0,
    flagsSubmitted: 0,
    manualTier: null,
    bannedAt: null,
    lastTierChangeAt: null,
    updatedAt: null,
  };
}

// ---------------------------------------------------------------------------
// getReputation
// ---------------------------------------------------------------------------
/**
 * Load a ContributorReputation record, or return a zeroed default if none exists.
 * Does NOT create the record — use bumpReputation for mutations.
 */
export async function getReputation(
  tables: any,
  userId: string,
): Promise<ReputationRecord & { id: string; userId: string }> {
  const existing = await tables.ContributorReputation.get(userId);
  if (existing) return existing as any;
  return defaultRep(userId);
}

// ---------------------------------------------------------------------------
// bumpReputation
// ---------------------------------------------------------------------------
/**
 * Load-or-create a ContributorReputation record, apply a delta to the earned
 * counts, recompute the tier (tier is derived-on-read; we store the timestamps
 * for tier change events), then put it back.
 *
 * Note: tier itself is NOT stored — it is always recomputed from the counts
 * via resolveTrustTier(). This avoids stale cached tier fields.
 */
export async function bumpReputation(
  tables: any,
  userId: string,
  delta: ReputationDelta,
): Promise<void> {
  const existing = (await tables.ContributorReputation.get(userId)) as any;
  const current: ReputationRecord = existing ?? defaultRep(userId);

  const tierBefore = resolveTrustTier(current);
  const updated = applyReputationDelta(current, delta);
  const tierAfter = resolveTrustTier(updated);

  const now = isoNow();
  const record: Record<string, any> = {
    id: userId,
    userId,
    ...updated,
    updatedAt: now,
    lastTierChangeAt:
      tierAfter !== tierBefore ? now : (current.lastTierChangeAt ?? null),
  };

  await tables.ContributorReputation.put(record);
}

// ---------------------------------------------------------------------------
// logModerationEvent
// ---------------------------------------------------------------------------
export async function logModerationEvent(
  tables: any,
  opts: {
    actorId: string;
    action: string;
    entityType?: string;
    entityId?: string;
    reason?: string;
  },
): Promise<void> {
  const id = compositeId([opts.action, opts.entityId ?? '', String(Date.now())]);
  await tables.ModerationEvent.put({
    id,
    actorId: opts.actorId,
    action: opts.action,
    entityType: opts.entityType ?? null,
    entityId: opts.entityId ?? null,
    reason: opts.reason ?? null,
    createdAt: isoNow(),
  });
}

// ---------------------------------------------------------------------------
// resolveCallerReview
// ---------------------------------------------------------------------------
/**
 * Determine if the request caller has review rights (canReview = isAdmin OR
 * trusted/moderator tier, not banned).
 *
 * Dev bypass: in non-production, always returns ok with isAdmin=true and
 * tier='moderator' so curl/local testing works without real users.
 *
 * Capability-helper-FIRST ordering: check the helper before getUserId→401 so
 * the dev bypass is reachable for unauthenticated curl in dev.
 */
export async function resolveCallerReview(
  tables: any,
  ctx: any,
): Promise<
  | { ok: true; userId: string; isAdmin: boolean; tier: TrustTier }
  | { ok: false }
> {
  // Dev bypass: non-prod always passes
  if (process.env.NODE_ENV !== 'production') {
    const userId = getUserId(ctx) || 'dev_local';
    return { ok: true, userId, isAdmin: true, tier: 'moderator' };
  }

  const userId = getUserId(ctx);
  if (!userId) return { ok: false };

  const userRecord = await tables.WaitlistUser.get(userId);
  if (!userRecord) return { ok: false };

  const caps = resolveCapabilities(userRecord as any);
  const rep = await getReputation(tables, userId);

  // Banned users cannot review
  if (isBanned(rep)) return { ok: false };

  const tier = resolveTrustTier(rep);
  const allowed = canReview(caps.isAdmin, tier);
  if (!allowed) return { ok: false };

  return { ok: true, userId, isAdmin: caps.isAdmin, tier };
}
