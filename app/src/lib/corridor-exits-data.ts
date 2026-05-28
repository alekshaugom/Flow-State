// Curated road-exit annotations per corridor.
// Real road geometry comes from the OpenMapTiles basemap (filtered to
// motorway/trunk/primary in corridor-map-style.ts). Each entry here just
// places a destination label at a point near where a major road exits
// the corridor view, with hand-set road mileage to the destination.

export interface CorridorExit {
	/** Optional road shield text, e.g. "US 285". Shown below the destination line. */
	road?: string;
	/** Destination name, e.g. "Denver" */
	destination: string;
	/** Hand-curated highway distance to destination in miles */
	distanceMiles: number;
	/** Where the label appears [lng, lat] — typically just past the corridor edge, on or near the road */
	labelPoint: [number, number];
	/** Directional arrow character. Match the road's exit direction visually. */
	arrow: '↑' | '→' | '↓' | '←' | '↗' | '↘' | '↖' | '↙';
}

export const CORRIDOR_EXITS: Record<string, CorridorExit[]> = {
	'arkansas-headwaters': [
		// US 24 N over Tennessee Pass → Vail / Minturn / I-70
		{ road: 'US 24', destination: 'Vail', distanceMiles: 50, labelPoint: [-106.40, 39.32], arrow: '↑' },
		// US 285 NE over Trout Creek Pass → Fairplay → Denver
		{ road: 'US 285', destination: 'Denver', distanceMiles: 125, labelPoint: [-105.92, 38.98], arrow: '↗' },
		// US 24 E through Wilkerson Pass / Hartsel → Colorado Springs
		{ road: 'US 24', destination: 'Colorado Springs', distanceMiles: 93, labelPoint: [-105.72, 38.85], arrow: '→' },
		// US 50 W over Monarch Pass → Gunnison
		{ road: 'US 50', destination: 'Gunnison', distanceMiles: 64, labelPoint: [-106.30, 38.50], arrow: '←' },
		// US 50 E → Penrose → Pueblo
		{ road: 'US 50', destination: 'Pueblo', distanceMiles: 36, labelPoint: [-104.85, 38.43], arrow: '→' },
	],
};
