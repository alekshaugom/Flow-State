import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './river-map.css';
import { useDashboard } from '../hooks/useDashboard';
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
	ideal: 'Ideal', runnable: 'Runnable', high: 'High',
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

interface RiverMapProps {
	style?: React.CSSProperties;
}

export function RiverMap({ style }: RiverMapProps) {
	const navigate = useNavigate();
	const { data, isLoading } = useDashboard();
	const sections = data?.sections || [];
	const geoRef = useRef<L.GeoJSON | null>(null);
	const [hoveredId, setHoveredId] = useState<string | null>(null);

	const geojson = buildGeoJSON(sections);

	const onEachFeature = (feature: any, layer: L.Layer) => {
		const p = feature.properties;

		const tooltipHtml = `
			<div style="font-family: 'Ubuntu', system-ui, sans-serif; min-width: 200px;">
				<div style="font-size: 11px; color: #6b7886; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">
					${p.river} · ${p.classification}
				</div>
				<div style="font-size: 15px; font-weight: 700; color: #0d1620; margin-bottom: 8px;">
					${p.section}
				</div>
				<div style="display: flex; align-items: baseline; gap: 6px; margin-bottom: 4px;">
					<span style="font-family: 'Fira Code', monospace; font-size: 22px; font-weight: 700; color: ${STATUS_HEX[p.status as DesignStatus] || '#6b7886'};">
						${p.now !== null ? p.now.toLocaleString() : '—'}
					</span>
					<span style="font-size: 13px; color: #6b7886;">cfs</span>
				</div>
				<div style="display: flex; align-items: center; gap: 8px;">
					<span style="
						display: inline-flex; align-items: center; gap: 4px;
						padding: 2px 8px; border-radius: 99px; font-size: 12px; font-weight: 600;
						background: ${STATUS_HEX[p.status as DesignStatus] || '#6b7886'}22;
						color: ${STATUS_HEX[p.status as DesignStatus] || '#6b7886'};
					">● ${p.statusLabel}</span>
					<span style="font-size: 12px; color: #6b7886;">
						${TREND_ARROW[p.trend] || ''} ${p.trendPct ? (p.trendPct > 0 ? '+' : '') + p.trendPct + '%' : ''}
					</span>
				</div>
				${p.updatedAt ? `<div style="font-size: 11px; color: #93a0ad; margin-top: 6px;">Updated ${timeAgo(p.updatedAt)}</div>` : ''}
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
				e.target.setStyle({ weight: 6, opacity: 1 });
				e.target.bringToFront();
			},
			mouseout: (e: any) => {
				setHoveredId(null);
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
				{geojson.features.length > 0 && (
					<>
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
				background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
				borderRadius: 12, padding: '12px 16px',
				boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
				fontFamily: 'var(--font-sans)',
			}}>
				<div style={{ fontSize: 11, fontWeight: 700, color: '#6b7886', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
					Flow Status
				</div>
				{(['ideal', 'runnable', 'high', 'low', 'dangerous'] as DesignStatus[]).map(s => (
					<div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
						<div style={{ width: 20, height: 3, borderRadius: 2, background: STATUS_HEX[s] }} />
						<span style={{ fontSize: 12, color: '#45525f' }}>{STATUS_LABEL[s]}</span>
					</div>
				))}
			</div>
		</div>
	);
}
