import type { DesignStatus } from './constants';
import type { FlowBandRow, ResolvedBand } from './lib/craftTypes';

// --- Dashboard view model (flat section list for sidebar/cards) ---

export interface DashboardSection {
	id: string;
	river: string;
	section: string;
	classification: string;
	now: number | null;
	status: DesignStatus;
	statusLabel: string;
	trend: 'up' | 'down' | 'stable';
	trendPct: number;
	change24h: number | null;
	sparkline: number[];
	updatedAt: string | null;
	gaugeName: string | null;
	primaryGaugeId: string | null;
	latitude: number | null;
	longitude: number | null;
	flowBands: FlowBandRow[];
	watershedSlug: string | null;
	watershedName: string | null;
	corridorSlug: string | null;
	corridorName: string | null;
	corridorSortIndex: number | null;
	sortIndex: number | null;
	driver: string | null;
	myTripCount: number;
	lastLoggedAt: string | null;
	legacyThresholds: {
		flowLow: number; flowRunnable: number;
		flowIdealMin: number; flowIdealMax: number;
		flowHigh: number; flowExpert: number; flowDangerous: number;
	} | null;
}

export interface WatershedSummary {
	id: string;
	name: string;
	region: string | null;
	description: string | null;
	dominantDriver: string | null;
}

export interface CorridorSummary {
	id: string;
	name: string;
	shortName: string | null;
	watershedId: string;
	riverId: string;
	driver: string | null;
}

// --- Detail view model ---

export interface Thresholds {
	runnable: number;
	idealLo: number;
	idealHi: number;
	high: number;
}

export interface ForecastBandData {
	center: number[];
	upper: number[];
	lower: number[];
}

export interface BreadcrumbSegment {
	slug: string;
	name: string;
	href: string;
}

export interface DetailViewModel {
	id: string;
	river: string;
	section: string;
	classification: string;
	nearestTown: string | null;
	putIn: string | null;
	takeOut: string | null;
	miles: number | null;
	notes: string | null;
	breadcrumb: BreadcrumbSegment[];

	now: number | null;
	status: DesignStatus;
	statusLabel: string;
	trend: 'up' | 'down' | 'stable';
	trendPct: number;
	updatedAt: string | null;

	thresholds: Thresholds;
	history: Array<{ t: number; v: number }>;

	forecastBand: ForecastBandData | null;
	forecastDirection: string;

	snowpackPct: number | null;
	damControlled: boolean;

	gauges: any[];
	reservoirs: any[];
	snowpack: any[];
	weatherForecast: any[];
	forecast: any;

	flowBands: FlowBandRow[];
	resolvedBand: ResolvedBand | null;

	corridorId: string | null;

	myLogs: RiverLogEntry[];
	myLogTotalCount: number;

	rapids: any[];
	bounties: BountyListItem[];

	flowThresholds: {
		flowLow: number; flowRunnable: number;
		flowIdealMin: number; flowIdealMax: number;
		flowHigh: number; flowExpert: number; flowDangerous: number;
	} | null;
}

// --- API response shapes ---

export interface ApiSectionSummary {
	id: string;
	name: string;
	difficulty: string;
	lengthMiles: number;
	currentFlow: number | null;
	unit: string;
	trend: string;
	change24h: number | null;
	change7d: number | null;
	status: string;
	statusLabel?: string | null;
	flowBands?: FlowBandRow[];
	watershedSlug?: string | null;
	watershedName?: string | null;
	corridorSlug?: string | null;
	corridorName?: string | null;
	corridorSortIndex?: number | null;
	sortIndex?: number | null;
	driver?: string | null;
	thresholds?: {
		flowLow: number; flowRunnable: number;
		flowIdealMin: number; flowIdealMax: number;
		flowHigh: number; flowExpert: number; flowDangerous: number;
	};
	primaryGaugeId: string;
	latitude: number;
	longitude: number;
	sparkline?: number[];
	updatedAt?: string | null;
	gaugeName?: string | null;
	myTripCount?: number;
	lastLoggedAt?: string | null;
}

// --- River log + user profile ---

export interface CampingNight {
	date: string;
	location: string;
}

export interface ParticipantView {
	userId: string;
	name: string | null;
	avatarUrl: string | null;
	notes: string | null;
	notesPrivate: boolean;
	craftSequenceJson: string | null;
	acceptedAt: string | null;
	isSelf: boolean;
}

export interface RiverLogEntry {
	id: string;
	userId: string;
	createdByUserId?: string | null;
	sectionId: string;
	watershedId: string | null;
	corridorId: string | null;
	date: string;
	endDate: string | null;
	campingJson: string | null;
	tripNights: number;
	craftId: string | null;
	craftType: string | null;
	craftSize: string | null;
	craftName: string | null;
	crewSize: number | null;
	durationHours: number | null;
	putIn: string | null;
	takeOut: string | null;
	notes: string | null;
	conditionsTags: string | null;
	flowAtTripCfs: number | null;
	flowSourceGaugeId: string | null;
	flowResolvedAt: string | null;
	visibility: 'private' | 'participants';
	createdAt: string;
	updatedAt: string;
	participants?: ParticipantView[];
}

export interface MyConnection {
	userId: string;
	name: string | null;
	email: string | null;
	avatarUrl: string | null;
	lastTripDate: string | null;
	tripsTogetherCount: number;
}

export interface MyConnectionsResponse {
	connections: MyConnection[];
	total: number;
}

export interface MintShareResult {
	ok: true;
	token: string;
	url: string;
	expiresAt: string;
	inviteeEmail: string;
}

export interface SharePreviewResult {
	ok: true;
	share: { tripId: string; inviteeEmail: string; expiresAt: string };
	trip: { id: string; date: string; endDate: string | null; sectionName: string | null; sectionId: string };
	inviter: { id: string; name: string | null; avatarUrl: string | null } | null;
}

export interface ShareConsumeResult {
	ok: true;
	tripId: string;
	userId: string;
	needsPasswordSetup: boolean;
	user: { id: string; email: string; name: string; avatarUrl: string | null; status: string };
}

export interface RiverLogInput {
	sectionId: string;
	date: string;
	endDate?: string | null;
	camping?: CampingNight[];
	craftId?: string | null;
	craftType?: string | null;
	craftSize?: string | null;
	craftName?: string | null;
	crewSize?: number | null;
	durationHours?: number | null;
	putIn?: string | null;
	takeOut?: string | null;
	notes?: string | null;
	conditionsTags?: string | null;
}

export interface MyLogsSection {
	sectionId: string;
	name: string;
	tripCount: number;
	lastTripAt: string | null;
}

export interface MyLogsCorridor {
	corridorId: string;
	name: string;
	tripCount: number;
	lastTripAt: string | null;
	sections: MyLogsSection[];
}

export interface MyLogsWatershed {
	watershedId: string;
	name: string;
	tripCount: number;
	sectionCount: number;
	lastTripAt: string | null;
	corridors: MyLogsCorridor[];
}

export interface MyLogsYearGroup {
	year: number;
	tripCount: number;
	logs: RiverLogEntry[];
}

export interface UserCraftEntry {
	id: string;
	userId: string;
	name: string;
	craftType: string;
	craftSize: string | null;
	notes: string | null;
	isDefault: boolean;
	archivedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface UserCraftInput {
	name: string;
	craftType: string;
	craftSize?: string | null;
	notes?: string | null;
	isDefault?: boolean;
}

export interface MyCraftsResponse {
	crafts: UserCraftEntry[];
	total: number;
}

// --- Email/password auth ---

export interface EmailLoginResult {
	ok: true;
	user: {
		id: string;
		email: string;
		name: string;
		avatarUrl: string | null;
		status: 'waitlist' | 'approved' | 'denied';
	};
	hasPassword?: boolean;
}

export interface SetMyPasswordResult {
	ok: true;
}

export interface AdminLoginLinkResult {
	ok: true;
	token: string;
	url: string;
	expiresAt: string;
}

export interface AdminLoginToken {
	id: string;
	userId: string;
	createdBy: string;
	expiresAt: string;
	usedAt: string | null;
	createdAt: string;
}

export interface AdminLoginTokenList {
	tokens: AdminLoginToken[];
}

export interface AdminInviteUserInput {
	email: string;
	firstName: string;
	lastName: string;
}

export interface AdminInviteUserResult {
	ok: true;
	user: {
		id: string;
		email: string;
		name: string;
		firstName: string;
		lastName: string;
		avatarUrl: string | null;
		provider: string;
		status: 'approved';
		createdAt: string;
		grantedAt: string;
		grantedBy: string;
		lastLoginAt: string | null;
	};
	link: { token: string; url: string; expiresAt: string };
}

// --- Bounty (slice 22) ---

export interface BountyListItem {
	id: string;
	title: string | null;
	acceptanceCriteria: string | null;
	sectionId: string | null;
	entityType: string | null;
	entityId: string | null;
	status: 'open' | 'awarded' | 'settled' | 'cancelled' | 'expired';
	escrowCents: number;
	postedBy: string | null;
	awardedTo: string | null;
}

export interface AdminDeleteUserResult {
	ok: true;
	userId: string;
	deleted: {
		user: number;
		credential: number;
		tokens: number;
		profile: number;
		crafts: number;
		logs: number;
	};
}

export interface MyLogsAggregateResponse {
	watersheds: MyLogsWatershed[];
	yearGroups: MyLogsYearGroup[];
	logs: RiverLogEntry[];
	generatedAt: string;
}

export interface SetMyNameResult {
	ok: true;
	user: {
		id: string;
		email: string;
		name: string;
		firstName: string | null;
		lastName: string | null;
		avatarUrl: string | null;
		status: string;
	};
}

export interface SectionLogsResponse {
	sectionId: string;
	logs: RiverLogEntry[];
	total: number;
}

export interface MyLogsResponse {
	logs: RiverLogEntry[];
	total: number;
}

export interface ApiRiverSummary {
	id: string;
	name: string;
	description: string;
	watershedId: string | null;
	sections: ApiSectionSummary[];
}

export interface ApiDashboardResponse {
	generated_at: string;
	rivers: ApiRiverSummary[];
	watersheds: WatershedSummary[];
	corridors: CorridorSummary[];
}
