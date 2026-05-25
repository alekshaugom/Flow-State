import { compositeId } from './utils.ts';

export interface AccessPointSeed {
	id: string;
	corridorId: string;
	riverId: string;
	name: string;
	altNames: string;
	kind: 'put-in' | 'take-out' | 'both';
	sortIndex: number;
	latitude: number | null;
	longitude: number | null;
	riverMile: number | null;
	fee: string | null;
	vehicleAccess: boolean | null;
	notes: string;
}

interface SectionLike {
	id: string;
	corridorId?: string;
	riverId?: string;
	sortIndex?: number;
	putIn?: string;
	takeOut?: string;
	primaryGaugeId?: string;
}

export interface BackfillResult {
	accessPoints: AccessPointSeed[];
	sectionUpdates: Map<string, { fromAccessPointId: string | null; toAccessPointId: string | null }>;
	gaugeUpdates: Map<string, { corridorId: string; sortIndex: number }>;
}

function normalize(s: string): string {
	return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Backfill access points from each section's putIn/takeOut strings.
 *
 * Per-corridor: walks sections in sortIndex order. Each unique putIn/takeOut
 * name becomes one AccessPoint; names that appear as both putIn for one section
 * and takeOut for another are merged with kind="both". AP sortIndex increments
 * by 10 in encounter order so APs sort upstream→downstream. Each gauge anchors
 * to the most-upstream section that lists it as primaryGaugeId; the gauge's
 * sortIndex lands midway between that section's two APs so the rail interleave
 * places it visually between them.
 *
 * Phase 5 hand curation overrides these by name match.
 */
export function buildAccessPointsFromSections(sections: SectionLike[]): BackfillResult {
	const sectionsByCorridor = new Map<string, SectionLike[]>();
	for (const s of sections) {
		if (!s.corridorId) continue;
		const arr = sectionsByCorridor.get(s.corridorId) || [];
		arr.push(s);
		sectionsByCorridor.set(s.corridorId, arr);
	}

	const accessPoints: AccessPointSeed[] = [];
	const sectionUpdates = new Map<string, { fromAccessPointId: string | null; toAccessPointId: string | null }>();
	const gaugeUpdates = new Map<string, { corridorId: string; sortIndex: number }>();

	for (const [corridorId, corridorSecs] of sectionsByCorridor) {
		corridorSecs.sort((a, b) => (a.sortIndex ?? 999) - (b.sortIndex ?? 999));
		const apByNorm = new Map<string, AccessPointSeed>();
		let nextSortIndex = 10;

		const apFor = (name: string | undefined, kind: 'put-in' | 'take-out', riverId: string): AccessPointSeed | null => {
			if (!name) return null;
			const norm = normalize(name);
			if (!norm) return null;
			const existing = apByNorm.get(norm);
			if (existing) {
				if (existing.kind !== kind) existing.kind = 'both';
				return existing;
			}
			const ap: AccessPointSeed = {
				id: compositeId(['ap', corridorId, norm]),
				corridorId,
				riverId,
				name,
				altNames: '',
				kind,
				sortIndex: nextSortIndex,
				latitude: null,
				longitude: null,
				riverMile: null,
				fee: null,
				vehicleAccess: null,
				notes: '',
			};
			apByNorm.set(norm, ap);
			accessPoints.push(ap);
			nextSortIndex += 10;
			return ap;
		};

		for (const sec of corridorSecs) {
			const riverId = sec.riverId || '';
			const fromAP = apFor(sec.putIn, 'put-in', riverId);
			const toAP = apFor(sec.takeOut, 'take-out', riverId);

			sectionUpdates.set(sec.id, {
				fromAccessPointId: fromAP?.id || null,
				toAccessPointId: toAP?.id || null,
			});

			if (sec.primaryGaugeId && fromAP && toAP && !gaugeUpdates.has(sec.primaryGaugeId)) {
				const midSort = Math.floor((fromAP.sortIndex + toAP.sortIndex) / 2);
				gaugeUpdates.set(sec.primaryGaugeId, { corridorId, sortIndex: midSort });
			}
		}
	}

	return { accessPoints, sectionUpdates, gaugeUpdates };
}
