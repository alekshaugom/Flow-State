import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildAccessPointsFromSections } from '../lib/access-points.ts';

function mkSection(p: { id: string; corridorId: string; riverId?: string; sortIndex: number; putIn: string; takeOut: string; primaryGaugeId?: string }) {
	return { riverId: 'r', ...p };
}

test('AccessPoint backfill: produces deduped APs with kind=both for shared put-in/take-out', () => {
	const sections = [
		mkSection({ id: 'sec-a', corridorId: 'c1', sortIndex: 10, putIn: 'Granite', takeOut: 'Buena Vista' }),
		mkSection({ id: 'sec-b', corridorId: 'c1', sortIndex: 20, putIn: 'Buena Vista', takeOut: 'Nathrop' }),
	];
	const { accessPoints } = buildAccessPointsFromSections(sections);
	assert.equal(accessPoints.length, 3, '3 unique APs from 2 sections sharing one name');
	const bv = accessPoints.find(a => a.name === 'Buena Vista');
	assert.ok(bv, 'Buena Vista exists');
	assert.equal(bv!.kind, 'both', 'shared AP merges to kind=both');
	const granite = accessPoints.find(a => a.name === 'Granite');
	assert.equal(granite!.kind, 'put-in');
	const nathrop = accessPoints.find(a => a.name === 'Nathrop');
	assert.equal(nathrop!.kind, 'take-out');
});

test('AccessPoint backfill: assigns increasing sortIndex in upstream→downstream order', () => {
	const sections = [
		mkSection({ id: 'a', corridorId: 'c', sortIndex: 10, putIn: 'Top', takeOut: 'Mid' }),
		mkSection({ id: 'b', corridorId: 'c', sortIndex: 20, putIn: 'Mid', takeOut: 'Bottom' }),
	];
	const { accessPoints } = buildAccessPointsFromSections(sections);
	const sorted = accessPoints.slice().sort((a, b) => a.sortIndex - b.sortIndex);
	assert.deepEqual(sorted.map(a => a.name), ['Top', 'Mid', 'Bottom']);
});

test('AccessPoint backfill: section foreign keys resolve to actual AP IDs', () => {
	const sections = [
		mkSection({ id: 'sec-a', corridorId: 'c1', sortIndex: 10, putIn: 'X', takeOut: 'Y' }),
	];
	const { accessPoints, sectionUpdates } = buildAccessPointsFromSections(sections);
	const upd = sectionUpdates.get('sec-a');
	assert.ok(upd, 'has update');
	const apIds = new Set(accessPoints.map(a => a.id));
	assert.ok(apIds.has(upd!.fromAccessPointId!), 'from resolves');
	assert.ok(apIds.has(upd!.toAccessPointId!), 'to resolves');
});

test('AccessPoint backfill: gauges anchor to corridor with sortIndex midway between APs', () => {
	const sections = [
		mkSection({ id: 'a', corridorId: 'c1', sortIndex: 10, putIn: 'Top', takeOut: 'Mid', primaryGaugeId: 'g1' }),
		mkSection({ id: 'b', corridorId: 'c1', sortIndex: 20, putIn: 'Mid', takeOut: 'Bottom', primaryGaugeId: 'g2' }),
	];
	const { gaugeUpdates } = buildAccessPointsFromSections(sections);
	const g1 = gaugeUpdates.get('g1');
	assert.ok(g1);
	assert.equal(g1!.corridorId, 'c1');
	// First section: AP 10 (Top) → AP 20 (Mid). Midpoint = 15.
	assert.equal(g1!.sortIndex, 15, 'gauge 1 between AP 10 and AP 20');
	const g2 = gaugeUpdates.get('g2');
	// Second section: AP 20 (Mid) → AP 30 (Bottom). Midpoint = 25.
	assert.equal(g2!.sortIndex, 25, 'gauge 2 between AP 20 and AP 30');
});

test('AccessPoint backfill: first upstream section wins when a gauge serves multiple sections', () => {
	const sections = [
		mkSection({ id: 'a', corridorId: 'c1', sortIndex: 10, putIn: 'Top', takeOut: 'Mid', primaryGaugeId: 'g1' }),
		mkSection({ id: 'b', corridorId: 'c1', sortIndex: 20, putIn: 'Mid', takeOut: 'Bottom', primaryGaugeId: 'g1' }),
	];
	const { gaugeUpdates } = buildAccessPointsFromSections(sections);
	const g = gaugeUpdates.get('g1');
	assert.equal(g!.sortIndex, 15, 'gauge anchors to the most-upstream section (sortIndex 10)');
});

test('AccessPoint backfill: separate corridors produce independent AP lists (dam-break model)', () => {
	const sections = [
		mkSection({ id: 'upper-a', corridorId: 'upper', sortIndex: 10, putIn: 'Top', takeOut: 'Reservoir' }),
		mkSection({ id: 'lower-a', corridorId: 'lower', sortIndex: 10, putIn: 'Below Dam', takeOut: 'Bottom' }),
	];
	const { accessPoints } = buildAccessPointsFromSections(sections);
	const upperAPs = accessPoints.filter(a => a.corridorId === 'upper');
	const lowerAPs = accessPoints.filter(a => a.corridorId === 'lower');
	assert.equal(upperAPs.length, 2);
	assert.equal(lowerAPs.length, 2);
	// IDs must not collide even if names overlap across corridors
	const upperIds = new Set(upperAPs.map(a => a.id));
	const lowerIds = new Set(lowerAPs.map(a => a.id));
	for (const id of upperIds) assert.ok(!lowerIds.has(id), `corridor isolation: ${id} should be unique`);
});

test('AccessPoint backfill: empty / missing putIn-takeOut is handled gracefully', () => {
	const sections = [
		mkSection({ id: 'a', corridorId: 'c1', sortIndex: 10, putIn: '', takeOut: 'Only Take-out' }),
	];
	const { accessPoints, sectionUpdates } = buildAccessPointsFromSections(sections);
	assert.equal(accessPoints.length, 1);
	assert.equal(accessPoints[0].name, 'Only Take-out');
	assert.equal(sectionUpdates.get('a')!.fromAccessPointId, null);
});
