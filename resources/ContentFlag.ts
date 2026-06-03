// REST path: /ContentFlagResource
// (Named ContentFlagResource rather than ContentFlag because `ContentFlag` is
//  @export @table, so Harper auto-generates /ContentFlag as the table CRUD
//  endpoint. Using the Resource suffix gives us /ContentFlagResource for the
//  action-dispatched logic.)

import { Resource, tables } from 'harper';
import { compositeId, isoNow } from '../lib/utils.ts';
import { resolveCapabilities } from '../lib/auth/capabilities-pure.ts';
import {
  getReputation,
  bumpReputation,
  logModerationEvent,
  resolveCallerReview,
} from '../lib/governance/reputation.ts';
import { isBanned } from '../lib/governance/reputation-pure.ts';
import { canTransition } from '../lib/contributions/contribution-pure.ts';

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------
function getUserId(ctx: any): string | null {
  return ctx?.session?.user || null;
}

async function isMemberUser(
  context: any,
): Promise<{ ok: true; userId: string } | { ok: false }> {
  const userId = getUserId(context);
  if (process.env.NODE_ENV !== 'production') {
    return { ok: true, userId: userId || 'dev_local' };
  }
  if (!userId) return { ok: false };
  const record = await tables.WaitlistUser.get(userId);
  if (!record) return { ok: false };
  const caps = resolveCapabilities(record as any);
  if (!caps.isMember) return { ok: false };
  return { ok: true, userId };
}

// ---------------------------------------------------------------------------
// Valid flag reasons
// ---------------------------------------------------------------------------
const VALID_REASONS = new Set(['inaccurate', 'outdated', 'harmful', 'duplicate', 'spam']);

// ---------------------------------------------------------------------------
// Resource
// ---------------------------------------------------------------------------
export class ContentFlagResource extends Resource {
  allowRead()   { return true; }
  allowCreate() { return true; }
  allowUpdate() { return true; }
  allowDelete() { return false; }

  // -------------------------------------------------------------------------
  // GET
  // -------------------------------------------------------------------------
  // /ContentFlagResource            → own flags for the caller
  // /ContentFlagResource?status=open → open flags (requires canReview)
  async get(target?: any) {
    const ctx = this.getContext();
    const param = (n: string): any =>
      typeof target?.get === 'function' ? target.get(n) : target?.[n];

    const status = param('status');

    if (status === 'open') {
      // Requires review privilege
      const reviewer = await resolveCallerReview(tables, ctx);
      if (!reviewer.ok) {
        const uid = getUserId(ctx);
        if (!uid) return new Response('Auth required', { status: 401 });
        return new Response('Forbidden — canReview required to list open flags', { status: 403 });
      }

      const flags: any[] = [];
      for await (const row of tables.ContentFlag.search({
        conditions: [{ attribute: 'status', value: 'open', comparator: 'equals' as const }],
      })) {
        flags.push(row);
      }
      flags.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      return { flags, total: flags.length };
    }

    // Default: own flags
    const member = await isMemberUser(ctx);
    if (!member.ok) {
      const uid = getUserId(ctx);
      if (!uid) return new Response('Auth required', { status: 401 });
      return new Response('Forbidden', { status: 403 });
    }

    const flags: any[] = [];
    for await (const row of tables.ContentFlag.search({
      conditions: [{ attribute: 'reportedBy', value: member.userId, comparator: 'equals' as const }],
    })) {
      flags.push(row);
    }
    flags.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return { flags, total: flags.length };
  }

  // -------------------------------------------------------------------------
  // POST — submit a flag
  // -------------------------------------------------------------------------
  async post(data: any) {
    const ctx = this.getContext();

    // Capability: must be a member (dev-bypassed in non-production).
    // Check capability helper first so dev bypass applies.
    const member = await isMemberUser(ctx);
    if (!member.ok) {
      const uid = getUserId(ctx);
      if (!uid) return new Response('Auth required', { status: 401 });
      return new Response('Forbidden', { status: 403 });
    }
    const reporterId = member.userId;

    // Check reporter ban status
    const reporterRep = await getReputation(tables, reporterId);
    if (isBanned(reporterRep)) {
      return new Response('Forbidden — account is banned', { status: 403 });
    }

    // Validate required fields
    const flaggedEntityType = data?.flaggedEntityType;
    const flaggedEntityId   = data?.flaggedEntityId;
    const reason            = data?.reason;

    if (!flaggedEntityType) return new Response('flaggedEntityType required', { status: 400 });
    if (!flaggedEntityId)   return new Response('flaggedEntityId required', { status: 400 });
    if (!reason)            return new Response('reason required', { status: 400 });
    if (!VALID_REASONS.has(reason)) {
      return new Response(
        `reason must be one of: ${[...VALID_REASONS].join(', ')}`,
        { status: 400 },
      );
    }

    const flaggedContributionId = data?.flaggedContributionId ?? null;
    const notes = data?.notes ?? null;

    // Dedup: one open flag per reporter+entity
    for await (const existing of tables.ContentFlag.search({
      conditions: [
        { attribute: 'reportedBy', value: reporterId, comparator: 'equals' as const },
        { attribute: 'flaggedEntityId', value: flaggedEntityId, comparator: 'equals' as const },
        { attribute: 'status', value: 'open', comparator: 'equals' as const },
      ],
    })) {
      if (existing) {
        return new Response(
          'You already have an open flag on this entity',
          { status: 409 },
        );
      }
    }

    const now = isoNow();
    const flagId = compositeId([flaggedEntityType, flaggedEntityId, reporterId, String(Date.now())]);

    const flag: Record<string, any> = {
      id: flagId,
      flaggedEntityType,
      flaggedEntityId,
      flaggedContributionId,
      reportedBy: reporterId,
      reason,
      status: 'open',
      reviewedBy: null,
      reviewedAt: null,
      notes,
      createdAt: now,
    };
    await tables.ContentFlag.put(flag);

    // If the flag targets a verified contribution → move it to disputed
    if (flaggedContributionId) {
      const contribution = await tables.Contribution.get(flaggedContributionId);
      if (contribution && (contribution as any).verificationState === 'verified') {
        if (canTransition('verified', 'disputed')) {
          await tables.Contribution.patch(flaggedContributionId, {
            verificationState: 'disputed',
          });

          // Bump author's flagsReceived
          const authorId = (contribution as any).authorId;
          if (authorId) {
            await bumpReputation(tables, authorId, { flagsReceived: 1 });
          }

          // Log moderation event
          await logModerationEvent(tables, {
            actorId: reporterId,
            action: 'flagged',
            entityType: 'Contribution',
            entityId: flaggedContributionId,
            reason,
          });
        }
      }
    }

    // Bump reporter's flagsSubmitted
    await bumpReputation(tables, reporterId, { flagsSubmitted: 1 });

    return flag;
  }

  // -------------------------------------------------------------------------
  // PATCH — review a flag (dismiss or action)
  // -------------------------------------------------------------------------
  async patch(data: any) {
    const ctx = this.getContext();

    // Requires canReview
    const reviewer = await resolveCallerReview(tables, ctx);
    if (!reviewer.ok) {
      const uid = getUserId(ctx);
      if (!uid) return new Response('Auth required', { status: 401 });
      return new Response('Forbidden — canReview required', { status: 403 });
    }
    const reviewerId = reviewer.userId;

    const id          = data?.id;
    const disposition = data?.disposition;
    const notes       = data?.notes ?? null;

    if (!id)          return new Response('id required', { status: 400 });
    if (!disposition) return new Response('disposition required', { status: 400 });
    if (disposition !== 'dismiss' && disposition !== 'action') {
      return new Response('disposition must be "dismiss" or "action"', { status: 400 });
    }

    const flag = await tables.ContentFlag.get(id);
    if (!flag) return new Response('ContentFlag not found', { status: 404 });
    if ((flag as any).status !== 'open') {
      return new Response('Flag is not open', { status: 409 });
    }

    const now = isoNow();

    if (disposition === 'dismiss') {
      const updated = { status: 'dismissed', reviewedBy: reviewerId, reviewedAt: now, notes };
      await tables.ContentFlag.patch(id, updated);
      await logModerationEvent(tables, {
        actorId: reviewerId,
        action: 'flag_dismissed',
        entityType: 'ContentFlag',
        entityId: id,
        reason: notes ?? undefined,
      });
      return { ...flag, ...updated };
    }

    // disposition === 'action'
    const actionUpdates = { status: 'actioned', reviewedBy: reviewerId, reviewedAt: now, notes };
    await tables.ContentFlag.patch(id, actionUpdates);

    await logModerationEvent(tables, {
      actorId: reviewerId,
      action: 'flag_actioned',
      entityType: 'ContentFlag',
      entityId: id,
      reason: notes ?? undefined,
    });

    // If there is a linked contribution, reject it
    const contribId = (flag as any).flaggedContributionId;
    if (contribId) {
      const contribution = await tables.Contribution.get(contribId);
      if (contribution) {
        const currentState = (contribution as any).verificationState;
        if (canTransition(currentState, 'rejected')) {
          await tables.Contribution.patch(contribId, {
            verificationState: 'rejected',
          });

          const authorId = (contribution as any).authorId;
          if (authorId) {
            await bumpReputation(tables, authorId, { rejected: 1 });
          }
        }
      }
    }

    return { ...flag, ...actionUpdates };
  }
}
