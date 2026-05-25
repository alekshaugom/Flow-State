import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkline } from './Sparkline';
import { STATUS_COLORS, mapStatusToDesign, type DesignStatus } from '../constants';
import { HomeCardLoggedBadge } from './HomeCardLoggedBadge';

export interface TileAccessPoint {
	id: string;
	name: string;
	altNames: string;
	kind: 'put-in' | 'take-out' | 'both' | string;
	sortIndex: number;
	latitude: number | null;
	longitude: number | null;
	riverMile: number | null;
	fee: string | null;
	vehicleAccess: boolean | null;
	notes: string;
}

export interface TileLeg {
	sectionId: string;
	name: string;
	difficultyMin: string | null;
	difficultyMax: string | null;
	difficultyLabel: string;
	lengthMiles: number | null;
	fromAccessPointId: string | null;
	toAccessPointId: string | null;
	sortIndex: number;
	status: string;
	statusLabel: string | null;
	notes: string;
	primaryGaugeId: string | null;
	primaryGaugeName: string | null;
	currentFlow: number | null;
	unit: string;
	sparkline: number[];
	updatedAt: string | null;
}

export interface TileGauge {
	id: string;
	name: string;
	sortIndex: number;
	latitude: number | null;
	longitude: number | null;
	source: string;
	currentFlow: number | null;
	unit: string;
	trend: string;
	change24h: number | null;
	sparkline: number[];
	updatedAt: string | null;
}

export interface TileImpassableDam {
	id: string;
	name: string;
	kind: string;
	position: 'upstream-end' | 'downstream-end' | string;
	latitude: number | null;
	longitude: number | null;
	riverMile: number | null;
	notes: string;
}

export interface CorridorTileData {
	corridorId: string;
	name: string;
	shortName: string | null;
	description: string | null;
	driver: string | null;
	sortIndex: number;
	riverId: string | null;
	riverName: string | null;
	watershedId: string | null;
	watershedName: string | null;
	accessPoints: TileAccessPoint[];
	legs: TileLeg[];
	gauges: TileGauge[];
	impassableDams?: TileImpassableDam[];
	myTripCount: number;
}

interface CorridorTileProps {
	tile: CorridorTileData;
	density?: 'desktop' | 'mobile';
}

type RailItem =
	| { kind: 'dam-top'; dam: TileImpassableDam }
	| { kind: 'ap'; ap: TileAccessPoint }
	| { kind: 'leg'; leg: TileLeg }
	| { kind: 'gauge'; gauge: TileGauge; leg: TileLeg | null }
	| { kind: 'dam-bottom'; dam: TileImpassableDam };

function buildRailItems(tile: CorridorTileData): RailItem[] {
	const aps = [...tile.accessPoints].sort((a, b) => a.sortIndex - b.sortIndex);
	const gauges = [...tile.gauges].sort((a, b) => a.sortIndex - b.sortIndex);
	const legs = tile.legs;
	const items: RailItem[] = [];

	// Dam at the upstream end (entry from impassable above)
	const upstreamDam = (tile.impassableDams || []).find(d => d.position === 'upstream-end');
	if (upstreamDam) items.push({ kind: 'dam-top', dam: upstreamDam });

	const findLegContaining = (sortIndex: number): TileLeg | null => {
		for (const leg of legs) {
			const from = aps.find(a => a.id === leg.fromAccessPointId);
			const to = aps.find(a => a.id === leg.toAccessPointId);
			if (!from || !to) continue;
			if (sortIndex > from.sortIndex && sortIndex <= to.sortIndex) return leg;
		}
		return null;
	};

	for (let i = 0; i < aps.length; i++) {
		const ap = aps[i];
		items.push({ kind: 'ap', ap });

		// Place any leg labels that START at this AP, just below it.
		const legsStarting = legs.filter(l => l.fromAccessPointId === ap.id);
		for (const leg of legsStarting) items.push({ kind: 'leg', leg });

		// Gauges between this AP and the next AP
		const nextAP = aps[i + 1];
		if (nextAP) {
			const gaugesHere = gauges.filter(g =>
				g.sortIndex > ap.sortIndex && g.sortIndex <= nextAP.sortIndex,
			);
			for (const g of gaugesHere) {
				items.push({ kind: 'gauge', gauge: g, leg: findLegContaining(g.sortIndex) });
			}
		}
	}

	// Dam at the downstream end
	const downstreamDam = (tile.impassableDams || []).find(d => d.position === 'downstream-end');
	if (downstreamDam) items.push({ kind: 'dam-bottom', dam: downstreamDam });

	return items;
}

function segmentColorAt(items: RailItem[], idx: number, tile: CorridorTileData): string {
	// Find the rail segment color at the boundary between row idx and row idx+1.
	// Determined by the leg covering the section of rail at this transition.
	const aps = [...tile.accessPoints].sort((a, b) => a.sortIndex - b.sortIndex);
	const apIdToSort = new Map(aps.map(a => [a.id, a.sortIndex] as const));
	// Find the upstream and downstream APs surrounding this segment.
	let upperApId: string | null = null;
	let lowerApId: string | null = null;
	for (let i = idx; i >= 0; i--) {
		if (items[i].kind === 'ap') { upperApId = (items[i] as any).ap.id; break; }
	}
	for (let i = idx + 1; i < items.length; i++) {
		if (items[i].kind === 'ap') { lowerApId = (items[i] as any).ap.id; break; }
	}
	if (!upperApId || !lowerApId) return 'var(--rule)';
	const upperSort = apIdToSort.get(upperApId)!;
	const lowerSort = apIdToSort.get(lowerApId)!;
	for (const leg of tile.legs) {
		const from = apIdToSort.get(leg.fromAccessPointId || '');
		const to = apIdToSort.get(leg.toAccessPointId || '');
		if (from === undefined || to === undefined) continue;
		if (from <= upperSort && to >= lowerSort) {
			const status = mapStatusToDesign(leg.status);
			return STATUS_COLORS[status].solid;
		}
	}
	return 'var(--rule)';
}

function apKindLabel(kind: string): string {
	if (kind === 'put-in') return 'put-in';
	if (kind === 'take-out') return 'take-out';
	return 'put/take';
}

export function CorridorTile({ tile, density = 'desktop' }: CorridorTileProps) {
	const navigate = useNavigate();
	const [openAPId, setOpenAPId] = useState<string | null>(null);
	const [openDamId, setOpenDamId] = useState<string | null>(null);

	const items = buildRailItems(tile);
	const mobile = density === 'mobile';

	const railX = mobile ? 14 : 18;
	const apRowH = mobile ? 26 : 30;
	const legRowH = mobile ? 30 : 36;
	const gaugeRowH = mobile ? 36 : 40;
	const damRowH = mobile ? 34 : 40;
	const sparkW = mobile ? 96 : 120;
	const sparkH = mobile ? 28 : 32;

	const aps = [...tile.accessPoints].sort((a, b) => a.sortIndex - b.sortIndex);
	const firstAP = aps[0];
	const lastAP = aps[aps.length - 1];
	const totalMiles = tile.legs.reduce((s, l) => s + (l.lengthMiles || 0), 0);
	const diffMin = tile.legs.reduce<string | null>((acc, l) => acc || l.difficultyMin, null);
	const diffMax = tile.legs.map(l => l.difficultyMax || '').filter(Boolean).sort().pop() || null;
	const difficultyRange = diffMin && diffMax && diffMin !== diffMax
		? `Class ${diffMin}–${diffMax}`
		: (diffMin || diffMax ? `Class ${diffMin || diffMax}` : '');

	return (
		<div style={{
			background: 'var(--bg-card)',
			border: '1px solid var(--rule)',
			borderRadius: 'var(--r-lg)',
			boxShadow: 'var(--shadow-card)',
			padding: mobile ? 12 : 14,
			position: 'relative',
			overflow: 'hidden',
		}}>
			<HomeCardLoggedBadge count={tile.myTripCount} />

			<div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 10 }}>
				<div style={{ fontSize: mobile ? 14 : 15, fontWeight: 700, color: 'var(--ink-0)', letterSpacing: '-0.005em' }}>
					{tile.name}
				</div>
				<div style={{ fontSize: 11, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
					{firstAP && lastAP && firstAP.id !== lastAP.id && (
						<span>{firstAP.name} → {lastAP.name}</span>
					)}
					{totalMiles > 0 && (
						<>
							<span style={{ opacity: 0.5 }}>·</span>
							<span style={{ fontFamily: 'var(--font-mono)' }}>{Math.round(totalMiles)} mi</span>
						</>
					)}
					{difficultyRange && (
						<>
							<span style={{ opacity: 0.5 }}>·</span>
							<span style={{ fontFamily: 'var(--font-mono)' }}>{difficultyRange}</span>
						</>
					)}
				</div>
			</div>

			<div style={{ position: 'relative' }}>
				{items.map((item, i) => {
					const isLast = i === items.length - 1;
					const segColor = isLast ? 'transparent' : segmentColorAt(items, i, tile);
					// Decide row height based on kind
					let rowH = apRowH;
					if (item.kind === 'leg') rowH = legRowH;
					else if (item.kind === 'gauge') rowH = gaugeRowH;
					else if (item.kind === 'dam-top' || item.kind === 'dam-bottom') rowH = damRowH;

					return (
						<RailRow
							key={i}
							item={item}
							rowH={rowH}
							railX={railX}
							segColor={segColor}
							isFirst={i === 0}
							isLast={isLast}
							sparkW={sparkW}
							sparkH={sparkH}
							mobile={mobile}
							onAPClick={(ap) => setOpenAPId(openAPId === ap.id ? null : ap.id)}
							onLegClick={(leg) => navigate(`/section/${leg.sectionId}`)}
							onGaugeClick={(gauge, leg) => {
								const target = leg || tile.legs.find(l => l.primaryGaugeId === gauge.id) || tile.legs[0];
								if (target) navigate(`/section/${target.sectionId}`);
							}}
							onDamClick={(dam) => setOpenDamId(openDamId === dam.id ? null : dam.id)}
						/>
					);
				})}
			</div>

			{openAPId && (() => {
				const ap = tile.accessPoints.find(a => a.id === openAPId);
				if (!ap) return null;
				return <APPopover ap={ap} onClose={() => setOpenAPId(null)} />;
			})()}

			{openDamId && (() => {
				const dam = (tile.impassableDams || []).find(d => d.id === openDamId);
				if (!dam) return null;
				return <DamPopover dam={dam} onClose={() => setOpenDamId(null)} />;
			})()}
		</div>
	);
}

interface RailRowProps {
	item: RailItem;
	rowH: number;
	railX: number;
	segColor: string;
	isFirst: boolean;
	isLast: boolean;
	sparkW: number;
	sparkH: number;
	mobile: boolean;
	onAPClick: (ap: TileAccessPoint) => void;
	onLegClick: (leg: TileLeg) => void;
	onGaugeClick: (gauge: TileGauge, leg: TileLeg | null) => void;
	onDamClick: (dam: TileImpassableDam) => void;
}

function RailRow({ item, rowH, railX, segColor, isFirst, isLast, sparkW, sparkH, mobile, onAPClick, onLegClick, onGaugeClick, onDamClick }: RailRowProps) {
	const half = rowH / 2;

	// Common rail line going through this row (drawn unless this is a dam end-cap)
	const railLineEl = (
		<>
			{!isFirst && item.kind !== 'dam-top' && (
				<div style={{ position: 'absolute', left: railX - 1.5, top: 0, height: half, width: 3, background: 'var(--rule)', borderRadius: 2 }} />
			)}
			{!isLast && item.kind !== 'dam-bottom' && (
				<div style={{ position: 'absolute', left: railX - 1.5, top: half, height: half, width: 3, background: segColor, borderRadius: 2 }} />
			)}
		</>
	);

	if (item.kind === 'ap') {
		const ap = item.ap;
		return (
			<div style={{
				position: 'relative',
				height: rowH,
				display: 'grid',
				gridTemplateColumns: `${railX + 14}px minmax(0, 1fr) auto`,
				alignItems: 'center',
				gap: 8,
			}}>
				<div style={{ position: 'relative', height: '100%' }}>
					{railLineEl}
					<button
						type="button"
						onClick={() => onAPClick(ap)}
						title={ap.name}
						style={{
							position: 'absolute',
							left: railX - 5, top: half - 5,
							width: 10, height: 10,
							borderRadius: '50%',
							background: 'var(--bg-card)',
							border: `2px solid var(--ink-2)`,
							cursor: 'pointer',
							padding: 0,
							zIndex: 3,
						}}
						aria-label={`Access point: ${ap.name}`}
					/>
				</div>
				<button
					type="button"
					onClick={() => onAPClick(ap)}
					style={{
						background: 'transparent', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer',
						display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0,
					}}
				>
					<span style={{
						fontSize: mobile ? 11.5 : 12.5,
						color: 'var(--ink-2)',
						fontWeight: 400,
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
					}}>{ap.name}</span>
					<span style={{
						fontFamily: 'var(--font-mono)',
						fontSize: 9,
						color: 'var(--ink-4)',
						letterSpacing: '0.05em',
						textTransform: 'uppercase',
						flexShrink: 0,
					}}>{apKindLabel(ap.kind)}</span>
				</button>
				<div style={{
					fontFamily: 'var(--font-mono)',
					fontSize: 10,
					color: 'var(--ink-4)',
					fontVariantNumeric: 'tabular-nums',
					whiteSpace: 'nowrap',
				}}>
					{ap.riverMile != null ? `RM ${ap.riverMile.toFixed(1)}` : ''}
				</div>
			</div>
		);
	}

	if (item.kind === 'leg') {
		const leg = item.leg;
		const status = mapStatusToDesign(leg.status);
		const c = STATUS_COLORS[status];
		return (
			<div style={{
				position: 'relative',
				height: rowH,
				display: 'grid',
				gridTemplateColumns: `${railX + 14}px minmax(0, 1fr) auto`,
				alignItems: 'center',
				gap: 8,
			}}>
				<div style={{ position: 'relative', height: '100%' }}>{railLineEl}</div>
				<button
					type="button"
					onClick={() => onLegClick(leg)}
					style={{
						background: 'transparent', border: 'none', padding: '4px 0', textAlign: 'left', cursor: 'pointer',
						display: 'flex', alignItems: 'center', gap: 8, minWidth: 0,
					}}
					aria-label={`${leg.name} — Class ${leg.difficultyLabel}. Open section.`}
				>
					<span style={{
						fontSize: mobile ? 13 : 14,
						fontWeight: 700,
						color: 'var(--ink-0)',
						letterSpacing: '-0.005em',
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
					}}>{leg.name}</span>
					{leg.difficultyLabel && (
						<span style={{
							fontFamily: 'var(--font-mono)',
							fontSize: 10,
							color: c.fg,
							background: c.bg,
							border: `1px solid ${c.line}`,
							borderRadius: 4,
							padding: '1px 6px',
							flexShrink: 0,
							letterSpacing: '0.02em',
						}}>{leg.difficultyLabel}</span>
					)}
				</button>
				<div />
			</div>
		);
	}

	if (item.kind === 'gauge') {
		const gauge = item.gauge;
		const leg = item.leg;
		const status = leg ? mapStatusToDesign(leg.status) : 'runnable';
		return (
			<div style={{
				position: 'relative',
				height: rowH,
				display: 'grid',
				gridTemplateColumns: `${railX + 14}px minmax(0, 1fr) auto`,
				alignItems: 'center',
				gap: 8,
			}}>
				<div style={{ position: 'relative', height: '100%' }}>
					{railLineEl}
					{/* Horizontal tick across the rail marking the gauge position */}
					<div style={{
						position: 'absolute',
						left: railX - 8, top: half - 1.5,
						width: 16, height: 3,
						background: 'var(--ink-2)',
						borderRadius: 2,
						zIndex: 3,
					}} />
				</div>
				<div />
				<button
					type="button"
					onClick={() => onGaugeClick(gauge, leg)}
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 8,
						background: 'transparent',
						border: 'none',
						padding: 0,
						cursor: 'pointer',
					}}
					aria-label={`Gauge: ${gauge.currentFlow ?? '—'} ${gauge.unit}`}
				>
					{gauge.sparkline && gauge.sparkline.length > 1 && (
						<Sparkline data={gauge.sparkline} width={sparkW} height={sparkH} status={status} />
					)}
					<div style={{ textAlign: 'right', minWidth: 48 }}>
						<div style={{
							fontFamily: 'var(--font-mono)',
							fontSize: mobile ? 14 : 16,
							fontWeight: 700,
							color: 'var(--ink-0)',
							fontVariantNumeric: 'tabular-nums',
							lineHeight: 1,
						}}>{gauge.currentFlow != null ? Math.round(gauge.currentFlow) : '—'}</div>
						<div style={{
							fontFamily: 'var(--font-mono)',
							fontSize: 9,
							color: 'var(--ink-3)',
							letterSpacing: '0.06em',
							textTransform: 'uppercase',
						}}>{gauge.unit}</div>
					</div>
				</button>
			</div>
		);
	}

	if (item.kind === 'dam-top' || item.kind === 'dam-bottom') {
		const dam = item.dam;
		return (
			<div style={{
				position: 'relative',
				height: rowH,
				display: 'grid',
				gridTemplateColumns: `${railX + 14}px minmax(0, 1fr) auto`,
				alignItems: 'center',
				gap: 8,
			}}>
				<div style={{ position: 'relative', height: '100%' }}>
					{/* Hatched / blocked rail end */}
					<div style={{
						position: 'absolute',
						left: railX - 8, top: half - 4,
						width: 16, height: 8,
						background: 'repeating-linear-gradient(45deg, var(--ink-1), var(--ink-1) 2px, var(--bg-card) 2px, var(--bg-card) 4px)',
						borderRadius: 2,
						zIndex: 3,
					}} />
					{item.kind === 'dam-bottom' && !isFirst && (
						<div style={{ position: 'absolute', left: railX - 1.5, top: 0, height: half, width: 3, background: 'var(--rule)', borderRadius: 2 }} />
					)}
					{item.kind === 'dam-top' && !isLast && (
						<div style={{ position: 'absolute', left: railX - 1.5, top: half, height: half, width: 3, background: 'var(--rule)', borderRadius: 2 }} />
					)}
				</div>
				<button
					type="button"
					onClick={() => onDamClick(dam)}
					style={{
						background: 'transparent', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer',
						display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0,
					}}
					aria-label={`Impassable: ${dam.name}`}
				>
					<span style={{
						fontSize: mobile ? 11.5 : 12.5,
						color: 'var(--ink-2)',
						fontWeight: 500,
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
					}}>{dam.name}</span>
					<span style={{
						fontFamily: 'var(--font-mono)',
						fontSize: 9,
						color: 'var(--danger-solid, #b91c1c)',
						letterSpacing: '0.05em',
						textTransform: 'uppercase',
						flexShrink: 0,
					}}>impassable</span>
				</button>
				<div />
			</div>
		);
	}

	return null;
}

function APPopover({ ap, onClose }: { ap: TileAccessPoint; onClose: () => void }) {
	const hasDetails = ap.altNames || ap.latitude || ap.longitude || ap.riverMile || ap.fee || ap.vehicleAccess !== null || ap.notes;
	return (
		<div onClick={onClose} style={{
			position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)',
			zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
		}}>
			<div onClick={e => e.stopPropagation()} style={{
				background: 'var(--bg-card)', borderRadius: 'var(--r-lg)', padding: 20,
				maxWidth: 360, width: '100%', boxShadow: 'var(--shadow-card)',
			}}>
				<div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
					<div>
						<div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-0)' }}>{ap.name}</div>
						<div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
							{apKindLabel(ap.kind)}
						</div>
					</div>
					<button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--ink-3)', padding: 4 }}>×</button>
				</div>
				{ap.altNames && <div style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 6 }}>Also known as: {ap.altNames}</div>}
				{ap.notes && <div style={{ fontSize: 13, color: 'var(--ink-1)', lineHeight: 1.45, marginBottom: 8 }}>{ap.notes}</div>}
				{(ap.latitude != null && ap.longitude != null) && (
					<div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
						{ap.latitude.toFixed(4)}, {ap.longitude.toFixed(4)}
						{ap.riverMile != null ? ` · RM ${ap.riverMile}` : ''}
					</div>
				)}
				{ap.fee && <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 6 }}>Fee: {ap.fee}</div>}
				{!hasDetails && <div style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>No additional details yet.</div>}
			</div>
		</div>
	);
}

function DamPopover({ dam, onClose }: { dam: TileImpassableDam; onClose: () => void }) {
	return (
		<div onClick={onClose} style={{
			position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)',
			zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
		}}>
			<div onClick={e => e.stopPropagation()} style={{
				background: 'var(--bg-card)', borderRadius: 'var(--r-lg)', padding: 20,
				maxWidth: 380, width: '100%', boxShadow: 'var(--shadow-card)',
			}}>
				<div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
					<div>
						<div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-0)' }}>{dam.name}</div>
						<div style={{ fontSize: 11, color: 'var(--danger-solid, #b91c1c)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
							impassable · breaks corridor
						</div>
					</div>
					<button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--ink-3)', padding: 4 }}>×</button>
				</div>
				{dam.notes && <div style={{ fontSize: 13, color: 'var(--ink-1)', lineHeight: 1.45, marginBottom: 8 }}>{dam.notes}</div>}
				{(dam.latitude != null && dam.longitude != null) && (
					<div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
						{dam.latitude.toFixed(4)}, {dam.longitude.toFixed(4)}
					</div>
				)}
			</div>
		</div>
	);
}
