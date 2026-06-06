interface BigCFSProps {
	cfs: number | null;
	size?: 'card' | 'lg' | 'detail';
	color?: string;
}

export function BigCFS({ cfs, size = 'card', color }: BigCFSProps) {
	const fs = size === 'detail' ? 'var(--fs-cfs-detail)' : size === 'lg' ? 56 : 'var(--fs-cfs-card)';
	return (
		<div style={{
			display: 'flex', alignItems: 'baseline', gap: 6,
			fontFamily: 'var(--font-mono)',
			fontVariantNumeric: 'tabular-nums',
			color: color || 'var(--ink-0)',
			lineHeight: 1,
		}}>
			<span style={{ fontSize: fs, fontWeight: 300, letterSpacing: '-0.03em' }}>
				{cfs !== null ? cfs.toLocaleString() : '—'}
			</span>
			<span style={{
				fontSize: size === 'detail' ? 22 : size === 'lg' ? 16 : 14,
				color: 'var(--ink-3)', fontWeight: 500, letterSpacing: '0.04em',
			}}>cfs</span>
		</div>
	);
}
