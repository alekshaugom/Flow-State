import { useId, useState, useRef, useCallback } from 'react';
import { STATUS_COLORS, type DesignStatus } from '../constants';
import type { Thresholds } from '../types';

interface MobileFlowChartProps {
	data: Array<{ t: number; v: number }>;
	days: number;
	status: DesignStatus;
	thresholds: Thresholds;
}

function formatDate(ts: number, rangeDays: number): string {
	const d = new Date(ts);
	if (rangeDays <= 7) return `${d.getMonth() + 1}/${d.getDate()}`;
	if (rangeDays <= 90) return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function niceYTicks(lo: number, hi: number, count = 4): number[] {
	const rawStep = (hi - lo) / (count + 1);
	if (rawStep <= 0) return [Math.round(lo)];
	const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
	const norm = rawStep / mag;
	const nice = norm <= 1.5 ? 1 : norm <= 3.5 ? 2 : norm <= 7.5 ? 5 : 10;
	const step = nice * mag;
	const start = Math.ceil(lo / step) * step;
	const ticks: number[] = [];
	for (let v = start; v <= hi && ticks.length < count + 2; v += step) {
		ticks.push(Math.round(v));
	}
	return ticks;
}

function formatCfs(v: number): string {
	if (v >= 10_000) return `${(v / 1000).toFixed(0)}k`;
	if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
	return String(v);
}

function flowStatus(v: number, th: Thresholds): string {
	if (v >= th.high) return 'Danger';
	if (v >= th.idealHi) return 'High';
	if (v >= th.idealLo) return 'Good';
	if (v >= th.runnable) return 'Runnable';
	return 'Low';
}

function formatTooltipDate(ts: number): string {
	const d = new Date(ts);
	const date = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
	const h = d.getUTCHours(), m = d.getUTCMinutes();
	if (h === 0 && m === 0) return date;
	return `${date}, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

export function MobileFlowChart({ data, days, status, thresholds }: MobileFlowChartProps) {
	const uid = useId();
	const svgRef = useRef<SVGSVGElement>(null);
	const [hover, setHover] = useState<{ idx: number; px: number; py: number } | null>(null);

	if (!data.length) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>No flow data available</div>;

	const width = 358;
	const height = 200;
	const padding = { l: 36, r: 12, t: 12, b: 24 };
	const w = width - padding.l - padding.r;
	const h = height - padding.t - padding.b;
	const c = STATUS_COLORS[status];

	const values = data.map(d => d.v);
	const dataMin = Math.min(...values);
	const dataMax = Math.max(...values);
	const dataSpan = dataMax - dataMin || dataMax * 0.1 || 1;
	const min = dataMin - dataSpan * 0.1;
	const max = dataMax + dataSpan * 0.15;
	const range = max - min || 1;

	const now = Date.now();
	const tMin = now - days * 86_400_000;
	const tMax = now;
	const tRange = tMax - tMin;
	const rangeDays = days;

	const y = (v: number) => padding.t + h - ((v - min) / range) * h;
	const x = (t: number) => padding.l + ((t - tMin) / tRange) * w;

	const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(d.t)} ${y(d.v)}`).join(' ');
	const firstX = x(data[0].t);
	const lastX = x(data[data.length - 1].t);
	const area = `${path} L ${lastX} ${padding.t + h} L ${firstX} ${padding.t + h} Z`;
	const tickVals = niceYTicks(min, max);
	const gradId = `mchart-${uid}`;

	const timeLabels = [
		{ t: tMin, label: formatDate(tMin, rangeDays) },
		{ t: tMin + tRange / 2, label: formatDate(tMin + tRange / 2, rangeDays) },
		{ t: tMax, label: 'now' },
	];

	const idealTop = Math.min(y(thresholds.idealHi), padding.t + h);
	const idealBot = Math.max(y(thresholds.idealLo), padding.t);
	const showIdeal = thresholds.idealHi > min && thresholds.idealLo < max;

	const resolveHover = useCallback((clientX: number) => {
		const svg = svgRef.current;
		if (!svg || data.length < 2) return;
		const rect = svg.getBoundingClientRect();
		const svgX = ((clientX - rect.left) / rect.width) * width;
		const t = tMin + ((svgX - padding.l) / w) * tRange;
		let best = 0, bestDist = Infinity;
		for (let i = 0; i < data.length; i++) {
			const d = Math.abs(data[i].t - t);
			if (d < bestDist) { bestDist = d; best = i; }
		}
		setHover({ idx: best, px: x(data[best].t), py: y(data[best].v) });
	}, [data, tMin, tRange, w, padding.l, width]);

	const onMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => resolveHover(e.clientX), [resolveHover]);
	const onTouchMove = useCallback((e: React.TouchEvent<SVGSVGElement>) => { e.preventDefault(); resolveHover(e.touches[0].clientX); }, [resolveHover]);
	const onLeave = useCallback(() => setHover(null), []);

	const hoverPoint = hover ? data[hover.idx] : null;
	const tipW = 155;
	const tipFlip = hover && hover.px + tipW + 12 > width;

	return (
		<div style={{
			background: 'var(--bg-card)', border: '1px solid var(--rule)',
			borderRadius: 'var(--r-lg)', padding: 12,
		}}>
			<svg ref={svgRef} width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', touchAction: 'none', cursor: hover ? 'crosshair' : undefined }}
				onMouseMove={onMouseMove} onMouseLeave={onLeave} onTouchMove={onTouchMove} onTouchEnd={onLeave}>
				<defs>
					<linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor={c.line} stopOpacity="0.30" />
						<stop offset="100%" stopColor={c.line} stopOpacity="0" />
					</linearGradient>
				</defs>
				{showIdeal && (
					<rect x={padding.l} y={idealTop} width={w} height={Math.max(0, idealBot - idealTop)} fill="var(--ideal-bg)" opacity="0.6" />
				)}
				{tickVals.map((v, i) => (
					<g key={i}>
						<line x1={padding.l} x2={padding.l + w} y1={y(v)} y2={y(v)} stroke="var(--rule)" strokeWidth="1" strokeDasharray="2 3" />
						<text x={padding.l - 6} y={y(v)} textAnchor="end" dominantBaseline="middle"
							fontSize="9" fill="var(--ink-3)" fontFamily="var(--font-mono)">
							{formatCfs(v)}
						</text>
					</g>
				))}
				<path d={area} fill={`url(#${gradId})`} />
				<path d={path} fill="none" stroke={c.solid} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
				<circle cx={x(tMax)} cy={y(data[data.length - 1].v)} r="4" fill={c.solid} stroke="white" strokeWidth="2.5" />
				{timeLabels.map((tl, i) => (
					<text key={i} x={x(tl.t)} y={padding.t + h + 14}
						textAnchor={i === 0 ? 'start' : i === timeLabels.length - 1 ? 'end' : 'middle'}
						fontSize="9" fill="var(--ink-3)" fontFamily="var(--font-mono)">
						{tl.label}
					</text>
				))}
				{hover && hoverPoint && (
					<g>
						<line x1={hover.px} x2={hover.px} y1={padding.t} y2={padding.t + h}
							stroke="var(--ink-3)" strokeWidth="1" strokeDasharray="3 2" opacity="0.6" />
						<circle cx={hover.px} cy={hover.py} r="4" fill={c.solid} stroke="white" strokeWidth="2" />
						<g transform={`translate(${tipFlip ? hover.px - tipW - 10 : hover.px + 10}, ${Math.max(padding.t, Math.min(hover.py - 32, padding.t + h - 64))})`}>
							<rect width={tipW} height={60} rx="5" fill="var(--ink-0)" opacity="0.92" />
							<text x="8" y="15" fontSize="9" fill="white" fontFamily="var(--font-mono)" opacity="0.75">
								{formatTooltipDate(hoverPoint.t)}
							</text>
							<text x="8" y="33" fontSize="14" fill="white" fontWeight="700" fontFamily="var(--font-mono)">
								{hoverPoint.v.toLocaleString()} cfs
							</text>
							<text x="8" y="49" fontSize="9" fill={c.line} fontFamily="var(--font-mono)" fontWeight="600">
								{flowStatus(hoverPoint.v, thresholds)}
							</text>
						</g>
					</g>
				)}
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
