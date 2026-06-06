import type { Thresholds } from '../types';

/**
 * FlowGauge — the signature flow-status glyph.
 *
 * A ring/cup outline that does NOT fill inside: a faint gray base outline with the
 * coloured portion **rising from the bottom** to a level = currentFlow ÷ top-of-good
 * (basin-relative). The shape morphs by band:
 *   low   → nearly-closed circle      (yellow)
 *   good  → open horseshoe            (green)   — replaces the old "ideal"
 *   high  → horseshoe, arms bend up   (red)
 *   flood → horseshoe, arms flare out (deep red, pulses)
 * The CFS value sits in the empty centre, in the band colour, with a small "CFS" below.
 */

type Band = 'low' | 'good' | 'high' | 'flood';

function classify(value: number, t: Thresholds): Band {
	if (value < t.idealLo) return 'low';
	if (value <= t.idealHi) return 'good';
	if (value <= t.high) return 'high';
	return 'flood';
}
const STATUS_VAR: Record<Band, string> = {
	low: 'var(--status-low)', good: 'var(--status-good)', high: 'var(--status-high)', flood: 'var(--status-danger)',
};

let _n = 0;
const f2 = (n: number) => n.toFixed(2);
function pt(cx: number, cy: number, R: number, deg: number): [number, number] {
	const a = (deg * Math.PI) / 180;
	return [cx + R * Math.sin(a), cy - R * Math.cos(a)];
}

interface FlowGaugeProps {
	currentFlow: number;
	thresholds: Thresholds;
	size?: number;
	/** Small white-haloed glyph for maps/photos — no rising outline, no centre number. */
	onMap?: boolean;
	/** Show the CFS number + "CFS" in the centre. Defaults to true (false on maps). */
	showValue?: boolean;
}

export function FlowGauge({ currentFlow, thresholds: t, size = 120, onMap = false, showValue }: FlowGaugeProps) {
	const band = classify(currentFlow, t);
	const col = STATUS_VAR[band];
	const withValue = showValue ?? !onMap;
	const VB = 56, cx = 28, cy = 29, R = 16;
	const cfg: Record<Band, { gap: number; arm: 'none' | 'up' | 'out' }> = {
		low: { gap: 40, arm: 'none' }, good: { gap: 150, arm: 'none' },
		high: { gap: 120, arm: 'up' }, flood: { gap: 120, arm: 'out' },
	};
	const { gap, arm } = cfg[band];
	const half = gap / 2;
	const [rx, ry] = pt(cx, cy, R, half);          // right rim end
	const [lx, ly] = pt(cx, cy, R, 360 - half);    // left rim end
	// cup: right end → clockwise through the bottom → left end (major arc)
	const cup = `M ${f2(rx)} ${f2(ry)} A ${R} ${R} 0 1 1 ${f2(lx)} ${f2(ly)}`;
	// arms
	let armR = '', armL = '', armTopY = ry;
	if (arm === 'up') {
		const ty = ry - 20; armTopY = ty;
		armR = `M ${f2(rx)} ${f2(ry)} C ${f2(rx + 2)} ${f2(ry - 9)} ${f2(rx + 1)} ${f2(ry - 15)} ${f2(rx + 0.5)} ${f2(ty)}`;
		armL = `M ${f2(lx)} ${f2(ly)} C ${f2(lx - 2)} ${f2(ly - 9)} ${f2(lx - 1)} ${f2(ly - 15)} ${f2(lx - 0.5)} ${f2(ty)}`;
	} else if (arm === 'out') {
		const ty = ry - 16; armTopY = ty - 3;
		armR = `M ${f2(rx)} ${f2(ry)} C ${f2(rx + 2)} ${f2(ry - 10)} ${f2(rx + 11)} ${f2(ry - 10)} ${f2(rx + 16)} ${f2(ty)}`;
		armL = `M ${f2(lx)} ${f2(ly)} C ${f2(lx - 2)} ${f2(ly - 10)} ${f2(lx - 11)} ${f2(ly - 10)} ${f2(lx - 16)} ${f2(ty)}`;
	}
	const full = `${cup} ${armR} ${armL}`.trim();
	// the coloured outline rises to f = currentFlow / top-of-good (basin-relative)
	const f = Math.max(0, Math.min(1, currentFlow / t.idealHi));
	const bottomY = cy + R, topY = arm === 'none' ? ry : armTopY;
	const waterY = bottomY - f * (bottomY - topY);
	const id = 'fg' + (++_n);
	const sw = 2.6;
	const numStr = Math.round(currentFlow).toLocaleString();
	const numFS = currentFlow >= 10000 ? 7.4 : 9;

	if (onMap) {
		return (
			<svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`} role="img"
				aria-label={`Flow ${numStr} cfs — ${band}`}
				className={band === 'flood' ? 'fs-flood-pulse' : undefined}
				style={{ display: 'block', overflow: 'visible', animation: band === 'flood' ? 'fs-flood-pulse 1.1s ease-in-out infinite' : undefined }}>
				<path d={full} fill="none" stroke="#fff" strokeWidth={sw + 2} strokeLinecap="round" strokeLinejoin="round" />
				<path d={full} fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
			</svg>
		);
	}

	return (
		<svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`} role="img"
			aria-label={`Flow ${numStr} cfs — ${band}`}
			className={band === 'flood' ? 'fs-flood-pulse' : undefined}
			style={{ display: 'block', overflow: 'visible', animation: band === 'flood' ? 'fs-flood-pulse 1.1s ease-in-out infinite' : undefined }}>
			<defs>
				<clipPath id={id}><rect x={-10} y={waterY} width={VB + 20} height={VB} /></clipPath>
			</defs>
			{/* faint gray base outline */}
			<path d={full} fill="none" stroke="var(--ink-300)" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
			{/* coloured outline, risen from the bottom */}
			<g clipPath={`url(#${id})`}>
				<path d={full} fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
			</g>
			{withValue && (
				<>
					<text x={cx} y={cy + 1} textAnchor="middle" fontFamily="var(--font-num)" fontWeight={600} fontSize={numFS} fill={col}>{numStr}</text>
					<text x={cx} y={cy + 6.6} textAnchor="middle" fontFamily="var(--font-sans)" fontWeight={600} fontSize={3.4} fill={col} letterSpacing="0.5" opacity={0.85}>CFS</text>
				</>
			)}
		</svg>
	);
}
