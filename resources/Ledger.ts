// REST path: /LedgerResource
// (Named LedgerResource rather than Ledger to avoid any future Harper collision.
//  The auto-table endpoint for LedgerEntry is /LedgerEntry — /Ledger is free,
//  but we use the Resource suffix for consistency with BountyResource.)

import { Resource, tables } from 'harper';
import { resolveCapabilities } from '../lib/auth/capabilities-pure.ts';
import { validateAmount, summarizeForProfile, computeBalance, type LedgerType } from '../lib/ledger/ledger-pure.ts';
import { writeLedgerEntry } from '../lib/ledger/write.ts';

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

async function collectEntries(userId: string): Promise<any[]> {
  const out: any[] = [];
  for await (const row of tables.LedgerEntry.search({
    conditions: [{ attribute: 'userId', value: userId, comparator: 'equals' as const }],
  })) {
    out.push(row);
  }
  out.sort((a: any, b: any) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  return out;
}

export class LedgerResource extends Resource {
  allowRead()   { return true; }
  allowCreate() { return true; }

  // -------------------------------------------------------------------------
  // GET
  // -------------------------------------------------------------------------
  // /LedgerResource            → own balance + history (auth required)
  // /LedgerResource?userId=X   → another user's ledger (admin only)
  // /LedgerResource?system=1   → system-level totals (admin only)
  async get(target?: any) {
    const param = (n: string): any =>
      typeof target?.get === 'function' ? target.get(n) : target?.[n];

    const ctx = this.getContext();
    const admin = await isAdminUser(ctx);

    // System view
    if (param('system')) {
      if (!admin.ok) {
        const uid = getUserId(ctx);
        if (!uid) return new Response('Auth required', { status: 401 });
        return new Response('Forbidden', { status: 403 });
      }
      return this.systemView();
    }

    // Per-user view
    const requestedUserId = param('userId');
    if (requestedUserId) {
      // Admin-only: view another user's ledger
      if (!admin.ok) {
        const uid = getUserId(ctx);
        if (!uid) return new Response('Auth required', { status: 401 });
        return new Response('Forbidden', { status: 403 });
      }
      return this.userView(requestedUserId);
    }

    // Own ledger — any logged-in user
    if (!admin.ok) {
      // In dev, admin.ok is always true; in prod, re-check for plain auth
      const uid = getUserId(ctx);
      if (!uid) return new Response('Auth required', { status: 401 });
      // Non-admin, non-dev: still valid for own balance
      return this.userView(uid);
    }
    return this.userView(admin.adminId);
  }

  private async userView(userId: string) {
    const entries = await collectEntries(userId);
    const summary = summarizeForProfile(entries as any);
    return {
      userId,
      ...summary,
      history: entries,
    };
  }

  private async systemView() {
    // Scan all LedgerEntry rows for system-level aggregates
    const all: any[] = [];
    for await (const row of tables.LedgerEntry.search({ conditions: [] })) {
      all.push(row);
    }

    let grantsTotal    = 0;
    let escrowTotal    = 0;
    let awardedTotal   = 0;
    let extractedTotal = 0; // always 0 in slice 22

    for (const e of all) {
      const type: LedgerType = e.type;
      const amount: number   = e.amountCents ?? 0;
      if (type === 'grant')        grantsTotal  += amount;
      if (type === 'bounty_fund')  escrowTotal  += Math.abs(amount);
      if (type === 'bounty_refund') escrowTotal -= amount;   // refunds reduce held escrow
      if (type === 'bounty_award')  awardedTotal += amount;
    }

    // Total credits in system = grants (+ deposits in slice 23)
    // Money currently in circulation = grantsTotal − extractedTotal
    return {
      system: true,
      totalGrantedCents:   grantsTotal,
      totalEscrowHeldCents: escrowTotal - awardedTotal > 0 ? escrowTotal - awardedTotal : 0,
      totalAwardedCents:   awardedTotal,
      totalExtractedCents: extractedTotal,
      totalInSystemCents:  grantsTotal - extractedTotal,
      entryCount: all.length,
    };
  }

  // -------------------------------------------------------------------------
  // POST — action: grant (admin only)
  // -------------------------------------------------------------------------
  async post(data: any) {
    const ctx   = this.getContext();
    const admin = await isAdminUser(ctx);
    if (!admin.ok) {
      const uid = getUserId(ctx);
      if (!uid) return new Response('Auth required', { status: 401 });
      return new Response('Forbidden', { status: 403 });
    }

    const action = data?.action;
    if (action !== 'grant') {
      return new Response('action must be "grant"', { status: 400 });
    }

    const userId = data?.userId;
    if (!userId || typeof userId !== 'string') {
      return new Response('userId required', { status: 400 });
    }

    const amountCents = data?.amountCents;
    const validation  = validateAmount(amountCents);
    if (!validation.ok) return new Response(validation.error, { status: 400 });

    const note = data?.note ?? null;

    const result = await writeLedgerEntry(
      tables,
      userId,
      'grant',
      amountCents,
      { note },
    );
    if (!result.ok) return new Response(result.error, { status: result.status });

    return result.entry;
  }
}
