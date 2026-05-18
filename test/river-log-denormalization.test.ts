import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildNewLogRow, getDenormalizationIds } from '../lib/log/river-log-pure.ts';

test('getDenormalizationIds reads watershedId from corridor', () => {
	const section = { corridorId: 'arkansas-headwaters' };
	const corridor = { watershedId: 'arkansas' };
	assert.deepEqual(getDenormalizationIds(section, corridor), {
		corridorId: 'arkansas-headwaters',
		watershedId: 'arkansas',
	});
});

test('getDenormalizationIds tolerates missing corridor', () => {
	const section = { corridorId: 'arkansas-headwaters' };
	assert.deepEqual(getDenormalizationIds(section, null), {
		corridorId: 'arkansas-headwaters',
		watershedId: null,
	});
});

test('getDenormalizationIds tolerates section with no corridor', () => {
	assert.deepEqual(getDenormalizationIds({}, null), {
		corridorId: null,
		watershedId: null,
	});
});

test('buildNewLogRow copies watershedId+corridorId onto the log at write time', () => {
	const log = buildNewLogRow(
		{
			userId: 'u1',
			sectionId: 'arkansas-browns-canyon',
			date: '2026-05-16',
			craftType: 'oar-raft',
			craftSize: '14 ft',
			craftName: 'Slipper Pickle',
			crewSize: 5,
			durationHours: 3.5,
			notes: 'tons of rock',
		},
		{
			section: {
				corridorId: 'arkansas-headwaters',
				putIn: 'Browns Park',
				takeOut: 'Hecla Junction',
			},
			corridor: { watershedId: 'arkansas' },
			flow: { cfs: 396, gaugeId: 'usgs-07091200' },
			id: 'u1_arkansas-browns-canyon_2026-05-16_12345',
			now: '2026-05-18T12:00:00.000Z',
		},
	);
	assert.equal(log.watershedId, 'arkansas');
	assert.equal(log.corridorId, 'arkansas-headwaters');
	assert.equal(log.userId, 'u1');
	assert.equal(log.sectionId, 'arkansas-browns-canyon');
	assert.equal(log.flowAtTripCfs, 396);
	assert.equal(log.flowSourceGaugeId, 'usgs-07091200');
	assert.equal(log.flowResolvedAt, '2026-05-18T12:00:00.000Z');
	assert.equal(log.visibility, 'private');
});

test('buildNewLogRow defaults put-in/take-out from section', () => {
	const log = buildNewLogRow(
		{ userId: 'u1', sectionId: 's1', date: '2026-05-16' },
		{
			section: { putIn: 'Default In', takeOut: 'Default Out', corridorId: 'c1' },
			corridor: { watershedId: 'w1' },
			flow: null,
			id: 'id',
			now: '2026-05-18T12:00:00.000Z',
		},
	);
	assert.equal(log.putIn, 'Default In');
	assert.equal(log.takeOut, 'Default Out');
});

test('buildNewLogRow leaves flow fields null when resolver returned null', () => {
	const log = buildNewLogRow(
		{ userId: 'u1', sectionId: 's1', date: '2026-05-16' },
		{
			section: { corridorId: 'c1' },
			corridor: { watershedId: 'w1' },
			flow: null,
			id: 'id',
			now: '2026-05-18T12:00:00.000Z',
		},
	);
	assert.equal(log.flowAtTripCfs, null);
	assert.equal(log.flowSourceGaugeId, null);
	assert.equal(log.flowResolvedAt, null);
});

test('buildNewLogRow always stamps visibility=private regardless of input', () => {
	const log = buildNewLogRow(
		{ userId: 'u1', sectionId: 's1', date: '2026-05-16' } as any,
		{
			section: {},
			corridor: null,
			flow: null,
			id: 'id',
			now: '2026-05-18T12:00:00.000Z',
		},
	);
	assert.equal(log.visibility, 'private');
});
