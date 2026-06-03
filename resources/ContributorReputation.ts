// REST path: /ContributorReputationResource
// (Named ContributorReputationResource rather than ContributorReputation because
//  `ContributorReputation` is @export @table, so Harper auto-generates
//  /ContributorReputation as the table CRUD endpoint.)

import { Resource, tables } from 'harper';
import { resolveCapabilities } from '../lib/auth/capabilities-pure.ts';
import {
  getReputation,
  logModerationEvent,
  resolveCallerReview,
} from '../lib/governance/reputation.ts';
import { resolveTrustTier } from '../lib/governance/reputation-pure.ts';
import { isoNow } from '../lib/utils.ts';

function getUserId(ctx: any): string | null {
  return ctx?.session?.user || null;
}

async function isAdminUser(
  context: any,
): Promise<{ ok: true; adminId: string } | { ok: false }> {
  const adminId = getUserId(context);
  if (process.env.NODE_ENV !== 'production') {
    return { ok: true, adminId: adminId || 'dev_local' };
  }
  if (!adminId) return { ok: false };
  const record = await tables.WaitlistUser.get(adminId);
  if (!record) return { ok: false };
  const caps = resolveCapabilities(record as any);
  if (!caps.isAdmin) return { ok: false };
  return { ok: true, adminId };
}

export class ContributorReputationResource extends Resource {
  allowRead()   { return true; }
  allowCreate() { return false; }
  allowUpdate() { return true; }
  allowDelete() { return false; }

  // -------------------------------------------------------------------------
  // GET
  // -------------------------------------------------------------------------
  // /ContributorReputationResource          → own reputation + derived tier
  // /ContributorReputationResource?userId=X → admin/moderator only
  async get(target?: any) {
    const ctx = this.getContext();
    const param = (n: string): any =>
      typeof target?.get === 'function' ? target.get(n) : target?.[n];

    const queryUserId = param('userId');

    if (queryUserId) {
      // Reading another user's reputation requires review privilege
      const reviewer = await resolveCallerReview(tables, ctx);
      if (!reviewer.ok) {
        const uid = getUserId(ctx);
        if (!uid) return new Response('Auth required', { status: 401 });
        return new Response('Forbidden — admin or moderator required to view other users', { status: 403 });
      }

      const rep = await getReputation(tables, queryUserId);
      const tier = resolveTrustTier(rep);
      return { ...rep, tier };
    }

    // Own reputation
    if (process.env.NODE_ENV !== 'production') {
      const userId = getUserId(ctx) || 'dev_local';
      const rep = await getReputation(tables, userId);
      const tier = resolveTrustTier(rep);
      return { ...rep, tier };
    }

    const userId = getUserId(ctx);
    if (!userId) return new Response('Auth required', { status: 401 });

    const rep = await getReputation(tables, userId);
    const tier = resolveTrustTier(rep);
    return { ...rep, tier };
  }

  // -------------------------------------------------------------------------
  // PATCH — admin-only: set manualTier or bannedAt
  // -------------------------------------------------------------------------
  // Do NOT allow writing earned counts (acceptedContributions, etc.) via API.
  async patch(data: any) {
    const ctx = this.getContext();

    // Admin-only (not just canReview — setting tier/ban is an admin action)
    const admin = await isAdminUser(ctx);
    if (!admin.ok) {
      const uid = getUserId(ctx);
      if (!uid) return new Response('Auth required', { status: 401 });
      return new Response('Forbidden — admin only', { status: 403 });
    }
    const adminId = admin.adminId;

    const targetUserId = data?.userId;
    if (!targetUserId) return new Response('userId required', { status: 400 });

    const now = isoNow();

    // --- manualTier ---
    if ('manualTier' in data) {
      const newTier = data.manualTier;
      if (newTier !== null && newTier !== 'moderator') {
        return new Response('manualTier must be "moderator" or null', { status: 400 });
      }

      const rep = await getReputation(tables, targetUserId);
      await tables.ContributorReputation.put({
        id: targetUserId,
        userId: targetUserId,
        ...rep,
        manualTier: newTier,
        updatedAt: now,
        lastTierChangeAt: now,
      });

      await logModerationEvent(tables, {
        actorId: adminId,
        action: 'tier_changed',
        entityType: 'ContributorReputation',
        entityId: targetUserId,
        reason: newTier ? `Set manualTier to ${newTier}` : 'Cleared manualTier',
      });

      const updated = await getReputation(tables, targetUserId);
      return { ...updated, tier: resolveTrustTier(updated) };
    }

    // --- ban / unban ---
    if ('banned' in data) {
      const shouldBan = !!data.banned;
      const rep = await getReputation(tables, targetUserId);

      await tables.ContributorReputation.put({
        id: targetUserId,
        userId: targetUserId,
        ...rep,
        bannedAt: shouldBan ? now : null,
        updatedAt: now,
      });

      await logModerationEvent(tables, {
        actorId: adminId,
        action: 'banned',
        entityType: 'ContributorReputation',
        entityId: targetUserId,
        reason: shouldBan ? 'Banned by admin' : 'Unbanned by admin',
      });

      const updated = await getReputation(tables, targetUserId);
      return { ...updated, tier: resolveTrustTier(updated) };
    }

    return new Response('Must supply manualTier or banned field', { status: 400 });
  }
}
