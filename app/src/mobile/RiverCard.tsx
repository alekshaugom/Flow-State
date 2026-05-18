import { STATUS_COLORS } from '../constants';
import { BigCFS } from '../components/BigCFS';
import { StatusPill } from '../components/StatusPill';
import { TrendChip } from '../components/TrendChip';
import { Sparkline } from '../components/Sparkline';
import { Icon } from '../components/Icon';
import { HomeCardLoggedBadge } from '../components/HomeCardLoggedBadge';
import type { DashboardSection } from '../types';

interface RiverCardProps {
	section: DashboardSection;
	onClick: () => void;
	sparkDays?: number;
}

export function RiverCard({ section: s, onClick, sparkDays = 30 }: RiverCardProps) {
	const c = STATUS_COLORS[s.status];

	const updatedLabel = (() => {
		if (!s.updatedAt) return null;
		const mins = Math.round((Date.now() - new Date(s.updatedAt).getTime()) / 60000);
		if (mins < 1) return 'just now';
		if (mins < 60) return `${mins}m ago`;
		return `${Math.round(mins / 60)}h ago`;
	})();

	return (
		<button onClick={onClick} style={{
			width: '100%', textAlign: 'left',
			background: 'var(--bg-card)', borderRadius: 'var(--r-lg)',
			border: '1px solid var(--rule)',
			boxShadow: 'var(--shadow-card)',
			padding: '14px 14px 12px',
			display: 'flex', flexDirection: 'column', gap: 10,
			position: 'relative', overflow: 'hidden',
		}}>
			<div style={{
				position: 'absolute', left: 0, top: 12, bottom: 12, width: 3,
				background: c.solid, borderRadius: '0 3px 3px 0',
			}} />

			<HomeCardLoggedBadge count={s.myTripCount} />

			<div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, paddingLeft: 8 }}>
				<div style={{ minWidth: 0, flex: 1 }}>
					<div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-0)', letterSpacing: '-0.01em', lineHeight: 1.15 }}>
						{s.section}
					</div>
					<div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
						<span>{s.river}</span>
						<span style={{ color: 'var(--ink-4)' }}>·</span>
						<span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, color: 'var(--ink-2)' }}>{s.classification}</span>
					</div>
				</div>
			</div>

			<div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, paddingLeft: 8 }}>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
					<BigCFS cfs={s.now} color="var(--ink-0)" />
					<div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
						<StatusPill status={s.status} label={s.statusLabel} size="sm" />
						<TrendChip trend={s.trend} pct={s.trendPct} size="sm" />
					</div>
				</div>
				{s.sparkline.length > 1 && (
					<div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
						<Sparkline data={s.sparkline.slice(-sparkDays)} width={130} height={40} status={s.status} />
						<span style={{
							fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)',
							letterSpacing: '0.06em',
						}}>{sparkDays}d</span>
					</div>
				)}
			</div>

			<div style={{
				paddingLeft: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
				fontSize: 10, color: 'var(--ink-4)',
				fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
			}}>
				{s.gaugeName && (
					<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
						<Icon name="pin" size={11} />
						{s.gaugeName}
					</span>
				)}
				{updatedLabel && (
					<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
						<Icon name="clock" size={11} />
						{updatedLabel}
					</span>
				)}
			</div>
		</button>
	);
}
