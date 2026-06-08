/**
 * GeoMap.tsx — reusable geographic map for corridor + section screens.
 *
 * Draws real OSM-backed Leaflet maps from RIVER_GEOMETRIES, colored by
 * STATUS_HEX[mapStatusToDesign(section.status)] — identical to RiverMap.tsx.
 * Fits bounds to the passed sections automatically, so a single section
 * zooms to that section and a full corridor zooms to all its sections.
 *
 * Modeled closely on RiverMap.tsx; imports river-map.css for tooltip styles.
 */

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './river-map.css';
import { RIVER_GEOMETRIES } from '../lib/river-geometries';
import { mapStatusToDesign } from '../constants';
import type { DesignStatus } from '../constants';

// ── Status colors — identical values to RiverMap.tsx ─────────────────────────

const STATUS_HEX: Record<DesignStatus, string> = {
	low: '#c9982b',
	runnable: '#6b8f48',
	ideal: '#16a37a',
	high: '#2563c7',
	dangerous: '#b0382a',
};

const STATUS_LABEL: Record<DesignStatus, string> = {
	ideal: 'Good',
	runnable: 'Runnable',
	high: 'High',
	low: 'Low',
	dangerous: 'Dangerous',
};

const TREND_ARROW: Record<string, string> = {
	up: '↑',
	down: '↓',
	stable: '→',
};

// ── Public types ──────────────────────────────────────────────────────────────

export interface GeoMapSection {
	id: string;
	river?: string;
	section?: string;
	classification?: string;
	now?: number | null;
	status: string;
	statusLabel?: string | null;
	trend?: string;
}

export interface GeoMapAccessPoint {
	id: string;
	name: string;
	kind?: string | null;
	latitude: number | null;
	longitude: number | null;
}

export interface GeoMapProps {
	sections: GeoMapSection[];
	accessPoints?: GeoMapAccessPoint[];
	selectedSectionId?: string | null;
	onSectionClick?: (id: string) => void;
	height?: number | string;
	showTooltips?: boolean;
	fitPadding?: number;
	style?: React.CSSProperties;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function buildGeoJSON(sections: GeoMapSection[]) {
	const features = [];
	for (const s of sections) {
		const coords = RIVER_GEOMETRIES[s.id];
		if (!coords || coords.length < 2) continue;
		const designStatus = mapStatusToDesign(s.status);
		features.push({
			type: 'Feature' as const,
			properties: {
				id: s.id,
				river: s.river ?? '',
				section: s.section ?? '',
				classification: s.classification ?? '',
				now: s.now ?? null,
				status: designStatus,
				statusLabel: s.statusLabel ?? STATUS_LABEL[designStatus],
				trend: s.trend ?? 'stable',
			},
			geometry: {
				type: 'LineString' as const,
				coordinates: coords,
			},
		});
	}
	return { type: 'FeatureCollection' as const, features };
}

// ── Map utility components ────────────────────────────────────────────────────

function InvalidateSize() {
	const map = useMap();
	useEffect(() => {
		const timer = setTimeout(() => map.invalidateSize(), 100);
		return () => clearTimeout(timer);
	}, [map]);
	return null;
}

function FitBounds({
	geojson,
	padding,
}: {
	geojson: ReturnType<typeof buildGeoJSON>;
	padding: number;
}) {
	const map = useMap();
	useEffect(() => {
		if (geojson.features.length === 0) return;
		const timer = setTimeout(() => {
			map.invalidateSize();
			const layer = L.geoJSON(geojson as Parameters<typeof L.geoJSON>[0]);
			const bounds = layer.getBounds();
			if (bounds.isValid()) {
				map.fitBounds(bounds, { padding: [padding, padding] });
			}
		}, 150);
		return () => clearTimeout(timer);
	}, [geojson, map, padding]);
	return null;
}

// ── Access-point markers ──────────────────────────────────────────────────────

function AccessPointMarkers({ accessPoints }: { accessPoints: GeoMapAccessPoint[] }) {
	const map = useMap();
	const markersRef = useRef<L.CircleMarker[]>([]);

	useEffect(() => {
		// Remove old markers
		markersRef.current.forEach(m => m.remove());
		markersRef.current = [];

		for (const ap of accessPoints) {
			if (ap.latitude == null || ap.longitude == null) continue;

			const color =
				ap.kind === 'put-in' ? '#2b9e5b'
				: ap.kind === 'take-out' ? '#1a6fa8'
				: '#7b8fa6';

			const marker = L.circleMarker([ap.latitude, ap.longitude], {
				radius: 6,
				color: '#fff',
				weight: 2,
				fillColor: color,
				fillOpacity: 1,
			});

			marker.bindTooltip(ap.name, {
				direction: 'top',
				offset: [0, -8],
				opacity: 1,
				className: 'river-tooltip',
			});

			marker.addTo(map);
			markersRef.current.push(marker);
		}

		return () => {
			markersRef.current.forEach(m => m.remove());
			markersRef.current = [];
		};
	}, [accessPoints, map]);

	return null;
}

// ── Main component ────────────────────────────────────────────────────────────

export function GeoMap({
	sections,
	accessPoints = [],
	selectedSectionId,
	onSectionClick,
	height = '100%',
	showTooltips = true,
	fitPadding = 30,
	style,
}: GeoMapProps) {
	const geojson = buildGeoJSON(sections);

	// Stable key: rebuild GeoJSON layer when sections or selected ID changes
	const geoKey = sections.map(s => s.id).join(',') + '|' + (selectedSectionId ?? '');

	const onEachFeature = (feature: GeoJSON.Feature, layer: L.Layer) => {
		const p = feature.properties as {
			id: string;
			river: string;
			section: string;
			classification: string;
			now: number | null;
			status: DesignStatus;
			statusLabel: string;
			trend: string;
		};

		const isSelected = p.id === selectedSectionId;
		const hex = STATUS_HEX[p.status] || '#93a0ad';

		// Apply initial style (selected gets heavier weight)
		(layer as L.Path).setStyle({
			weight: isSelected ? 6 : 4,
			opacity: isSelected ? 1 : 0.85,
		});
		if (isSelected) {
			(layer as L.Path).bringToFront();
		}

		if (showTooltips) {
			const tooltipHtml = `
				<div style="font-family: var(--font-sans); min-width: 180px;">
					<div style="font-size: 11px; color: var(--fg-3); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">
						${p.river}${p.river && p.classification ? ' · ' : ''}${p.classification}
					</div>
					<div style="font-size: 15px; font-weight: 700; color: var(--fg-1); margin-bottom: 8px;">
						${p.section}
					</div>
					<div style="display: flex; align-items: baseline; gap: 6px; margin-bottom: 4px;">
						<span style="font-family: var(--font-mono); font-size: 22px; font-weight: 700; color: ${hex};">
							${p.now !== null ? p.now.toLocaleString() : '—'}
						</span>
						<span style="font-size: 13px; color: var(--fg-3);">cfs</span>
					</div>
					<div style="display: flex; align-items: center; gap: 8px;">
						<span style="
							display: inline-flex; align-items: center; gap: 4px;
							padding: 2px 8px; border-radius: 99px; font-size: 12px; font-weight: 600;
							background: ${hex}22;
							color: ${hex};
						">● ${p.statusLabel}</span>
						<span style="font-size: 12px; color: var(--fg-3);">
							${TREND_ARROW[p.trend] || ''}
						</span>
					</div>
				</div>
			`;

			layer.bindTooltip(tooltipHtml, {
				sticky: true,
				direction: 'top',
				offset: [0, -10],
				opacity: 1,
				className: 'river-tooltip',
			});
		}

		(layer as L.Path).on({
			mouseover: (e: L.LeafletMouseEvent) => {
				(e.target as L.Path).setStyle({ weight: 6, opacity: 1 });
				(e.target as L.Path).bringToFront();
			},
			mouseout: (e: L.LeafletMouseEvent) => {
				const isStillSelected = p.id === selectedSectionId;
				(e.target as L.Path).setStyle({
					weight: isStillSelected ? 6 : 4,
					opacity: isStillSelected ? 1 : 0.85,
				});
			},
			click: () => {
				if (onSectionClick) onSectionClick(p.id);
			},
		});
	};

	const styleFeature = (feature?: GeoJSON.Feature) => {
		const status = feature?.properties?.status as DesignStatus;
		const isSelected = feature?.properties?.id === selectedSectionId;
		return {
			color: STATUS_HEX[status] || '#93a0ad',
			weight: isSelected ? 6 : 4,
			opacity: isSelected ? 1 : 0.85,
			lineCap: 'round' as const,
			lineJoin: 'round' as const,
		};
	};

	return (
		<div style={{ position: 'relative', height, ...style }}>
			<MapContainer
				center={[39.0, -106.8]}
				zoom={7}
				style={{ width: '100%', height: '100%' }}
				zoomControl={false}
				scrollWheelZoom={false}
			>
				<TileLayer
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
					url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
					maxZoom={19}
				/>
				<InvalidateSize />
				{geojson.features.length > 0 && (
					<>
						<GeoJSON
							key={geoKey}
							data={geojson as GeoJSON.FeatureCollection}
							style={styleFeature}
							onEachFeature={onEachFeature}
						/>
						<FitBounds geojson={geojson} padding={fitPadding} />
					</>
				)}
				{accessPoints.length > 0 && (
					<AccessPointMarkers accessPoints={accessPoints} />
				)}
			</MapContainer>
		</div>
	);
}
