export const MAX_TRIP_NIGHTS = 14;

export interface CampingNight {
	date: string;
	location: string;
}

export type DateRangeError = { error: string; status: number } | null;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateDateRange(startDate: any, endDate: any): DateRangeError {
	if (typeof startDate !== 'string' || !DATE_RE.test(startDate)) {
		return { error: 'date must be YYYY-MM-DD', status: 400 };
	}
	if (endDate == null || endDate === '') return null;
	if (typeof endDate !== 'string' || !DATE_RE.test(endDate)) {
		return { error: 'endDate must be YYYY-MM-DD', status: 400 };
	}
	const startMs = Date.parse(startDate + 'T00:00:00Z');
	const endMs = Date.parse(endDate + 'T00:00:00Z');
	if (isNaN(startMs) || isNaN(endMs)) {
		return { error: 'invalid date', status: 400 };
	}
	if (endMs < startMs) {
		return { error: 'endDate must be on or after date', status: 400 };
	}
	const nights = Math.round((endMs - startMs) / 86_400_000);
	if (nights > MAX_TRIP_NIGHTS) {
		return { error: `endDate is more than ${MAX_TRIP_NIGHTS} nights after date`, status: 400 };
	}
	return null;
}

export function tripNightsBetween(startDate: string, endDate: string | null | undefined): number {
	if (!endDate || endDate === startDate) return 0;
	const startMs = Date.parse(startDate + 'T00:00:00Z');
	const endMs = Date.parse(endDate + 'T00:00:00Z');
	if (isNaN(startMs) || isNaN(endMs) || endMs < startMs) return 0;
	return Math.round((endMs - startMs) / 86_400_000);
}

export function parseCamping(json: string | null | undefined): CampingNight[] {
	if (!json) return [];
	try {
		const parsed = JSON.parse(json);
		if (!Array.isArray(parsed)) return [];
		const out: CampingNight[] = [];
		for (const entry of parsed) {
			if (!entry || typeof entry !== 'object') continue;
			const date = typeof entry.date === 'string' && DATE_RE.test(entry.date) ? entry.date : null;
			const location = typeof entry.location === 'string' ? entry.location.trim() : '';
			if (!date || !location) continue;
			out.push({ date, location });
		}
		return out;
	} catch {
		return [];
	}
}

export function stringifyCamping(nights: CampingNight[] | null | undefined): string | null {
	if (!nights || nights.length === 0) return null;
	const cleaned = nights
		.filter(n => n && typeof n.date === 'string' && DATE_RE.test(n.date) && typeof n.location === 'string' && n.location.trim())
		.map(n => ({ date: n.date, location: n.location.trim() }));
	if (cleaned.length === 0) return null;
	return JSON.stringify(cleaned);
}

export function validateCampingAgainstRange(camping: CampingNight[], startDate: string, endDate: string | null | undefined): DateRangeError {
	if (!camping.length) return null;
	if (!endDate || endDate === startDate) {
		return { error: 'campingJson is only allowed on multi-day trips (endDate must be after date)', status: 400 };
	}
	const startMs = Date.parse(startDate + 'T00:00:00Z');
	const endMs = Date.parse(endDate + 'T00:00:00Z');
	for (const night of camping) {
		const nightMs = Date.parse(night.date + 'T00:00:00Z');
		if (isNaN(nightMs)) {
			return { error: `camping night has invalid date: ${night.date}`, status: 400 };
		}
		if (nightMs < startMs || nightMs >= endMs) {
			return { error: `camping night ${night.date} is outside trip range ${startDate}..${endDate}`, status: 400 };
		}
	}
	return null;
}
