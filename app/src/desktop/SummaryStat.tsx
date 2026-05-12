import { Icon } from '../components/Icon';

interface SummaryStatProps {
	label: string;
	value: number;
	sub: string;
	color?: string;
	trendIcon?: 'up' | 'down';
}

export function SummaryStat({ label, value, sub, color, trendIcon }: SummaryStatProps) {
	return (
		<div style={{
			padding: '12px 16px', borderRadius: 'var(--r-lg)',
			background: 'var(--bg-card)', border: '1px solid var(--rule)',
			boxShadow: 'var(--shadow-card)',
			display: 'flex', flexDirection: 'column', gap: 2, minWidth: 110,
		}}>
			<div style={{ fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{label}</div>
			<div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
				<span style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 500, letterSpacing: '-0.02em', color: color || 'var(--ink-0)' }}>
					{value}
				</span>
				{trendIcon && <Icon name={trendIcon === 'up' ? 'arrow-up' : 'arrow-down'} size={14} color={color} strokeWidth={2.5} />}
			</div>
			<div style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>{sub}</div>
		</div>
	);
}
