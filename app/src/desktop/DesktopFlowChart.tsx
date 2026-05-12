import { useId } from 'react';
import { STATUS_COLORS, type DesignStatus } from '../constants';
import type { Thresholds } from '../types';

interface DesktopFlowChartProps {
	data: number[];
	status: DesignStatus;
	thresholds: Thresholds;
}

export function DesktopFlowChart({ data, status, thresholds }: DesktopFlowChartProps) {
	const uid = useId();
	if (!data.length) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>No flow data available</div>;

	const width = 880;
	const height = 280;
	const padding = { l: 50, r: 14, t: 16, b: 28 };
	const w = width - padding.l - padding.r;
	const h = height - padding.t - padding.b;
	const c = STATUS_COLORS[status];
	const min = Math.min(...data, thresholds.runnable) * 0.92;
	const max = Math.max(...data, thresholds.idealHi) * 1.10;
	const range = max - min || 1;
	const y = (v: number) => padding.t + h - ((v - min) / range) * h;
	const x = (i: number) => padding.l + (i / (data.length - 1)) * w;
	const path = data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ');
	const area = `${path} L ${x(data.length - 1)} ${padding.t + h} L ${padding.l} ${padding.t + h} Z`;
	const tickVals = [thresholds.runnable, thresholds.idealLo, thresholds.idealHi, thresholds.high].filter(v => v >= min && v <= max);
	const gradId = `dchart-${uid}`;

	return (
		<svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
			<defs>
				<linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor={c.line} stopOpacity="0.30" />
					<stop offset="100%" stopColor={c.line} stopOpacity="0" />
				</linearGradient>
			</defs>
			<rect x={padding.l} y={y(thresholds.idealHi)} width={w} height={y(thresholds.idealLo) - y(thresholds.idealHi)} fill="var(--ideal-bg)" opacity="0.5" />
			{tickVals.map((v, i) => (
				<g key={i}>
					<line x1={padding.l} x2={padding.l + w} y1={y(v)} y2={y(v)} stroke="var(--rule)" strokeDasharray="2 4" />
					<text x={padding.l - 8} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize="11" fill="var(--ink-3)" fontFamily="Fira Code, monospace">
						{v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
					</text>
				</g>
			))}
			<path d={area} fill={`url(#${gradId})`} />
			<path d={path} fill="none" stroke={c.solid} strokeWidth="2.5" strokeLinecap="round" />
			<circle cx={x(data.length - 1)} cy={y(data[data.length - 1])} r="5" fill={c.solid} stroke="white" strokeWidth="3" />
			{[0, Math.floor(data.length * 0.25), Math.floor(data.length * 0.5), Math.floor(data.length * 0.75), data.length - 1].map((i) => (
				<text key={i} x={x(i)} y={padding.t + h + 18}
					textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}
					fontSize="11" fill="var(--ink-3)" fontFamily="Fira Code, monospace">
					{i === data.length - 1 ? 'now' : `−${data.length - 1 - i}d`}
				</text>
			))}
		</svg>
	);
}
