import { STATUS_COLORS } from '../constants';
import { TrendChip } from '../components/TrendChip';
import { Sparkline } from '../components/Sparkline';
import { Icon } from '../components/Icon';
import type { DashboardSection } from '../types';

interface DesktopRiverRowProps {
	section: DashboardSection;
	selected: boolean;
	onClick: () => void;
}

export function DesktopRiverRow({ section: s, selected, onClick }: DesktopRiverRowProps) {
	const c = STATUS_COLORS[s.status];
	return (
		<button onClick={onClick} style={{
			width: '100%', textAlign: 'left',
			background: 'var(--bg-card)',
			borderRadius: 'var(--r-lg)',
			border: selected ? `1.5px solid ${c.solid}` : '1px solid var(--rule)',
			boxShadow: selected ? `0 0 0 3px ${c.bg}, var(--shadow-card)` : 'var(--shadow-card)',
			padding: 12,
			display: 'flex', alignItems: 'center', gap: 12,
			position: 'relative', overflow: 'hidden',
			transition: 'all var(--dur-fast) var(--ease)',
		}}>
			<div style={{
				position: 'absolute', left: 0, top: 8, bottom: 8, width: 3,
				background: c.solid, borderRadius: '0 2px 2px 0',
			}} />
			<div style={{ flex: '0 0 auto', minWidth: 90, paddingLeft: 6 }}>
				<div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 500, color: 'var(--ink-0)', letterSpacing: '-0.03em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
					{s.now !== null ? s.now.toLocaleString() : '—'}
				</div>
				<div style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', marginTop: 2 }}>cfs</div>
			</div>
			<div style={{ flex: 1, minWidth: 0 }}>
				<div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-0)', letterSpacing: '-0.005em', lineHeight: 1.2 }}>
					{s.section}
				</div>
				<div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
					{s.river} · <span style={{ fontFamily: 'var(--font-mono)' }}>{s.classification}</span>
				</div>
				<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
					<TrendChip trend={s.trend} pct={s.trendPct} size="sm" />
				</div>
			</div>
			{s.sparkline.length > 1 && (
				<div style={{ flex: '0 0 auto' }}>
					<Sparkline data={s.sparkline} width={80} height={36} status={s.status} />
				</div>
			)}
			<Icon name="chevron-right" size={14} color="var(--ink-4)" />
		</button>
	);
}
