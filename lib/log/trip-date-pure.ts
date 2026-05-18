const MONTHS = [
	'January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December',
];

function ordinalSuffix(day: number): string {
	const tens = day % 100;
	if (tens >= 11 && tens <= 13) return 'th';
	switch (day % 10) {
		case 1: return 'st';
		case 2: return 'nd';
		case 3: return 'rd';
		default: return 'th';
	}
}

function parseYmd(yyyymmdd: string): { year: number; month: number; day: number } | null {
	if (typeof yyyymmdd !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(yyyymmdd)) return null;
	const [yStr, mStr, dStr] = yyyymmdd.split('-');
	const year = parseInt(yStr, 10);
	const month = parseInt(mStr, 10);
	const day = parseInt(dStr, 10);
	if (!Number.isFinite(year) || month < 1 || month > 12 || day < 1 || day > 31) return null;
	return { year, month, day };
}

export function formatDayWithOrdinal(day: number): string {
	return `${day}${ordinalSuffix(day)}`;
}

export function formatTripDateLong(yyyymmdd: string): string {
	const parts = parseYmd(yyyymmdd);
	if (!parts) return yyyymmdd;
	const { year, month, day } = parts;
	return `${MONTHS[month - 1]} ${formatDayWithOrdinal(day)}, ${year}`;
}

export interface TripDateView {
	label: string;
	nightsLabel: string | null;
}

/**
 * Render a single-day or multi-day trip date as the card eyebrow would show it.
 *
 * - Single day → `May 16th, 2026`
 * - Multi-day, same year → `May 15th → May 17th, 2026`
 * - Multi-day, cross-year → `December 30th, 2025 → January 2nd, 2026`
 */
export function formatTripDate(date: string, endDate: string | null | undefined, tripNights: number | null | undefined): TripDateView {
	const start = parseYmd(date);
	if (!start) return { label: date, nightsLabel: null };

	const isMultiDay = !!endDate && endDate !== date && tripNights !== null && tripNights !== undefined && tripNights > 0;
	if (!isMultiDay) {
		return { label: formatTripDateLong(date), nightsLabel: null };
	}

	const end = parseYmd(endDate as string);
	const nights = tripNights as number;
	const nightsLabel = `${nights} ${nights === 1 ? 'night' : 'nights'}`;
	if (!end) {
		// Couldn't parse endDate — fall back to full single-day format.
		return { label: formatTripDateLong(date), nightsLabel };
	}

	if (end.year === start.year) {
		return {
			label: `${MONTHS[start.month - 1]} ${formatDayWithOrdinal(start.day)} → ${MONTHS[end.month - 1]} ${formatDayWithOrdinal(end.day)}, ${end.year}`,
			nightsLabel,
		};
	}

	return {
		label: `${formatTripDateLong(date)} → ${formatTripDateLong(endDate as string)}`,
		nightsLabel,
	};
}
