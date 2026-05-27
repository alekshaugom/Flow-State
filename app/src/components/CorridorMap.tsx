import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { applyCorridorMapStyle } from '../lib/corridor-map-style';
import { buildCorridorTubePolygon, corridorBoundsFromPolyline, pointAtMileGeographic, sectionSubPolyline } from '../lib/corridor-map-data';
import { STATUS_COLORS, mapStatusToDesign } from '../constants';

export interface CorridorMapSection {
	id: string;
	name: string;
	status: string;
	startMile: number;
	endMile: number;
	parentSectionId?: string | null;
}

export interface CorridorMapAccessPoint {
	id: string;
	name: string;
	kind: string;
	lng: number;
	lat: number;
	riverMile: number | null;
}

export interface CorridorMapDam {
	id: string;
	name: string;
	lng: number;
	lat: number;
	riverMile: number | null;
}

export interface CorridorMapGauge {
	id: string;
	name: string;
	lng: number;
	lat: number;
	riverMile: number | null;
	currentFlow: number | null;
	unit: string;
}

interface CorridorMapProps {
	corridorPolyline: Array<[number, number, number]>;
	targetRiverName: string;
	sections: CorridorMapSection[];
	accessPoints: CorridorMapAccessPoint[];
	dams: CorridorMapDam[];
	gauges: CorridorMapGauge[];
	activeMile: number | null;
	activeSectionId: string | null;
	/** When non-null, the map animates to this section's bbox and hides the dot. */
	focusedSectionId?: string | null;
	onSelectSection?: (sectionId: string) => void;
	style?: React.CSSProperties;
	calloutDirection?: 'right' | 'down';
}

// Shorten USGS gauge names ("Arkansas River at Salida, CO" → "Salida") so pills stay compact.
const shortGaugeName = (name: string): string => {
	const m = name.match(/\b(?:at|near|below|above)\s+(.+?)(?:,\s*[A-Z]{2})?$/i);
	return (m ? m[1] : name).replace(/,\s*[A-Z]{2}$/i, '').trim();
};

// Sentinel used for AP dim/lit expressions when activeMile is null.
// Using -Infinity means no AP will ever be "lit" (all riverMile >= -Infinity check fails for the case expression).
// We pass a large negative number because MapLibre expressions don't accept JS Infinity directly.
const NO_MILE_SENTINEL = -9999999;

export function CorridorMap({
	corridorPolyline,
	targetRiverName,
	sections,
	accessPoints,
	dams,
	gauges,
	activeMile,
	activeSectionId,
	focusedSectionId = null,
	onSelectSection,
	style,
	calloutDirection = 'right',
}: CorridorMapProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const mapRef = useRef<maplibregl.Map | null>(null);
	const mapLoadedRef = useRef(false);
	// Stable ref to the latest repositionGauges so the mount-once load callback can call it.
	const repositionGaugesRef = useRef<(() => void) | null>(null);

	// Callout state: geographic anchor (lng/lat + name) and projected pixel position.
	const [calloutAnchor, setCalloutAnchor] = useState<{ lng: number; lat: number; name: string } | null>(null);
	const [calloutPx, setCalloutPx] = useState<{ x: number; y: number } | null>(null);

	// Gauge pill state: projected pixel positions for DOM-overlay CFS pills.
	const [gaugePins, setGaugePins] = useState<Array<{ id: string; x: number; y: number; label: string; reading: string }>>([]);

	// -- Mount the map once -----------------------------------------------
	useEffect(() => {
		if (!containerRef.current) return;

		const map = new maplibregl.Map({
			container: containerRef.current,
			style: 'https://tiles.openfreemap.org/styles/positron',
			minZoom: 7,
			maxZoom: 14,
			scrollZoom: false,
			doubleClickZoom: false,
			touchZoomRotate: false,
			boxZoom: false,
			dragPan: true,
		});
		mapRef.current = map;

		map.on('load', () => {
			mapLoadedRef.current = true;

			// Build tube polygon for de-cluttering place labels (±6 mi lateral padding).
			const tubePolygon = corridorPolyline.length >= 2
				? buildCorridorTubePolygon(corridorPolyline, 6)
				: undefined;

			applyCorridorMapStyle(map, targetRiverName, tubePolygon);

			// Fit to corridor bounds.
			if (corridorPolyline.length >= 2) {
				const [w, s, e, n] = corridorBoundsFromPolyline(corridorPolyline);
				map.fitBounds([[w, s], [e, n]], { padding: 40, animate: false });
			}

			// Determine the first symbol layer so we insert custom layers before labels.
			const firstSymbolId = map.getStyle().layers.find(l => l.type === 'symbol')?.id;

			// ---- 1. Section paths ------------------------------------------------
			// Section lines + glows render in navy blue (matches the basemap's water-tier-1
			// styling). Status is conveyed by the tile's StatusPill, not the line color.
			const SECTION_LINE_COLOR = '#1e3a8a';
			const topLevelSections = sections.filter(s => !s.parentSectionId);
			const sectionFeatures = topLevelSections
				.filter(s => s.startMile < s.endMile)
				.map(s => {
					const coords = sectionSubPolyline(corridorPolyline, s.startMile, s.endMile);
					if (coords.length < 2) return null;
					return {
						type: 'Feature' as const,
						geometry: {
							type: 'LineString' as const,
							coordinates: coords,
						},
						properties: {
							id: s.id,
							name: s.name,
							status: s.status,
						},
					};
				})
				.filter(Boolean);

			map.addSource('section-paths', {
				type: 'geojson',
				data: {
					type: 'FeatureCollection',
					features: sectionFeatures as GeoJSON.Feature[],
				},
			});

			// Glow layers sit BELOW the solid line so the crisp path renders on top.
			map.addLayer(
				{
					id: 'section-paths-glow-outer',
					type: 'line',
					source: 'section-paths',
					paint: {
						'line-color': SECTION_LINE_COLOR,
						'line-width': 22,
						'line-blur': 14,
						'line-opacity': 0,
					},
					layout: {
						'line-cap': 'round',
						'line-join': 'round',
					},
				},
				firstSymbolId,
			);

			map.addLayer(
				{
					id: 'section-paths-glow-inner',
					type: 'line',
					source: 'section-paths',
					paint: {
						'line-color': SECTION_LINE_COLOR,
						'line-width': 12,
						'line-blur': 6,
						'line-opacity': 0,
					},
					layout: {
						'line-cap': 'round',
						'line-join': 'round',
					},
				},
				firstSymbolId,
			);

			map.addLayer(
				{
					id: 'section-paths-layer',
					type: 'line',
					source: 'section-paths',
					paint: {
						'line-color': SECTION_LINE_COLOR,
						'line-width': 4,
						'line-opacity': 0.95,
					},
					layout: {
						'line-cap': 'round',
						'line-join': 'round',
					},
				},
				firstSymbolId,
			);

			// Hover cursor + click for section paths.
			map.on('mouseenter', 'section-paths-layer', () => {
				map.getCanvas().style.cursor = 'pointer';
			});
			map.on('mouseleave', 'section-paths-layer', () => {
				map.getCanvas().style.cursor = '';
			});
			map.on('click', 'section-paths-layer', (e) => {
				if (!onSelectSection) return;
				const feature = e.features?.[0];
				if (feature?.properties?.id) {
					onSelectSection(feature.properties.id as string);
				}
			});

			// ---- 2. Access points -----------------------------------------------
			const apFeatures = accessPoints
				.filter(ap => isFinite(ap.lng) && isFinite(ap.lat))
				.map(ap => ({
					type: 'Feature' as const,
					geometry: {
						type: 'Point' as const,
						coordinates: [ap.lng, ap.lat],
					},
					properties: {
						id: ap.id,
						name: ap.name,
						kind: ap.kind,
						// Use sentinel for null so MapLibre expressions can compare numerically.
						riverMile: ap.riverMile ?? -1,
					},
				}));

			map.addSource('aps', {
				type: 'geojson',
				data: { type: 'FeatureCollection', features: apFeatures },
			});

			map.addLayer(
				{
					id: 'aps-circles',
					type: 'circle',
					source: 'aps',
					paint: {
						'circle-radius': 5,
						'circle-color': '#ffffff',
						'circle-stroke-width': 1.5,
						// Initial state: all dimmed (activeMile is null at mount).
						'circle-stroke-color': '#6b7886',
						'circle-opacity': 1.0,
					},
				},
				firstSymbolId,
			);

			// AP name labels — proximity-driven opacity, updated in the activeMile effect.
			// Starts at opacity 0; effect will set the expression once activeMile is known.
			map.addLayer({
				id: 'aps-labels',
				type: 'symbol',
				source: 'aps',
				layout: {
					'text-field': ['get', 'name'],
					'text-font': ['Noto Sans Regular'],
					'text-size': 11,
					'text-anchor': 'bottom-left',
					'text-offset': [0.6, -0.6],
					'text-allow-overlap': false,
					'text-padding': 4,
					// Below gauge labels (0); put-in/take-out (5) beat alternate APs (15).
					'symbol-sort-key': [
						'case',
						['in', ['get', 'kind'], ['literal', ['put-in', 'take-out', 'both']]],
						5,
						15,
					],
				},
				paint: {
					'text-color': '#1f2937',
					'text-halo-color': '#f3ecd8',
					'text-halo-width': 1.5,
					'text-opacity': 1,
				},
			});

			// ---- 3. Dams --------------------------------------------------------
			const damFeatures = dams
				.filter(d => isFinite(d.lng) && isFinite(d.lat))
				.map(d => ({
					type: 'Feature' as const,
					geometry: {
						type: 'Point' as const,
						coordinates: [d.lng, d.lat],
					},
					properties: {
						id: d.id,
						name: d.name,
						riverMile: d.riverMile ?? null,
					},
				}));

			map.addSource('dams', {
				type: 'geojson',
				data: { type: 'FeatureCollection', features: damFeatures },
			});

			map.addLayer(
				{
					id: 'dams-marker',
					type: 'circle',
					source: 'dams',
					paint: {
						'circle-radius': 7,
						'circle-color': '#1f2937',
						'circle-stroke-width': 2,
						'circle-stroke-color': '#ffffff',
					},
				},
				firstSymbolId,
			);

			// Dam hover tooltip.
			const damPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });
			map.on('mouseenter', 'dams-marker', (e) => {
				map.getCanvas().style.cursor = 'pointer';
				const feature = e.features?.[0];
				if (!feature) return;
				const name = feature.properties?.name as string | undefined;
				const riverMile = feature.properties?.riverMile as number | null | undefined;
				const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
				const html = `<strong>${name ?? 'Dam'}</strong>${riverMile != null ? `<br/>Mile ${riverMile.toFixed(1)}` : ''}`;
				damPopup.setLngLat(coords).setHTML(html).addTo(map);
			});
			map.on('mouseleave', 'dams-marker', () => {
				map.getCanvas().style.cursor = '';
				damPopup.remove();
			});

			// ---- 4. Gauges ------------------------------------------------------
			const gaugeFeatures = gauges
				.filter(g => isFinite(g.lng) && isFinite(g.lat))
				.map(g => ({
					type: 'Feature' as const,
					geometry: {
						type: 'Point' as const,
						coordinates: [g.lng, g.lat],
					},
					properties: {
						id: g.id,
						name: g.name,
						label: shortGaugeName(g.name),
						reading: g.currentFlow != null
							? `${Math.round(g.currentFlow).toLocaleString()} ${g.unit || 'cfs'}`
							: undefined,
						riverMile: g.riverMile ?? null,
						currentFlow: g.currentFlow,
						unit: g.unit,
					},
				}));

			map.addSource('gauges', {
				type: 'geojson',
				data: { type: 'FeatureCollection', features: gaugeFeatures },
			});

			map.addLayer(
				{
					id: 'gauges-marker',
					type: 'circle',
					source: 'gauges',
					paint: {
						'circle-radius': 4,
						'circle-color': '#2563c7',
						'circle-stroke-color': '#ffffff',
						'circle-stroke-width': 2,
					},
				},
				firstSymbolId,
			);

			// ---- 5. Active position dot -----------------------------------------
			map.addSource('active-dot', {
				type: 'geojson',
				data: { type: 'FeatureCollection', features: [] },
			});

			map.addLayer({
				id: 'active-dot-halo',
				type: 'circle',
				source: 'active-dot',
				paint: {
					'circle-radius': 14,
					'circle-color': '#2563c7',
					'circle-opacity': 0.18,
				},
			});

			map.addLayer({
				id: 'active-dot-core',
				type: 'circle',
				source: 'active-dot',
				paint: {
					'circle-radius': 8,
					'circle-color': '#1d4ed8',
					'circle-stroke-color': '#ffffff',
					'circle-stroke-width': 3,
				},
			});

			// First-paint gauge pins — gauge data may already be present when load fires.
			repositionGaugesRef.current?.();
		});

		return () => {
			mapLoadedRef.current = false;
			map.remove();
			mapRef.current = null;
		};
		// Mount-once — overlay data is updated via separate effects.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// -- Active mile: update dot + AP dim/lit ---------------------------------
	useEffect(() => {
		const map = mapRef.current;
		if (!map || !mapLoadedRef.current) return;

		// Update active dot — hide when a section is focused.
		const dotSource = map.getSource('active-dot') as maplibregl.GeoJSONSource | undefined;
		if (dotSource) {
			if (activeMile !== null && focusedSectionId === null) {
				const pt = pointAtMileGeographic(corridorPolyline, activeMile);
				dotSource.setData(pt
					? {
						type: 'FeatureCollection',
						features: [{
							type: 'Feature',
							geometry: { type: 'Point', coordinates: [pt.lng, pt.lat] },
							properties: {},
						}],
					}
					: { type: 'FeatureCollection', features: [] },
				);
			} else {
				dotSource.setData({ type: 'FeatureCollection', features: [] });
			}
		}

		// Update AP dim/lit paint via data-driven expressions.
		// MapLibre paint expressions must be valid JSON-serialisable values.
		// We use `as any` for the expression array because maplibre-gl's TypeScript types
		// don't accept arbitrary nested expression arrays through setPaintProperty's overloads.
		const mileCutoff = activeMile ?? NO_MILE_SENTINEL;
		if (map.getLayer('aps-circles')) {
			map.setPaintProperty('aps-circles', 'circle-stroke-color', [
				'case',
				['<=', ['get', 'riverMile'], mileCutoff],
				'#1d4ed8',
				'#6b7886',
			] as any);
			map.setPaintProperty('aps-circles', 'circle-opacity', [
				'case',
				['<=', ['get', 'riverMile'], mileCutoff],
				1.0,
				0.35,
			] as any);
		}

		// Update AP label proximity opacity.
		// Hide when no active mile or when a section tile is focused.
		// AP labels stay always-visible (collision-managed); no proximity gating.
	}, [activeMile, corridorPolyline, focusedSectionId]);

	// -- Active section: thicken active path + drive glow layers -------------
	useEffect(() => {
		const map = mapRef.current;
		if (!map || !mapLoadedRef.current) return;
		if (!map.getLayer('section-paths-layer')) return;

		const activeId = activeSectionId ?? '';
		map.setPaintProperty('section-paths-layer', 'line-width', [
			'case',
			['==', ['get', 'id'], activeId],
			7,
			4,
		] as any);
		map.setPaintProperty('section-paths-layer', 'line-opacity', [
			'case',
			['==', ['get', 'id'], activeId],
			1.0,
			0.6,
		] as any);

		// Glow layers — keep visible when a tile is focused too (focusedSectionId fallback).
		const glowId = activeSectionId ?? focusedSectionId ?? '';
		const hasActive = glowId !== '';
		const filterExpr = ['==', ['get', 'id'], glowId] as any;

		if (map.getLayer('section-paths-glow-outer')) {
			map.setFilter('section-paths-glow-outer', filterExpr);
			map.setPaintProperty('section-paths-glow-outer', 'line-opacity', hasActive ? 0.5 : 0);
		}
		if (map.getLayer('section-paths-glow-inner')) {
			map.setFilter('section-paths-glow-inner', filterExpr);
			map.setPaintProperty('section-paths-glow-inner', 'line-opacity', hasActive ? 0.7 : 0);
		}
	}, [activeSectionId, focusedSectionId]);

	// -- Focused section: fitBounds to section bbox or restore corridor bounds --
	useEffect(() => {
		const map = mapRef.current;
		if (!map || !mapLoadedRef.current) return;

		if (focusedSectionId === null) {
			// Restore corridor bounds + re-show dot.
			if (corridorPolyline.length >= 2) {
				const [w, s, e, n] = corridorBoundsFromPolyline(corridorPolyline);
				map.fitBounds([[w, s], [e, n]], { padding: 40, duration: 600 });
			}
		} else {
			// Zoom to the focused section's sub-polyline bbox.
			const section = sections.find(sec => sec.id === focusedSectionId);
			if (section && section.startMile < section.endMile) {
				const coords = sectionSubPolyline(corridorPolyline, section.startMile, section.endMile);
				if (coords.length >= 2) {
					let west = Infinity, east = -Infinity, south = Infinity, north = -Infinity;
					for (const [lng, lat] of coords) {
						if (lng < west) west = lng;
						if (lng > east) east = lng;
						if (lat < south) south = lat;
						if (lat > north) north = lat;
					}
					map.fitBounds([[west, south], [east, north]], { padding: 60, duration: 600 });
				}
			}
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [focusedSectionId]);

	// -- Derive callout anchor from active section's midpoint -----------------
	// Hide callout when a section tile is focused (it's obvious which section is active).
	useEffect(() => {
		if (!activeSectionId || focusedSectionId !== null) {
			setCalloutAnchor(null);
			return;
		}
		const section = sections.find(s => s.id === activeSectionId);
		if (!section) {
			setCalloutAnchor(null);
			return;
		}
		const midMile = (section.startMile + section.endMile) / 2;
		const pt = pointAtMileGeographic(corridorPolyline, midMile);
		if (pt) {
			setCalloutAnchor({ lng: pt.lng, lat: pt.lat, name: section.name });
		} else {
			setCalloutAnchor(null);
		}
	}, [activeSectionId, focusedSectionId, sections, corridorPolyline]);

	// -- Reproject callout anchor on map move/zoom ----------------------------
	const repositionCallout = useCallback(() => {
		const map = mapRef.current;
		if (!map || !calloutAnchor) {
			setCalloutPx(null);
			return;
		}
		const p = map.project([calloutAnchor.lng, calloutAnchor.lat]);
		setCalloutPx({ x: p.x, y: p.y });
	}, [calloutAnchor]);

	useEffect(() => {
		const map = mapRef.current;
		if (!map || !calloutAnchor) {
			setCalloutPx(null);
			return;
		}
		repositionCallout();
		map.on('move', repositionCallout);
		map.on('zoom', repositionCallout);
		return () => {
			map.off('move', repositionCallout);
			map.off('zoom', repositionCallout);
		};
	}, [calloutAnchor, repositionCallout]);

	// -- Gauge DOM-overlay pills: reproject on map move/zoom ------------------
	// Keep the ref current so the mount-once load callback can call the latest version.
	const repositionGauges = useCallback(() => {
		const map = mapRef.current;
		if (!map || !mapLoadedRef.current) return;
		const pins = gauges
			.filter(g => isFinite(g.lng) && isFinite(g.lat) && g.currentFlow != null)
			.map(g => {
				const p = map.project([g.lng, g.lat]);
				return {
					id: g.id,
					x: p.x,
					y: p.y,
					label: shortGaugeName(g.name),
					reading: `${Math.round(g.currentFlow!).toLocaleString()} ${g.unit || 'cfs'}`,
				};
			});
		setGaugePins(pins);
	}, [gauges]);

	// Always keep the ref pointing at the latest repositionGauges (stable identity trick).
	useEffect(() => {
		repositionGaugesRef.current = repositionGauges;
	});

	useEffect(() => {
		const map = mapRef.current;
		if (!map || !mapLoadedRef.current) {
			// Map not yet loaded — register a one-time idle handler to paint pins on first ready.
			if (map) {
				map.once('idle', repositionGauges);
			}
			return;
		}
		repositionGauges();
		map.on('move', repositionGauges);
		map.on('zoom', repositionGauges);
		return () => {
			map.off('move', repositionGauges);
			map.off('zoom', repositionGauges);
		};
	}, [gauges, repositionGauges]);

	return (
		<div style={{ position: 'relative', ...style }}>
			<div
				ref={containerRef}
				style={{
					width: '100%',
					height: '100%',
					minHeight: 480,
					borderRadius: 'var(--r-lg)',
					overflow: 'hidden',
					border: '1px solid var(--rule)',
				}}
			/>

			{calloutAnchor && calloutPx && (
				// The callout body is pinned to the right (desktop) or bottom (mobile) edge of the
				// map container. Only the CSS-triangle tip protrudes past that edge — by 8 px —
				// so the box reads as anchored TO the map but pointing AT the section tile.
				// Vertical (desktop) / horizontal (mobile) position tracks the active section's
				// projected pixel position on the map, clamped to keep the box inside the map bounds.
				<div
					aria-label={`Active section: ${calloutAnchor.name}`}
					style={{
						position: 'absolute',
						...(calloutDirection === 'down'
							? {
								// Mobile: pin to bottom of map; horizontal follows the section's projected X.
								left: calloutPx.x - 70,
								bottom: 8,
							}
							: {
								// Desktop: pin to right of map; vertical follows the section's projected Y.
								right: 0,
								top: Math.max(8, calloutPx.y - 14),
							}),
						pointerEvents: 'none',
						zIndex: 5,
						transition: calloutDirection === 'down'
							? 'left 160ms ease-out'
							: 'top 160ms ease-out',
					}}
				>
					<div style={{
						position: 'relative',
						padding: '6px 10px',
						background: '#0d1620',
						color: '#fff',
						fontFamily: 'var(--font-sans)',
						fontSize: 12,
						fontWeight: 600,
						borderRadius: 6,
						boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
						whiteSpace: 'nowrap',
					}}>
						{calloutAnchor.name}
						{calloutDirection === 'down' ? (
							/* Down-pointing CSS triangle tip — extends past bottom of map */
							<span
								style={{
									position: 'absolute',
									left: '50%',
									bottom: -8,
									transform: 'translateX(-50%)',
									width: 0,
									height: 0,
									borderLeft: '8px solid transparent',
									borderRight: '8px solid transparent',
									borderTop: '8px solid #0d1620',
								}}
							/>
						) : (
							/* Right-pointing CSS triangle tip — extends past right edge of map */
							<span
								style={{
									position: 'absolute',
									right: -8,
									top: '50%',
									transform: 'translateY(-50%)',
									width: 0,
									height: 0,
									borderTop: '8px solid transparent',
									borderBottom: '8px solid transparent',
									borderLeft: '8px solid #0d1620',
								}}
							/>
						)}
					</div>
				</div>
			)}

			{gaugePins.map(g => (
				<div
					key={g.id}
					aria-label={`Gauge ${g.label}: ${g.reading}`}
					style={{
						position: 'absolute',
						left: g.x,
						top: g.y,
						// Sit to the LEFT of the gauge dot so the pill never covers the river.
						transform: 'translate(calc(-100% - 10px), -50%)',
						pointerEvents: 'none',
						zIndex: 4,
						display: 'flex',
						alignItems: 'baseline',
						gap: 5,
						padding: '3px 9px',
						borderRadius: 999,
						background: '#1e3a8a',
						color: '#ffffff',
						fontFamily: 'var(--font-sans)',
						fontSize: 11,
						fontWeight: 600,
						whiteSpace: 'nowrap',
						boxShadow: '0 1px 5px rgba(13,22,32,0.30)',
					}}
				>
					<span>{g.label}</span>
					<span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{g.reading}</span>
				</div>
			))}
		</div>
	);
}
