import { Icon } from '../components/Icon';
import type { DetailViewModel } from '../types';

interface MobileGaugePanelProps {
	detail: DetailViewModel;
}

export function MobileGaugePanel({ detail }: MobileGaugePanelProps) {
	const gauge = detail.gauges?.[0];
	const gaugeName = gauge?.name || gauge?.id || 'Unknown gauge';

	const updatedLabel = (() => {
		if (!detail.updatedAt) return null;
		const mins = Math.round((Date.now() - new Date(detail.updatedAt).getTime()) / 60000);
		if (mins < 1) return 'just now';
		if (mins < 60) return `${mins}m ago`;
		return `${Math.round(mins / 60)}h ago`;
	})();

	return (
		<div style={{
			background: 'var(--bg-card)', border: '1px solid var(--rule)',
			borderRadius: 'var(--r-lg)', padding: 14,
			display: 'flex', flexDirection: 'column', gap: 8,
		}}>
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
				<div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-0)' }}>USGS Gauge</div>
				<button style={{
					display: 'flex', alignItems: 'center', gap: 4,
					fontSize: 11, color: 'var(--river-600)', fontWeight: 600,
					background: 'none', border: 'none', padding: 0,
				}}>
					<Icon name="refresh" size={12} />
					Refresh
				</button>
			</div>
			<div style={{
				fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)',
				padding: '8px 10px', background: 'var(--bg-sunken)', borderRadius: 'var(--r-sm)',
				border: '1px solid var(--rule)',
			}}>
				{gaugeName}
			</div>
			<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-3)' }}>
				{updatedLabel && <span style={{ fontFamily: 'var(--font-mono)' }}>Updated {updatedLabel}</span>}
				<span style={{ fontFamily: 'var(--font-mono)' }}>15-min interval</span>
			</div>
		</div>
	);
}
