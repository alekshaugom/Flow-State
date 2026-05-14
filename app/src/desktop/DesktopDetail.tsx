import { useState } from 'react';
import { STATUS_COLORS } from '../constants';
import { BigCFS } from '../components/BigCFS';
import { StatusPill } from '../components/StatusPill';
import { TrendChip } from '../components/TrendChip';
import { Icon } from '../components/Icon';
import { SectionHead } from '../components/SectionHead';
import { ForecastStrip } from '../components/ForecastStrip';
import { ForecastBand } from '../components/ForecastBand';
import { ContextStrip } from '../components/ContextStrip';
import { DesktopFlowChart } from './DesktopFlowChart';
import { useRiverDetail } from '../hooks/useRiverDetail';

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

interface DesktopDetailProps {
	sectionId: string;
}

export function DesktopDetail({ sectionId }: DesktopDetailProps) {
	const { data: detail, isLoading } = useRiverDetail(sectionId);
	const [range, setRange] = useState(30);

	if (isLoading || !detail) {
		return <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>Loading section data...</div>;
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
			{/* Hero */}
			<div>
				<div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--river-600)', fontWeight: 500 }}>
					<span style={{ color: 'var(--ink-4)' }}>{'// '}</span>
					{detail.river} · {detail.classification}{detail.miles ? ` · ${detail.miles} mi` : ''}
				</div>
				<div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginTop: 4, flexWrap: 'wrap' }}>
					<h1 style={{ margin: 0, fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--ink-0)', minWidth: 0, wordBreak: 'break-word' }}>
						{detail.section}
					</h1>
					<div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
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
						<span style={{ opacity: 0.6 }}>{'// '}</span>Current flow
					</div>
					<div style={{
						marginTop: 8,
						display: 'flex', flexWrap: 'wrap',
						alignItems: 'baseline', justifyContent: 'space-between',
						columnGap: 14, rowGap: 10,
					}}>
						<BigCFS cfs={detail.now} size="lg" color={c.fg} />
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
					<div style={statLabel}><span style={{ color: 'var(--ink-4)' }}>{'// '}</span>Ideal band</div>
					<div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 500, color: 'var(--ink-0)', letterSpacing: '-0.02em', marginTop: 6 }}>
						{detail.thresholds.idealLo.toLocaleString()}–{detail.thresholds.idealHi.toLocaleString()}
						<span style={{ fontSize: 12, color: 'var(--ink-3)', marginLeft: 4 }}>cfs</span>
					</div>
					<div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>Where this section runs at its best.</div>
				</div>
				<div style={{ ...statCard, minWidth: 0 }}>
					<div style={statLabel}><span style={{ color: 'var(--ink-4)' }}>{'// '}</span>Snowpack</div>
					<div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
						<span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 500, color: (detail.snowpackPct ?? 0) >= 100 ? 'var(--ideal-solid)' : 'var(--low-solid)', letterSpacing: '-0.02em' }}>
							{detail.snowpackPct !== null ? `${detail.snowpackPct}%` : '—'}
						</span>
						{detail.snowpackPct !== null && <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>of normal</span>}
					</div>
					<div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>Basin SWE · SNOTEL avg.</div>
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
					<div style={{ marginTop: 12 }}>
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
								No forecast available. Trigger one from the admin page or API.
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
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
