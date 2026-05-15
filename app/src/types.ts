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
	forecast: any;

	flowBands: FlowBandRow[];
	resolvedBand: ResolvedBand | null;
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
