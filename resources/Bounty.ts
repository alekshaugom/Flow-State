// REST path: /BountyResource
// (Named BountyResource rather than Bounty because `Bounty` is @export @table,
//  so Harper auto-generates /Bounty as the table CRUD endpoint. Using the
//  Resource suffix gives us /BountyResource for the action-dispatched logic,
//  mirroring ContributionResource → /ContributionResource.)

import { Resource, tables } from 'harper';
import { compositeId, isoNow } from '../lib/utils.ts';
import { resolveCapabilities } from '../lib/auth/capabilities-pure.ts';
import {
  validateBountyInput,
  canTransitionBounty,
  canAward,
} from '../lib/bounties/bounty-pure.ts';
import { validateAmount } from '../lib/ledger/ledger-pure.ts';
import { writeLedgerEntry, getUserBalance } from '../lib/ledger/write.ts';
import { applyVerifiedContribution } from '../lib/contributions/apply-verification.ts';
import { canTransition } from '../lib/contributions/contribution-pure.ts';
import {
  resolveCallerReview,
  bumpReputation,
  logModerationEvent,
} from '../lib/governance/reputation.ts';

// ---------------------------------------------------------------------------
// Auth helpers (mirroring Contribution.ts / AdminAuth.ts)
// ---------------------------------------------------------------------------
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

async function isFunder(
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
  if (!caps.canFund) return { ok: false };
  return { ok: true, userId };
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------
async function getBountyFundEntries(bountyId: string): Promise<any[]> {
  const out: any[] = [];
  for await (const row of tables.LedgerEntry.search({
    conditions: [{ attribute: 'bountyId', value: bountyId, comparator: 'equals' as const }],
  })) {
    out.push(row);
  }
  return out;
}

async function getContributionsForBounty(bountyId: string): Promise<any[]> {
  const out: any[] = [];
  for await (const row of tables.Contribution.search({
    conditions: [{ attribute: 'bountyId', value: bountyId, comparator: 'equals' as const }],
  })) {
    out.push(row);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Resource
// ---------------------------------------------------------------------------
export class BountyResource extends Resource {
  allowRead()   { return true; }
  allowCreate() { return true; }
  allowUpdate() { return true; }
  allowDelete() { return false; }

  // -------------------------------------------------------------------------
  // GET — public read
  // -------------------------------------------------------------------------
  // /BountyResource/:id             → bounty detail (ledger entries + candidate contributions)
  // /BountyResource?entityType=&entityId=  → list
  // /BountyResource?corridorId=     → list
  async get(target?: any) {
    const param = (n: string): any =>
      typeof target?.get === 'function' ? target.get(n) : target?.[n];

    const id = param('id');
    if (id) {
      const bounty = await tables.Bounty.get(id);
      if (!bounty) return new Response('Bounty not found', { status: 404 });
      const fundEntries    = await getBountyFundEntries(id);
      const contributions  = await getContributionsForBounty(id);
      return { bounty, fundEntries, contributions };
    }

    const entityType = param('entityType');
    const entityId   = param('entityId');
    const corridorId = param('corridorId');

    const conditions: { attribute: string; value: string; comparator: 'equals' }[] = [];
    if (entityType) conditions.push({ attribute: 'entityType', value: entityType, comparator: 'equals' as const });
    if (entityId)   conditions.push({ attribute: 'entityId',   value: entityId,   comparator: 'equals' as const });
    if (corridorId) conditions.push({ attribute: 'corridorId', value: corridorId, comparator: 'equals' as const });

    const bounties: any[] = [];
    for await (const row of tables.Bounty.search({ conditions })) {
      bounties.push(row);
    }
    bounties.sort((a: any, b: any) => (b.postedAt || '').localeCompare(a.postedAt || ''));
    return { bounties, total: bounties.length };
  }

  // -------------------------------------------------------------------------
  // POST — action-dispatched
  // -------------------------------------------------------------------------
  async post(data: any) {
    const action = data?.action;

    if (action === 'post-bounty')  return this.postBounty(data);
    if (action === 'add-funding')  return this.addFunding(data);
    if (action === 'cancel')       return this.cancel(data);

    return new Response(`Unknown action: ${action}`, { status: 400 });
  }

  private async postBounty(data: any) {
    const ctx = this.getContext();

    // Dev-bypass-safe: capability check first
    const funder = await isFunder(ctx);
    if (!funder.ok) {
      const uid = getUserId(ctx);
      if (!uid) return new Response('Auth required', { status: 401 });
      return new Response('Forbidden — canFund required', { status: 403 });
    }
    const posterId = funder.userId;

    // Validate input
    const validation = validateBountyInput(data);
    if (!validation.ok) return new Response(validation.error, { status: validation.status });
    const clean = validation.clean;

    // Validate fund amount
    const fundCheck = validateAmount(clean.fundCents);
    if (!fundCheck.ok) return new Response(fundCheck.error, { status: 400 });

    const now = isoNow();

    // Debit the poster (no-overdraft enforced inside writeLedgerEntry)
    const bountyId = compositeId(['bounty', clean.entityId ?? 'new', posterId, String(Date.now())]);

    const debitResult = await writeLedgerEntry(
      tables,
      posterId,
      'bounty_fund',
      -clean.fundCents,  // debit
      { bountyId, note: `Fund bounty: ${clean.title}` },
    );
    if (!debitResult.ok) {
      return new Response(debitResult.error, { status: debitResult.status });
    }

    // Create the Bounty row
    const bounty: Record<string, any> = {
      id:                  bountyId,
      title:               clean.title,
      description:         clean.description   ?? null,
      acceptanceCriteria:  clean.acceptanceCriteria,
      sectionId:           clean.sectionId,
      entityType:          clean.entityType,
      entityId:            clean.entityId      ?? null,
      corridorId:          clean.corridorId    ?? null,
      status:              'open',
      escrowCents:         clean.fundCents,
      postedBy:            posterId,
      postedAt:            now,
      expiresAt:           clean.expiresAt     ?? null,
      awardedTo:           null,
      awardedContributionId: null,
      awardedAt:           null,
      settledAt:           null,
      cancelledAt:         null,
    };
    await tables.Bounty.put(bounty);
    return bounty;
  }

  private async addFunding(data: any) {
    const ctx = this.getContext();

    const funder = await isFunder(ctx);
    if (!funder.ok) {
      const uid = getUserId(ctx);
      if (!uid) return new Response('Auth required', { status: 401 });
      return new Response('Forbidden — canFund required', { status: 403 });
    }
    const userId = funder.userId;

    const bountyId = data?.bountyId;
    if (!bountyId) return new Response('bountyId required', { status: 400 });

    const bounty = await tables.Bounty.get(bountyId);
    if (!bounty) return new Response('Bounty not found', { status: 404 });
    if ((bounty as any).status !== 'open') {
      return new Response('Bounty is not open', { status: 409 });
    }

    const amountCents = data?.amountCents;
    const validation  = validateAmount(amountCents);
    if (!validation.ok) return new Response(validation.error, { status: 400 });

    // Debit the funder
    const debitResult = await writeLedgerEntry(
      tables,
      userId,
      'bounty_fund',
      -amountCents,
      { bountyId, note: `Add funding to bounty: ${(bounty as any).title}` },
    );
    if (!debitResult.ok) {
      return new Response(debitResult.error, { status: debitResult.status });
    }

    // Update escrow
    const newEscrow = ((bounty as any).escrowCents ?? 0) + amountCents;
    await tables.Bounty.patch(bountyId, { escrowCents: newEscrow });

    return { ...bounty, escrowCents: newEscrow };
  }

  private async cancel(data: any) {
    const ctx = this.getContext();
    const uid = getUserId(ctx);

    const bountyId = data?.bountyId;
    if (!bountyId) return new Response('bountyId required', { status: 400 });

    const bounty = await tables.Bounty.get(bountyId);
    if (!bounty) return new Response('Bounty not found', { status: 404 });
    if ((bounty as any).status !== 'open') {
      return new Response('Only open bounties can be cancelled', { status: 409 });
    }

    // Authorize: an admin (dev-bypassed in non-production) OR the bounty's
    // poster may cancel. Load the bounty first so the poster check is reachable
    // — gating on admin alone would lock a non-admin poster out of their own.
    const admin = await isAdminUser(ctx);
    const isPoster = !!uid && uid === (bounty as any).postedBy;
    if (!admin.ok && !isPoster) {
      if (!uid) return new Response('Auth required', { status: 401 });
      return new Response('Forbidden — only the poster or an admin may cancel', { status: 403 });
    }

    if (!canTransitionBounty('open', 'cancelled')) {
      return new Response('Cannot cancel this bounty', { status: 409 });
    }

    const now = isoNow();

    // Refund each funder their net contribution
    const fundEntries = await getBountyFundEntries(bountyId);
    // Compute net per funder: sum of fund debits (negative) and refunds (positive already given)
    const funderNet: Map<string, number> = new Map();
    for (const e of fundEntries) {
      if (e.type === 'bounty_fund') {
        const cur = funderNet.get(e.userId) ?? 0;
        funderNet.set(e.userId, cur + Math.abs(e.amountCents));
      }
      if (e.type === 'bounty_refund') {
        const cur = funderNet.get(e.userId) ?? 0;
        funderNet.set(e.userId, cur - e.amountCents);
      }
    }

    for (const [funderId, netAmount] of funderNet.entries()) {
      if (netAmount <= 0) continue;
      await writeLedgerEntry(tables, funderId, 'bounty_refund', netAmount, {
        bountyId,
        note: `Refund: bounty cancelled — ${(bounty as any).title}`,
      });
    }

    const updated = {
      status:      'cancelled',
      escrowCents: 0,
      cancelledAt: now,
    };
    await tables.Bounty.patch(bountyId, updated);
    return { ...bounty, ...updated };
  }

  // -------------------------------------------------------------------------
  // PATCH — action: award (admin only)
  // -------------------------------------------------------------------------
  async patch(data: any) {
    const action = data?.action;
    if (action === 'award') return this.award(data);
    return new Response(`Unknown action: ${action}`, { status: 400 });
  }

  private async award(data: any) {
    const ctx = this.getContext();

    // Dev-bypass-safe: check canReview helper first (broadened gate: admin OR
    // trusted/moderator tier). This replaces the previous isAdminUser-only gate.
    const reviewer = await resolveCallerReview(tables, ctx);
    if (!reviewer.ok) {
      const uid = getUserId(ctx);
      if (!uid) return new Response('Auth required', { status: 401 });
      return new Response('Forbidden — canReview required (admin, trusted, or moderator)', { status: 403 });
    }
    const reviewerId = reviewer.userId;

    const bountyId      = data?.bountyId;
    const contributionId = data?.contributionId;
    if (!bountyId)       return new Response('bountyId required', { status: 400 });
    if (!contributionId) return new Response('contributionId required', { status: 400 });

    const bounty = await tables.Bounty.get(bountyId);
    if (!bounty) return new Response('Bounty not found', { status: 404 });
    if ((bounty as any).status !== 'open') {
      return new Response('Bounty is not open', { status: 409 });
    }

    const contribution = await tables.Contribution.get(contributionId);
    if (!contribution) return new Response('Contribution not found', { status: 404 });

    // The contribution must be linked to this bounty
    if ((contribution as any).bountyId !== bountyId) {
      return new Response('Contribution is not linked to this bounty', { status: 409 });
    }

    const submitterId = (contribution as any).authorId as string;

    // Reviewer ≠ submitter integrity rule (kept from original)
    if (!canAward(reviewerId, submitterId)) {
      return new Response(
        'Forbidden — reviewer cannot approve their own submission (reviewer ≠ submitter)',
        { status: 403 },
      );
    }

    // Contribution must be in a verifiable state (pending or disputed)
    const currentState = (contribution as any).verificationState;
    if (!canTransition(currentState, 'verified')) {
      return new Response(
        `Cannot verify contribution from state "${currentState}"`,
        { status: 409 },
      );
    }

    if (!canTransitionBounty('open', 'settled')) {
      return new Response('Cannot settle this bounty', { status: 409 });
    }

    const now          = isoNow();
    const escrowCents  = (bounty as any).escrowCents ?? 0;
    const awardeeId    = submitterId;

    // 1. Apply the verified contribution to the target entity (slice-21 verify path)
    const verifyPatch = await applyVerifiedContribution(tables, contribution, reviewerId, now);
    await tables.Contribution.patch(contributionId, verifyPatch);

    // 2. Bump awardee reputation (the awarded contribution counts as accepted).
    //    The award path calls applyVerifiedContribution directly (not Contribution.patch),
    //    so bump here is needed — no double-counting risk.
    if (awardeeId) {
      await bumpReputation(tables, awardeeId, { accepted: 1 });
    }
    await logModerationEvent(tables, {
      actorId: reviewerId,
      action: 'accepted',
      entityType: 'Contribution',
      entityId: contributionId,
      reason: `Bounty award: ${(bounty as any).title}`,
    });

    // 3. Award the pot to the awardee
    const awardResult = await writeLedgerEntry(
      tables,
      awardeeId,
      'bounty_award',
      escrowCents,
      {
        bountyId,
        counterpartyUserId: reviewerId,
        note: `Bounty award: ${(bounty as any).title}`,
      },
    );
    if (!awardResult.ok) {
      return new Response(awardResult.error, { status: awardResult.status });
    }

    // 4. Settle the bounty
    const bountyPatch = {
      status:                'settled',
      awardedTo:             awardeeId,
      awardedContributionId: contributionId,
      awardedAt:             now,
      settledAt:             now,
      escrowCents:           0,
    };
    await tables.Bounty.patch(bountyId, bountyPatch);

    // emitBountySettlement stub — slice 23 seam
    // Real $ release happens only at extraction in slice 23; internal award is final here.

    return { ...bounty, ...bountyPatch };
  }
}
