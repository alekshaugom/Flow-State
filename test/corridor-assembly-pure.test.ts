import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
	selectTopLevelSections,
	assembleCorridorPolyline,
	placeChildInParent,
	type SectionForAssembly,
} from '../app/src/lib/corridor-assembly-pure.ts';

const closeTo = (actual: number, expected: number, eps: number, msg?: string) =>
	assert.ok(Math.abs(actual - expected) < eps, `${msg ?? ''} expected ${actual} ≈ ${expected} (eps=${eps})`);

test('selectTopLevelSections drops children and sorts by sortIndex', () => {
	const sections: SectionForAssembly[] = [
		{ id: 'b', sortIndex: 20, parentSectionId: null },
		{ id: 'a-child', sortIndex: 11, parentSectionId: 'a' },
		{ id: 'a', sortIndex: 10, parentSectionId: null },
		{ id: 'c', sortIndex: 30, parentSectionId: undefined },
	];
	const out = selectTopLevelSections(sections);
	assert.deepEqual(out.map(s => s.id), ['a', 'b', 'c']);
});

test('assembleCorridorPolyline with all sections having geometry concatenates them in order', () => {
	const sections: SectionForAssembly[] = [
		{ id: 's1', sortIndex: 10, parentSectionId: null },
		{ id: 's2', sortIndex: 20, parentSectionId: null },
	];
	const geometries = {
		s1: [[-106.0, 39.0], [-106.0, 39.05], [-106.0, 39.1]] as [number, number][],
		s2: [[-106.0, 39.1], [-106.0, 39.15], [-106.0, 39.2]] as [number, number][],
	};
	const result = assembleCorridorPolyline(sections, geometries);
	assert.ok(result.polyline.length >= 4, 'concatenated polyline');
	assert.equal(result.sectionRanges.length, 2);
	assert.equal(result.sectionRanges[0].sectionId, 's1');
	assert.equal(result.sectionRanges[1].sectionId, 's2');
	assert.equal(result.sectionRanges[0].startMile, 0);
	closeTo(result.sectionRanges[0].endMile, result.sectionRanges[1].startMile, 1e-6, 'sections meet at start/end mile');
	closeTo(result.totalMiles, result.sectionRanges[1].endMile, 1e-6);
	assert.ok(result.sectionRanges[0].hasGeometry);
	assert.ok(result.sectionRanges[1].hasGeometry);
});

test('assembleCorridorPolyline bridges a gap section with a straight line', () => {
	const sections: SectionForAssembly[] = [
		{ id: 's1', sortIndex: 10, parentSectionId: null },
		{ id: 's-gap', sortIndex: 15, parentSectionId: null },
		{ id: 's2', sortIndex: 20, parentSectionId: null },
	];
	const geometries = {
		s1: [[-106.0, 39.0], [-106.0, 39.05]] as [number, number][],
		s2: [[-106.0, 39.10], [-106.0, 39.15]] as [number, number][],
		// s-gap intentionally missing
	};
	const result = assembleCorridorPolyline(sections, geometries);
	assert.equal(result.sectionRanges.length, 3);
	assert.equal(result.sectionRanges[1].sectionId, 's-gap');
	assert.ok(!result.sectionRanges[1].hasGeometry, 'gap section flagged as no-geometry');
	assert.ok(result.sectionRanges[1].endMile > result.sectionRanges[1].startMile, 'gap section has non-zero length');
	// Total should be ~10.4 miles (s1 ≈ 3.4 mi + gap ≈ 3.4 mi + s2 ≈ 3.4 mi) but exact depends on haversine; just verify monotonicity.
	for (let i = 1; i < result.sectionRanges.length; i++) {
		closeTo(result.sectionRanges[i - 1].endMile, result.sectionRanges[i].startMile, 1e-6, `range ${i-1}→${i} contiguous`);
	}
	assert.ok(result.totalMiles > 9 && result.totalMiles < 15, `totalMiles ~10-15 mi (got ${result.totalMiles})`);
});

test('assembleCorridorPolyline handles a trailing gap section using lengthMiles fallback', () => {
	const sections: SectionForAssembly[] = [
		{ id: 's1', sortIndex: 10, parentSectionId: null },
		{ id: 's-trailing', sortIndex: 20, parentSectionId: null, lengthMiles: 5 },
	];
	const geometries = {
		s1: [[-106.0, 39.0], [-106.0, 39.05]] as [number, number][],
	};
	const result = assembleCorridorPolyline(sections, geometries);
	assert.equal(result.sectionRanges.length, 2);
	// Trailing gap should still get a recorded mile range even though we can't draw it on the polyline.
	assert.ok(result.sectionRanges[1].endMile > result.sectionRanges[1].startMile, 'trailing gap has range');
});

test('placeChildInParent confines child to parent range', () => {
	const parent = { sectionId: 'p', startMile: 10, endMile: 30, hasGeometry: true };
	const child = placeChildInParent(parent, 0, 5);
	assert.equal(child.startMile, 10);
	assert.equal(child.endMile, 15);

	// Overshooting child clamps to parent end
	const big = placeChildInParent(parent, 18, 50);
	assert.equal(big.startMile, 28);
	assert.equal(big.endMile, 30);

	// Negative offset clamps to 0
	const neg = placeChildInParent(parent, -5, 5);
	assert.equal(neg.startMile, 10);
	assert.equal(neg.endMile, 15);
});
