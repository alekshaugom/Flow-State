// REST path: /ModerationResource
// Moderation queue: pending + disputed contributions + open flags.
// Read-only — actions go through ContributionResource and ContentFlagResource.
// Requires canReview (admin OR trusted/moderator tier).

import { Resource, tables } from 'harper';
import { resolveCallerReview } from '../lib/governance/reputation.ts';

function getUserId(ctx: any): string | null {
  return ctx?.session?.user || null;
}

export class ModerationResource extends Resource {
  allowRead()   { return true; }
  allowCreate() { return false; }
  allowUpdate() { return false; }
  allowDelete() { return false; }

  // GET /ModerationResource → { pendingContributions, disputedContributions, openFlags }
  async get(_target?: any) {
    const ctx = this.getContext();

    // Capability check first (dev bypass inside resolveCallerReview)
    const reviewer = await resolveCallerReview(tables, ctx);
    if (!reviewer.ok) {
      const uid = getUserId(ctx);
      if (!uid) return new Response('Auth required', { status: 401 });
      return new Response('Forbidden — canReview required', { status: 403 });
    }

    // Pending contributions
    const pendingContributions: any[] = [];
    for await (const row of tables.Contribution.search({
      conditions: [
        { attribute: 'verificationState', value: 'pending', comparator: 'equals' as const },
      ],
    })) {
      pendingContributions.push(row);
    }
    pendingContributions.sort(
      (a: any, b: any) => (a.submittedAt || '').localeCompare(b.submittedAt || ''),
    );

    // Disputed contributions
    const disputedContributions: any[] = [];
    for await (const row of tables.Contribution.search({
      conditions: [
        { attribute: 'verificationState', value: 'disputed', comparator: 'equals' as const },
      ],
    })) {
      disputedContributions.push(row);
    }
    disputedContributions.sort(
      (a: any, b: any) => (a.submittedAt || '').localeCompare(b.submittedAt || ''),
    );

    // Open flags
    const openFlags: any[] = [];
    for await (const row of tables.ContentFlag.search({
      conditions: [{ attribute: 'status', value: 'open', comparator: 'equals' as const }],
    })) {
      openFlags.push(row);
    }
    openFlags.sort(
      (a: any, b: any) => (a.createdAt || '').localeCompare(b.createdAt || ''),
    );

    return {
      pendingContributions,
      disputedContributions,
      openFlags,
      totals: {
        pending: pendingContributions.length,
        disputed: disputedContributions.length,
        openFlags: openFlags.length,
      },
    };
  }
}
