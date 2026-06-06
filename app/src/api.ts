import type { RiverLogEntry, RiverLogInput, SectionLogsResponse, MyLogsResponse, MyLogsAggregateResponse, UserCraftEntry, UserCraftInput, MyCraftsResponse, EmailLoginResult, AdminLoginLinkResult, AdminLoginTokenList, AdminInviteUserInput, AdminInviteUserResult, AdminDeleteUserResult, SetMyPasswordResult, SetMyNameResult, MyConnectionsResponse, MintShareResult, SharePreviewResult, ShareConsumeResult, ParticipantView, MyFollowsResponse } from './types';

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

	corridorTiles: () =>
		fetch('/CorridorTiles').then(json<any>),

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

	setMyName: (firstName: string, lastName: string) =>
		fetch('/EmailLoginResource', {
			method: 'POST',
			headers: JSON_HEADERS,
			body: JSON.stringify({ action: 'set-my-name', firstName, lastName }),
		}).then(json<SetMyNameResult>),

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

	adminGrantRole: (userId: string, role: string) =>
		fetch('/AdminAuthResource', {
			method: 'POST',
			headers: JSON_HEADERS,
			body: JSON.stringify({ action: 'grant-role', userId, role }),
		}).then(json<{ ok: true; userId: string; role: string }>),

	adminRevokeRole: (userId: string) =>
		fetch('/AdminAuthResource', {
			method: 'POST',
			headers: JSON_HEADERS,
			body: JSON.stringify({ action: 'revoke-role', userId }),
		}).then(json<{ ok: true; userId: string; role: string }>),

	// --- Share + participant primitives (slice 12c) ---
	mintShare: (tripId: string, inviteeEmail: string) =>
		fetch('/LogShareResource', {
			method: 'POST',
			headers: JSON_HEADERS,
			body: JSON.stringify({ action: 'mint', tripId, inviteeEmail }),
		}).then(json<MintShareResult>),

	previewShare: (token: string) =>
		fetch('/LogShareResource', {
			method: 'POST',
			headers: JSON_HEADERS,
			body: JSON.stringify({ action: 'preview', token }),
		}).then(json<SharePreviewResult>),

	consumeShare: (token: string) =>
		fetch('/LogShareResource', {
			method: 'POST',
			headers: JSON_HEADERS,
			body: JSON.stringify({ action: 'consume', token }),
		}).then(json<ShareConsumeResult>),

	revokeShare: (token: string) =>
		fetch('/LogShareResource', {
			method: 'POST',
			headers: JSON_HEADERS,
			body: JSON.stringify({ action: 'revoke', token }),
		}).then(json<{ ok: true; token: string; alreadyUsed?: boolean }>),

	myConnections: () =>
		fetch('/MyConnectionsView').then(json<MyConnectionsResponse>),

	addParticipant: (tripId: string, userId: string) =>
		fetch('/TripParticipantResource', {
			method: 'POST',
			headers: JSON_HEADERS,
			body: JSON.stringify({ tripId, userId }),
		}).then(json<ParticipantView>),

	patchParticipant: (participantId: string, patch: { notes?: string; notesPrivate?: boolean }) =>
		fetch(`/TripParticipantResource/${encodeURIComponent(participantId)}`, {
			method: 'PATCH',
			headers: JSON_HEADERS,
			body: JSON.stringify(patch),
		}).then(json<ParticipantView>),

	// --- Search + world rivers ---
	searchRivers: (q: string, limit = 12) =>
		fetch(`/RiverSearch?q=${encodeURIComponent(q)}&limit=${limit}`).then(json<SearchResults>),

	worldRiver: (slug: string) =>
		fetch(`/WorldRiverView/${encodeURIComponent(slug)}`).then(json<WorldRiverEntry>),

	requestRiver: (worldRiverId: string, note?: string) =>
		fetch('/RiverRequestResource', {
			method: 'POST',
			headers: JSON_HEADERS,
			body: JSON.stringify({ worldRiverId, note }),
		}).then(json<{ ok: true; id: string; alreadyExisted: boolean }>),

	myRiverRequests: () =>
		fetch('/RiverRequestResource').then(json<{ authenticated: boolean; requests: any[] }>),

	adminRiverRequests: () =>
		fetch('/AdminRiverRequests').then(json<AdminRiverRequestsResponse>),

	// --- Contributions (slice 21) ---
	submitContribution: (entityType: string, entityId: string | null, op: 'edit' | 'create', fields: Record<string, any>, bountyId?: string | null) =>
		fetch('/ContributionResource', {
			method: 'POST',
			headers: JSON_HEADERS,
			body: JSON.stringify({ entityType, op, entityId, fields, ...(bountyId ? { bountyId } : {}) }),
		}).then(json<any>),

	listContributions: (entityType: string, entityId: string) =>
		fetch(`/ContributionResource?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`).then(json<{ contributions: any[]; total: number }>),

	verifyContribution: (id: string, action: 'verify' | 'reject' | 'dispute') =>
		fetch('/ContributionResource', {
			method: 'PATCH',
			headers: JSON_HEADERS,
			body: JSON.stringify({ id, action }),
		}).then(json<any>),

	// --- Bounties (slice 22) ---
	listBounties: (entityType: string, entityId: string) =>
		fetch(`/BountyResource?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`).then(json<{ bounties: any[]; total: number }>),

	listBountiesByCorridor: (corridorId: string) =>
		fetch(`/BountyResource?corridorId=${encodeURIComponent(corridorId)}`).then(json<{ bounties: any[]; total: number }>),

	getBounty: (id: string) =>
		fetch(`/BountyResource/${encodeURIComponent(id)}`).then(json<{ bounty: any; fundEntries: any[]; contributions: any[] }>),

	postBounty: (input: { title: string; description: string; acceptanceCriteria: string; entityType: string; entityId: string | null; corridorId?: string | null; fundCents: number }) =>
		fetch('/BountyResource', {
			method: 'POST',
			headers: JSON_HEADERS,
			body: JSON.stringify({ action: 'post-bounty', ...input }),
		}).then(json<any>),

	addBountyFunding: (bountyId: string, amountCents: number) =>
		fetch('/BountyResource', {
			method: 'POST',
			headers: JSON_HEADERS,
			body: JSON.stringify({ action: 'add-funding', bountyId, amountCents }),
		}).then(json<any>),

	cancelBounty: (bountyId: string) =>
		fetch('/BountyResource', {
			method: 'POST',
			headers: JSON_HEADERS,
			body: JSON.stringify({ action: 'cancel', bountyId }),
		}).then(json<any>),

	awardBounty: (bountyId: string, contributionId: string) =>
		fetch('/BountyResource', {
			method: 'PATCH',
			headers: JSON_HEADERS,
			body: JSON.stringify({ action: 'award', bountyId, contributionId }),
		}).then(json<any>),

	// --- Ledger / Wallet (slice 22) ---
	getWallet: (userId?: string) =>
		fetch(userId ? `/LedgerResource?userId=${encodeURIComponent(userId)}` : '/LedgerResource').then(json<{ userId: string; balanceCents: number; putInCents: number; collectedCents: number; extractedCents: number; fundedCents: number; history: any[] }>),

	grantCredits: (userId: string, amountCents: number, note?: string) =>
		fetch('/LedgerResource', {
			method: 'POST',
			headers: JSON_HEADERS,
			body: JSON.stringify({ action: 'grant', userId, amountCents, ...(note ? { note } : {}) }),
		}).then(json<any>),

	getSystemLedger: () =>
		fetch('/LedgerResource?system=1').then(json<{ system: true; totalGrantedCents: number; totalEscrowHeldCents: number; totalAwardedCents: number; totalExtractedCents: number; totalInSystemCents: number; entryCount: number }>),

	// --- Trust, reputation & governance (slice 24) ---
	submitFlag: (input: { flaggedEntityType: string; flaggedEntityId: string; flaggedContributionId?: string | null; reason: string; notes?: string }) =>
		fetch('/ContentFlagResource', {
			method: 'POST',
			headers: JSON_HEADERS,
			body: JSON.stringify(input),
		}).then(json<any>),

	listOpenFlags: () =>
		fetch('/ContentFlagResource?status=open').then(json<{ flags: any[]; total: number }>),

	reviewFlag: (id: string, disposition: 'dismiss' | 'action', notes?: string) =>
		fetch('/ContentFlagResource', {
			method: 'PATCH',
			headers: JSON_HEADERS,
			body: JSON.stringify({ id, disposition, ...(notes ? { notes } : {}) }),
		}).then(json<any>),

	getModerationQueue: () =>
		fetch('/ModerationResource').then(json<{ pendingContributions: any[]; disputedContributions: any[]; openFlags: any[]; totals: Record<string, number> }>),

	getReputation: (userId?: string) =>
		fetch(userId ? `/ContributorReputationResource?userId=${encodeURIComponent(userId)}` : '/ContributorReputationResource')
			.then(json<{ userId: string; acceptedContributions: number; rejectedContributions: number; flagsReceived: number; flagsSubmitted: number; manualTier: string | null; bannedAt: string | null; tier: string }>),

	setTrustTier: (userId: string, patch: { manualTier?: string | null; bannedAt?: string | null }) =>
		fetch('/ContributorReputationResource', {
			method: 'PATCH',
			headers: JSON_HEADERS,
			body: JSON.stringify({ userId, ...patch }),
		}).then(json<any>),

	// --- Outfitters ---
	outfitters: () =>
		fetch('/Outfitter/').then(json<any[]>),

	// --- Follow / bookmark (slice 29) ---
	myFollows: () =>
		fetch('/FollowResource').then(json<MyFollowsResponse>),

	toggleFollow: (targetType: 'corridor' | 'section', targetId: string, action?: 'toggle' | 'add' | 'remove') =>
		fetch('/FollowResource', {
			method: 'POST',
			headers: JSON_HEADERS,
			body: JSON.stringify({ targetType, targetId, ...(action ? { action } : {}) }),
		}).then(json<{ ok: true; following: boolean; targetType: string; targetId: string }>),
};

export interface SearchHit {
	kind: 'section' | 'river' | 'watershed' | 'corridor' | 'world-river';
	id: string;
	name: string;
	right: string;
	href: string;
	rank: number;
	country?: string;
	isoCountry?: string;
	region?: string | null;
}

export interface SearchResults {
	colorado: SearchHit[];
	america: SearchHit[];
	worldwide: SearchHit[];
	query: string;
	limits: { colorado: number; america: number; worldwide: number };
}

export interface WorldRiverEntry {
	id: string;
	name: string;
	alternateNamesJson: string;
	country: string;
	isoCountry: string;
	region: string | null;
	continent: string;
	sourceLat: number | null;
	sourceLon: number | null;
	mouthLat: number | null;
	mouthLon: number | null;
	centerLat: number | null;
	centerLon: number | null;
	difficulty: string | null;
	sections: string;
	note: string;
	learnMoreUrl: string;
	wikidataId: string | null;
	hasFlowData: boolean;
	source: string;
}

export interface AdminRiverRequestRow {
	worldRiverId: string;
	name: string;
	country: string;
	region: string | null;
	continent: string;
	difficulty: string | null;
	learnMoreUrl: string;
	count: number;
	distinctUsers: number;
	lastRequestedAt: string;
	firstRequestedAt: string;
	latestNote: string;
}

export interface AdminRiverRequestsResponse {
	requests: AdminRiverRequestRow[];
	total: number;
}
