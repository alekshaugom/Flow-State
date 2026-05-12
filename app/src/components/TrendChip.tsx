import { Icon } from './Icon';

interface TrendChipProps {
	trend: 'up' | 'down' | 'stable';
	pct: number;
	size?: 'sm' | 'md' | 'lg';
}

export function TrendChip({ trend, pct, size = 'md' }: TrendChipProps) {
	const color = trend === 'up' ? 'var(--trend-up)' : trend === 'down' ? 'var(--trend-down)' : 'var(--trend-stable)';
	const iconName = trend === 'up' ? 'arrow-up' : trend === 'down' ? 'arrow-down' : 'minus';
	const iconSize = size === 'sm' ? 12 : size === 'lg' ? 18 : 14;
	const fs = size === 'sm' ? 11 : size === 'lg' ? 14 : 12;
	return (
		<span style={{
			display: 'inline-flex', alignItems: 'center', gap: 4,
			color, fontWeight: 600, fontSize: fs,
			fontFamily: 'var(--font-mono)',
			fontVariantNumeric: 'tabular-nums',
		}}>
			<Icon name={iconName} size={iconSize} strokeWidth={2.5} />
			{trend === 'stable' ? 'steady' : `${pct > 0 ? '+' : ''}${pct}%`}
		</span>
	);
}
