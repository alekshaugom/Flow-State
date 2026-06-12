import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './river-map.css';
import { useDashboard } from '../hooks/useDashboard';
import { api } from '../api';
import { RIVER_GEOMETRIES } from '../lib/river-geometries';
import type { DashboardSection } from '../types';
import type { DesignStatus } from '../constants';

const STATUS_HEX: Record<DesignStatus, string> = {
	low: '#c9982b',
	runnable: '#6b8f48',
	ideal: '#16a37a',
	high: '#2563c7',
	dangerous: '#b0382a',
};

const STATUS_LABEL: Record<string, string> = {
	ideal: 'Good', runnable: 'Runnable', high: 'High',
	low: 'Low', dangerous: 'Dangerous',
};

const TREND_ARROW: Record<string, string> = {
	up: '↑', down: '↓', stable: '→',
};

const CO_CENTER: [number, number] = [39.0, -106.8];
const CO_ZOOM = 7;

function buildGeoJSON(sections: DashboardSection[]) {
	const features = [];
	for (const s of sections) {
		const coords = RIVER_GEOMETRIES[s.id];
		if (!coords || coords.length < 2) continue;
		features.push({
			type: 'Feature' as const,
			properties: {
				id: s.id,
				river: s.river,
				section: s.section,
				classification: s.classification,
				now: s.now,
				status: s.status,
				statusLabel: STATUS_LABEL[s.status] || s.status,
				trend: s.trend,
				trendPct: s.trendPct,
				change24h: s.change24h,
				updatedAt: s.updatedAt,
			},
			geometry: {
				type: 'LineString' as const,
				coordinates: coords,
			},
		});
	}
	return { type: 'FeatureCollection' as const, features };
}

// Nearest river polyline segment to a point, so a dam tick can be drawn
// perpendicular to the river where it sits. Coords in RIVER_GEOMETRIES are
// [lon, lat]; returns the segment endpoints as [lat, lng] (for L.latLng).
function nearestRiverSegment(lat: number, lng: number): { a: [number, number]; b: [number, number] } | null {
	const cosLat = Math.cos((lat * Math.PI) / 180);
	const px = lng * cosLat;
	const py = lat;
	let best: { a: [number, number]; b: [number, number] } | null = null;
	let bestD = Infinity;
	for (const id in RIVER_GEOMETRIES) {
		const coords = RIVER_GEOMETRIES[id];
		for (let i = 0; i < coords.length - 1; i++) {
			const ax = coords[i][0] * cosLat, ay = coords[i][1];
			const bx = coords[i + 1][0] * cosLat, by = coords[i + 1][1];
			const dx = bx - ax, dy = by - ay;
			const len2 = dx * dx + dy * dy;
			let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
			t = Math.max(0, Math.min(1, t));
			const cx = ax + t * dx, cy = ay + t * dy;
			const d = (px - cx) ** 2 + (py - cy) ** 2;
			if (d < bestD) {
				bestD = d;
				best = { a: [coords[i][1], coords[i][0]], b: [coords[i + 1][1], coords[i + 1][0]] };
			}
		}
	}
	return best;
}

function timeAgo(ts: string | null): string {
	if (!ts) return '';
	const diff = Date.now() - new Date(ts).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return 'just now';
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	return `${Math.floor(hours / 24)}d ago`;
}

function InvalidateSize() {
	const map = useMap();
	useEffect(() => {
		const timer = setTimeout(() => map.invalidateSize(), 100);
		return () => clearTimeout(timer);
	}, [map]);
	return null;
}

function FitBounds({ geojson }: { geojson: any }) {
	const map = useMap();
	useEffect(() => {
		if (geojson.features.length === 0) return;
		const timer = setTimeout(() => {
			map.invalidateSize();
			const layer = L.geoJSON(geojson as any);
			const bounds = layer.getBounds();
			if (bounds.isValid()) {
				map.fitBounds(bounds, { padding: [40, 40] });
			}
		}, 150);
		return () => clearTimeout(timer);
	}, [geojson, map]);
	return null;
}

// Creates a dedicated map pane for the wide "halo" highlight layer, sitting
// ABOVE the basemap tiles (pane zIndex 200) but BELOW the thin section lines
// in the default overlayPane (400). pointerEvents:none so the halo never
// intercepts hover/click meant for the thin lines.
function HaloPane() {
	const map = useMap();
	useEffect(() => {
		let pane = map.getPane('riverHalo');
		if (!pane) {
			pane = map.createPane('riverHalo');
			pane.style.zIndex = '390';
			pane.style.pointerEvents = 'none';
		}
	}, [map]);
	return null;
}

function DamMarkers({ reservoirs, visibleIds, damSegments }: { reservoirs: any[]; visibleIds: Set<any>; damSegments: Map<string, { a: [number, number]; b: [number, number] }> }) {
	const map = useMap();
	useEffect(() => {
		const markers: L.Marker[] = [];
		for (const r of reservoirs) {
			if (!visibleIds.has(r.id) || r.latitude == null || r.longitude == null) continue;
			// Orient the tick perpendicular to the river: take the nearest river
			// segment's on-screen angle (Mercator is conformal, so this holds at any
			// zoom) and add 90°.
			let angle = 0;
			const seg = damSegments.get(r.id);
			if (seg) {
				const pa = map.latLngToLayerPoint(L.latLng(seg.a[0], seg.a[1]));
				const pb = map.latLngToLayerPoint(L.latLng(seg.b[0], seg.b[1]));
				angle = (Math.atan2(pb.y - pa.y, pb.x - pa.x) * 180) / Math.PI + 90;
			}
			const icon = L.divIcon({
				className: 'fs-dam-marker',
				html: `<span style="display:block;width:8px;height:2px;background:#111;border-radius:1px;box-shadow:0 0 0 1px rgba(255,255,255,0.85);transform:rotate(${angle}deg);"></span>`,
				iconSize: [8, 2],
				iconAnchor: [4, 1],
			});
			const m = L.marker([r.latitude, r.longitude], { icon, interactive: false, keyboard: false, zIndexOffset: 1000 });
			m.addTo(map);
			markers.push(m);
		}
		return () => { markers.forEach(m => m.remove()); };
	}, [reservoirs, visibleIds, damSegments, map]);
	return null;
}

interface RiverMapProps {
	style?: React.CSSProperties;
	/** Section ids to "light up" with a wide halo under the thin line (desktop tile hover). */
	highlightedSectionIds?: Set<string> | null;
	/** Fired as the cursor enters/leaves a section line — lets the list glow the matching tile. */
	onSectionHover?: (sectionId: string | null) => void;
}

export function RiverMap({ style, highlightedSectionIds, onSectionHover }: RiverMapProps) {
	const navigate = useNavigate();
	const { data, isLoading } = useDashboard();
	const sections = data?.sections || [];
	const geoRef = useRef<L.GeoJSON | null>(null);
	const haloRef = useRef<L.GeoJSON | null>(null);
	const [hoveredId, setHoveredId] = useState<string | null>(null);

	const { data: reservoirs = [] } = useQuery({ queryKey: ['reservoirs'], queryFn: api.reservoirs, staleTime: 30 * 60_000 });
	const { data: corridorsMeta = [] } = useQuery({ queryKey: ['riverCorridorsMeta'], queryFn: api.riverCorridorsMeta, staleTime: 30 * 60_000 });

	const splitIds = (s: any) => (s || '').split(',').map((x: string) => x.trim()).filter(Boolean);

	const corridorReservoirs = useMemo(() => {
		const m = new Map<string, string[]>();
		for (const c of corridorsMeta) m.set(c.id, splitIds(c.governingReservoirIds));
		return m;
	}, [corridorsMeta]);

	const highlightedReservoirIds = useMemo(() => {
		const out = new Set<string>();
		if (!highlightedSectionIds || highlightedSectionIds.size === 0) return out;
		const slugs = new Set<string>();
		for (const s of sections) if (highlightedSectionIds.has(s.id) && s.corridorSlug) slugs.add(s.corridorSlug);
		for (const slug of slugs) for (const rid of (corridorReservoirs.get(slug) || [])) out.add(rid);
		return out;
	}, [highlightedSectionIds, sections, corridorReservoirs]);

	// Nearest river segment per reservoir — used to draw the dam tick perpendicular.
	const damSegments = useMemo(() => {
		const m = new Map<string, { a: [number, number]; b: [number, number] }>();
		for (const r of reservoirs) {
			if (r.latitude == null || r.longitude == null) continue;
			const seg = nearestRiverSegment(r.latitude, r.longitude);
			if (seg) m.set(r.id, seg);
		}
		return m;
	}, [reservoirs]);

	const geojson = useMemo(() => buildGeoJSON(sections), [sections]);

	// Wide halo under the thin lines: same geometry, +10px weight, rounded, in the
	// riverHalo pane. Hidden (opacity 0) until the matching river tile is hovered.
	const haloStyle = (feature: any) => {
		const status = feature?.properties?.status as DesignStatus;
		const on = highlightedSectionIds?.has(feature?.properties?.id) ?? false;
		return {
			pane: 'riverHalo',
			color: STATUS_HEX[status] || '#93a0ad',
			weight: 14,
			opacity: on ? 0.55 : 0,
			lineCap: 'round' as const,
			lineJoin: 'round' as const,
			interactive: false,
		};
	};

	// Live-update halo opacity per section as the hovered tile changes (no remount,
	// so the layer stays under the thin lines).
	useEffect(() => {
		const layer = haloRef.current;
		if (!layer) return;
		layer.eachLayer((l: any) => {
			const id = l.feature?.properties?.id;
			const on = highlightedSectionIds?.has(id) ?? false;
			l.setStyle({ opacity: on ? 0.55 : 0 });
		});
	}, [highlightedSectionIds, geojson]);

	const onEachFeature = (feature: any, layer: L.Layer) => {
		const p = feature.properties;

		const tooltipHtml = `
			<div style="font-family: var(--font-sans); min-width: 200px;">
				<div style="font-size: 11px; color: var(--fg-3); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">
					${p.river} · ${p.classification}
				</div>
				<div style="font-size: 15px; font-weight: 700; color: var(--fg-1); margin-bottom: 8px;">
					${p.section}
				</div>
				<div style="display: flex; align-items: baseline; gap: 6px; margin-bottom: 4px;">
					<span style="font-family: var(--font-mono); font-size: 22px; font-weight: 700; color: ${STATUS_HEX[p.status as DesignStatus] || '#6b7886'};">
						${p.now !== null ? p.now.toLocaleString() : '—'}
					</span>
					<span style="font-size: 13px; color: var(--fg-3);">cfs</span>
				</div>
				<div style="display: flex; align-items: center; gap: 8px;">
					<span style="
						display: inline-flex; align-items: center; gap: 4px;
						padding: 2px 8px; border-radius: 99px; font-size: 12px; font-weight: 600;
						background: ${STATUS_HEX[p.status as DesignStatus] || '#6b7886'}22;
						color: ${STATUS_HEX[p.status as DesignStatus] || '#6b7886'};
					">● ${p.statusLabel}</span>
					<span style="font-size: 12px; color: var(--fg-3);">
						${TREND_ARROW[p.trend] || ''} ${p.trendPct ? (p.trendPct > 0 ? '+' : '') + p.trendPct + '%' : ''}
					</span>
				</div>
				${p.updatedAt ? `<div style="font-size: 11px; color: var(--fg-3); margin-top: 6px;">Updated ${timeAgo(p.updatedAt)}</div>` : ''}
			</div>
		`;

		layer.bindTooltip(tooltipHtml, {
			sticky: true,
			direction: 'top',
			offset: [0, -10],
			opacity: 1,
			className: 'river-tooltip',
		});

		(layer as any).on({
			mouseover: (e: any) => {
				setHoveredId(p.id);
				onSectionHover?.(p.id);
				e.target.setStyle({ weight: 6, opacity: 1 });
				e.target.bringToFront();
			},
			mouseout: (e: any) => {
				setHoveredId(null);
				onSectionHover?.(null);
				e.target.setStyle({
					weight: 4,
					opacity: 0.85,
				});
			},
			click: () => {
				navigate(`/section/${p.id}`);
			},
		});
	};

	const styleFeature = (feature: any) => {
		const status = feature?.properties?.status as DesignStatus;
		return {
			color: STATUS_HEX[status] || '#93a0ad',
			weight: 4,
			opacity: 0.85,
			lineCap: 'round' as const,
			lineJoin: 'round' as const,
		};
	};

	if (isLoading) {
		return (
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink-3)', ...style }}>
				Loading map data…
			</div>
		);
	}

	return (
		<div style={{ position: 'relative', ...style }}>
			<MapContainer
				center={CO_CENTER}
				zoom={CO_ZOOM}
				style={{ width: '100%', height: '100%' }}
				zoomControl={false}
			>
				<TileLayer
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
					url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
					maxZoom={19}
				/>
				<InvalidateSize />
				<HaloPane />
				<DamMarkers reservoirs={reservoirs} visibleIds={highlightedReservoirIds} damSegments={damSegments} />
				{geojson.features.length > 0 && (
					<>
						{/* Wide halo layer — under the thin lines (riverHalo pane), lights up on tile hover */}
						<GeoJSON
							key={'halo-' + JSON.stringify(geojson)}
							data={geojson as any}
							style={haloStyle as any}
							pane="riverHalo"
							interactive={false}
							ref={haloRef as any}
						/>
						{/* Thin interactive section lines — on top */}
						<GeoJSON
							key={JSON.stringify(geojson)}
							data={geojson as any}
							style={styleFeature}
							onEachFeature={onEachFeature}
							ref={geoRef as any}
						/>
						<FitBounds geojson={geojson} />
					</>
				)}
			</MapContainer>

			{/* Legend */}
			<div style={{
				position: 'absolute', bottom: 24, left: 24, zIndex: 1000,
				background: 'var(--bg-card)', backdropFilter: 'blur(8px)',
				borderRadius: 12, padding: '12px 16px',
				boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
				fontFamily: 'var(--font-sans)',
			}}>
				<div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
					Flow Status
				</div>
				{(['dangerous', 'high', 'ideal', 'runnable', 'low'] as DesignStatus[]).map(s => (
					<div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
						<div style={{ width: 20, height: 3, borderRadius: 2, background: STATUS_HEX[s] }} />
						<span style={{ fontSize: 12, color: 'var(--fg-2)' }}>{STATUS_LABEL[s]}</span>
					</div>
				))}
				<div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0', marginTop: 6, borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: 8 }}>
					<div style={{ width: 20, height: 4, borderRadius: 1, background: '#111' }} />
					<span style={{ fontSize: 12, color: 'var(--fg-2)' }}>Dam</span>
				</div>
			</div>
		</div>
	);
}
