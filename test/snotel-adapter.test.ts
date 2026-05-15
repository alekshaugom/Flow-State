import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildSnowpackRecords, parseAwdbResponse } from '../lib/adapters/snotel.ts';

// Fixture: actual AWDB /data response captured 2026-05-15 for station 369:CO:SNTL element=WTEQ
const AWDB_RESPONSE = [{
	stationTriplet: '369:CO:SNTL',
	data: [{
		stationElement: { elementCode: 'WTEQ', ordinal: 1, durationName: 'DAILY' },
		values: [
			{ date: '2026-05-08', value: 0.5 },
			{ date: '2026-05-09', value: 0.4 },
			{ date: '2026-05-13', value: 0.6 },
		],
	}],
}];

test('parseAwdbResponse extracts {date,value} from nested data[].values[]', () => {
	const out = parseAwdbResponse(AWDB_RESPONSE);
	assert.equal(out.length, 3);
	assert.deepEqual(out[0], { date: '2026-05-08', value: 0.5 });
	assert.deepEqual(out[2], { date: '2026-05-13', value: 0.6 });
});

test('parseAwdbResponse handles empty / missing shapes', () => {
	assert.deepEqual(parseAwdbResponse([]), []);
	assert.deepEqual(parseAwdbResponse(null), []);
	assert.deepEqual(parseAwdbResponse([{ stationTriplet: 'x' }]), []);
	assert.deepEqual(parseAwdbResponse([{ stationTriplet: 'x', data: [] }]), []);
	assert.deepEqual(parseAwdbResponse([{ stationTriplet: 'x', data: [{}] }]), []);
});

test('parseAwdbResponse skips negative/null values (sentinels) and missing dates', () => {
	const out = parseAwdbResponse([{
		stationTriplet: 'x',
		data: [{ values: [
			{ date: '2026-05-08', value: 0.5 },
			{ date: '2026-05-09', value: -99 },  // missing-data sentinel
			{ date: null, value: 0.7 },
			{ date: '2026-05-10', value: null },
		]}],
	}]);
	assert.equal(out.length, 1);
	assert.equal(out[0].date, '2026-05-08');
});

test('buildSnowpackRecords stamps records with the logical basinId, not the station triplet', () => {
	const records = buildSnowpackRecords(
		'arkansas-headwaters',
		'369:CO:SNTL',
		[{ date: '2026-05-13', value: 12.5 }, { date: '2026-05-14', value: 12.3 }],
		[{ date: '2026-05-13', value: 36 }, { date: '2026-05-14', value: 35 }],
		[{ date: '2026-05-13', value: 18.0 }, { date: '2026-05-14', value: 18.1 }],
	);

	assert.equal(records.length, 2, 'should produce one record per date');
	for (const r of records) {
		assert.equal(r.basinId, 'arkansas-headwaters', 'basinId must be the logical basin, not the station triplet');
	}
});

test('buildSnowpackRecords composite id includes basin + station + timestamp so multiple stations in same basin do not collide', () => {
	const a = buildSnowpackRecords(
		'arkansas-headwaters',
		'369:CO:SNTL',
		[{ date: '2026-05-14', value: 12.3 }], [], [],
	);
	const b = buildSnowpackRecords(
		'arkansas-headwaters',
		'531:CO:SNTL',
		[{ date: '2026-05-14', value: 14.7 }], [], [],
	);
	assert.notEqual(a[0].id, b[0].id, 'two stations on the same day must produce distinct ids');
	assert.match(a[0].id, /arkansas-headwaters/);
	assert.match(a[0].id, /369-CO-SNTL/);
	assert.match(b[0].id, /531-CO-SNTL/);
});

test('buildSnowpackRecords merges swe / depth / precip per date', () => {
	const records = buildSnowpackRecords(
		'gunnison-river',
		'680:CO:SNTL',
		[{ date: '2026-05-14', value: 10 }],
		[{ date: '2026-05-14', value: 30 }],
		[{ date: '2026-05-14', value: 15 }],
	);
	assert.equal(records.length, 1);
	assert.equal(records[0].sweInches, 10);
	assert.equal(records[0].snowDepthInches, 30);
	assert.equal(records[0].precipAccumInches, 15);
});

test('buildSnowpackRecords handles missing elements gracefully', () => {
	const records = buildSnowpackRecords(
		'gunnison-river',
		'680:CO:SNTL',
		[{ date: '2026-05-14', value: 10 }],
		[],
		[],
	);
	assert.equal(records.length, 1);
	assert.equal(records[0].sweInches, 10);
	assert.equal(records[0].snowDepthInches, null);
	assert.equal(records[0].precipAccumInches, null);
});

test('buildSnowpackRecords returns empty when no data', () => {
	const records = buildSnowpackRecords('eagle-river', '842:CO:SNTL', [], [], []);
	assert.equal(records.length, 0);
});

test('parseAwdbResponse preserves the median field when present', () => {
	const out = parseAwdbResponse([{
		stationTriplet: '369:CO:SNTL',
		data: [{
			values: [
				{ date: '2025-12-01', value: 0.6, median: 2.8 },
				{ date: '2025-12-02', value: 0.8, median: 2.8 },
			],
		}],
	}]);
	assert.equal(out.length, 2);
	assert.equal(out[0].median, 2.8);
	assert.equal(out[1].median, 2.8);
});

test('parseAwdbResponse omits median when AWDB response does not include it', () => {
	const out = parseAwdbResponse([{
		stationTriplet: '369:CO:SNTL',
		data: [{ values: [{ date: '2025-12-01', value: 0.6 }] }],
	}]);
	assert.equal(out.length, 1);
	assert.equal(out[0].median, undefined);
});

test('buildSnowpackRecords computes swePercentMedian when sweData carries a median', () => {
	const records = buildSnowpackRecords(
		'arkansas-headwaters',
		'369:CO:SNTL',
		[{ date: '2025-12-01', value: 0.6, median: 2.8 }],  // 21.4% of median (drought)
		[],
		[],
	);
	assert.equal(records.length, 1);
	assert.equal(records[0].sweInches, 0.6);
	assert.equal(records[0].swePercentMedian, 21.4);
});

test('buildSnowpackRecords leaves swePercentMedian null when median is absent or zero', () => {
	const noMedian = buildSnowpackRecords(
		'arkansas-headwaters', '369:CO:SNTL',
		[{ date: '2025-12-01', value: 0.6 }], [], [],
	);
	assert.equal(noMedian[0].swePercentMedian, null);

	const zeroMedian = buildSnowpackRecords(
		'arkansas-headwaters', '369:CO:SNTL',
		[{ date: '2025-08-01', value: 0, median: 0 }], [], [],   // summer baseline; both zero
	);
	assert.equal(zeroMedian[0].swePercentMedian, null, 'guards against divide-by-zero');
});
