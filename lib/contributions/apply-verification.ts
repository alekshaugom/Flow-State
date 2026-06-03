// Shared helper: apply a verified contribution's changeset to its target entity.
// Used by both Contribution.ts (action 'verify') and Bounty.ts (action 'award').
//
// This is NOT a pure module — it imports from Harper's `tables` via the
// `tables` argument passed in. Keep it thin: pure logic lives in contribution-pure.ts.

import { applyChangeset } from './contribution-pure.ts';
import { getEntityConfig } from './entity-registry.ts';

export interface VerificationPatch {
  verificationState: 'verified';
  verifiedBy: string;
  verifiedAt: string;
}

/**
 * Apply a verified contribution to its target entity in the database and
 * return the patch that should be applied to the Contribution row itself.
 *
 * @param tables   The Harper `tables` namespace (passed in to avoid a static import)
 * @param contribution  The full contribution row (any shape from Harper)
 * @param verifierId    The admin userId doing the verification
 * @param nowIso        Current ISO timestamp
 */
export async function applyVerifiedContribution(
  tables: any,
  contribution: any,
  verifierId: string,
  nowIso: string,
): Promise<VerificationPatch> {
  const entityType = contribution.entityType as string;
  const entityId   = contribution.entityId as string;
  const config     = getEntityConfig(entityType);

  if (config) {
    let changeset: { before: Record<string, any>; after: Record<string, any> };
    try {
      changeset = JSON.parse(contribution.changesetJson ?? '{"before":{},"after":{}}');
    } catch {
      changeset = { before: {}, after: {} };
    }
    const patch = applyChangeset({}, changeset);
    await tables[config.tableName].patch(entityId, {
      ...patch,
      lastVerifiedAt:        nowIso,
      verifiedBy:            verifierId,
      currentContributionId: contribution.id,
    });
  }

  return {
    verificationState: 'verified',
    verifiedBy: verifierId,
    verifiedAt: nowIso,
  };
}
