import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
	pickBandsForValue,
	selectByPrecedence,
	legacyFallback,
	rowToResolved,
	resolveFromCache,
	bandToDesignStatus,
	bandToLabel,
	type FlowBandRow,
} from '../lib/flow-bands.ts';

function makeBand(partial: Partial<FlowBandRow>): FlowBandRow {
	return {
		id: 'test',
		sectionId: 'sec',
		craftType: null,
		commercial: null,
		skillLevel: null,
		bandName: 'ideal',
		minCfs: 0,
		maxCfs: 99999,
		rating: 'ideal',
		description: 'test',
		authorNote: null,
		source: 'guide-input',
		active: true,
		...partial,
	};
}

test('pickBandsForValue filters by min/max and active flag', () => {
	const bands = [
		makeBand({ id: 'a', minCfs: 0, maxCfs: 100 }),
		makeBand({ id: 'b', minCfs: 100, maxCfs: 200 }),
		makeBand({ id: 'c', minCfs: 200, maxCfs: 300 }),
		makeBand({ id: 'd', minCfs: 100, maxCfs: 200, active: false }),
	];
	const matching = pickBandsForValue(bands, 150);
	assert.deepEqual(matching.map(b => b.id), ['b']);
});

test('selectByPrecedence prefers exact (craft, skill) match', () => {
	const bands = [
		makeBand({ id: 'a', craftType: 'raft', skillLevel: 'intermediate' }),
		makeBand({ id: 'b', craftType: 'raft', skillLevel: null }),
		makeBand({ id: 'c', craftType: null, skillLevel: 'intermediate' }),
		makeBand({ id: 'd', craftType: null, skillLevel: null }),
	];
	const picked = selectByPrecedence(bands, 'raft', 'intermediate');
	assert.equal(picked?.id, 'a');
});

test('selectByPrecedence falls through to craft-only when no exact match', () => {
	const bands = [
		makeBand({ id: 'b', craftType: 'raft', skillLevel: null }),
		makeBand({ id: 'c', craftType: null, skillLevel: 'intermediate' }),
		makeBand({ id: 'd', craftType: null, skillLevel: null }),
	];
	const picked = selectByPrecedence(bands, 'raft', 'intermediate');
	assert.equal(picked?.id, 'b');
});

test('selectByPrecedence falls through to skill-only when no craft match', () => {
	const bands = [
		makeBand({ id: 'b', craftType: 'kayak', skillLevel: 'expert' }),
		makeBand({ id: 'c', craftType: null, skillLevel: 'intermediate' }),
		makeBand({ id: 'd', craftType: null, skillLevel: null }),
	];
	const picked = selectByPrecedence(bands, 'raft', 'intermediate');
	assert.equal(picked?.id, 'c');
});

test('selectByPrecedence falls through to generic when nothing matches', () => {
	const bands = [
		makeBand({ id: 'b', craftType: 'kayak', skillLevel: 'expert' }),
		makeBand({ id: 'd', craftType: null, skillLevel: null }),
	];
	const picked = selectByPrecedence(bands, 'raft', 'intermediate');
	assert.equal(picked?.id, 'd');
});

test('selectByPrecedence returns null when no candidates', () => {
	const bands = [
		makeBand({ id: 'b', craftType: 'kayak', skillLevel: 'expert' }),
	];
	const picked = selectByPrecedence(bands, 'raft', 'intermediate');
	assert.equal(picked, null);
});

test('legacyFallback maps section thresholds to a synthetic band', () => {
	const section = {
		flowLow: 100, flowRunnable: 200, flowIdealMin: 400, flowIdealMax: 800,
		flowHigh: 1200, flowExpert: 1800, flowDangerous: 3000,
	};
	const band = legacyFallback(section, 500);
	assert.equal(band?.bandName, 'ideal');
	assert.equal(band?.source, 'legacy-fallback');
});

test('legacyFallback returns null when value is null', () => {
	const section = { flowLow: 100, flowRunnable: 200, flowIdealMin: 400, flowIdealMax: 800, flowHigh: 1200, flowExpert: 1800, flowDangerous: 3000 };
	const band = legacyFallback(section, null as any);
	assert.equal(band, null);
});

test('resolveFromCache uses bands then falls back to legacy', () => {
	const section = {
		flowLow: 100, flowRunnable: 200, flowIdealMin: 400, flowIdealMax: 800,
		flowHigh: 1200, flowExpert: 1800, flowDangerous: 3000,
	};
	// No bands for kayak/expert — falls back to legacy
	const bands: FlowBandRow[] = [
		makeBand({ id: 'a', craftType: 'raft', skillLevel: 'intermediate', minCfs: 0, maxCfs: 500, bandName: 'low-runnable' }),
	];
	const raftBand = resolveFromCache(bands, section, 'raft', 'intermediate', 250);
	assert.equal(raftBand?.bandName, 'low-runnable');
	assert.equal(raftBand?.source, 'guide-input');

	const kayakBand = resolveFromCache(bands, section, 'kayak', 'expert', 250);
	assert.equal(kayakBand?.source, 'legacy-fallback');
});

test('Browns Canyon canonical case: 396 cfs raft+intermediate is "low-runnable"', () => {
	// Simulates the seed data for Browns Canyon raft+intermediate.
	// Multiplier 1.0; tooLowMax=349, lowRunnableMax=499, idealMin=700.
	const brownsBands: FlowBandRow[] = [
		makeBand({ id: 'tl',  craftType: 'raft', skillLevel: 'intermediate', minCfs: 0,   maxCfs: 349,  bandName: 'too-low',      rating: 'no-go' }),
		makeBand({ id: 'lr',  craftType: 'raft', skillLevel: 'intermediate', minCfs: 350, maxCfs: 499,  bandName: 'low-runnable', rating: 'marginal' }),
		makeBand({ id: 'te',  craftType: 'raft', skillLevel: 'intermediate', minCfs: 500, maxCfs: 699,  bandName: 'technical',    rating: 'good' }),
		makeBand({ id: 'id',  craftType: 'raft', skillLevel: 'intermediate', minCfs: 700, maxCfs: 2500, bandName: 'ideal',        rating: 'ideal' }),
	];
	const resolved = resolveFromCache(brownsBands, {}, 'raft', 'intermediate', 396);
	assert.equal(resolved?.bandName, 'low-runnable', 'Browns at 396 should be low-runnable for raft+intermediate');
	assert.equal(resolved?.rating, 'marginal');
});

test('bandToDesignStatus maps band names to legacy status enum', () => {
	assert.equal(bandToDesignStatus('too-low'), 'too-low');
	assert.equal(bandToDesignStatus('low-runnable'), 'runnable');
	assert.equal(bandToDesignStatus('technical'), 'runnable');
	assert.equal(bandToDesignStatus('ideal'), 'ideal');
	assert.equal(bandToDesignStatus('pushy'), 'high');
	assert.equal(bandToDesignStatus('expert-only'), 'expert-only');
	assert.equal(bandToDesignStatus('unsafe'), 'dangerous');
});

test('bandToLabel produces friendly UI labels', () => {
	assert.equal(bandToLabel('low-runnable'), 'Runnable (technical)');
	assert.equal(bandToLabel('ideal'), 'Ideal');
	assert.equal(bandToLabel('expert-only'), 'Expert Only');
});

test('rowToResolved preserves all band fields', () => {
	const row = makeBand({
		id: 'x',
		craftType: 'raft',
		skillLevel: 'intermediate',
		bandName: 'low-runnable',
		description: 'Test description',
		authorNote: 'Test note',
		minCfs: 350,
		maxCfs: 499,
	});
	const resolved = rowToResolved(row);
	assert.equal(resolved.bandName, 'low-runnable');
	assert.equal(resolved.description, 'Test description');
	assert.equal(resolved.authorNote, 'Test note');
	assert.equal(resolved.minCfs, 350);
	assert.equal(resolved.maxCfs, 499);
	assert.equal(resolved.craftType, 'raft');
});
