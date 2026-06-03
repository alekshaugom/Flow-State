import { Resource, tables } from 'harper';
import { compositeId, isoNow } from '../lib/utils.ts';
import { getEntityConfig } from '../lib/contributions/entity-registry.ts';
import {
  validateContribution,
  buildChangeset,
  nextVersion,
  canTransition,
  type VerificationState,
} from '../lib/contributions/contribution-pure.ts';
import { applyVerifiedContribution } from '../lib/contributions/apply-verification.ts';
import { resolveCallerReview, bumpReputation, logModerationEvent } from '../lib/governance/reputation.ts';
import { resolveCapabilities } from '../lib/auth/capabilities-pure.ts';

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------
function getUserId(ctx: any): string | null {
  return ctx?.session?.user || null;
}

async function isContributor(
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
  if (!caps.canContribute) return { ok: false };
  return { ok: true, userId };
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------
async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const r of iter) out.push(r);
  return out;
}

async function maxVersionForEntity(
  entityType: string,
  entityId: string,
): Promise<number | null> {
  const rows = await collect(
    tables.Contribution.search({
      conditions: [
        { attribute: 'entityType', value: entityType, comparator: 'equals' as const },
        { attribute: 'entityId',   value: entityId,   comparator: 'equals' as const },
      ],
    }),
  );
  if (rows.length === 0) return null;
  return rows.reduce((max: number, r: any) => Math.max(max, r.version ?? 0), 0);
}

// ---------------------------------------------------------------------------
// Resource
// ---------------------------------------------------------------------------
export class ContributionResource extends Resource {
  allowRead()   { return true; }
  allowCreate() { return true; }
  allowUpdate() { return true; }
  allowDelete() { return false; }

  // -------------------------------------------------------------------------
  // GET
  // -------------------------------------------------------------------------
  // Routes:
  //   /Contribution/:id          → single row (target.id)
  //   /Contribution?entityType=X&entityId=Y → version history
  async get(target?: any) {
    // Harper surfaces query-string params as a URLSearchParams-like object
    // (has `.get(name)`); path params arrive as plain properties. Read both
    // ways, mirroring RiverSearch.
    const param = (name: string): any =>
      typeof target?.get === 'function' ? target.get(name) : target?.[name];

    // Single record by id (path param)
    const id = param('id');
    if (id) {
      const row = await tables.Contribution.get(id);
      if (!row) return new Response('Not found', { status: 404 });
      return row;
    }

    // Version history for an entity (query params)
    const entityType = param('entityType');
    const entityId   = param('entityId');

    if (!entityType || !entityId) {
      return new Response('entityType and entityId are required (or provide an id)', { status: 400 });
    }

    const rows = await collect(
      tables.Contribution.search({
        conditions: [
          { attribute: 'entityType', value: entityType, comparator: 'equals' as const },
          { attribute: 'entityId',   value: entityId,   comparator: 'equals' as const },
        ],
      }),
    );
    rows.sort((a: any, b: any) => (a.version ?? 0) - (b.version ?? 0));
    return { contributions: rows, total: rows.length };
  }

  // -------------------------------------------------------------------------
  // POST — submit a contribution
  // -------------------------------------------------------------------------
  async post(data: any) {
    const ctx = this.getContext();

    // Capability: must be a contributor (dev-bypassed in non-production).
    // Check the capability helper first so the dev bypass applies; only then
    // distinguish 401 (no session) from 403 (session but not a contributor),
    // mirroring the AdminAuth / patch() convention.
    const contrib = await isContributor(ctx);
    if (!contrib.ok) {
      const userId = getUserId(ctx);
      if (!userId) return new Response('Auth required', { status: 401 });
      return new Response('Forbidden', { status: 403 });
    }
    const authorId = contrib.userId;

    // Entity config
    const entityType = data?.entityType;
    if (!entityType) return new Response('entityType required', { status: 400 });
    const config = getEntityConfig(entityType);
    if (!config) return new Response(`Unknown entityType: ${entityType}`, { status: 400 });

    const op = data?.op;
    if (op !== 'edit' && op !== 'create') {
      return new Response('op must be "edit" or "create"', { status: 400 });
    }

    const fields = data?.fields ?? {};
    if (typeof fields !== 'object' || Array.isArray(fields)) {
      return new Response('fields must be an object', { status: 400 });
    }

    // Validate + whitelist. An edit is partial (only supplied fields,
    // required not enforced); a create must satisfy required fields.
    const validation = validateContribution(entityType, fields, config, { partial: op === 'edit' });
    if (!validation.ok) return new Response(validation.error, { status: validation.status });
    const clean = validation.clean;

    const now = isoNow();
    let entityId: string;
    let changeset: { before: Record<string, any>; after: Record<string, any> };
    const fieldKeys = config.fields.map((f) => f.key);

    if (op === 'edit') {
      entityId = data?.entityId;
      if (!entityId) return new Response('entityId required for op:edit', { status: 400 });

      const targetRow = await (tables as any)[config.tableName].get(entityId);
      if (!targetRow) return new Response('Entity not found', { status: 404 });

      changeset = buildChangeset(targetRow as any, clean, fieldKeys);
      // Pending edit: do NOT mutate the live entity row
    } else {
      // op === 'create'
      entityId = config.newId(clean);
      changeset = buildChangeset({}, clean, fieldKeys);

      // Seed a base row in the target table (unverified — no currentContributionId yet)
      const baseRow: Record<string, any> = { id: entityId, ...clean };
      await (tables as any)[config.tableName].put(baseRow);
    }

    // Compute version
    const maxVer = await maxVersionForEntity(entityType, entityId);
    const version = nextVersion(maxVer);

    // Write the Contribution row
    const contribId = compositeId([entityType, entityId, authorId, String(Date.now())]);
    const contribution: Record<string, any> = {
      id:                contribId,
      entityType,
      entityId,
      op,
      version,
      authorId,
      submittedAt:       now,
      verificationState: 'pending' as VerificationState,
      verifiedBy:        null,
      verifiedAt:        null,
      changesetJson:     JSON.stringify(changeset),
      bountyId:          data?.bountyId ?? null,
    };
    await tables.Contribution.put(contribution);
    return contribution;
  }

  // -------------------------------------------------------------------------
  // PATCH — verify / reject / dispute a contribution
  //
  // Gate: resolveCallerReview (admin OR trusted/moderator tier), not admin-only.
  // Reviewer ≠ submitter is enforced — a contributor cannot verify their own work.
  // -------------------------------------------------------------------------
  async patch(data: any) {
    const ctx = this.getContext();

    // Capability-helper-FIRST ordering: check canReview before userId→401
    const reviewer = await resolveCallerReview(tables, ctx);
    if (!reviewer.ok) {
      const userId = getUserId(ctx);
      if (!userId) return new Response('Auth required', { status: 401 });
      return new Response('Forbidden — canReview required (admin, trusted, or moderator)', { status: 403 });
    }
    const reviewerId = reviewer.userId;

    const id = data?.id;
    if (!id) return new Response('id required', { status: 400 });

    const action: string = data?.action;
    if (!['verify', 'reject', 'dispute'].includes(action)) {
      return new Response('action must be "verify", "reject", or "dispute"', { status: 400 });
    }

    const contribution = await tables.Contribution.get(id);
    if (!contribution) return new Response('Contribution not found', { status: 404 });

    // Reviewer ≠ submitter: a contributor cannot verify their own submission.
    const authorId = (contribution as any).authorId as string | null;
    if (authorId && reviewerId === authorId) {
      return new Response(
        'Forbidden — reviewer cannot verify their own submission (reviewer ≠ submitter)',
        { status: 403 },
      );
    }

    const fromState = (contribution as any).verificationState as VerificationState;
    const toStateMap: Record<string, VerificationState> = {
      verify:  'verified',
      reject:  'rejected',
      dispute: 'disputed',
    };
    const toState = toStateMap[action];

    if (!canTransition(fromState, toState)) {
      return new Response(
        `Cannot transition from "${fromState}" to "${toState}"`,
        { status: 409 },
      );
    }

    const now = isoNow();
    const contribPatch: Record<string, any> = {
      verificationState: toState,
    };

    if (action === 'verify') {
      // Delegate to shared helper (also used by BountyResource.award)
      const verifyPatch = await applyVerifiedContribution(tables, contribution, reviewerId, now);
      Object.assign(contribPatch, verifyPatch);

      // Bump author reputation + log moderation event
      if (authorId) {
        await bumpReputation(tables, authorId, { accepted: 1 });
      }
      await logModerationEvent(tables, {
        actorId: reviewerId,
        action: 'accepted',
        entityType: 'Contribution',
        entityId: id,
      });
    } else if (action === 'reject') {
      // Bump author reputation (rejected count) + log event
      if (authorId) {
        await bumpReputation(tables, authorId, { rejected: 1 });
      }
      await logModerationEvent(tables, {
        actorId: reviewerId,
        action: 'rejected',
        entityType: 'Contribution',
        entityId: id,
      });
    }

    await tables.Contribution.patch(id, contribPatch);
    // Return the authoritative post-patch state directly; an immediate re-read
    // can come back stale (read-after-write) within the same request.
    return { ...contribution, ...contribPatch };
  }
}
