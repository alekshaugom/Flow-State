import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  validateBountyInput,
  canTransitionBounty,
  canAward,
  isExpired,
  type BountyStatus,
} from '../lib/bounties/bounty-pure.ts';

// ---------------------------------------------------------------------------
// validateBountyInput
// ---------------------------------------------------------------------------
test('validateBountyInput: valid input', () => {
  const r = validateBountyInput({
    title: 'Update put-in directions',
    acceptanceCriteria: 'Must include parking info and driving directions',
    sectionId: 'arkansas-pine-creek',
    entityType: 'access-point',
    entityId: 'ap_test_123',
    fundCents: 1000,
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.clean.title, 'Update put-in directions');
    assert.equal(r.clean.fundCents, 1000);
    assert.equal(r.clean.sectionId, 'arkansas-pine-creek');
  }
});

test('validateBountyInput: missing title → 400', () => {
  const r = validateBountyInput({
    acceptanceCriteria: 'some criteria',
    entityType: 'access-point',
    fundCents: 1000,
  });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.status, 400);
    assert.match(r.error, /title/i);
  }
});

test('validateBountyInput: empty title → 400', () => {
  const r = validateBountyInput({
    title: '   ',
    acceptanceCriteria: 'some criteria',
    entityType: 'access-point',
    fundCents: 1000,
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.status, 400);
});

test('validateBountyInput: missing acceptanceCriteria → 400', () => {
  const r = validateBountyInput({
    title: 'A bounty',
    sectionId: 'arkansas-pine-creek',
    entityType: 'access-point',
    fundCents: 1000,
  });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.status, 400);
    assert.match(r.error, /acceptanceCriteria/i);
  }
});

test('validateBountyInput: missing sectionId → 400', () => {
  const r = validateBountyInput({
    title: 'A bounty',
    acceptanceCriteria: 'some criteria',
    entityType: 'access-point',
    fundCents: 1000,
  });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.status, 400);
    assert.match(r.error, /sectionId/i);
  }
});

test('validateBountyInput: empty sectionId → 400', () => {
  const r = validateBountyInput({
    title: 'A bounty',
    acceptanceCriteria: 'some criteria',
    sectionId: '   ',
    entityType: 'access-point',
    fundCents: 1000,
  });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.status, 400);
    assert.match(r.error, /sectionId/i);
  }
});

test('validateBountyInput: missing entityType → 400', () => {
  const r = validateBountyInput({
    title: 'A bounty',
    acceptanceCriteria: 'some criteria',
    sectionId: 'arkansas-pine-creek',
    fundCents: 1000,
  });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.status, 400);
    assert.match(r.error, /entityType/i);
  }
});

test('validateBountyInput: invalid entityType → 400', () => {
  const r = validateBountyInput({
    title: 'A bounty',
    acceptanceCriteria: 'some criteria',
    sectionId: 'arkansas-pine-creek',
    entityType: 'foobar',
    fundCents: 1000,
  });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.status, 400);
    assert.match(r.error, /entityType/i);
  }
});

test('validateBountyInput: section entityType no longer valid → 400', () => {
  const r = validateBountyInput({
    title: 'A bounty',
    acceptanceCriteria: 'some criteria',
    sectionId: 'arkansas-pine-creek',
    entityType: 'section',
    fundCents: 1000,
  });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.status, 400);
    assert.match(r.error, /entityType/i);
  }
});

test('validateBountyInput: fundCents 0 → 400', () => {
  const r = validateBountyInput({
    title: 'A bounty',
    acceptanceCriteria: 'some criteria',
    sectionId: 'arkansas-pine-creek',
    entityType: 'rapid',
    fundCents: 0,
  });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.status, 400);
    assert.match(r.error, /fundCents/i);
  }
});

test('validateBountyInput: negative fundCents → 400', () => {
  const r = validateBountyInput({
    title: 'A bounty',
    acceptanceCriteria: 'some criteria',
    sectionId: 'arkansas-pine-creek',
    entityType: 'rapid',
    fundCents: -500,
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.status, 400);
});

test('validateBountyInput: all fulfillable entity types accepted', () => {
  const types = ['access-point', 'rapid', 'shuttle-business', 'outfitter'];
  for (const entityType of types) {
    const r = validateBountyInput({
      title: 'A bounty',
      acceptanceCriteria: 'criteria',
      sectionId: 'arkansas-pine-creek',
      entityType,
      fundCents: 100,
    });
    assert.equal(r.ok, true, `expected ok for entityType: ${entityType}`);
  }
});

test('validateBountyInput: photo and other entity types accepted', () => {
  const types = ['photo', 'other'];
  for (const entityType of types) {
    const r = validateBountyInput({
      title: 'An aerial shot bounty',
      acceptanceCriteria: 'Aerial photo at 3000 cfs',
      sectionId: 'arkansas-pine-creek',
      entityType,
      fundCents: 500,
    });
    assert.equal(r.ok, true, `expected ok for entityType: ${entityType}`);
  }
});

// ---------------------------------------------------------------------------
// canTransitionBounty
// ---------------------------------------------------------------------------
test('canTransitionBounty: open → awarded (true)', () => {
  assert.equal(canTransitionBounty('open', 'awarded'), true);
});

test('canTransitionBounty: open → settled (true)', () => {
  assert.equal(canTransitionBounty('open', 'settled'), true);
});

test('canTransitionBounty: open → cancelled (true)', () => {
  assert.equal(canTransitionBounty('open', 'cancelled'), true);
});

test('canTransitionBounty: open → expired (true)', () => {
  assert.equal(canTransitionBounty('open', 'expired'), true);
});

test('canTransitionBounty: awarded → settled (true)', () => {
  assert.equal(canTransitionBounty('awarded', 'settled'), true);
});

test('canTransitionBounty: awarded → open (false)', () => {
  assert.equal(canTransitionBounty('awarded', 'open'), false);
});

test('canTransitionBounty: settled is terminal (false for all)', () => {
  const targets: BountyStatus[] = ['open', 'awarded', 'cancelled', 'expired'];
  for (const to of targets) {
    assert.equal(canTransitionBounty('settled', to), false, `settled → ${to} should be false`);
  }
});

test('canTransitionBounty: cancelled is terminal (false for all)', () => {
  const targets: BountyStatus[] = ['open', 'awarded', 'settled', 'expired'];
  for (const to of targets) {
    assert.equal(canTransitionBounty('cancelled', to), false, `cancelled → ${to} should be false`);
  }
});

test('canTransitionBounty: expired is terminal (false for all)', () => {
  const targets: BountyStatus[] = ['open', 'awarded', 'settled', 'cancelled'];
  for (const to of targets) {
    assert.equal(canTransitionBounty('expired', to), false, `expired → ${to} should be false`);
  }
});

// ---------------------------------------------------------------------------
// canAward — reviewer ≠ submitter
// ---------------------------------------------------------------------------
test('canAward: same id → false (reviewer cannot approve own work)', () => {
  assert.equal(canAward('user_alice', 'user_alice'), false);
});

test('canAward: dev_local self-award → false', () => {
  assert.equal(canAward('dev_local', 'dev_local'), false);
});

test('canAward: different ids → true', () => {
  assert.equal(canAward('user_admin', 'user_alice'), true);
});

test('canAward: admin awards contributor → true', () => {
  assert.equal(canAward('admin_1', 'contributor_2'), true);
});

// ---------------------------------------------------------------------------
// isExpired
// ---------------------------------------------------------------------------
test('isExpired: null expiresAt → false', () => {
  assert.equal(isExpired(null, '2026-06-03T00:00:00.000Z'), false);
});

test('isExpired: undefined expiresAt → false', () => {
  assert.equal(isExpired(undefined, '2026-06-03T00:00:00.000Z'), false);
});

test('isExpired: future expiresAt → false', () => {
  assert.equal(isExpired('2026-12-31T00:00:00.000Z', '2026-06-03T00:00:00.000Z'), false);
});

test('isExpired: past expiresAt → true', () => {
  assert.equal(isExpired('2026-01-01T00:00:00.000Z', '2026-06-03T00:00:00.000Z'), true);
});

test('isExpired: exact match → true (boundary is expired)', () => {
  const ts = '2026-06-03T00:00:00.000Z';
  assert.equal(isExpired(ts, ts), true);
});
