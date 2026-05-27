// Pure helper: applies the corridor basemap style to a MapLibre map instance.
// Caller wraps in: map.on('load', () => applyCorridorMapStyle(map, targetRiverName))
// All steps, colors, filters, and paint values match the spec verbatim.

import type maplibregl from 'maplibre-gl';

export function applyCorridorMapStyle(
	map: maplibregl.Map,
	targetRiverName: string,
	corridorTubePolygon?: GeoJSON.Polygon,
): void {
	const layers = map.getStyle().layers ?? [];

	// (0) First symbol layer — all custom layers inserted before this so labels stay on top.
	const firstSymbolId = layers.find(l => l.type === 'symbol')?.id;

	// (1) Background — recolor to paper.
	const bgLayer = layers.find(l => l.type === 'background');
	if (bgLayer) {
		map.setPaintProperty(bgLayer.id, 'background-color', '#f3ecd8');
	}

	// (2) Hide all default waterway layers (replaced by tiered set).
	for (const layer of layers) {
		const src = (layer as any)['source-layer'];
		if (src === 'waterway') {
			map.setLayoutProperty(layer.id, 'visibility', 'none');
		}
	}

	// (3) Roads — dim every transportation line layer.
	for (const layer of layers) {
		const src = (layer as any)['source-layer'];
		if (src === 'transportation' && layer.type === 'line') {
			map.setPaintProperty(layer.id, 'line-opacity', 0.28);
		}
	}

	// (4) Admin boundaries — purple dashed style.
	for (const layer of layers) {
		const src = (layer as any)['source-layer'];
		if (src === 'boundary' && layer.type === 'line') {
			map.setPaintProperty(layer.id, 'line-color', 'rgba(106, 43, 240, 0.55)');
			map.setPaintProperty(layer.id, 'line-width', 1.25);
			map.setPaintProperty(layer.id, 'line-blur', 1.5);
			map.setPaintProperty(layer.id, 'line-dasharray', [3, 2]);
		}
	}

	// (5) Esri hillshade raster.
	map.addSource('esri-hillshade', {
		type: 'raster',
		tiles: [
			'https://server.arcgisonline.com/ArcGIS/rest/services/World_Hillshade/MapServer/tile/{z}/{y}/{x}',
		],
		tileSize: 256,
	});
	map.addLayer(
		{
			id: 'topo-hillshade',
			type: 'raster',
			source: 'esri-hillshade',
			paint: {
				'raster-opacity': 0.42,
				'raster-saturation': -0.15,
			},
		},
		firstSymbolId,
	);

	// (6) Unified green for natural + public land. Park source-layer is optional.
	try {
		map.addLayer(
			{
				id: 'landcover-public',
				type: 'fill',
				source: 'openmaptiles',
				'source-layer': 'park',
				paint: {
					'fill-color': '#a8c08a',
					'fill-opacity': 1.0,
				},
			},
			firstSymbolId,
		);
	} catch (_e) {
		// park source-layer may not be present in all tile sets — ignore.
	}

	map.addLayer(
		{
			id: 'landcover-natural',
			type: 'fill',
			source: 'openmaptiles',
			'source-layer': 'landcover',
			filter: ['in', ['get', 'class'], ['literal', ['wood', 'grass', 'scrub']]],
			paint: {
				'fill-color': '#a8c08a',
				'fill-opacity': 1.0,
			},
		},
		firstSymbolId,
	);

	map.addLayer(
		{
			id: 'landcover-alpine',
			type: 'fill',
			source: 'openmaptiles',
			'source-layer': 'landcover',
			filter: ['in', ['get', 'class'], ['literal', ['ice', 'snow', 'glacier', 'rock']]],
			paint: {
				'fill-color': '#f5efe0',
				'fill-opacity': 0.85,
			},
		},
		firstSymbolId,
	);

	// (6b) OpenTopoMap contours raster — faded + desaturated.
	map.addSource('opentopo', {
		type: 'raster',
		tiles: [
			'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
			'https://b.tile.opentopomap.org/{z}/{x}/{y}.png',
			'https://c.tile.opentopomap.org/{z}/{x}/{y}.png',
		],
		tileSize: 256,
		maxzoom: 17,
	});
	map.addLayer(
		{
			id: 'topo-contours',
			type: 'raster',
			source: 'opentopo',
			paint: {
				'raster-opacity': 0.22,
				'raster-saturation': -0.45,
				'raster-contrast': 0.18,
			},
		},
		firstSymbolId,
	);

	// (7) Three-tier water hierarchy — all navy #1e3a8a, hierarchy via weight + opacity + blur.

	// TIER 3 — small streams, drains, ditches.
	map.addLayer(
		{
			id: 'water-tier-3-streams',
			type: 'line',
			source: 'openmaptiles',
			'source-layer': 'waterway',
			filter: ['in', ['get', 'class'], ['literal', ['stream', 'drain', 'ditch']]],
			paint: {
				'line-color': '#1e3a8a',
				'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.25, 10, 0.6, 13, 1.4],
				'line-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0.0, 10, 0.25, 13, 0.40],
				'line-blur': 0.7,
			},
			layout: {
				'line-cap': 'round',
				'line-join': 'round',
			},
		},
		firstSymbolId,
	);

	// TIER 2 — named tributaries (every river except the target).
	map.addLayer(
		{
			id: 'water-tier-2-rivers',
			type: 'line',
			source: 'openmaptiles',
			'source-layer': 'waterway',
			filter: ['all',
				['==', ['get', 'class'], 'river'],
				['!=', ['get', 'name'], targetRiverName],
			],
			paint: {
				'line-color': '#1e3a8a',
				'line-width': ['interpolate', ['linear'], ['zoom'], 7, 0.5, 10, 1.6, 13, 3],
				'line-opacity': 0.75,
			},
		},
		firstSymbolId,
	);

	// TIER 1 — target river: halo then main (last addLayer renders on top).
	map.addLayer(
		{
			id: 'water-tier-1-arkansas-halo',
			type: 'line',
			source: 'openmaptiles',
			'source-layer': 'waterway',
			filter: ['==', ['get', 'name'], targetRiverName],
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
			filter: ['==', ['get', 'name'], targetRiverName],
			paint: {
				'line-color': '#1e3a8a',
				'line-width': ['interpolate', ['linear'], ['zoom'], 7, 1.5, 10, 3.2, 13, 5.5],
				'line-opacity': 1.0,
			},
		},
		firstSymbolId,
	);

	// (8) Tributary labels — italic blue, placed along line.
	// Waterway layers were hidden in step 2; this adds back only named river-class tributaries.
	try {
		map.addLayer(
			{
				id: 'tributary-labels',
				type: 'symbol',
				source: 'openmaptiles',
				'source-layer': 'waterway',
				filter: ['all',
					['==', ['get', 'class'], 'river'],
					['!=', ['get', 'name'], targetRiverName],
					['has', 'name'],
				],
				layout: {
					'text-field': ['get', 'name'],
					'symbol-placement': 'line',
					// Try italic first; positron falls back gracefully to the next available glyph.
					'text-font': ['Noto Sans Italic', 'Noto Sans Regular'],
					'text-size': 11,
					'text-letter-spacing': 0.04,
				},
				paint: {
					'text-color': '#1e3a8a',
					'text-halo-color': '#f3ecd8',
					'text-halo-width': 1.4,
				},
			},
			firstSymbolId,
		);
	} catch (err) {
		console.warn('[corridor-map-style] tributary-labels layer skipped:', err);
	}

	// (9) De-clutter place labels: restrict all place/POI/peak symbol layers to the corridor tube.
	// Only runs when a corridor polygon is provided.
	if (corridorTubePolygon) {
		const tubeFeature: GeoJSON.Feature<GeoJSON.Polygon> = {
			type: 'Feature',
			properties: {},
			geometry: corridorTubePolygon,
		};
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
