import { useId } from 'react';
import { STATUS_COLORS, type DesignStatus } from '../constants';
import type { ForecastBandData } from '../types';

interface ForecastBandProps {
	history: number[];
	forecast: ForecastBandData;
	width?: number;
	height?: number;
	status?: DesignStatus;
	padding?: number;
}

export function ForecastBand({ history, forecast, width = 280, height = 90, status = 'ideal', padding = 0 }: ForecastBandProps) {
	const uid = useId();
	const c = STATUS_COLORS[status];
	const histLen = history.length;
	const fcLen = forecast.center.length;
	const total = histLen + fcLen;
	const allValues = [...history, ...forecast.upper, ...forecast.lower];
	const min = Math.min(...allValues) * 0.92;
	const max = Math.max(...allValues) * 1.06;
	const range = max - min || 1;
	const w = width - padding * 2;
	const h = height - padding * 2;
	const stepX = w / (total - 1);
	const y = (v: number) => padding + h - ((v - min) / range) * h;
	const x = (i: number) => padding + i * stepX;

	const histPath = history.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ');
	const histArea = `${histPath} L ${x(histLen - 1)} ${padding + h} L ${padding} ${padding + h} Z`;

	const upperPts = forecast.upper.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(histLen + i)} ${y(v)}`).join(' ');
	const lowerPts = forecast.lower.slice().reverse().map((v, idx) => {
		const i = forecast.lower.length - 1 - idx;
		return `L ${x(histLen + i)} ${y(v)}`;
	}).join(' ');
	const bandPath = `${upperPts} ${lowerPts} Z`;

	const fcCenterPath = forecast.center.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(histLen + i)} ${y(v)}`).join(' ');
	const splitX = x(histLen - 1);
	const lastPt = [x(histLen - 1), y(history[history.length - 1])];

	const histGradId = `hist-${uid}`;
	const patternId = `fc-pat-${uid}`;

	return (
		<svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible', width: '100%', height: 'auto', maxHeight: height }}>
			<defs>
				<linearGradient id={histGradId} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor={c.line} stopOpacity="0.28" />
					<stop offset="100%" stopColor={c.line} stopOpacity="0" />
				</linearGradient>
				<pattern id={patternId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
					<line x1="0" y1="0" x2="0" y2="6" stroke={c.line} strokeWidth="1" strokeOpacity="0.35"/>
				</pattern>
			</defs>
			<path d={histArea} fill={`url(#${histGradId})`} />
			<path d={histPath} fill="none" stroke={c.solid} strokeWidth="2" strokeLinecap="round" />
			<line x1={splitX} y1={padding} x2={splitX} y2={padding + h} stroke="var(--rule-strong)" strokeWidth="1" strokeDasharray="2 3" />
			<path d={bandPath} fill={`url(#${patternId})`} stroke="none" />
			<path d={fcCenterPath} fill="none" stroke={c.solid} strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" />
			<circle cx={lastPt[0]} cy={lastPt[1]} r="3.5" fill={c.solid} stroke="#fff" strokeWidth="2" />
		</svg>
	);
}
