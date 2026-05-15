async function json<T>(res: Response): Promise<T> {
	if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
	const text = await res.text();
	return text ? JSON.parse(text) : undefined;
}

export const api = {
	dashboard: () =>
		fetch('/Dashboard').then(json<any>),

	riverDetail: (sectionId: string) =>
		fetch(`/RiverDetail/${encodeURIComponent(sectionId)}`).then(json<any>),

	watershed: (slug: string) =>
		fetch(`/WatershedView/${encodeURIComponent(slug)}`).then(json<any>),

	corridor: (slug: string) =>
		fetch(`/CorridorView/${encodeURIComponent(slug)}`).then(json<any>),

	ingestionStatus: () =>
		fetch('/Ingestion').then(json<any>),

	triggerIngestion: (action: string, extra?: Record<string, any>) =>
		fetch('/Ingestion', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ action, ...extra }),
		}).then(json<any>),

	seed: () =>
		fetch('/Seed', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
			.then(json<any>),

	seedStatus: () =>
		fetch('/Seed').then(json<any>),

	triggerForecast: (sectionId: string) =>
		fetch('/ForecastPipeline', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ sectionId }),
		}).then(json<any>),

	ingestionLogs: () =>
		fetch('/IngestionLog/?sort(-timestamp)&limit(20)').then(json<any>),

	dataHealth: () =>
		fetch('/DataHealth').then(json<any>),

	me: () =>
		fetch('/Me').then(json<any>),

	adminWaitlist: () =>
		fetch('/AdminWaitlist').then(json<any>),

	adminWaitlistAction: (userId: string, action: 'approve' | 'deny' | 'revoke') =>
		fetch('/AdminWaitlist', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ userId, action }),
		}).then(json<any>),
};
