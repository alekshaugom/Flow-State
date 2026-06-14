// lib/dam-flow.ts
// Pure logic that turns a reach's dam-release entries into a structured model
// the UI can render directly. No Harper / IO dependencies — unit-tested.
//
// A reach's dam picture takes one of two shapes:
//
//  - "controlling": a single on-channel dam sits directly upstream and releases
//    ~100% of the flow. Everything above it — including other dams stacked in
//    series — is already integrated into that dam's release, so we headline the
//    one controlling dam and list the rest as upstream feeders for context.
//    (e.g. the Gunnison Gorge below the Aspinall Unit: Blue Mesa → Morrow Point
//    → Crystal, all in series; Crystal's release is the whole river.)
//
//  - "contributing": dams sit on different tributaries (or merely augment an
//    otherwise snowmelt-driven river). Each adds part of the flow, so we show
//    every leaf dam's release plus a combined subtotal. Dams that feed another
//    dam in the same list (series feeders, e.g. Turquoise Lake → Twin Lakes on
//    the Fry-Ark project) are folded out of the subtotal to avoid double-counting.
//
// "Controlling" is a curated, per-reach judgment (RiverSection.controllingReservoirId):
// it requires an on-channel dam where essentially all of the reach's water passed
// through it. Series topology (Reservoir.feedsReservoirId) is what lets us fold
// stacked dams and pick the downstream-most "leaf" contributors.

export interface ReservoirRef {
	id: string;
	name?: string | null;
	feedsReservoirId?: string | null;
	riverId?: string | null;
	plannedReleaseUrl?: string | null;
	plannedReleaseNote?: string | null;
	[k: string]: any;
}

export interface DamReleaseEntry {
	reservoir: ReservoirRef | string | null;
	latest?: { outflowCfs?: number | null } | null;
	history?: any[];
	diversion?: any;
	[k: string]: any;
}

export type DamFlowMode = 'controlling' | 'contributing' | 'none';

export interface DamFlow {
	mode: DamFlowMode;
	/** The single dam governing ~100% of flow (mode === 'controlling'). */
	controlling: DamReleaseEntry | null;
	/** Downstream-most ("leaf") dams that each add flow (mode === 'contributing'). */
	contributors: DamReleaseEntry[];
	/** Dams that feed another listed dam in series — shown as upstream context,
	 *  never summed into combinedCfs. */
	feeders: DamReleaseEntry[];
	/** Sum of the headline dams' outflows (controlling: the one dam; contributing:
	 *  all leaf contributors with data). null when no dam has a release value yet. */
	combinedCfs: number | null;
	/** The reach's own current flow (cfs), for "share of flow from dams" context.
	 *  null on the corridor view, which has no single reach gauge. */
	reachFlowCfs: number | null;
}

function resId(entry: DamReleaseEntry): string | null {
	const r = entry?.reservoir;
	if (!r) return null;
	return typeof r === 'string' ? r : (r.id ?? null);
}

function feedsId(entry: DamReleaseEntry): string | null {
	const r = entry?.reservoir;
	if (!r || typeof r === 'string') return null;
	return r.feedsReservoirId ?? null;
}

function outflow(entry: DamReleaseEntry): number | null {
	const v = entry?.latest?.outflowCfs;
	return v == null ? null : v;
}

function sumOutflows(entries: DamReleaseEntry[]): number | null {
	const vals = entries.map(outflow).filter((v): v is number => v != null);
	return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
}

/**
 * Reservoir ids that do NOT feed another reservoir present in the same list —
 * i.e. the downstream-most dams whose releases actually reach the reach. A dam
 * whose feedsReservoirId points at another dam in the list is a series feeder
 * (its water is already counted in the dam it flows into).
 */
export function leafReservoirIds(entries: DamReleaseEntry[]): string[] {
	const ids = new Set((entries.map(resId).filter(Boolean)) as string[]);
	const leaves: string[] = [];
	for (const e of entries) {
		const id = resId(e);
		if (!id) continue;
		const feeds = feedsId(e);
		if (feeds && ids.has(feeds)) continue; // feeds another listed dam → not a leaf
		leaves.push(id);
	}
	return leaves;
}

export function buildDamFlow(args: {
	entries: DamReleaseEntry[] | null | undefined;
	controllingReservoirId?: string | null;
	reachFlowCfs?: number | null;
}): DamFlow {
	const entries = (args.entries ?? []).filter(Boolean) as DamReleaseEntry[];
	const reachFlowCfs = args.reachFlowCfs ?? null;

	if (entries.length === 0) {
		return { mode: 'none', controlling: null, contributors: [], feeders: [], combinedCfs: null, reachFlowCfs };
	}

	const leaves = new Set(leafReservoirIds(entries));

	// Controlling: an explicit, curated on-channel dam governs ~100% of the flow.
	// Every other listed dam is upstream of it in series, so it becomes context.
	const controllingId = args.controllingReservoirId ?? null;
	if (controllingId) {
		const controlling = entries.find(e => resId(e) === controllingId) ?? null;
		if (controlling) {
			const feeders = entries.filter(e => resId(e) !== controllingId);
			return {
				mode: 'controlling',
				controlling,
				contributors: [],
				feeders,
				combinedCfs: outflow(controlling),
				reachFlowCfs,
			};
		}
		// controllingReservoirId set but no matching entry (e.g. reservoir row
		// missing) → fall through and present whatever dams we do have.
	}

	const contributors = entries.filter(e => { const id = resId(e); return id != null && leaves.has(id); });
	const feeders = entries.filter(e => { const id = resId(e); return id != null && !leaves.has(id); });

	return {
		mode: 'contributing',
		controlling: null,
		contributors,
		feeders,
		combinedCfs: sumOutflows(contributors),
		reachFlowCfs,
	};
}
