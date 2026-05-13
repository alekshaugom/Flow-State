export function isoNow(): string {
	return new Date().toISOString();
}

export function isoDate(d: Date): string {
	return d.toISOString().split('T')[0];
}

export function daysAgo(n: number): Date {
	const d = new Date();
	d.setDate(d.getDate() - n);
	return d;
}

export function hoursAgo(n: number): Date {
	return new Date(Date.now() - n * 3600_000);
}

export async function fetchJson(url: string, options?: RequestInit): Promise<any> {
	const res = await fetch(url, {
		...options,
		headers: { 'Accept': 'application/json', ...options?.headers },
	});
	if (res.status === 429) {
		const err: any = new Error(`HTTP 429 from ${url}: Too Many Requests`);
		err.status = 429;
		throw err;
	}
	if (!res.ok) {
		throw new Error(`HTTP ${res.status} from ${url}: ${res.statusText}`);
	}
	return res.json();
}

export async function fetchWithRetry(url: string, retries = 3, delayMs = 1000): Promise<any> {
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			return await fetchJson(url);
		} catch (err: any) {
			if (err?.status === 429) throw err;
			if (attempt === retries) throw err;
			await new Promise(r => setTimeout(r, delayMs * attempt));
		}
	}
}

export function compositeId(parts: string[]): string {
	return parts.join('_');
}

export function getFlowStatus(
	value: number,
	thresholds: { low: number; runnable: number; idealMin: number; idealMax: number; high: number; expert: number; dangerous: number }
): string {
	if (value <= 0) return 'no-flow';
	if (value < thresholds.low) return 'too-low';
	if (value < thresholds.runnable) return 'low';
	if (value >= thresholds.dangerous) return 'dangerous';
	if (value >= thresholds.expert) return 'expert-only';
	if (value >= thresholds.high) return 'high';
	if (value >= thresholds.idealMin && value <= thresholds.idealMax) return 'ideal';
	return 'runnable';
}
