import { test } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  slugify,
  validateContribution,
  buildChangeset,
  applyChangeset,
  nextVersion,
  canTransition,
  type VerificationState,
} from '../lib/contributions/contribution-pure.ts';
import { getEntityConfig } from '../lib/contributions/entity-registry.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function apConfig() {
  const cfg = getEntityConfig('access-point');
  assert.ok(cfg, 'access-point config must exist');
  return cfg!;
}

// ---------------------------------------------------------------------------
// slugify
// ---------------------------------------------------------------------------
test('slugify: lowercases and replaces spaces with dashes', () => {
  assert.equal(slugify('Browns Canyon'), 'browns-canyon');
});

test('slugify: collapses multiple non-alphanums', () => {
  assert.equal(slugify('Hecla  Junction!!'), 'hecla-junction');
});

test('slugify: strips leading/trailing dashes', () => {
  assert.equal(slugify('--test--'), 'test');
});

test('slugify: empty string returns "unnamed"', () => {
  assert.equal(slugify(''), 'unnamed');
});

test('slugify: already clean slug passes through', () => {
  assert.equal(slugify('ruby-horsethief'), 'ruby-horsethief');
});

// ---------------------------------------------------------------------------
// validateContribution — access-point
// ---------------------------------------------------------------------------
test('validateContribution: valid minimal set passes', () => {
  const cfg = apConfig();
  const result = validateContribution('access-point', { name: 'Hecla Junction' }, cfg);
  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.clean.name, 'Hecla Junction');
  }
});

test('validateContribution: valid full set passes', () => {
  const cfg = apConfig();
  const result = validateContribution('access-point', {
    name: 'Hecla Junction',
    kind: 'put-in',
    directions: 'Turn left at the sign.',
    permitRequired: false,
    feeUsd: 5,
    parkingSpaces: 20,
    latitude: 38.5,
    longitude: -105.8,
    riverMile: 76.4,
    notes: 'Rocky road.',
    altNames: 'HJ',
  }, cfg);
  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.clean.kind, 'put-in');
    assert.equal(result.clean.feeUsd, 5);
    assert.equal(result.clean.latitude, 38.5);
  }
});

test('validateContribution: non-descriptor keys (id, sortIndex) are dropped', () => {
  const cfg = apConfig();
  const result = validateContribution('access-point', {
    name: 'Test',
    id: 'some-id',
    sortIndex: 99,
    corridorId: 'abc',
  }, cfg);
  assert.ok(result.ok);
  if (result.ok) {
    assert.ok(!('id' in result.clean), 'id should be dropped');
    assert.ok(!('sortIndex' in result.clean), 'sortIndex should be dropped');
    assert.ok(!('corridorId' in result.clean), 'corridorId should be dropped');
    assert.equal(result.clean.name, 'Test');
  }
});

test('validateContribution: required name missing → 400', () => {
  const cfg = apConfig();
  const result = validateContribution('access-point', { kind: 'put-in' }, cfg);
  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.status, 400);
    assert.ok(result.error.includes('name'));
  }
});

test('validateContribution: invalid kind → 400', () => {
  const cfg = apConfig();
  const result = validateContribution('access-point', { name: 'X', kind: 'invalid-kind' }, cfg);
  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.status, 400);
    assert.ok(result.error.includes('kind'));
  }
});

test('validateContribution: negative feeUsd → 400', () => {
  const cfg = apConfig();
  const result = validateContribution('access-point', { name: 'X', feeUsd: -1 }, cfg);
  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.status, 400);
    assert.ok(result.error.includes('feeUsd'));
  }
});

test('validateContribution: latitude out of range (> 90) → 400', () => {
  const cfg = apConfig();
  const result = validateContribution('access-point', { name: 'X', latitude: 91 }, cfg);
  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.status, 400);
    assert.ok(result.error.includes('latitude'));
  }
});

test('validateContribution: latitude out of range (< -90) → 400', () => {
  const cfg = apConfig();
  const result = validateContribution('access-point', { name: 'X', latitude: -91 }, cfg);
  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.status, 400);
  }
});

test('validateContribution: longitude out of range → 400', () => {
  const cfg = apConfig();
  const result = validateContribution('access-point', { name: 'X', longitude: 181 }, cfg);
  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.status, 400);
    assert.ok(result.error.includes('longitude'));
  }
});

test('validateContribution: zero feeUsd is valid (min=0)', () => {
  const cfg = apConfig();
  const result = validateContribution('access-point', { name: 'X', feeUsd: 0 }, cfg);
  assert.ok(result.ok);
});

test('validateContribution: boolean permitRequired coerced from string', () => {
  const cfg = apConfig();
  const result = validateContribution('access-point', { name: 'X', permitRequired: 'true' }, cfg);
  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.clean.permitRequired, true);
  }
});

test('validateContribution: invalid boolean → 400', () => {
  const cfg = apConfig();
  const result = validateContribution('access-point', { name: 'X', permitRequired: 'yes' }, cfg);
  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.status, 400);
  }
});

// ---------------------------------------------------------------------------
// buildChangeset
// ---------------------------------------------------------------------------
test('buildChangeset: returns only changed fields', () => {
  const before = { name: 'Old Name', latitude: 38.0, notes: 'Old' };
  const after  = { name: 'New Name', latitude: 38.0, notes: 'New' };
  const keys   = ['name', 'latitude', 'notes'];

  const cs = buildChangeset(before, after, keys);
  assert.deepEqual(cs.before, { name: 'Old Name', notes: 'Old' });
  assert.deepEqual(cs.after,  { name: 'New Name', notes: 'New' });
});

test('buildChangeset: identical values → empty diff', () => {
  const before = { name: 'Same', latitude: 38.0 };
  const after  = { name: 'Same', latitude: 38.0 };
  const cs = buildChangeset(before, after, ['name', 'latitude']);
  assert.deepEqual(cs.before, {});
  assert.deepEqual(cs.after,  {});
});

test('buildChangeset: undefined before treated as null', () => {
  const before = {};
  const after  = { name: 'New Name' };
  const cs = buildChangeset(before, after, ['name']);
  assert.deepEqual(cs.before, { name: null });
  assert.deepEqual(cs.after,  { name: 'New Name' });
});

test('buildChangeset: keys not in fieldKeys are ignored', () => {
  const before = { name: 'A', notes: 'B' };
  const after  = { name: 'X', notes: 'Y' };
  const cs = buildChangeset(before, after, ['name']); // notes excluded
  assert.ok(!('notes' in cs.before));
  assert.ok(!('notes' in cs.after));
});

// ---------------------------------------------------------------------------
// applyChangeset
// ---------------------------------------------------------------------------
test('applyChangeset: returns changeset.after fields', () => {
  const row = { name: 'Old', latitude: 38.0, notes: 'old notes' };
  const cs  = { before: { name: 'Old' }, after: { name: 'Updated' } };
  const patch = applyChangeset(row, cs);
  assert.deepEqual(patch, { name: 'Updated' });
});

test('applyChangeset round-trip: patching with result gives updated row', () => {
  const row = { name: 'Old', latitude: 38.0 };
  const cs  = { before: { name: 'Old' }, after: { name: 'New' } };
  const patch = applyChangeset(row, cs);
  const updated = { ...row, ...patch };
  assert.equal(updated.name, 'New');
  assert.equal(updated.latitude, 38.0);
});

// ---------------------------------------------------------------------------
// nextVersion
// ---------------------------------------------------------------------------
test('nextVersion: null → 1', () => {
  assert.equal(nextVersion(null), 1);
});

test('nextVersion: undefined → 1', () => {
  assert.equal(nextVersion(undefined), 1);
});

test('nextVersion: 0 → 1', () => {
  assert.equal(nextVersion(0), 1);
});

test('nextVersion: 3 → 4', () => {
  assert.equal(nextVersion(3), 4);
});

// ---------------------------------------------------------------------------
// canTransition — full matrix
// ---------------------------------------------------------------------------
const allStates: VerificationState[] = ['pending', 'verified', 'disputed', 'rejected'];

// Legal transitions
test('canTransition: pending → verified (legal)', () => {
  assert.equal(canTransition('pending', 'verified'), true);
});
test('canTransition: pending → disputed (legal)', () => {
  assert.equal(canTransition('pending', 'disputed'), true);
});
test('canTransition: pending → rejected (legal)', () => {
  assert.equal(canTransition('pending', 'rejected'), true);
});
test('canTransition: disputed → verified (legal)', () => {
  assert.equal(canTransition('disputed', 'verified'), true);
});
test('canTransition: disputed → rejected (legal)', () => {
  assert.equal(canTransition('disputed', 'rejected'), true);
});
test('canTransition: verified → disputed (legal)', () => {
  assert.equal(canTransition('verified', 'disputed'), true);
});

// Illegal transitions
test('canTransition: pending → pending (illegal self-loop)', () => {
  assert.equal(canTransition('pending', 'pending'), false);
});
test('canTransition: verified → pending (illegal)', () => {
  assert.equal(canTransition('verified', 'pending'), false);
});
test('canTransition: verified → rejected (illegal)', () => {
  assert.equal(canTransition('verified', 'rejected'), false);
});
test('canTransition: verified → verified (illegal self-loop)', () => {
  assert.equal(canTransition('verified', 'verified'), false);
});
test('canTransition: disputed → pending (illegal)', () => {
  assert.equal(canTransition('disputed', 'pending'), false);
});
test('canTransition: disputed → disputed (illegal self-loop)', () => {
  assert.equal(canTransition('disputed', 'disputed'), false);
});
test('canTransition: rejected → pending (terminal: illegal)', () => {
  assert.equal(canTransition('rejected', 'pending'), false);
});
test('canTransition: rejected → verified (terminal: illegal)', () => {
  assert.equal(canTransition('rejected', 'verified'), false);
});
test('canTransition: rejected → disputed (terminal: illegal)', () => {
  assert.equal(canTransition('rejected', 'disputed'), false);
});
test('canTransition: rejected → rejected (terminal: illegal self-loop)', () => {
  assert.equal(canTransition('rejected', 'rejected'), false);
});

// ---------------------------------------------------------------------------
// validateContribution — rapid (Phase B)
// ---------------------------------------------------------------------------

function rapidConfig() {
  const cfg = getEntityConfig('rapid');
  assert.ok(cfg, 'rapid config must exist');
  return cfg!;
}

test('rapid config: entityType and tableName are correct', () => {
  const cfg = getEntityConfig('rapid');
  assert.ok(cfg);
  assert.equal(cfg!.entityType, 'rapid');
  assert.equal(cfg!.tableName, 'Rapid');
  assert.equal(cfg!.label, 'Rapid');
});

test('validateContribution rapid: valid minimal (name only) passes', () => {
  const cfg = rapidConfig();
  const result = validateContribution('rapid', { name: 'Zoom Flume' }, cfg);
  assert.ok(result.ok);
  if (result.ok) assert.equal(result.clean.name, 'Zoom Flume');
});

test('validateContribution rapid: valid full set passes', () => {
  const cfg = rapidConfig();
  const result = validateContribution('rapid', {
    name: 'Sunshine Falls',
    classRating: 'V',
    riverMile: 3.2,
    latitude: 38.463,
    longitude: -105.314,
    scoutPortageNotes: 'Scout river left.',
    linesJson: JSON.stringify([{ name: 'Main drop', description: 'Hard left.' }]),
    hazardsJson: JSON.stringify([{ type: 'hydraulic', severity: 'serious' }]),
    classByFlowJson: JSON.stringify([{ minCfs: 600, maxCfs: 1200, class: 'IV+' }]),
  }, cfg);
  assert.ok(result.ok, `expected ok but got error: ${!result.ok ? (result as any).error : ''}`);
  if (result.ok) {
    assert.equal(result.clean.classRating, 'V');
    assert.equal(result.clean.riverMile, 3.2);
  }
});

test('validateContribution rapid: non-descriptor keys dropped (id, sectionId, corridorId)', () => {
  const cfg = rapidConfig();
  const result = validateContribution('rapid', {
    name: 'Test Rapid',
    id: 'some-id',
    sectionId: 'arkansas-numbers',
    corridorId: 'arkansas-headwaters',
    sortIndex: 10,
  }, cfg);
  assert.ok(result.ok);
  if (result.ok) {
    assert.ok(!('id' in result.clean));
    assert.ok(!('sectionId' in result.clean));
    assert.ok(!('corridorId' in result.clean));
    assert.ok(!('sortIndex' in result.clean));
    assert.equal(result.clean.name, 'Test Rapid');
  }
});

test('validateContribution rapid: required name missing (non-partial) → 400', () => {
  const cfg = rapidConfig();
  const result = validateContribution('rapid', { classRating: 'IV' }, cfg);
  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.status, 400);
    assert.ok(result.error.toLowerCase().includes('name'));
  }
});

test('validateContribution rapid: partial edit allows missing name', () => {
  const cfg = rapidConfig();
  const result = validateContribution('rapid', { classRating: 'IV+' }, cfg, { partial: true });
  assert.ok(result.ok);
});

test('validateContribution rapid: invalid linesJson (bad JSON) → 400', () => {
  const cfg = rapidConfig();
  const result = validateContribution('rapid', {
    name: 'Test',
    linesJson: 'not valid json {[',
  }, cfg);
  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.status, 400);
    assert.ok(result.error.toLowerCase().includes('linesjson') || result.error.includes('linesJson'));
  }
});

test('validateContribution rapid: invalid hazardsJson → 400', () => {
  const cfg = rapidConfig();
  const result = validateContribution('rapid', {
    name: 'Test',
    hazardsJson: '{bad',
  }, cfg);
  assert.ok(!result.ok);
  if (!result.ok) assert.equal(result.status, 400);
});

test('validateContribution rapid: invalid classByFlowJson → 400', () => {
  const cfg = rapidConfig();
  const result = validateContribution('rapid', {
    name: 'Test',
    classByFlowJson: 'oops',
  }, cfg);
  assert.ok(!result.ok);
  if (!result.ok) assert.equal(result.status, 400);
});

test('validateContribution rapid: latitude out of range → 400', () => {
  const cfg = rapidConfig();
  const result = validateContribution('rapid', { name: 'X', latitude: 100 }, cfg);
  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.status, 400);
    assert.ok(result.error.includes('latitude'));
  }
});

test('validateContribution rapid: longitude out of range → 400', () => {
  const cfg = rapidConfig();
  const result = validateContribution('rapid', { name: 'X', longitude: -200 }, cfg);
  assert.ok(!result.ok);
  if (!result.ok) assert.equal(result.status, 400);
});

test('validateContribution rapid: negative riverMile → 400', () => {
  const cfg = rapidConfig();
  const result = validateContribution('rapid', { name: 'X', riverMile: -1 }, cfg);
  assert.ok(!result.ok);
  if (!result.ok) assert.equal(result.status, 400);
});

test('validateContribution rapid: valid linesJson (valid JSON array) passes', () => {
  const cfg = rapidConfig();
  const result = validateContribution('rapid', {
    name: 'X',
    linesJson: '[]',
  }, cfg);
  assert.ok(result.ok);
});

test('rapid newId generates a string containing "rapid"', () => {
  const cfg = rapidConfig();
  const id = cfg.newId({ name: 'Number One Rapid' });
  assert.ok(typeof id === 'string' && id.length > 0);
  assert.ok(id.includes('rapid'), `expected id to contain "rapid", got: ${id}`);
  // Also confirm slugified name appears
  assert.ok(id.includes('number-one-rapid'), `expected id to contain slugified name, got: ${id}`);
});

// ---------------------------------------------------------------------------
// Regression tests (Phase A2 bug fixes)
// ---------------------------------------------------------------------------

// validateContribution with {partial:true} and missing required field → ok:true
test('validateContribution: partial:true allows missing required name', () => {
  const cfg = apConfig();
  const result = validateContribution('access-point', { kind: 'put-in' }, cfg, { partial: true });
  assert.ok(result.ok, 'partial edit without name should pass');
});

// validateContribution with {partial:false} and missing required field → ok:false, status:400
test('validateContribution: partial:false (default) missing name → 400', () => {
  const cfg = apConfig();
  const result = validateContribution('access-point', { kind: 'put-in' }, cfg, { partial: false });
  assert.ok(!result.ok, 'full create without name should fail');
  if (!result.ok) {
    assert.equal(result.status, 400);
    assert.ok(result.error.toLowerCase().includes('name'));
  }
});

// buildChangeset: after omits some fieldKeys → omitted keys NOT in result (sparse)
test('buildChangeset: omitted fieldKey not present in result', () => {
  const before = { name: 'A', notes: 'x' };
  const after  = { notes: 'y' };  // name omitted
  const cs = buildChangeset(before, after, ['name', 'notes']);
  assert.ok(!('name' in cs.after),  'name should NOT be in changeset.after when omitted from after');
  assert.ok(!('name' in cs.before), 'name should NOT be in changeset.before when omitted from after');
  assert.equal(cs.after.notes, 'y');
  assert.equal(cs.before.notes, 'x');
});

// buildChangeset: present-but-unchanged field excluded from result
test('buildChangeset: unchanged field excluded from changeset', () => {
  const before = { name: 'A', notes: 'x' };
  const after  = { name: 'A', notes: 'y' };
  const cs = buildChangeset(before, after, ['name', 'notes']);
  assert.ok(!('name' in cs.after),  'unchanged name should not be in changeset.after');
  assert.ok(!('name' in cs.before), 'unchanged name should not be in changeset.before');
  assert.equal(cs.after.notes, 'y');
});

// ---------------------------------------------------------------------------
// validateContribution — shuttle-business (Phase C)
// ---------------------------------------------------------------------------

function shuttleConfig() {
  const cfg = getEntityConfig('shuttle-business');
  assert.ok(cfg, 'shuttle-business config must exist');
  return cfg!;
}

test('shuttle-business config: entityType and tableName are correct', () => {
  const cfg = getEntityConfig('shuttle-business');
  assert.ok(cfg);
  assert.equal(cfg!.entityType, 'shuttle-business');
  assert.equal(cfg!.tableName, 'ShuttleBusiness');
  assert.equal(cfg!.label, 'Shuttle business');
});

test('validateContribution shuttle: valid minimal (name only) passes', () => {
  const cfg = shuttleConfig();
  const result = validateContribution('shuttle-business', { name: 'Arkansas Valley Adventures' }, cfg);
  assert.ok(result.ok);
  if (result.ok) assert.equal(result.clean.name, 'Arkansas Valley Adventures');
});

test('validateContribution shuttle: valid full set passes', () => {
  const cfg = shuttleConfig();
  const result = validateContribution('shuttle-business', {
    name: 'Arkansas Valley Adventures',
    phone: '719-539-6789',
    website: 'https://avaraft.com',
    serviceCorridorIds: JSON.stringify(['arkansas-headwaters']),
    ratesJson: JSON.stringify([{ label: 'Hecla to Salida', priceUsd: 35, notes: 'per person' }]),
    notes: 'Call ahead for reservations.',
  }, cfg);
  assert.ok(result.ok, `expected ok, got: ${!result.ok ? (result as any).error : ''}`);
  if (result.ok) {
    assert.equal(result.clean.phone, '719-539-6789');
  }
});

test('validateContribution shuttle: non-descriptor keys dropped (id, slug, lastVerifiedAt)', () => {
  const cfg = shuttleConfig();
  const result = validateContribution('shuttle-business', {
    name: 'Test Shuttle',
    id: 'should-drop',
    slug: 'should-drop',
    lastVerifiedAt: 'should-drop',
    verifiedBy: 'should-drop',
  }, cfg);
  assert.ok(result.ok);
  if (result.ok) {
    assert.ok(!('id' in result.clean));
    assert.ok(!('slug' in result.clean));
    assert.ok(!('lastVerifiedAt' in result.clean));
    assert.ok(!('verifiedBy' in result.clean));
    assert.equal(result.clean.name, 'Test Shuttle');
  }
});

test('validateContribution shuttle: required name missing (non-partial) → 400', () => {
  const cfg = shuttleConfig();
  const result = validateContribution('shuttle-business', { phone: '555-1234' }, cfg);
  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.status, 400);
    assert.ok(result.error.toLowerCase().includes('name'));
  }
});

test('validateContribution shuttle: partial edit allows missing name', () => {
  const cfg = shuttleConfig();
  const result = validateContribution('shuttle-business', { phone: '555-1234' }, cfg, { partial: true });
  assert.ok(result.ok);
});

test('validateContribution shuttle: invalid ratesJson (bad JSON) → 400', () => {
  const cfg = shuttleConfig();
  const result = validateContribution('shuttle-business', {
    name: 'Test',
    ratesJson: 'not valid json {[',
  }, cfg);
  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.status, 400);
    assert.ok(result.error.toLowerCase().includes('ratesjson') || result.error.includes('ratesJson'));
  }
});

// serviceCorridorIds is type 'longtext' (key doesn't end in Json), so it is stored
// as-is without JSON validation — the *Json suffix convention triggers JSON checks.
test('validateContribution shuttle: serviceCorridorIds stored as-is (no Json-suffix check)', () => {
  const cfg = shuttleConfig();
  const result = validateContribution('shuttle-business', {
    name: 'Test',
    serviceCorridorIds: 'not-json',
  }, cfg);
  // No JSON validation on this field — it passes through
  assert.ok(result.ok);
});

test('validateContribution shuttle: valid ratesJson (empty array) passes', () => {
  const cfg = shuttleConfig();
  const result = validateContribution('shuttle-business', {
    name: 'Test',
    ratesJson: '[]',
  }, cfg);
  assert.ok(result.ok);
});

test('shuttle-business newId generates a string containing "shuttle"', () => {
  const cfg = shuttleConfig();
  const id = cfg.newId({ name: 'Arkansas Valley Adventures' });
  assert.ok(typeof id === 'string' && id.length > 0);
  assert.ok(id.includes('shuttle'), `expected id to contain "shuttle", got: ${id}`);
});

// ---------------------------------------------------------------------------
// validateContribution — outfitter (Phase C)
// ---------------------------------------------------------------------------

function outfitterConfig() {
  const cfg = getEntityConfig('outfitter');
  assert.ok(cfg, 'outfitter config must exist');
  return cfg!;
}

test('outfitter config: entityType and tableName are correct', () => {
  const cfg = getEntityConfig('outfitter');
  assert.ok(cfg);
  assert.equal(cfg!.entityType, 'outfitter');
  assert.equal(cfg!.tableName, 'Outfitter');
  assert.equal(cfg!.label, 'Outfitter');
});

test('validateContribution outfitter: valid minimal (name only) passes', () => {
  const cfg = outfitterConfig();
  const result = validateContribution('outfitter', { name: 'Wilderness Aware Rafting' }, cfg);
  assert.ok(result.ok);
  if (result.ok) assert.equal(result.clean.name, 'Wilderness Aware Rafting');
});

test('validateContribution outfitter: valid full set passes', () => {
  const cfg = outfitterConfig();
  const result = validateContribution('outfitter', {
    name: 'Wilderness Aware Rafting',
    licenseNumber: 'CO-OA-2024-0042',
    licenseState: 'CO',
    phone: '719-395-2112',
    website: 'https://inaraft.com',
    serviceCorridorIds: JSON.stringify(['arkansas-headwaters']),
    tripTypesJson: JSON.stringify(['half-day', 'full-day', 'overnight']),
    notes: 'Family-friendly trips available.',
  }, cfg);
  assert.ok(result.ok, `expected ok, got: ${!result.ok ? (result as any).error : ''}`);
  if (result.ok) {
    assert.equal(result.clean.licenseNumber, 'CO-OA-2024-0042');
  }
});

test('validateContribution outfitter: non-descriptor keys dropped (id, slug)', () => {
  const cfg = outfitterConfig();
  const result = validateContribution('outfitter', {
    name: 'Test Outfitter',
    id: 'should-drop',
    slug: 'should-drop',
    currentContributionId: 'should-drop',
  }, cfg);
  assert.ok(result.ok);
  if (result.ok) {
    assert.ok(!('id' in result.clean));
    assert.ok(!('slug' in result.clean));
    assert.ok(!('currentContributionId' in result.clean));
    assert.equal(result.clean.name, 'Test Outfitter');
  }
});

test('validateContribution outfitter: required name missing (non-partial) → 400', () => {
  const cfg = outfitterConfig();
  const result = validateContribution('outfitter', { licenseNumber: 'CO-123' }, cfg);
  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.status, 400);
    assert.ok(result.error.toLowerCase().includes('name'));
  }
});

test('validateContribution outfitter: partial edit allows missing name', () => {
  const cfg = outfitterConfig();
  const result = validateContribution('outfitter', { licenseNumber: 'CO-456' }, cfg, { partial: true });
  assert.ok(result.ok);
});

test('validateContribution outfitter: invalid tripTypesJson (bad JSON) → 400', () => {
  const cfg = outfitterConfig();
  const result = validateContribution('outfitter', {
    name: 'Test',
    tripTypesJson: 'not valid json',
  }, cfg);
  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.status, 400);
    assert.ok(result.error.toLowerCase().includes('triptypesjson') || result.error.includes('tripTypesJson'));
  }
});

// serviceCorridorIds is type 'longtext' (key doesn't end in Json), so it is stored
// as-is without JSON validation — the *Json suffix convention triggers JSON checks.
test('validateContribution outfitter: serviceCorridorIds stored as-is (no Json-suffix check)', () => {
  const cfg = outfitterConfig();
  const result = validateContribution('outfitter', {
    name: 'Test',
    serviceCorridorIds: '{bad}',
  }, cfg);
  // No JSON validation on this field — it passes through
  assert.ok(result.ok);
});

test('validateContribution outfitter: valid tripTypesJson passes', () => {
  const cfg = outfitterConfig();
  const result = validateContribution('outfitter', {
    name: 'Test',
    tripTypesJson: JSON.stringify(['half-day', 'full-day']),
  }, cfg);
  assert.ok(result.ok);
});

test('outfitter newId generates a string containing "outfitter"', () => {
  const cfg = outfitterConfig();
  const id = cfg.newId({ name: 'Echo Canyon River Expeditions' });
  assert.ok(typeof id === 'string' && id.length > 0);
  assert.ok(id.includes('outfitter'), `expected id to contain "outfitter", got: ${id}`);
});
