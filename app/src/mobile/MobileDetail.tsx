import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { STATUS_COLORS } from '../constants';
import { BigCFS } from '../components/BigCFS';
import { StatusPill } from '../components/StatusPill';
import { TrendChip } from '../components/TrendChip';
import { Icon } from '../components/Icon';
import { SectionHead } from '../components/SectionHead';
import { RangeGauge } from '../components/RangeGauge';
import { ContextStrip } from '../components/ContextStrip';
import { MobileFlowChart } from './MobileFlowChart';
import { MobileForecastPanel } from './MobileForecastPanel';
import { MobileGaugePanel } from './MobileGaugePanel';
import { useRiverDetail } from '../hooks/useRiverDetail';

const topBtn: React.CSSProperties = {
	width: 36, height: 36, borderRadius: 'var(--r-pill)',
	background: 'var(--bg-card)', border: '1px solid var(--rule)',
	display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const sectionStyle: React.CSSProperties = { padding: '20px 20px 0' };

interface MobileDetailProps {
	sectionId: string;
}

export function MobileDetail({ sectionId }: MobileDetailProps) {
	const navigate = useNavigate();
	const { data: detail, isLoading } = useRiverDetail(sectionId);
	const [range, setRange] = useState(30);

	if (isLoading || !detail) {
		return <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--ink-3)' }}>Loading...</div>;
	}

	const c = STATUS_COLORS[detail.status];
	const cutoff = Date.now() - range * 24 * 3600_000;
	const histSlice = detail.history.filter(p => p.t >= cutoff);

	return (
		<div style={{
			width: '100%', height: '100%',
			background: 'var(--bg-app)',
			overflow: 'auto', paddingBottom: 40,
		}}>
			{/* Top bar */}
			<div style={{
				position: 'sticky', top: 0, zIndex: 10,
				background: 'rgba(244,246,248,0.85)', backdropFilter: 'blur(14px)',
				borderBottom: '1px solid var(--rule)',
				padding: '12px 16px',
				display: 'flex', alignItems: 'center', justifyContent: 'space-between',
			}}>
				<button onClick={() => navigate('/')} style={{
					display: 'flex', alignItems: 'center', gap: 4,
					color: 'var(--river-600)', fontWeight: 600, fontSize: 14,
					background: 'none', border: 'none', padding: 0,
				}}>
					<Icon name="chevron-left" size={20} />
					Rivers
				</button>
				<div style={{ display: 'flex', gap: 6 }}>
					<button style={topBtn}><Icon name="star" size={17} color="var(--ink-2)" /></button>
					<button style={topBtn}><Icon name="bell" size={17} color="var(--ink-2)" /></button>
				</div>
			</div>

			{/* Hero */}
			<section style={{ padding: '16px 20px 20px' }}>
				<div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 4 }}>
					<span style={{ color: 'var(--ink-4)' }}>{'// '}</span>
					{detail.river} · {detail.classification}
				</div>
				<h1 style={{
					margin: 0, fontSize: 28, fontWeight: 700, color: 'var(--ink-0)',
					letterSpacing: '-0.02em', lineHeight: 1.1,
				}}>
					{detail.section}
				</h1>
				{detail.nearestTown && (
					<div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
						<Icon name="pin" size={12} />
						{detail.nearestTown}{detail.miles ? ` · ${detail.miles} mi` : ''}
					</div>
				)}

				<div style={{
					marginTop: 22, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12,
				}}>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
						<BigCFS cfs={detail.now} size="detail" color={c.solid} />
						<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
							<StatusPill status={detail.status} label={detail.statusLabel} size="lg" />
							<TrendChip trend={detail.trend} pct={detail.trendPct} size="lg" />
						</div>
					</div>
				</div>

				{detail.resolvedBand?.description && (
					<div style={{
						marginTop: 14,
						padding: '12px 14px',
						borderRadius: 'var(--r-lg)',
						background: c.bg,
						border: `1px solid ${c.line}`,
						fontSize: 13, lineHeight: 1.55, color: 'var(--ink-1)',
					}}>
						{detail.resolvedBand.description}
					</div>
				)}

				<RangeGauge currentFlow={detail.now ?? 0} thresholds={detail.thresholds} />
			</section>

			{/* Chart */}
			<section style={sectionStyle}>
				<SectionHead title="Flow History" eyebrow="Recent" />
				<div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
					{[7, 30, 90, 180, 360].map(d => (
						<button key={d} onClick={() => setRange(d)} style={{
							padding: '7px 14px', borderRadius: 'var(--r-pill)',
							background: range === d ? 'var(--ink-0)' : 'transparent',
							color: range === d ? 'white' : 'var(--ink-2)',
							border: range === d ? '1px solid var(--ink-0)' : '1px solid var(--rule)',
							fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)',
						}}>
							{d}d
						</button>
					))}
				</div>
				<MobileFlowChart data={histSlice} days={range} status={detail.status} thresholds={detail.thresholds} />
			</section>

			{/* Forecast */}
			<section style={sectionStyle}>
				<SectionHead title="14-Day Forecast" eyebrow="Outlook" />
				<MobileForecastPanel detail={detail} />
			</section>

			{/* Briefing */}
			<section style={sectionStyle}>
				<SectionHead title="What's happening" eyebrow="Briefing" />
				<div style={{
					background: 'var(--bg-card)', border: '1px solid var(--rule)',
					borderRadius: 'var(--r-lg)', padding: 16,
					fontSize: 14, lineHeight: 1.55, color: 'var(--ink-1)',
				}}>
					{detail.notes || 'No description available for this section.'}
				</div>
			</section>

			{/* Context */}
			<section style={sectionStyle}>
				<SectionHead title="Context" eyebrow="Drivers" />
				<ContextStrip
					snowpackPct={detail.snowpackPct}
					damControlled={detail.damControlled}
					riverName={detail.river}
				/>
			</section>

			{/* Gauge */}
			<section style={{ ...sectionStyle, paddingBottom: 24 }}>
				<SectionHead title="Source" eyebrow="Gauge" />
				<MobileGaugePanel detail={detail} />
			</section>
		</div>
	);
}
