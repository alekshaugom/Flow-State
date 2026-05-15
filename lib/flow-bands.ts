import { tables } from 'harper';
import {
	pickBandsForValue, selectByPrecedence, rowToResolved, legacyFallback,
	type FlowBandRow, type ResolvedBand,
} from './flow-bands-pure.ts';

export * from './flow-bands-pure.ts';

// In-memory FlowBand cache. The FlowBand table is small (≤ a few hundred
// rows for the foreseeable future) and rarely changes, so a process-local
// cache is cheaper than a per-request indexed search. Also dodges a Harper
// index-consistency quirk we saw on Fabric where filtered searches by
// sectionId returned 0 rows immediately after a rolling restart even though
// an empty-conditions scan saw the same rows.
let _bandsCache: FlowBandRow[] | null = null;
let _bandsCacheLoadedAt = 0;
const BANDS_CACHE_TTL_MS = 5 * 60_000;

export async function loadAllBands(): Promise<FlowBandRow[]> {
	if (_bandsCache && (Date.now() - _bandsCacheLoadedAt) < BANDS_CACHE_TTL_MS) {
		return _bandsCache;
	}
	const out: FlowBandRow[] = [];
	for await (const b of tables.FlowBand.search({ conditions: [] })) {
		out.push(b as FlowBandRow);
	}
	_bandsCache = out;
	_bandsCacheLoadedAt = Date.now();
	return out;
}

export function invalidateFlowBandsCache() {
	_bandsCache = null;
	_bandsCacheLoadedAt = 0;
}

export async function loadBandsForSection(sectionId: string): Promise<FlowBandRow[]> {
	const all = await loadAllBands();
	return all.filter(b => b.sectionId === sectionId);
}

export async function resolveFlowBand(
	sectionId: string,
	craft: string,
	skill: string,
	value: number | null,
): Promise<ResolvedBand | null> {
	if (value == null) return null;
	const bands = await loadBandsForSection(sectionId);
	const matching = pickBandsForValue(bands, value);
	const picked = selectByPrecedence(matching, craft, skill);
	if (picked) return rowToResolved(picked);
	const section = await tables.RiverSection.get(sectionId);
	if (!section) return null;
	return legacyFallback(section, value);
}
