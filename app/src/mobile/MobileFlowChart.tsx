import { useId } from 'react';
import { STATUS_COLORS, type DesignStatus } from '../constants';
import type { Thresholds } from '../types';

interface MobileFlowChartProps {
	data: number[];
	status: DesignStatus;
	thresholds: Thresholds;
}

export function MobileFlowChart({ data, status, thresholds }: MobileFlowChartProps) {
	const uid = useId();
	if (!data.length) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>No flow data available</div>;

	const width = 358;
	const height = 200;
	const padding = { l: 36, r: 12, t: 12, b: 24 };
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
	const gradId = `mchart-${uid}`;

	return (
		<div style={{
			background: 'var(--bg-card)', border: '1px solid var(--rule)',
			borderRadius: 'var(--r-lg)', padding: 12,
		}}>
			<svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
				<defs>
					<linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor={c.line} stopOpacity="0.30" />
						<stop offset="100%" stopColor={c.line} stopOpacity="0" />
					</linearGradient>
				</defs>
				<rect x={padding.l} y={y(thresholds.idealHi)} width={w} height={y(thresholds.idealLo) - y(thresholds.idealHi)} fill="var(--ideal-bg)" opacity="0.6" />
				{tickVals.map((v, i) => (
					<g key={i}>
						<line x1={padding.l} x2={padding.l + w} y1={y(v)} y2={y(v)} stroke="var(--rule)" strokeWidth="1" strokeDasharray="2 3" />
						<text x={padding.l - 6} y={y(v)} textAnchor="end" dominantBaseline="middle"
							fontSize="9" fill="var(--ink-3)" fontFamily="Fira Code, monospace">
							{v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
						</text>
					</g>
				))}
				<path d={area} fill={`url(#${gradId})`} />
				<path d={path} fill="none" stroke={c.solid} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
				<circle cx={x(data.length - 1)} cy={y(data[data.length - 1])} r="4" fill={c.solid} stroke="white" strokeWidth="2.5" />
				{[0, Math.floor(data.length / 2), data.length - 1].map((i) => (
					<text key={i} x={x(i)} y={padding.t + h + 14}
						textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}
						fontSize="9" fill="var(--ink-3)" fontFamily="Fira Code, monospace">
						{i === data.length - 1 ? 'now' : i === 0 ? `${data.length}d ago` : `${Math.floor(data.length / 2)}d`}
					</text>
				))}
			</svg>
			<div style={{
				display: 'flex', gap: 12, marginTop: 4,
				fontSize: 10, color: 'var(--ink-3)',
				fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
			}}>
				<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
					<span style={{ width: 10, height: 6, background: 'var(--ideal-bg)', borderRadius: 1 }} />
					Ideal zone
				</span>
				<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
					<span style={{ width: 10, height: 2, background: 'var(--rule-strong)' }} />
					Thresholds
				</span>
			</div>
		</div>
	);
}
