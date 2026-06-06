import { useState } from 'react';
import { Link } from 'react-router-dom';
import { STATUS_COLORS } from '../constants';
import { BigCFS } from './BigCFS';
import { FlowGauge } from './FlowGauge';
import { StatusPill } from './StatusPill';
import { TrendChip } from './TrendChip';
import { Icon } from './Icon';
import { SectionHead } from './SectionHead';
import { ForecastBand } from './ForecastBand';
import { ContextStrip } from './ContextStrip';
import { WeatherStrip } from './WeatherStrip';
import { PastTripsStrip } from './PastTripsStrip';
import { DesktopFlowChart } from '../desktop/DesktopFlowChart';
import { useRiverDetail } from '../hooks/useRiverDetail';
import { useAuth } from '../hooks/useAuth';
import { AccessPointCard, type AccessPointData } from './AccessPointCard';
import { RapidCard, type RapidData } from './RapidCard';
import { ShuttleBusinessCard, type ShuttleBusinessData } from './ShuttleBusinessCard';
import { OutfitterCard, type OutfitterData } from './OutfitterCard';
import { EditContributionForm } from './EditContributionForm';
import { RequireCapability } from './RequireCapability';
import { BountyCard } from './BountyCard';
import { PostBountyForm } from './PostBountyForm';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import type { BountyListItem } from '../types';

const detailBtn: React.CSSProperties = {
	display: 'inline-flex', alignItems: 'center', gap: 6,
	padding: '8px 12px', borderRadius: 'var(--r-md)',
	background: 'var(--bg-card)', color: 'var(--ink-1)',
	border: '1px solid var(--rule)',
	fontSize: 13, fontWeight: 600,
};
const statCard: React.CSSProperties = {
	padding: 18, borderRadius: 'var(--r-lg)',
	background: 'var(--bg-raised)', border: '1px solid var(--rule)',
};
const statLabel: React.CSSProperties = {
	fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
	textTransform: 'uppercase', color: 'var(--river-600)', fontWeight: 500,
};

interface SectionDetailBodyProps {
	sectionId: string;
	/** When true, hide the title + Save/Alerts/Log buttons + nearestTown row.
	 * Use this when embedded inside a tile where the tile's compact header
	 * already shows the title. */
	hideHero?: boolean;
	/** Access points for the whole corridor — filtered to this section's mile span. */
	accessPoints?: AccessPointData[];
	/** This section's river-mile span for filtering APs. */
	corridorMileSpan?: { startMile: number | null; endMile: number | null } | null;
	/** Corridor-scoped shuttle businesses (not section-filtered). */
	shuttleBusinesses?: ShuttleBusinessData[];
	/** Corridor-scoped outfitters (not section-filtered). */
	outfitters?: OutfitterData[];
}

/**
 * The body of DesktopDetail, extracted so it can be embedded inside SectionTile
 * without duplicating logic. Handles its own data fetch — React Query dedupes
 * the request when DesktopDetail (thin wrapper) already fetched the same key.
 *
 * Loading state: if sectionId resolves to no data this component renders a
 * subtle spinner inline rather than a full-page skeleton, which is appropriate
 * for the tile-embedded context. DesktopDetail owns the full-page loading
 * skeleton for the standalone detail page.
 */
export function SectionDetailBody({
	sectionId,
	hideHero = false,
	accessPoints,
	corridorMileSpan,
	shuttleBusinesses,
	outfitters,
}: SectionDetailBodyProps) {
	const { data: detail, isLoading } = useRiverDetail(sectionId);
	const { isAuthenticated } = useAuth();
	const [range, setRange] = useState(30);
	const [editingApId, setEditingApId] = useState<string | null>(null);
	const [editingRapidId, setEditingRapidId] = useState<string | null>(null);
	const [addingRapid, setAddingRapid] = useState(false);
	const [editingShuttleId, setEditingShuttleId] = useState<string | null>(null);
	const [addingShuttle, setAddingShuttle] = useState(false);
	const [editingOutfitterId, setEditingOutfitterId] = useState<string | null>(null);
	const [addingOutfitter, setAddingOutfitter] = useState(false);
	const [addingBounty, setAddingBounty] = useState(false);

	if (isLoading || !detail) {
		return (
			<div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
				Loading…
			</div>
		);
	}

	const c = STATUS_COLORS[detail.status];
	const cutoff = Date.now() - range * 24 * 3600_000;
	const histSlice = detail.history.filter(p => p.t >= cutoff);

	const fcPct = (() => {
		if (!detail.forecastBand || !detail.now) return null;
		const last = detail.forecastBand.center[detail.forecastBand.center.length - 1];
		return Math.round(((last - detail.now) / detail.now) * 100);
	})();

	const fcVerbal = (() => {
		if (!detail.forecastBand) return null;
		const d = detail.forecastDirection;
		if (d === 'rising') return (fcPct ?? 0) > 20 ? 'Likely rising' : 'Trending up';
		if (d === 'falling') return 'Dropping over the next two weeks';
		if (d === 'stable') return 'Stable, no major changes expected';
		if (d === 'volatile') return 'Volatile — daily swings ahead';
		if (d === 'peak') return 'Near peak, then easing back';
		return 'Forecast';
	})();

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
			{/* Hero — conditionally shown */}
			{!hideHero && (
				<div>
					<div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--river-600)', fontWeight: 500 }}>
						{detail.river} · {detail.classification}{detail.miles ? ` · ${detail.miles} mi` : ''}
					</div>
					<div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginTop: 4, flexWrap: 'wrap' }}>
						<h1 style={{ margin: 0, fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--ink-0)', minWidth: 0, wordBreak: 'break-word' }}>
							{detail.section}
						</h1>
						<div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
							{isAuthenticated && (
								<Link
									to={`/log/new?sectionId=${encodeURIComponent(sectionId)}`}
									style={{
										...detailBtn,
										textDecoration: 'none',
										border: '1px solid var(--river-700)',
										background: 'var(--river-700)',
										color: '#fff',
									}}
								>+ Log a trip</Link>
							)}
							<button style={detailBtn}><Icon name="star" size={16} />Save</button>
							<button style={detailBtn}><Icon name="bell" size={16} />Alerts</button>
						</div>
					</div>
					{detail.nearestTown && (
						<div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
							<Icon name="pin" size={12} />
							{detail.nearestTown}
						</div>
					)}
				</div>
			)}

			{/* Stat strip */}
			<div style={{
				display: 'grid',
				gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
				gap: 16, alignItems: 'start',
			}}>
				<div style={{
					gridColumn: 'span 2', minWidth: 0,
					padding: 20, borderRadius: 'var(--r-lg)',
					border: `1px solid ${c.line}`, background: c.bg,
					position: 'relative', overflow: 'hidden',
				}}>
					<div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: c.fg, fontWeight: 600 }}>
						Current flow
					</div>
					<div style={{
						marginTop: 8,
						display: 'flex', flexWrap: 'wrap',
						alignItems: 'baseline', justifyContent: 'space-between',
						columnGap: 14, rowGap: 10,
					}}>
						<div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
							{detail.now != null
								? <FlowGauge currentFlow={detail.now} thresholds={detail.thresholds} size={140} />
								: <BigCFS cfs={null} size="lg" color={c.fg} />}
						</div>
						<div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
							<StatusPill status={detail.status} label={detail.statusLabel} size="md" />
							<TrendChip trend={detail.trend} pct={detail.trendPct} size="md" />
						</div>
					</div>
					{detail.resolvedBand?.description && (
						<div style={{
							marginTop: 14, paddingTop: 14,
							borderTop: `1px solid ${c.line}`,
							fontSize: 13, lineHeight: 1.55, color: 'var(--ink-1)',
						}}>
							{detail.resolvedBand.description}
						</div>
					)}
				</div>
				<div style={{ ...statCard, minWidth: 0 }}>
					<div style={statLabel}>Good band</div>
					<div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 500, color: 'var(--ink-0)', letterSpacing: '-0.02em', marginTop: 6 }}>
						{detail.thresholds.idealLo.toLocaleString()}–{detail.thresholds.idealHi.toLocaleString()}
						<span style={{ fontSize: 12, color: 'var(--ink-3)', marginLeft: 4 }}>cfs</span>
					</div>
					<div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>Where this section runs at its best.</div>
				</div>
			</div>

			{/* Chart */}
			<div>
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
					<SectionHead title="Flow history" eyebrow="Recent" />
					<div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--bg-sunken)', borderRadius: 'var(--r-pill)', flexWrap: 'wrap' }}>
						{[7, 30, 90, 180, 360].map(d => (
							<button key={d} onClick={() => setRange(d)} style={{
								padding: '6px 12px', borderRadius: 'var(--r-pill)',
								background: range === d ? 'var(--bg-card)' : 'transparent',
								color: range === d ? 'var(--ink-0)' : 'var(--ink-3)',
								border: range === d ? '1px solid var(--rule)' : '1px solid transparent',
								fontSize: 12, fontWeight: 600,
								boxShadow: range === d ? 'var(--shadow-press)' : 'none',
							}}>{d} days</button>
						))}
					</div>
				</div>
				<div style={{ background: 'var(--bg-raised)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', padding: 18 }}>
					<DesktopFlowChart data={histSlice} days={range} status={detail.status} thresholds={detail.thresholds} />
				</div>
			</div>

			{/* Forecast + summary + context */}
			<div style={{
				display: 'grid',
				gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
				gap: 16,
			}}>
				<div>
					<SectionHead title="14-day forecast" eyebrow="Outlook" />
					<div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
						{detail.forecastBand && detail.history.length > 1 ? (
							<div style={{
								background: 'var(--bg-card)', border: '1px solid var(--rule)',
								borderRadius: 'var(--r-lg)', padding: 16,
								display: 'flex', flexDirection: 'column', gap: 14,
							}}>
								<div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
									<div>
										<div style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink-0)', letterSpacing: '-0.01em' }}>{fcVerbal}</div>
										<div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 6, lineHeight: 1.5 }}>
											Confidence band reflects 80% likely range based on snowpack, temperature, and recent flow.
										</div>
									</div>
									{fcPct !== null && (
										<div style={{
											padding: '6px 10px', borderRadius: 'var(--r-md)',
											background: c.bg, color: c.fg,
											fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
											flexShrink: 0,
										}}>
											{fcPct > 0 ? '+' : ''}{fcPct}%
										</div>
									)}
								</div>
								<ForecastBand history={detail.history.slice(-30).map(p => p.v)} forecast={detail.forecastBand} width={500} height={110} status={detail.status} />
								<div style={{
									display: 'flex', justifyContent: 'space-between',
									fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.06em',
								}}>
									<span>30d history</span>
									<span style={{ color: 'var(--ink-4)' }}>· now ·</span>
									<span>14d forecast</span>
								</div>
							</div>
						) : (
							<div style={{ padding: 16, background: 'var(--bg-sunken)', borderRadius: 'var(--r-lg)', fontSize: 13, color: 'var(--ink-3)' }}>
								No flow forecast available yet. Trigger one from the admin page or API.
							</div>
						)}
						{detail.weatherForecast?.length > 0 && (
							<div style={{
								background: 'var(--bg-card)', border: '1px solid var(--rule)',
								borderRadius: 'var(--r-lg)', padding: 16,
								display: 'flex', flexDirection: 'column', gap: 10,
							}}>
								<div style={{
									fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
									textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 500,
								}}>
									Weather · Open-Meteo · {detail.weatherForecast.length}-day
								</div>
								<WeatherStrip weather={detail.weatherForecast} />
							</div>
						)}
					</div>
				</div>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
					<div>
						<SectionHead title="What's happening" eyebrow="Briefing" />
						<div style={{ marginTop: 12, padding: 16, background: 'var(--bg-tint)', border: '1px solid var(--river-100)', borderRadius: 'var(--r-lg)', fontSize: 13, lineHeight: 1.6, color: 'var(--ink-1)' }}>
							{detail.notes || 'No description available for this section.'}
						</div>
					</div>
					<div>
						<SectionHead title="Context" eyebrow="Drivers" />
						<div style={{ marginTop: 12 }}>
							<ContextStrip
								snowpackPct={detail.snowpackPct}
								damControlled={detail.damControlled}
								riverName={detail.river}
								snowpack={detail.snowpack}
								reservoirs={detail.reservoirs}
							/>
						</div>
					</div>
				</div>
			</div>

			{/* Past trips (auth-only, last) */}
			{isAuthenticated && (
				<PastTripsStrip
					sectionId={sectionId}
					logs={detail.myLogs}
					totalCount={detail.myLogTotalCount}
					sectionThresholds={detail.flowThresholds}
				/>
			)}

			{/* Community — bounties + access points + rapids + shuttles + outfitters */}
			<CommunitySection
				sectionId={sectionId}
				corridorId={detail.corridorId}
				accessPoints={accessPoints}
				corridorMileSpan={corridorMileSpan}
				editingApId={editingApId}
				setEditingApId={setEditingApId}
				rapids={detail.rapids as RapidData[]}
				editingRapidId={editingRapidId}
				setEditingRapidId={setEditingRapidId}
				addingRapid={addingRapid}
				setAddingRapid={setAddingRapid}
				shuttleBusinesses={shuttleBusinesses}
				editingShuttleId={editingShuttleId}
				setEditingShuttleId={setEditingShuttleId}
				addingShuttle={addingShuttle}
				setAddingShuttle={setAddingShuttle}
				outfitters={outfitters}
				editingOutfitterId={editingOutfitterId}
				setEditingOutfitterId={setEditingOutfitterId}
				addingOutfitter={addingOutfitter}
				setAddingOutfitter={setAddingOutfitter}
				bounties={detail.bounties ?? []}
				addingBounty={addingBounty}
				setAddingBounty={setAddingBounty}
			/>
		</div>
	);
}

// ---------------------------------------------------------------------------
// CommunitySection — access points for this section with contribution UI
// ---------------------------------------------------------------------------

interface CommunitySectionProps {
	sectionId: string;
	corridorId?: string | null;
	accessPoints?: AccessPointData[];
	corridorMileSpan?: { startMile: number | null; endMile: number | null } | null;
	editingApId: string | null;
	setEditingApId: (id: string | null) => void;
	rapids?: RapidData[];
	editingRapidId: string | null;
	setEditingRapidId: (id: string | null) => void;
	addingRapid: boolean;
	setAddingRapid: (v: boolean) => void;
	shuttleBusinesses?: ShuttleBusinessData[];
	editingShuttleId: string | null;
	setEditingShuttleId: (id: string | null) => void;
	addingShuttle: boolean;
	setAddingShuttle: (v: boolean) => void;
	outfitters?: OutfitterData[];
	editingOutfitterId: string | null;
	setEditingOutfitterId: (id: string | null) => void;
	addingOutfitter: boolean;
	setAddingOutfitter: (v: boolean) => void;
	bounties?: BountyListItem[];
	addingBounty: boolean;
	setAddingBounty: (v: boolean) => void;
}

function CommunitySection({
	sectionId,
	corridorId,
	accessPoints,
	corridorMileSpan,
	editingApId,
	setEditingApId,
	rapids = [],
	editingRapidId,
	setEditingRapidId,
	addingRapid,
	setAddingRapid,
	shuttleBusinesses = [],
	editingShuttleId,
	setEditingShuttleId,
	addingShuttle,
	setAddingShuttle,
	outfitters = [],
	editingOutfitterId,
	setEditingOutfitterId,
	addingOutfitter,
	setAddingOutfitter,
	bounties = [],
	addingBounty,
	setAddingBounty,
}: CommunitySectionProps) {
	// Filter APs to those whose riverMile falls in this section's mile span.
	// If the AP has no riverMile, fall back to no filtering (include all passed-in APs).
	const sectionAps: AccessPointData[] = (() => {
		if (!accessPoints || accessPoints.length === 0) return [];
		const start = corridorMileSpan?.startMile;
		const end = corridorMileSpan?.endMile;
		if (start == null || end == null) return accessPoints;
		return accessPoints.filter(ap => {
			if (ap.riverMile == null) return false;
			return ap.riverMile >= start && ap.riverMile <= end;
		});
	})();

	const hasContent = sectionAps.length > 0 || rapids.length > 0 || shuttleBusinesses.length > 0 || outfitters.length > 0 || bounties.length > 0;
	// Always render if addingBounty so the form shows even with no existing data
	if (!hasContent && !addingBounty) return null;

	const suggestEditBtnStyle: React.CSSProperties = {
		marginTop: 6,
		padding: '5px 12px',
		borderRadius: 'var(--r-md)',
		background: 'transparent',
		color: 'var(--river-600)',
		border: '1px solid var(--river-200)',
		fontSize: 12,
		fontWeight: 600,
		cursor: 'pointer',
	};
	const formWrapStyle: React.CSSProperties = {
		marginTop: 10,
		padding: '14px 16px',
		background: 'var(--bg-raised)',
		border: '1px solid var(--rule)',
		borderRadius: 'var(--r-lg)',
	};
	const formEyebrowStyle: React.CSSProperties = {
		fontFamily: 'var(--font-mono)',
		fontSize: 10,
		letterSpacing: '0.12em',
		textTransform: 'uppercase',
		color: 'var(--ink-3)',
		fontWeight: 500,
		marginBottom: 12,
	};

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

			{/* Bounties sub-block */}
			<div>
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
					<SectionHead title="Bounties" eyebrow="Community" />
					<RequireCapability capability="canFund">
						{!addingBounty && (
							<button
								type="button"
								onClick={() => setAddingBounty(true)}
								style={{
									padding: '5px 12px',
									borderRadius: 'var(--r-md)',
									background: 'var(--river-700)',
									color: '#fff',
									border: 'none',
									fontSize: 12,
									fontWeight: 600,
									cursor: 'pointer',
								}}
							>
								+ Post a bounty
							</button>
						)}
					</RequireCapability>
				</div>

				{addingBounty && (
					<div style={{ marginTop: 12, padding: '14px 16px', background: 'var(--bg-raised)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)' }}>
						<div style={{
							fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
							textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 500, marginBottom: 12,
						}}>
							Post new bounty
						</div>
						<PostBountyForm
							sectionId={sectionId}
							corridorId={corridorId}
							onDone={() => setAddingBounty(false)}
						/>
					</div>
				)}

				{bounties.length > 0 && (
					<div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
						{bounties.map(b => (
							<BountyCard key={b.id} bounty={b} sectionId={sectionId} />
						))}
					</div>
				)}

				{bounties.length === 0 && !addingBounty && (
					<div style={{ marginTop: 8, fontSize: 13, color: 'var(--ink-3)', fontStyle: 'italic' }}>
						No bounties posted for this section yet.{' '}
						<RequireCapability capability="canFund">
							<button type="button" onClick={() => setAddingBounty(true)} style={{ background: 'none', border: 'none', color: 'var(--river-600)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0, fontStyle: 'normal' }}>
								Post one.
							</button>
						</RequireCapability>
					</div>
				)}
			</div>

			{/* Access points sub-block */}
			{sectionAps.length > 0 && (
				<div>
					<SectionHead title="Access points" eyebrow="Community" />
					<div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
						{sectionAps.map(ap => (
							<div key={ap.id}>
								<AccessPointCard ap={ap} />

								{editingApId === ap.id ? (
									<div style={formWrapStyle}>
										<div style={formEyebrowStyle}>Suggest edit · {ap.name}</div>
										<EditContributionForm
											entityType="access-point"
											entityId={ap.id}
											op="edit"
											initial={ap as Record<string, any>}
											onDone={() => setEditingApId(null)}
										/>
									</div>
								) : (
									<RequireCapability capability="canContribute">
										<button type="button" onClick={() => setEditingApId(ap.id)} style={suggestEditBtnStyle}>
											Suggest an edit
										</button>
									</RequireCapability>
								)}

								<RequireCapability capability="isAdmin">
									<AdminContributionControls entityType="access-point" entityId={ap.id} />
								</RequireCapability>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Rapids sub-block */}
			<div>
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
					<SectionHead title="Rapids" eyebrow="Community" />
					<RequireCapability capability="canContribute">
						{!addingRapid && (
							<button
								type="button"
								onClick={() => { setAddingRapid(true); setEditingRapidId(null); }}
								style={{
									padding: '5px 12px',
									borderRadius: 'var(--r-md)',
									background: 'var(--river-700)',
									color: '#fff',
									border: 'none',
									fontSize: 12,
									fontWeight: 600,
									cursor: 'pointer',
								}}
							>
								+ Add a rapid
							</button>
						)}
					</RequireCapability>
				</div>

				{/* Add-rapid form */}
				{addingRapid && (
					<div style={{ ...formWrapStyle, marginTop: 12 }}>
						<div style={formEyebrowStyle}>Add new rapid</div>
						<EditContributionForm
							entityType="rapid"
							entityId={null}
							op="create"
							onDone={() => setAddingRapid(false)}
						/>
					</div>
				)}

				{rapids.length > 0 && (
					<div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
						{rapids.map(rapid => (
							<div key={rapid.id}>
								<RapidCard rapid={rapid} />

								{editingRapidId === rapid.id ? (
									<div style={formWrapStyle}>
										<div style={formEyebrowStyle}>Suggest edit · {rapid.name}</div>
										<EditContributionForm
											entityType="rapid"
											entityId={rapid.id}
											op="edit"
											initial={rapid as Record<string, any>}
											onDone={() => setEditingRapidId(null)}
										/>
									</div>
								) : (
									<RequireCapability capability="canContribute">
										<button type="button" onClick={() => { setEditingRapidId(rapid.id); setAddingRapid(false); }} style={suggestEditBtnStyle}>
											Suggest an edit
										</button>
									</RequireCapability>
								)}

								<RequireCapability capability="isAdmin">
									<AdminContributionControls entityType="rapid" entityId={rapid.id} />
								</RequireCapability>
							</div>
						))}
					</div>
				)}

				{rapids.length === 0 && !addingRapid && (
					<div style={{ marginTop: 8, fontSize: 13, color: 'var(--ink-3)', fontStyle: 'italic' }}>
						No rapids recorded yet.{' '}
						<RequireCapability capability="canContribute">
							<button type="button" onClick={() => setAddingRapid(true)} style={{ background: 'none', border: 'none', color: 'var(--river-600)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0, fontStyle: 'normal' }}>
								Add one.
							</button>
						</RequireCapability>
					</div>
				)}
			</div>

			{/* Shuttles sub-block */}
			<div>
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
					<SectionHead title="Shuttles" eyebrow="Community" />
					<RequireCapability capability="canContribute">
						{!addingShuttle && (
							<button
								type="button"
								onClick={() => { setAddingShuttle(true); setEditingShuttleId(null); }}
								style={{
									padding: '5px 12px',
									borderRadius: 'var(--r-md)',
									background: 'var(--river-700)',
									color: '#fff',
									border: 'none',
									fontSize: 12,
									fontWeight: 600,
									cursor: 'pointer',
								}}
							>
								+ Add shuttle service
							</button>
						)}
					</RequireCapability>
				</div>

				{/* Add-shuttle form */}
				{addingShuttle && (
					<div style={{ ...formWrapStyle, marginTop: 12 }}>
						<div style={formEyebrowStyle}>Add new shuttle service</div>
						<EditContributionForm
							entityType="shuttle-business"
							entityId={null}
							op="create"
							onDone={() => setAddingShuttle(false)}
						/>
					</div>
				)}

				{shuttleBusinesses.length > 0 && (
					<div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
						{shuttleBusinesses.map(business => (
							<div key={business.id}>
								<ShuttleBusinessCard business={business} />

								{editingShuttleId === business.id ? (
									<div style={formWrapStyle}>
										<div style={formEyebrowStyle}>Suggest edit · {business.name}</div>
										<EditContributionForm
											entityType="shuttle-business"
											entityId={business.id}
											op="edit"
											initial={business as Record<string, any>}
											onDone={() => setEditingShuttleId(null)}
										/>
									</div>
								) : (
									<RequireCapability capability="canContribute">
										<button type="button" onClick={() => { setEditingShuttleId(business.id); setAddingShuttle(false); }} style={suggestEditBtnStyle}>
											Suggest an edit
										</button>
									</RequireCapability>
								)}

								<RequireCapability capability="isAdmin">
									<AdminContributionControls entityType="shuttle-business" entityId={business.id} />
								</RequireCapability>
							</div>
						))}
					</div>
				)}

				{shuttleBusinesses.length === 0 && !addingShuttle && (
					<div style={{ marginTop: 8, fontSize: 13, color: 'var(--ink-3)', fontStyle: 'italic' }}>
						No shuttle services listed yet.{' '}
						<RequireCapability capability="canContribute">
							<button type="button" onClick={() => setAddingShuttle(true)} style={{ background: 'none', border: 'none', color: 'var(--river-600)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0, fontStyle: 'normal' }}>
								Add one.
							</button>
						</RequireCapability>
					</div>
				)}
			</div>

			{/* Outfitters sub-block */}
			<div>
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
					<SectionHead title="Outfitters" eyebrow="Community" />
					<RequireCapability capability="canContribute">
						{!addingOutfitter && (
							<button
								type="button"
								onClick={() => { setAddingOutfitter(true); setEditingOutfitterId(null); }}
								style={{
									padding: '5px 12px',
									borderRadius: 'var(--r-md)',
									background: 'var(--river-700)',
									color: '#fff',
									border: 'none',
									fontSize: 12,
									fontWeight: 600,
									cursor: 'pointer',
								}}
							>
								+ Add outfitter
							</button>
						)}
					</RequireCapability>
				</div>

				{/* Add-outfitter form */}
				{addingOutfitter && (
					<div style={{ ...formWrapStyle, marginTop: 12 }}>
						<div style={formEyebrowStyle}>Add new outfitter</div>
						<EditContributionForm
							entityType="outfitter"
							entityId={null}
							op="create"
							onDone={() => setAddingOutfitter(false)}
						/>
					</div>
				)}

				{outfitters.length > 0 && (
					<div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
						{outfitters.map(outfitter => (
							<div key={outfitter.id}>
								<OutfitterCard outfitter={outfitter} />

								{editingOutfitterId === outfitter.id ? (
									<div style={formWrapStyle}>
										<div style={formEyebrowStyle}>Suggest edit · {outfitter.name}</div>
										<EditContributionForm
											entityType="outfitter"
											entityId={outfitter.id}
											op="edit"
											initial={outfitter as Record<string, any>}
											onDone={() => setEditingOutfitterId(null)}
										/>
									</div>
								) : (
									<RequireCapability capability="canContribute">
										<button type="button" onClick={() => { setEditingOutfitterId(outfitter.id); setAddingOutfitter(false); }} style={suggestEditBtnStyle}>
											Suggest an edit
										</button>
									</RequireCapability>
								)}

								<RequireCapability capability="isAdmin">
									<AdminContributionControls entityType="outfitter" entityId={outfitter.id} />
								</RequireCapability>
							</div>
						))}
					</div>
				)}

				{outfitters.length === 0 && !addingOutfitter && (
					<div style={{ marginTop: 8, fontSize: 13, color: 'var(--ink-3)', fontStyle: 'italic' }}>
						No outfitters listed yet.{' '}
						<RequireCapability capability="canContribute">
							<button type="button" onClick={() => setAddingOutfitter(true)} style={{ background: 'none', border: 'none', color: 'var(--river-600)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0, fontStyle: 'normal' }}>
								Add one.
							</button>
						</RequireCapability>
					</div>
				)}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// AdminContributionControls — fetches pending contributions for any entity
// ---------------------------------------------------------------------------

function AdminContributionControls({ entityType, entityId }: { entityType: string; entityId: string }) {
	const qc = useQueryClient();
	const { data } = useQuery({
		queryKey: ['contributions', entityType, entityId],
		queryFn: () => api.listContributions(entityType, entityId),
		staleTime: 30_000,
	});

	const pending = (data?.contributions ?? []).filter((c: any) => c.verificationState === 'pending');
	if (pending.length === 0) return null;

	return (
		<div style={{
			marginTop: 8,
			padding: '10px 14px',
			background: 'var(--amber-50, #fffbeb)',
			border: '1px solid var(--amber-200, #fde68a)',
			borderRadius: 'var(--r-lg)',
			display: 'flex',
			flexDirection: 'column',
			gap: 8,
		}}>
			<div style={{
				fontFamily: 'var(--font-mono)',
				fontSize: 10,
				letterSpacing: '0.12em',
				textTransform: 'uppercase',
				color: 'var(--amber-700, #b45309)',
				fontWeight: 600,
			}}>
				{pending.length} pending contribution{pending.length > 1 ? 's' : ''}
			</div>
			{pending.map((c: any) => (
				<PendingContributionRow key={c.id} contribution={c} onAction={() => {
					qc.invalidateQueries({ queryKey: ['contributions', entityType, entityId] });
					qc.invalidateQueries({ queryKey: ['corridor'] });
					qc.invalidateQueries({ queryKey: ['riverDetail'] });
				}} />
			))}
		</div>
	);
}

function PendingContributionRow({ contribution: c, onAction }: { contribution: any; onAction: () => void }) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const act = async (action: 'verify' | 'reject' | 'dispute') => {
		setBusy(true);
		setError(null);
		try {
			await api.verifyContribution(c.id, action);
			onAction();
		} catch (e) {
			setError(String((e as Error)?.message ?? 'Error'));
		} finally {
			setBusy(false);
		}
	};

	let changesetSummary = '';
	try {
		const cs = JSON.parse(c.changesetJson ?? '{}');
		const keys = Object.keys(cs.after ?? {});
		changesetSummary = keys.length > 0 ? keys.join(', ') : '(no changes)';
	} catch {}

	return (
		<div style={{ fontSize: 12, color: 'var(--ink-1)' }}>
			<div style={{ marginBottom: 4 }}>
				<span style={{ color: 'var(--ink-3)' }}>v{c.version} · </span>
				{changesetSummary}
			</div>
			<div style={{ display: 'flex', gap: 8 }}>
				<button
					type="button"
					disabled={busy}
					onClick={() => act('verify')}
					style={{
						padding: '4px 10px',
						borderRadius: 'var(--r-md)',
						background: 'var(--green-600, #16a34a)',
						color: '#fff',
						border: 'none',
						fontSize: 11,
						fontWeight: 600,
						cursor: busy ? 'wait' : 'pointer',
					}}
				>Verify</button>
				<button
					type="button"
					disabled={busy}
					onClick={() => act('reject')}
					style={{
						padding: '4px 10px',
						borderRadius: 'var(--r-md)',
						background: 'transparent',
						color: 'var(--ink-2)',
						border: '1px solid var(--rule)',
						fontSize: 11,
						fontWeight: 600,
						cursor: busy ? 'wait' : 'pointer',
					}}
				>Reject</button>
			</div>
			{error && <div style={{ marginTop: 4, color: 'var(--red-600, #dc2626)', fontSize: 11 }}>{error}</div>}
		</div>
	);
}
