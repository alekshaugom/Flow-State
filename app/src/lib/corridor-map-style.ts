// Pure helper: applies the corridor basemap style to a MapLibre map instance.
// Caller wraps in: map.on('load', () => applyCorridorMapStyle(map, targetRiverName))
// Visible layers after this runs: target river, major highways (motorway/trunk/primary),
// and place labels (towns) clipped to corridor tube.
// Everything else (hillshade, contours, tier-2/3 water, road labels, admin lines, landcover) is hidden.

import type maplibregl from 'maplibre-gl';

export function applyCorridorMapStyle(
	map: maplibregl.Map,
	targetRiverName: string,
	corridorTubePolygon?: GeoJSON.Polygon,
): void {
	const layers = map.getStyle().layers ?? [];

	// (0) First symbol layer — all custom layers inserted before this so labels stay on top.
	const firstSymbolId = layers.find(l => l.type === 'symbol')?.id;

	// Corridor tube feature wrapper — used by river clip and label clip below.
	const tubeFeature: GeoJSON.Feature<GeoJSON.Polygon> | undefined = corridorTubePolygon
		? { type: 'Feature', properties: {}, geometry: corridorTubePolygon }
		: undefined;

	// (1) Background — blend into page (no visible paper color).
	const bgLayer = layers.find(l => l.type === 'background');
	if (bgLayer) {
		map.setPaintProperty(bgLayer.id, 'background-color', '#f4f6f8');
	}

	// (2) Hide all default waterway layers (replaced by tiered set below).
	for (const layer of layers) {
		const src = (layer as any)['source-layer'];
		if (src === 'waterway') {
			map.setLayoutProperty(layer.id, 'visibility', 'none');
		}
	}

	// (3) Hide all basemap transportation line layers and road-label symbol layers.
	// Curated exit annotations (added by CorridorMap.tsx) replace the road network.
	for (const layer of layers) {
		const src = (layer as any)['source-layer'];
		if (src === 'transportation' && layer.type === 'line') {
			map.setLayoutProperty(layer.id, 'visibility', 'none');
		}
		if (src === 'transportation_name' && layer.type === 'symbol') {
			map.setLayoutProperty(layer.id, 'visibility', 'none');
		}
	}

	// (4) Hide all admin boundary layers.
	for (const layer of layers) {
		const src = (layer as any)['source-layer'];
		if (src === 'boundary') {
			map.setLayoutProperty(layer.id, 'visibility', 'none');
		}
	}

	// (5) Target river: halo then main (last addLayer renders on top).
	map.addLayer(
		{
			id: 'water-tier-1-arkansas-halo',
			type: 'line',
			source: 'openmaptiles',
			'source-layer': 'waterway',
			filter: tubeFeature
				? ['all', ['==', ['get', 'name'], targetRiverName], ['within', tubeFeature]] as any
				: ['==', ['get', 'name'], targetRiverName],
			paint: {
				'line-color': '#1e3a8a',
				'line-width': ['interpolate', ['linear'], ['zoom'], 7, 4, 10, 8, 13, 14],
				'line-opacity': 0.18,
				'line-blur': 4,
			},
		},
		firstSymbolId,
	);

	map.addLayer(
		{
			id: 'water-tier-1-arkansas-main',
			type: 'line',
			source: 'openmaptiles',
			'source-layer': 'waterway',
			filter: tubeFeature
				? ['all', ['==', ['get', 'name'], targetRiverName], ['within', tubeFeature]] as any
				: ['==', ['get', 'name'], targetRiverName],
			paint: {
				'line-color': '#1e3a8a',
				'line-width': ['interpolate', ['linear'], ['zoom'], 7, 1.5, 10, 3.2, 13, 5.5],
				'line-opacity': 1.0,
			},
		},
		firstSymbolId,
	);

	// (6) Major highways only — single clean layer filtered to motorway/trunk/primary.
	// Replaces the basemap's multi-layered road styling. Curated exit labels
	// (added by CorridorMap.tsx) sit on top of this and call out destinations.
	map.addLayer(
		{
			id: 'corridor-roads-major',
			type: 'line',
			source: 'openmaptiles',
			'source-layer': 'transportation',
			filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary']]],
			paint: {
				'line-color': '#8a96a3',
				'line-width': ['interpolate', ['linear'], ['zoom'], 7, 0.8, 10, 1.6, 13, 2.6],
				'line-opacity': 0.85,
			},
			layout: { 'line-cap': 'round', 'line-join': 'round' },
		},
		firstSymbolId,
	);

	// (7) De-clutter place labels: restrict all place/POI/peak symbol layers to the corridor tube.
	// Only runs when a corridor polygon is provided.
	if (tubeFeature) {
		const LABEL_SOURCE_LAYERS = new Set(['place', 'poi', 'mountain_peak']);
		for (const layer of map.getStyle().layers ?? []) {
			if (layer.type !== 'symbol') continue;
			const srcLayer = (layer as any)['source-layer'] as string | undefined;
			if (!srcLayer || !LABEL_SOURCE_LAYERS.has(srcLayer)) continue;
			try {
				const existing = map.getFilter(layer.id);
				const withinExpr = ['within', tubeFeature];
				const newFilter = existing
					? ['all', existing, withinExpr]
					: withinExpr;
				map.setFilter(layer.id, newFilter as any);
			} catch (err) {
				console.warn(`[corridor-map-style] filter skipped for layer ${layer.id}:`, err);
			}
		}
	}
}
