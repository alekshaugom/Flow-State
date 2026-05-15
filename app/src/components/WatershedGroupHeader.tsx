import { Link } from 'react-router-dom';
import { Icon } from './Icon';

const SPARK_RANGES = [7, 14, 30] as const;
export type SparkRange = typeof SPARK_RANGES[number];

interface WatershedGroupHeaderProps {
	slug: string;
	name: string;
	count: number;
	collapsed: boolean;
	onToggle: () => void;
	sparkRange?: SparkRange;
	onSparkRangeChange?: (range: SparkRange) => void;
}

export function WatershedGroupHeader({
	slug, name, count, collapsed, onToggle, sparkRange, onSparkRangeChange,
}: WatershedGroupHeaderProps) {
	return (
		<div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px 8px' }}>
			<button
				onClick={onToggle}
				aria-expanded={!collapsed}
				aria-label={collapsed ? `Expand ${name}` : `Collapse ${name}`}
				style={{
					display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
					width: 18, height: 18, padding: 0,
					background: 'transparent', border: 'none', cursor: 'pointer',
					color: 'var(--ink-3)', flexShrink: 0,
					transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)',
					transition: 'transform 120ms ease',
				}}
			>
				<Icon name="chevron-right" size={14} />
			</button>
			<Link
				to={`/watershed/${slug}`}
				style={{
					fontSize: 15, fontWeight: 700, color: 'var(--ink-0)',
					letterSpacing: '-0.01em', textDecoration: 'none',
				}}
			>
				{name}
			</Link>
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
