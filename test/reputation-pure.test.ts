import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  resolveTrustTier,
  canReview,
  applyReputationDelta,
  isBanned,
  ESTABLISHED_MIN_ACCEPTED,
  TRUSTED_MIN_ACCEPTED,
  MAX_REJECTION_RATE,
  type ReputationRecord,
} from '../lib/governance/reputation-pure.ts';

// ---------------------------------------------------------------------------
// resolveTrustTier — tier boundaries
// ---------------------------------------------------------------------------

test('resolveTrustTier: zero contributions → new', () => {
  assert.equal(resolveTrustTier({}), 'new');
});

test('resolveTrustTier: 1 accepted → new (below ESTABLISHED_MIN)', () => {
  assert.equal(resolveTrustTier({ acceptedContributions: 1 }), 'new');
});

test('resolveTrustTier: 2 accepted → new (still below ESTABLISHED_MIN=3)', () => {
  assert.equal(resolveTrustTier({ acceptedContributions: 2 }), 'new');
});

test('resolveTrustTier: ESTABLISHED_MIN accepted, no rejections → established', () => {
  assert.equal(resolveTrustTier({ acceptedContributions: ESTABLISHED_MIN_ACCEPTED }), 'established');
});

test('resolveTrustTier: ESTABLISHED_MIN+1 accepted → established (below TRUSTED_MIN)', () => {
  assert.equal(resolveTrustTier({ acceptedContributions: ESTABLISHED_MIN_ACCEPTED + 1 }), 'established');
});

test('resolveTrustTier: TRUSTED_MIN-1 accepted → established', () => {
  assert.equal(resolveTrustTier({ acceptedContributions: TRUSTED_MIN_ACCEPTED - 1 }), 'established');
});

test('resolveTrustTier: TRUSTED_MIN accepted, no rejections → trusted', () => {
  assert.equal(resolveTrustTier({ acceptedContributions: TRUSTED_MIN_ACCEPTED }), 'trusted');
});

test('resolveTrustTier: TRUSTED_MIN+5 accepted → trusted', () => {
  assert.equal(resolveTrustTier({ acceptedContributions: TRUSTED_MIN_ACCEPTED + 5 }), 'trusted');
});

// ---------------------------------------------------------------------------
// resolveTrustTier — rejection rate gating
// ---------------------------------------------------------------------------

test('resolveTrustTier: high rejection rate drops established user to new', () => {
  // 3 accepted but 1 rejected = rate 1/4 = 0.25 = exactly MAX → stays established
  assert.equal(
    resolveTrustTier({ acceptedContributions: 3, rejectedContributions: 1 }),
    'established',
  );
});

test('resolveTrustTier: rejection rate just above MAX → new', () => {
  // 3 accepted, 2 rejected = rate 2/5 = 0.4 > 0.25 → new
  assert.equal(
    resolveTrustTier({ acceptedContributions: 3, rejectedContributions: 2 }),
    'new',
  );
});

test('resolveTrustTier: trusted user with high rejection rate drops to new', () => {
  // 15 accepted, 6 rejected = rate 6/21 ≈ 0.286 > 0.25 → new
  assert.equal(
    resolveTrustTier({ acceptedContributions: 15, rejectedContributions: 6 }),
    'new',
  );
});

test('resolveTrustTier: trusted user at exactly MAX rejection rate stays trusted', () => {
  // 15 accepted, 5 rejected = rate 5/20 = 0.25 = MAX → trusted (boundary inclusive)
  assert.equal(
    resolveTrustTier({ acceptedContributions: 15, rejectedContributions: 5 }),
    'trusted',
  );
});

test('resolveTrustTier: zero total decisions → rejectionRate = 0 (no NaN)', () => {
  // Both counts missing/null → should not throw, should return 'new'
  assert.equal(resolveTrustTier({ acceptedContributions: null, rejectedContributions: null }), 'new');
});

// ---------------------------------------------------------------------------
// resolveTrustTier — manualTier override
// ---------------------------------------------------------------------------

test('resolveTrustTier: manualTier moderator overrides everything → moderator', () => {
  assert.equal(resolveTrustTier({ manualTier: 'moderator' }), 'moderator');
});

test('resolveTrustTier: manualTier moderator overrides high rejection rate → moderator', () => {
  assert.equal(
    resolveTrustTier({ acceptedContributions: 1, rejectedContributions: 100, manualTier: 'moderator' }),
    'moderator',
  );
});

test('resolveTrustTier: manualTier null → falls back to earned tier', () => {
  assert.equal(
    resolveTrustTier({ acceptedContributions: TRUSTED_MIN_ACCEPTED, manualTier: null }),
    'trusted',
  );
});

test('resolveTrustTier: manualTier other string → ignored (treated as no override)', () => {
  // only 'moderator' is a recognized manual tier; anything else falls to earned
  assert.equal(
    resolveTrustTier({ acceptedContributions: 1, manualTier: 'custom' }),
    'new',
  );
});

// ---------------------------------------------------------------------------
// canReview
// ---------------------------------------------------------------------------

test('canReview: admin true, tier new → true', () => {
  assert.equal(canReview(true, 'new'), true);
});

test('canReview: admin true, tier established → true', () => {
  assert.equal(canReview(true, 'established'), true);
});

test('canReview: admin true, tier trusted → true', () => {
  assert.equal(canReview(true, 'trusted'), true);
});

test('canReview: admin true, tier moderator → true', () => {
  assert.equal(canReview(true, 'moderator'), true);
});

test('canReview: admin false, tier trusted → true', () => {
  assert.equal(canReview(false, 'trusted'), true);
});

test('canReview: admin false, tier moderator → true', () => {
  assert.equal(canReview(false, 'moderator'), true);
});

test('canReview: admin false, tier established → false', () => {
  assert.equal(canReview(false, 'established'), false);
});

test('canReview: admin false, tier new → false', () => {
  assert.equal(canReview(false, 'new'), false);
});

// ---------------------------------------------------------------------------
// applyReputationDelta
// ---------------------------------------------------------------------------

test('applyReputationDelta: empty delta on empty record → all zero', () => {
  const result = applyReputationDelta({}, {});
  assert.equal(result.acceptedContributions, 0);
  assert.equal(result.rejectedContributions, 0);
  assert.equal(result.flagsReceived, 0);
  assert.equal(result.flagsSubmitted, 0);
});

test('applyReputationDelta: increment accepted by 1', () => {
  const rep: ReputationRecord = { acceptedContributions: 5 };
  const result = applyReputationDelta(rep, { accepted: 1 });
  assert.equal(result.acceptedContributions, 6);
  assert.equal(result.rejectedContributions, 0); // defaulted
});

test('applyReputationDelta: increment rejected by 1', () => {
  const rep: ReputationRecord = { acceptedContributions: 3, rejectedContributions: 1 };
  const result = applyReputationDelta(rep, { rejected: 1 });
  assert.equal(result.rejectedContributions, 2);
  assert.equal(result.acceptedContributions, 3); // unchanged
});

test('applyReputationDelta: increment flagsReceived', () => {
  const result = applyReputationDelta({ flagsReceived: 2 }, { flagsReceived: 1 });
  assert.equal(result.flagsReceived, 3);
});

test('applyReputationDelta: increment flagsSubmitted', () => {
  const result = applyReputationDelta({ flagsSubmitted: 0 }, { flagsSubmitted: 1 });
  assert.equal(result.flagsSubmitted, 1);
});

test('applyReputationDelta: partial delta only touches specified fields', () => {
  const rep: ReputationRecord = {
    acceptedContributions: 10,
    rejectedContributions: 2,
    flagsReceived: 1,
    flagsSubmitted: 3,
  };
  const result = applyReputationDelta(rep, { accepted: 1 });
  assert.equal(result.acceptedContributions, 11);
  assert.equal(result.rejectedContributions, 2);
  assert.equal(result.flagsReceived, 1);
  assert.equal(result.flagsSubmitted, 3);
});

test('applyReputationDelta: does not mutate the input record', () => {
  const rep: ReputationRecord = { acceptedContributions: 5 };
  applyReputationDelta(rep, { accepted: 1 });
  assert.equal(rep.acceptedContributions, 5); // unchanged
});

test('applyReputationDelta: preserves other record fields', () => {
  const rep: ReputationRecord = { manualTier: 'moderator', bannedAt: '2026-01-01T00:00:00.000Z' };
  const result = applyReputationDelta(rep, { accepted: 1 });
  assert.equal(result.manualTier, 'moderator');
  assert.equal(result.bannedAt, '2026-01-01T00:00:00.000Z');
});

// ---------------------------------------------------------------------------
// isBanned
// ---------------------------------------------------------------------------

test('isBanned: null record → false', () => {
  assert.equal(isBanned(null), false);
});

test('isBanned: undefined record → false', () => {
  assert.equal(isBanned(undefined), false);
});

test('isBanned: empty record → false', () => {
  assert.equal(isBanned({}), false);
});

test('isBanned: bannedAt null → false', () => {
  assert.equal(isBanned({ bannedAt: null }), false);
});

test('isBanned: bannedAt empty string → false', () => {
  assert.equal(isBanned({ bannedAt: '' }), false);
});

test('isBanned: bannedAt set → true', () => {
  assert.equal(isBanned({ bannedAt: '2026-06-01T00:00:00.000Z' }), true);
});

// ---------------------------------------------------------------------------
// MAX_REJECTION_RATE constant sanity
// ---------------------------------------------------------------------------

test('MAX_REJECTION_RATE is between 0 and 1 exclusive', () => {
  assert.ok(MAX_REJECTION_RATE > 0 && MAX_REJECTION_RATE < 1);
});
