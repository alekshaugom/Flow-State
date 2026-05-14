import { tables } from 'harper';
import {
	pickBandsForValue, selectByPrecedence, rowToResolved, legacyFallback,
	type FlowBandRow, type ResolvedBand,
} from './flow-bands-pure.ts';

export * from './flow-bands-pure.ts';

export async function loadBandsForSection(sectionId: string): Promise<FlowBandRow[]> {
	const out: FlowBandRow[] = [];
	for await (const b of tables.FlowBand.search({
		conditions: [{ attribute: 'sectionId', value: sectionId, comparator: 'equals' as const }],
	})) {
		out.push(b as FlowBandRow);
	}
	return out;
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
