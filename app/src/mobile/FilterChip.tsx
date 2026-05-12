import { STATUS_COLORS, type DesignStatus } from '../constants';

interface FilterChipProps {
	label: string;
	count: number;
	status?: DesignStatus;
	active: boolean;
	onClick: () => void;
}

export function FilterChip({ label, count, status, active, onClick }: FilterChipProps) {
	const dot = status ? STATUS_COLORS[status].solid : null;
	return (
		<button onClick={onClick} style={{
			flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6,
			padding: '7px 12px', borderRadius: 'var(--r-pill)',
			background: active ? 'var(--ink-0)' : 'var(--bg-card)',
			color: active ? 'white' : 'var(--ink-1)',
			border: active ? '1px solid var(--ink-0)' : '1px solid var(--rule)',
			fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)',
			whiteSpace: 'nowrap',
			transition: 'all var(--dur-fast) var(--ease)',
		}}>
			{dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot }} />}
			{label}
			<span style={{
				fontFamily: 'var(--font-mono)', fontSize: 11,
				color: active ? 'rgba(255,255,255,0.6)' : 'var(--ink-3)',
				fontVariantNumeric: 'tabular-nums',
			}}>
				{count}
			</span>
		</button>
	);
}
