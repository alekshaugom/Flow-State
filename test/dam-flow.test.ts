import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDamFlow, leafReservoirIds } from '../lib/dam-flow.ts';

// Build a dam-release entry shaped like getDamReleases() output.
function entry(id: string, outflowCfs: number | null, feedsReservoirId: string | null = null, extra: any = {}) {
	return {
		reservoir: { id, name: id, feedsReservoirId, ...extra },
		latest: outflowCfs == null ? null : { outflowCfs },
		history: [],
		diversion: null,
	};
}

test('leafReservoirIds folds series feeders out', () => {
	// Aspinall: blue-mesa → morrow-point → crystal-dam
	const entries = [
		entry('crystal-dam', 1500, null),
		entry('morrow-point', 1589, 'crystal-dam'),
		entry('blue-mesa', 1999, 'morrow-point'),
	];
	assert.deepEqual(leafReservoirIds(entries).sort(), ['crystal-dam']);
});

test('leafReservoirIds keeps all parallel dams', () => {
	const entries = [entry('granby', 78), entry('williams-fork', 24), entry('wolford-mountain', 53), entry('green-mountain', 579)];
	assert.deepEqual(leafReservoirIds(entries).sort(), ['granby', 'green-mountain', 'williams-fork', 'wolford-mountain']);
});

test('controlling: single dam governs 100%, others become feeders', () => {
	// Gunnison Gorge: Crystal is the controlling Aspinall dam.
	const entries = [
		entry('crystal-dam', 1500, null),
		entry('morrow-point', 1589, 'crystal-dam'),
		entry('blue-mesa', 1999, 'morrow-point'),
	];
	const df = buildDamFlow({ entries, controllingReservoirId: 'crystal-dam', reachFlowCfs: 1480 });
	assert.equal(df.mode, 'controlling');
	assert.equal((df.controlling!.reservoir as any).id, 'crystal-dam');
	assert.equal(df.contributors.length, 0);
	assert.deepEqual(df.feeders.map(f => (f.reservoir as any).id).sort(), ['blue-mesa', 'morrow-point']);
	assert.equal(df.combinedCfs, 1500); // the controlling dam's release, NOT the sum of all three
	assert.equal(df.reachFlowCfs, 1480);
});

test('contributing: multiple parallel dams, summed, no feeders', () => {
	// Upper Colorado: four dams on different tributaries each add flow.
	const entries = [entry('granby', 78), entry('williams-fork', 24), entry('wolford-mountain', 53), entry('green-mountain', 579)];
	const df = buildDamFlow({ entries, controllingReservoirId: null, reachFlowCfs: 2400 });
	assert.equal(df.mode, 'contributing');
	assert.equal(df.contributors.length, 4);
	assert.equal(df.feeders.length, 0);
	assert.equal(df.combinedCfs, 78 + 24 + 53 + 579);
});

test('contributing: series feeder folded out of the subtotal (no double-count)', () => {
	// Arkansas Fry-Ark: Turquoise → Twin Lakes (series); Clear Creek separate.
	const entries = [
		entry('twin-lakes', 200, null),
		entry('turquoise-lake', 150, 'twin-lakes'),
		entry('clear-creek-reservoir', 169, null),
	];
	const df = buildDamFlow({ entries, controllingReservoirId: null });
	assert.equal(df.mode, 'contributing');
	assert.deepEqual(df.contributors.map(c => (c.reservoir as any).id).sort(), ['clear-creek-reservoir', 'twin-lakes']);
	assert.deepEqual(df.feeders.map(f => (f.reservoir as any).id), ['turquoise-lake']);
	assert.equal(df.combinedCfs, 200 + 169); // turquoise NOT added (already in twin-lakes' release)
});

test('contributing: single augmentation dam', () => {
	const entries = [entry('ruedi', 105)];
	const df = buildDamFlow({ entries, controllingReservoirId: null, reachFlowCfs: 1800 });
	assert.equal(df.mode, 'contributing');
	assert.equal(df.contributors.length, 1);
	assert.equal(df.combinedCfs, 105);
});

test('null outflows: combinedCfs sums only dams with data, else null', () => {
	const partial = buildDamFlow({ entries: [entry('a', 100), entry('b', null)], controllingReservoirId: null });
	assert.equal(partial.combinedCfs, 100);
	const allNull = buildDamFlow({ entries: [entry('a', null), entry('b', null)], controllingReservoirId: null });
	assert.equal(allNull.combinedCfs, null);
});

test('controlling dam present but no release data yet', () => {
	// Cheesman controls Deckers but has no DamRelease rows — entry exists, outflow null.
	const df = buildDamFlow({ entries: [entry('cheesman', null)], controllingReservoirId: 'cheesman' });
	assert.equal(df.mode, 'controlling');
	assert.equal((df.controlling!.reservoir as any).id, 'cheesman');
	assert.equal(df.combinedCfs, null);
});

test('controllingReservoirId with no matching entry falls back to contributing', () => {
	const df = buildDamFlow({ entries: [entry('granby', 78)], controllingReservoirId: 'nonexistent' });
	assert.equal(df.mode, 'contributing');
	assert.equal(df.contributors.length, 1);
});

test('empty entries → mode none', () => {
	const df = buildDamFlow({ entries: [], controllingReservoirId: null, reachFlowCfs: 500 });
	assert.equal(df.mode, 'none');
	assert.equal(df.combinedCfs, null);
	assert.equal(df.contributors.length, 0);
	assert.equal(df.reachFlowCfs, 500);
});
