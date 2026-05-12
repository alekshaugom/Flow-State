import { useId } from 'react';
import { STATUS_COLORS, type DesignStatus } from '../constants';

interface SparklineProps {
	data: number[];
	width?: number;
	height?: number;
	status?: DesignStatus;
	filled?: boolean;
	showLast?: boolean;
}

export function Sparkline({ data, width = 280, height = 56, status = 'ideal', filled = true, showLast = true }: SparklineProps) {
	const uid = useId();
	if (!data.length) return null;
	const c = STATUS_COLORS[status];
	const min = Math.min(...data) * 0.92;
	const max = Math.max(...data) * 1.06;
	const range = max - min || 1;
	const stepX = width / (data.length - 1);
	const points = data.map((v, i) => [i * stepX, height - ((v - min) / range) * height] as [number, number]);
	const path = points.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(' ');
	const area = `${path} L ${points[points.length - 1][0]} ${height} L 0 ${height} Z`;
	const last = points[points.length - 1];
	const gradId = `spark-${uid}`;
	return (
		<svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'visible' }}>
			{filled && (
				<defs>
					<linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor={c.line} stopOpacity="0.32" />
						<stop offset="100%" stopColor={c.line} stopOpacity="0" />
					</linearGradient>
				</defs>
			)}
			{filled && <path d={area} fill={`url(#${gradId})`} />}
			<path d={path} fill="none" stroke={c.solid} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
			{showLast && <circle cx={last[0]} cy={last[1]} r="3" fill={c.solid} stroke="#fff" strokeWidth="2" />}
		</svg>
	);
}
