import { STATUS_COLORS, STATUS_LABEL, type DesignStatus } from '../constants';

const SPARK_RANGES = [7, 14, 30] as const;
export type SparkRange = typeof SPARK_RANGES[number];

interface StatusGroupHeaderProps {
	status: DesignStatus;
	count: number;
	sparkRange?: SparkRange;
	onSparkRangeChange?: (range: SparkRange) => void;
}

export function StatusGroupHeader({ status, count, sparkRange, onSparkRangeChange }: StatusGroupHeaderProps) {
	const c = STATUS_COLORS[status];
	return (
		<div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px 8px' }}>
			<span style={{ width: 8, height: 8, borderRadius: '50%', background: c.solid, flexShrink: 0 }} />
			<span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-0)', letterSpacing: '-0.01em' }}>
				{STATUS_LABEL[status]}
			</span>
			<span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>
				{count} section{count === 1 ? '' : 's'}
			</span>
			{onSparkRangeChange && sparkRange != null && (
				<div style={{ marginLeft: 'auto', display: 'flex', gap: 2, padding: 2, background: 'var(--bg-sunken)', borderRadius: 'var(--r-pill)' }}>
					{SPARK_RANGES.map(d => (
						<button key={d} onClick={() => onSparkRangeChange(d)} style={{
							padding: '3px 8px', borderRadius: 'var(--r-pill)',
							background: sparkRange === d ? 'var(--bg-card)' : 'transparent',
							color: sparkRange === d ? 'var(--ink-0)' : 'var(--ink-3)',
							border: sparkRange === d ? '1px solid var(--rule)' : '1px solid transparent',
							fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)',
							boxShadow: sparkRange === d ? 'var(--shadow-press)' : 'none',
							lineHeight: 1,
						}}>{d}d</button>
					))}
				</div>
			)}
		</div>
	);
}
