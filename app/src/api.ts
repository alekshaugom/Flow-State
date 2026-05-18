import type { RiverLogEntry, RiverLogInput, UserProfileEntry, UserProfileInput, SectionLogsResponse, MyLogsResponse, MyLogsAggregateResponse, UserCraftEntry, UserCraftInput, MyCraftsResponse, EmailLoginResult, AdminLoginLinkResult, AdminLoginTokenList, AdminInviteUserInput, AdminInviteUserResult, AdminDeleteUserResult, SetMyPasswordResult } from './types';

async function json<T>(res: Response): Promise<T> {
	if (!res.ok) {
		let body = '';
		try { body = await res.text(); } catch {}
		throw new Error(body ? `${res.status} ${body}` : `${res.status} ${res.statusText}`);
	}
	const text = await res.text();
	return text ? JSON.parse(text) : undefined;
}

const JSON_HEADERS = { 'content-type': 'application/json' } as const;

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

	// --- River log ---
	myLogs: (sectionId?: string) =>
		fetch(`/RiverLogResource/${sectionId ? `?sectionId=${encodeURIComponent(sectionId)}` : ''}`)
			.then(json<MyLogsResponse>),

	myLog: (id: string) =>
		fetch(`/RiverLogResource/${encodeURIComponent(id)}`).then(json<RiverLogEntry>),

	createLog: (input: RiverLogInput) =>
		fetch('/RiverLogResource/', {
			method: 'POST',
			headers: JSON_HEADERS,
			body: JSON.stringify(input),
		}).then(json<RiverLogEntry>),

	updateLog: (id: string, patch: Partial<RiverLogInput>) =>
		fetch(`/RiverLogResource/${encodeURIComponent(id)}`, {
			method: 'PATCH',
			headers: JSON_HEADERS,
			body: JSON.stringify(patch),
		}).then(json<RiverLogEntry>),

	deleteLog: (id: string) =>
		fetch(`/RiverLogResource/${encodeURIComponent(id)}`, {
			method: 'DELETE',
		}).then(json<{ ok: true; id: string }>),

	sectionLogs: (sectionId: string) =>
		fetch(`/SectionLogsView/${encodeURIComponent(sectionId)}`).then(json<SectionLogsResponse>),

	myLogsAggregate: () =>
		fetch('/MyLogsView').then(json<MyLogsAggregateResponse>),

	// --- Profile ---
	profile: (userId: string) =>
		fetch(`/UserProfileResource/${encodeURIComponent(userId)}`).then(json<UserProfileEntry | null>),

	updateProfile: (userId: string, patch: UserProfileInput) =>
		fetch(`/UserProfileResource/${encodeURIComponent(userId)}`, {
			method: 'PUT',
			headers: JSON_HEADERS,
			body: JSON.stringify(patch),
		}).then(json<UserProfileEntry>),

	// --- Saved crafts ---
	myCrafts: () =>
		fetch('/UserCraftResource/').then(json<MyCraftsResponse>),

	createCraft: (input: UserCraftInput) =>
		fetch('/UserCraftResource/', {
			method: 'POST',
			headers: JSON_HEADERS,
			body: JSON.stringify(input),
		}).then(json<UserCraftEntry>),

	updateCraft: (id: string, patch: Partial<UserCraftInput>) =>
		fetch(`/UserCraftResource/${encodeURIComponent(id)}`, {
			method: 'PATCH',
			headers: JSON_HEADERS,
			body: JSON.stringify(patch),
		}).then(json<UserCraftEntry>),

	archiveCraft: (id: string) =>
		fetch(`/UserCraftResource/${encodeURIComponent(id)}`, {
			method: 'DELETE',
		}).then(json<{ ok: true; id: string }>),

	// --- Email/password auth ---
	emailLogin: (email: string, password: string) =>
		fetch('/EmailLoginResource', {
			method: 'POST',
			headers: JSON_HEADERS,
			body: JSON.stringify({ email, password }),
		}).then(json<EmailLoginResult>),

	consumeLoginLink: (token: string) =>
		fetch('/EmailLoginResource', {
			method: 'POST',
			headers: JSON_HEADERS,
			body: JSON.stringify({ action: 'consume', token }),
		}).then(json<EmailLoginResult>),

	setMyPassword: (password: string) =>
		fetch('/EmailLoginResource', {
			method: 'POST',
			headers: JSON_HEADERS,
			body: JSON.stringify({ action: 'set-my-password', password }),
		}).then(json<SetMyPasswordResult>),

	adminSetPassword: (userId: string, password: string) =>
		fetch('/AdminAuthResource', {
			method: 'POST',
			headers: JSON_HEADERS,
			body: JSON.stringify({ action: 'set-password', userId, password }),
		}).then(json<{ ok: true; userId: string; hadPriorPassword: boolean }>),

	adminCreateLoginLink: (userId: string, ttlMinutes?: number) =>
		fetch('/AdminAuthResource', {
			method: 'POST',
			headers: JSON_HEADERS,
			body: JSON.stringify({ action: 'create-login-link', userId, ttlMinutes }),
		}).then(json<AdminLoginLinkResult>),

	adminRevokeLoginToken: (userId: string, tokenId: string) =>
		fetch('/AdminAuthResource', {
			method: 'POST',
			headers: JSON_HEADERS,
			body: JSON.stringify({ action: 'revoke-token', userId, tokenId }),
		}).then(json<{ ok: true; tokenId: string }>),

	adminListLoginTokens: (userId: string) =>
		fetch('/AdminAuthResource', {
			method: 'POST',
			headers: JSON_HEADERS,
			body: JSON.stringify({ action: 'list-tokens', userId }),
		}).then(json<AdminLoginTokenList>),

	adminInviteUser: (input: AdminInviteUserInput) =>
		fetch('/AdminAuthResource', {
			method: 'POST',
			headers: JSON_HEADERS,
			body: JSON.stringify({ action: 'invite-user', ...input }),
		}).then(json<AdminInviteUserResult>),

	adminDeleteUser: (userId: string) =>
		fetch('/AdminAuthResource', {
			method: 'POST',
			headers: JSON_HEADERS,
			body: JSON.stringify({ action: 'delete-user', userId }),
		}).then(json<AdminDeleteUserResult>),
};
