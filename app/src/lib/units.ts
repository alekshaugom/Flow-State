import type { FlowUnit, TempUnit, LengthUnit } from '../hooks/usePreferences';

const CFS_TO_CMS = 0.0283168;
const MI_TO_KM = 1.60934;

/** Flow number only (no unit), formatted with thousands separators. */
export function flowValue(cfs: number | null | undefined, unit: FlowUnit): string {
	if (cfs == null || Number.isNaN(cfs)) return '—';
	if (unit === 'cms') {
		const cms = cfs * CFS_TO_CMS;
		const v = cms >= 100 ? Math.round(cms) : Math.round(cms * 10) / 10;
		return v.toLocaleString('en-US');
	}
	return Math.round(cfs).toLocaleString('en-US');
}

export function flowUnitLabel(unit: FlowUnit): string {
	return unit === 'cms' ? 'm³/s' : 'cfs';
}

/** "935 cfs" / "26.5 m³/s" */
export function formatFlow(cfs: number | null | undefined, unit: FlowUnit): string {
	if (cfs == null || Number.isNaN(cfs)) return '—';
	return `${flowValue(cfs, unit)} ${flowUnitLabel(unit)}`;
}

/** Fahrenheit input -> "83°" or "28°" depending on unit. Returns the number+degree only. */
export function formatTemp(f: number | null | undefined, unit: TempUnit): string {
	if (f == null || Number.isNaN(f)) return '—';
	const v = unit === 'C' ? Math.round((f - 32) * 5 / 9) : Math.round(f);
	return `${v}°`;
}

/** Just the converted temperature number (no degree sign). */
export function tempValue(f: number, unit: TempUnit): number {
	return unit === 'C' ? Math.round((f - 32) * 5 / 9) : Math.round(f);
}

/** Miles input -> "8 mi" / "12.9 km". */
export function formatLength(mi: number | null | undefined, unit: LengthUnit): string {
	if (mi == null || Number.isNaN(mi)) return '—';
	const v = unit === 'km' ? mi * MI_TO_KM : mi;
	const r = v >= 100 ? Math.round(v) : Math.round(v * 100) / 100;
	return `${r} ${unit}`;
}

export function lengthValue(mi: number, unit: LengthUnit): string {
	const v = unit === 'km' ? mi * MI_TO_KM : mi;
	const r = v >= 100 ? Math.round(v) : Math.round(v * 100) / 100;
	return String(r);
}

export function lengthUnitLabel(unit: LengthUnit): string {
	return unit;
}
