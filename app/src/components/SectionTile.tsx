import { BigCFS } from './BigCFS';
import { StatusPill } from './StatusPill';
import { TrendChip } from './TrendChip';
import { Sparkline } from './Sparkline';
import { SectionDetailBody } from './SectionDetailBody';
import { mapStatusToDesign, STATUS_LABEL } from '../constants';
import type { AccessPointData } from './AccessPointCard';

// --- Prop types ---

interface SectionTileSection {
	id: string;
	name: string;
	parentSectionId: string | null;
	difficulty: string;
	classification?: string;
	lengthMiles: number | null;
	river?: string;
	status: string;
	statusLabel: string | null;
	currentFlow: number | null;
	unit: string;
	trend: string;
	change24h: number | null;
	trendPct?: number | null;
	sparkline: number[];
	corridorMileSpan: { startMile: number | null; endMile: number | null };
	/** Parent section name — passed by CorridorMapColumn when parentSectionId is set */
	parentSectionName?: string | null;
}

interface SectionTileProps {
	/** Compact section data from the CorridorView response */
	section: SectionTileSection;
	/** Controlled expansion state */
	expanded: boolean;
	onToggle: () => void;
	/** Tracks this tile's DOM rect for viewport-center math */
	tileRefCallback?: (el: HTMLDivElement | null) => void;
	/** Visual: this tile is the currently active one (viewport center inside it) */
	isActive?: boolean;
	/** All corridor access points — filtered by SectionDetailBody to this section's mile span */
	accessPoints?: AccessPointData[];
	/** All corridor shuttle businesses — passed through to SectionDetailBody (corridor-scoped, not filtered) */
	shuttleBusinesses?: any[];
	/** All corridor outfitters — passed through to SectionDetailBody (corridor-scoped, not filtered) */
	outfitters?: any[];
}

// --- Style helpers ---

const eyebrowStyle: React.CSSProperties = {
	fontFamily: 'var(--font-mono)',
	fontSize: 10,
	letterSpacing: '0.14em',
	textTransform: 'uppercase',
	color: 'var(--river-600)',
	fontWeight: 500,
};

const subEyebrowStyle: React.CSSProperties = {
	fontFamily: 'var(--font-mono)',
	fontSize: 10,
	letterSpacing: '0.12em',
	textTransform: 'uppercase',
	color: 'var(--ink-3)',
	fontWeight: 500,
};

/**
 * Build the eyebrow line: "RIVER · CLASS IV · 5.3 MI" (or similar).
 */
function buildEyebrow(section: SectionTileSection): string {
	const parts: string[] = [];
	if (section.river) parts.push(section.river.toUpperCase());
	if (section.classification) parts.push(section.classification.toUpperCase());
	if (section.lengthMiles != null) parts.push(`${section.lengthMiles} MI`);
	return parts.join(' · ');
}

function toTrendChipTrend(trend: string): 'up' | 'down' | 'stable' {
	if (trend === 'rising') return 'up';
	if (trend === 'falling') return 'down';
	return 'stable';
}

// --- Component ---

export function SectionTile({
	section,
	expanded,
	onToggle,
	tileRefCallback,
	isActive = false,
	accessPoints,
	shuttleBusinesses,
	outfitters,
}: SectionTileProps) {
	const designStatus = mapStatusToDesign(section.status);
	const statusLabel = section.statusLabel ?? STATUS_LABEL[designStatus] ?? designStatus;
	const trendForChip = toTrendChipTrend(section.trend);
	const trendPct = section.trendPct ?? 0;
	const eyebrow = buildEyebrow(section);

	const borderColor = isActive ? 'var(--river-300)' : 'var(--rule)';

	const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		if (e.key === ' ' || e.key === 'Enter') {
			e.preventDefault();
			onToggle();
		}
	};

	return (
		<div
			ref={tileRefCallback}
			role="button"
			tabIndex={0}
			onClick={onToggle}
			onKeyDown={handleKeyDown}
			style={{
				position: 'relative',
				background: 'var(--bg-card)',
				border: `1px solid ${borderColor}`,
				borderRadius: 'var(--r-lg)',
				boxShadow: isActive ? '0 0 0 2px var(--river-200)' : 'var(--shadow-card)',
				overflow: 'hidden',
				transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background 0.15s ease',
				cursor: 'pointer',
			}}
			onMouseEnter={e => {
				if (!expanded) {
					(e.currentTarget as HTMLDivElement).style.background = 'var(--bg-raised)';
				}
			}}
			onMouseLeave={e => {
				(e.currentTarget as HTMLDivElement).style.background = 'var(--bg-card)';
			}}
		>
			{/* Header row — always visible */}
			<div style={{
				display: 'flex',
				alignItems: 'stretch',
				minHeight: 80,
				padding: '14px 16px',
			}}>
				{/* Section info */}
				<div style={{
					flex: 1,
					minWidth: 0,
					display: 'flex',
					flexDirection: 'column',
					gap: 6,
				}}>
					{/* Eyebrow: parent indicator or river · class · miles */}
					{section.parentSectionId && section.parentSectionName ? (
						<div>
							<div style={subEyebrowStyle}>{section.parentSectionName} · sub-section</div>
						</div>
					) : eyebrow ? (
						<div style={eyebrowStyle}>{eyebrow}</div>
					) : null}

					{/* Section name */}
					<h2 style={{
						margin: 0,
						fontSize: 16,
						fontWeight: 700,
						letterSpacing: '-0.02em',
						color: 'var(--ink-0)',
						lineHeight: 1.2,
						display: 'flex',
						alignItems: 'center',
						gap: 6,
					}}>
						{section.parentSectionId && (
							<span aria-hidden="true" style={{ color: 'var(--ink-3)', fontWeight: 400, fontSize: 14 }}>↳</span>
						)}
						{section.name}
					</h2>

					{/* Stat row */}
					<div style={{
						display: 'flex',
						alignItems: 'center',
						flexWrap: 'wrap',
						gap: 10,
						marginTop: 2,
					}}>
						<BigCFS cfs={section.currentFlow} size="card" />
						<StatusPill status={designStatus} label={statusLabel} size="sm" />
						<TrendChip trend={trendForChip} pct={trendPct} size="sm" />
						{section.sparkline.length > 1 && (
							<Sparkline
								data={section.sparkline}
								status={designStatus}
								width={140}
								height={32}
								filled
								showLast
							/>
						)}
					</div>
				</div>
			</div>

			{/* Expanded body — lazy renders the full section detail */}
			{expanded && (
				<div
					style={{
						position: 'relative',
						padding: '0 20px 20px',
						borderTop: '1px solid var(--rule)',
					}}
					onClick={e => e.stopPropagation()}
					onKeyDown={e => e.stopPropagation()}
				>
					{/* X close button */}
					<button
						type="button"
						aria-label="Close section"
						onClick={(e) => {
							e.stopPropagation();
							onToggle();
						}}
						style={{
							position: 'absolute',
							top: 12,
							right: 12,
							width: 28,
							height: 28,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							background: 'var(--bg-raised)',
							border: '1px solid var(--rule)',
							borderRadius: 6,
							cursor: 'pointer',
							color: 'var(--ink-2)',
							fontSize: 14,
							lineHeight: 1,
							zIndex: 2,
							transition: 'background 0.15s ease, color 0.15s ease',
						}}
						onMouseEnter={e => {
							(e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-sunken)';
							(e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-0)';
						}}
						onMouseLeave={e => {
							(e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-raised)';
							(e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-2)';
						}}
					>
						✕
					</button>
					<SectionDetailBody
						sectionId={section.id}
						hideHero
						accessPoints={accessPoints}
						corridorMileSpan={section.corridorMileSpan}
						shuttleBusinesses={shuttleBusinesses}
						outfitters={outfitters}
					/>
				</div>
			)}
		</div>
	);
}
