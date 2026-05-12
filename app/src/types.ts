import type { DesignStatus } from './constants';

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

export interface DetailViewModel {
	id: string;
	river: string;
	section: string;
	classification: string;
	nearestTown: string | null;
	miles: number | null;
	notes: string | null;

	now: number | null;
	status: DesignStatus;
	statusLabel: string;
	trend: 'up' | 'down' | 'stable';
	trendPct: number;
	updatedAt: string | null;

	thresholds: Thresholds;
	history: number[];

	forecastBand: ForecastBandData | null;
	forecastDirection: string;

	snowpackPct: number | null;
	damControlled: boolean;

	gauges: any[];
	reservoirs: any[];
	snowpack: any[];
	forecast: any;
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
	sections: ApiSectionSummary[];
}

export interface ApiDashboardResponse {
	generated_at: string;
	rivers: ApiRiverSummary[];
}
