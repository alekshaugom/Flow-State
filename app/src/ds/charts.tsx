import { CSSProperties, useState } from 'react';

// ── internal math helpers ────────────────────────────────────────────────────

type Point = [number, number];

function smoothPath(pts: Point[]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

// ── shared counter for unique gradient IDs ───────────────────────────────────

let _gidCounter = 0;
function nextGid(prefix: string) {
  return `${prefix}${++_gidCounter}`;
}

// ── FlowChart ────────────────────────────────────────────────────────────────

export interface FlowChartDatum {
  v: number;
  [key: string]: unknown;
}

export interface FlowChartLabel {
  i: number;
  t: string;
}

export interface FlowChartProps {
  data: FlowChartDatum[];
  optimal?: [number, number];
  nowIndex?: number;
  labels?: FlowChartLabel[];
  height?: number;
  accent?: string;
  onSky?: boolean;
  markerIndex?: number;
  style?: CSSProperties;
}

/**
 * Full day flow chart: area + smooth line + optional optimal band + now marker.
 * Pure inline SVG — no recharts.
 */
export function FlowChart({
  data,
  optimal,
  nowIndex,
  labels,
  height = 150,
  accent = 'var(--fg-on-sky-1)',
  onSky = true,
  markerIndex,
  style,
}: FlowChartProps) {
  const W = 320;
  const H = height;
  const padB = 22;
  const padT = 12;

  const vals = data.map((d) => d.v);
  const optMin = optimal ? optimal[0] : Infinity;
  const optMax = optimal ? optimal[1] : 0;
  const min = Math.min(...vals, optMin) * 0.9;
  const max = Math.max(...vals, optMax) * 1.08;

  const xFn = (i: number) => (i / (data.length - 1)) * (W - 8) + 4;
  const yFn = (v: number) =>
    padT + (1 - (v - min) / (max - min)) * (H - padB - padT);

  const pts: Point[] = data.map((d, i) => [xFn(i), yFn(d.v)]);
  const line = smoothPath(pts);
  const area = `${line} L ${xFn(data.length - 1)} ${H - padB} L ${xFn(0)} ${H - padB} Z`;

  const labelColor = onSky ? 'var(--fg-on-sky-3)' : 'var(--fg-3)';
  const gid = nextGid('fcg');

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 'auto', display: 'block', ...style }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={accent} stopOpacity="0.32" />
          <stop offset="1" stopColor={accent} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {optimal && (
        <rect
          x="0"
          y={yFn(optimal[1])}
          width={W}
          height={Math.max(0, yFn(optimal[0]) - yFn(optimal[1]))}
          fill="var(--status-good)"
          opacity="0.16"
        />
      )}

      <path d={area} fill={`url(#${gid})`} />
      <path
        d={line}
        fill="none"
        stroke={accent}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {nowIndex != null && (
        <g>
          <line
            x1={xFn(nowIndex)}
            y1={padT}
            x2={xFn(nowIndex)}
            y2={H - padB}
            stroke="var(--fg-on-sky-1)"
            strokeOpacity="0.4"
            strokeWidth="1"
            strokeDasharray="2 3"
          />
          <circle
            cx={xFn(nowIndex)}
            cy={yFn(data[nowIndex].v)}
            r="4.5"
            fill="#fff"
            stroke={accent}
            strokeWidth="2"
          />
        </g>
      )}

      {markerIndex != null && data[markerIndex] && (
        <g>
          <line
            x1={xFn(markerIndex)}
            y1={padT}
            x2={xFn(markerIndex)}
            y2={H - padB}
            stroke="var(--fg-on-sky-1)"
            strokeOpacity="0.75"
            strokeWidth="1.25"
          />
          <circle
            cx={xFn(markerIndex)}
            cy={yFn(data[markerIndex].v)}
            r="5"
            fill={accent}
            stroke="#fff"
            strokeWidth="2"
          />
        </g>
      )}

      {labels &&
        labels.map((l, i) => (
          <text
            key={i}
            x={xFn(l.i)}
            y={H - 6}
            fill={labelColor}
            fontSize="9.5"
            fontFamily="var(--font-mono)"
            textAnchor="middle"
          >
            {l.t}
          </text>
        ))}
    </svg>
  );
}

// ── Sparkline ────────────────────────────────────────────────────────────────

export type SparklineDatum = number | { v: number; [key: string]: unknown };

export interface SparklineProps {
  data: SparklineDatum[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
  dot?: boolean;
  strokeWidth?: number;
  style?: CSSProperties;
}

/**
 * Clean inline sparkline. No axes — just a smooth line with optional soft fill
 * and endpoint dot.
 */
export function Sparkline({
  data,
  width = 120,
  height = 36,
  color = 'var(--flow-500)',
  fill = true,
  dot = true,
  strokeWidth = 2,
  style,
}: SparklineProps) {
  const vals = data.map((d) => (typeof d === 'number' ? d : d.v));
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = 3;

  const xFn = (i: number) => pad + (i / (vals.length - 1)) * (width - pad * 2);
  const yFn = (v: number) =>
    max === min
      ? height / 2
      : pad + (1 - (v - min) / (max - min)) * (height - pad * 2);

  const pts: Point[] = vals.map((v, i) => [xFn(i), yFn(v)]);
  const line = smoothPath(pts);
  const gid = nextGid('spk');
  const last = pts[pts.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', overflow: 'visible', ...style }}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.22" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {fill && (
        <path
          d={`${line} L ${last[0]} ${height} L ${pts[0][0]} ${height} Z`}
          fill={`url(#${gid})`}
        />
      )}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {dot && (
        <circle cx={last[0]} cy={last[1]} r={strokeWidth + 0.8} fill={color} />
      )}
    </svg>
  );
}

// ── CorridorSpark ────────────────────────────────────────────────────────────

export interface CorridorSparkProps {
  down: number[];
  up?: number[];
  optimal?: [number, number];
  colorDown?: string;
  colorUp?: string;
  width?: number;
  height?: number;
  style?: CSSProperties;
}

/**
 * 30-day corridor sparkline. Single series → solid line. Two gauges →
 * downstream solid, upstream dashed, sharing one chart + scale.
 * Faint optimal band drawn behind.
 */
export function CorridorSpark({
  down,
  up,
  optimal,
  colorDown = 'var(--status-good)',
  colorUp,
  width = 132,
  height = 48,
  style,
}: CorridorSparkProps) {
  const all = [...down, ...(up ?? [])];
  let min = Math.min(...all);
  let max = Math.max(...all);
  if (optimal) {
    min = Math.min(min, optimal[0]);
    max = Math.max(max, optimal[1]);
  }
  const pad = 4;
  min = min * 0.97;
  max = max * 1.03;

  const xFn = (i: number) =>
    pad + (i / (down.length - 1)) * (width - pad * 2);
  const yFn = (v: number) =>
    max === min
      ? height / 2
      : pad + (1 - (v - min) / (max - min)) * (height - pad * 2);

  const pathFor = (arr: number[]) =>
    smoothPath(arr.map((v, i): Point => [xFn(i), yFn(v)]));

  const last: Point = [xFn(down.length - 1), yFn(down[down.length - 1])];
  const upColor = colorUp ?? colorDown;

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ display: 'block', width: '100%', overflow: 'visible', ...style }}
    >
      {up && (
        <path
          d={pathFor(up)}
          fill="none"
          stroke={upColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeDasharray="3 3"
          opacity="0.85"
        />
      )}
      <path
        d={pathFor(down)}
        fill="none"
        stroke={colorDown}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r="3" fill={colorDown} />
    </svg>
  );
}

// ── PeriodFlowChart ──────────────────────────────────────────────────────────

const PERIOD_OPTS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: '1Y', days: 365 },
];

export interface PeriodFlowChartProps {
  history: { t: number; v: number }[];   // ascending, epoch ms
  optimal?: [number, number];
  height?: number;
  accent?: string;
  onSky?: boolean;
  defaultDays?: number;   // default 30
  bleedX?: number;        // px of negative horizontal margin so the chart spans the tile edge-to-edge
  valueOverlay?: {
    format: (v: number) => string;   // formats a flow value (with unit conversion)
    unit: string;                    // unit label, e.g. 'cfs'
    trend?: string | null;           // 'rising' | 'falling' | 'steady'
  };
}

/**
 * Full-width period chart with a minimal period toggle.
 * Slices history to the selected window and renders FlowChart edge-to-edge
 * by applying a negative horizontal margin equal to the tile's padding.
 */
export function PeriodFlowChart({
  history,
  optimal,
  height = 130,
  accent = 'var(--fg-on-sky-1)',
  onSky = true,
  defaultDays = 30,
  bleedX,
  valueOverlay,
}: PeriodFlowChartProps) {
  const [days, setDays] = useState(defaultDays);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const slice = history.filter(p => p.t >= Date.now() - days * 86400000);
  const lastIdx = slice.length - 1;
  const activeIdx = hoverIdx != null ? Math.min(Math.max(hoverIdx, 0), lastIdx) : lastIdx;
  const activePt = slice[activeIdx];

  // x-fraction of the active point, matching FlowChart's xFn = (i/(n-1))*(W-8)+4, W=320
  const frac = lastIdx > 0 ? activeIdx / lastIdx : 0;
  const leftFrac = (frac * 312 + 4) / 320;
  const tx = leftFrac <= 0.2 ? '0%' : leftFrac >= 0.8 ? '-100%' : '-50%';
  const align = tx === '0%' ? 'flex-start' : tx === '-100%' ? 'flex-end' : 'center';

  const onMove = (e: any) => {
    if (lastIdx < 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const f = (e.clientX - rect.left) / rect.width;
    setHoverIdx(Math.min(Math.max(Math.round(f * lastIdx), 0), lastIdx));
  };

  const stamp = (t: number) => {
    const d = new Date(t);
    return (
      d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
      ' · ' +
      d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    );
  };

  return (
    <div>
      {/* value label band — tracks the active point; only when valueOverlay is set */}
      {valueOverlay && slice.length >= 2 && activePt && (
        <div
          style={{
            position: 'relative',
            height: 52,
            margin: bleedX ? `0 -${bleedX}px` : undefined,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: `${leftFrac * 100}%`,
              transform: `translateX(${tx})`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: align,
              whiteSpace: 'nowrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span
                style={{
                  fontWeight: 300,
                  fontSize: 34,
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {valueOverlay.format(activePt.v)}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--fg-on-sky-2)',
                }}
              >
                {valueOverlay.unit}
              </span>
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10.5,
                color: 'var(--fg-on-sky-3)',
                marginTop: 3,
              }}
            >
              {stamp(activePt.t)}
            </div>
          </div>
        </div>
      )}

      {/* chart — bleeds to tile edges via negative margin */}
      <div
        style={{ position: 'relative', margin: bleedX ? `0 -${bleedX}px` : undefined }}
        onMouseMove={valueOverlay ? onMove : undefined}
        onMouseLeave={valueOverlay ? () => setHoverIdx(null) : undefined}
      >
        {slice.length >= 2 ? (
          <FlowChart
            data={slice.map(p => ({ v: p.v }))}
            optimal={optimal}
            nowIndex={valueOverlay ? undefined : lastIdx}
            markerIndex={valueOverlay && hoverIdx != null ? activeIdx : undefined}
            height={height}
            accent={accent}
            onSky={onSky}
          />
        ) : (
          <div
            style={{
              height,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--fg-on-sky-3)',
              fontSize: 13,
            }}
          >
            No history for this period
          </div>
        )}
      </div>

      {/* minimal period toggle — right-aligned, no filled pill bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 2,
          marginTop: 8,
        }}
      >
        {PERIOD_OPTS.map(opt => {
          const active = days === opt.days;
          return (
            <button
              key={opt.days}
              onClick={() => setDays(opt.days)}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                padding: '2px 7px',
                border: 'none',
                background: active ? 'rgba(255,255,255,0.16)' : 'transparent',
                borderRadius: active ? 'var(--r-pill)' : undefined,
                color: active ? 'var(--fg-on-sky-1)' : 'var(--fg-on-sky-3)',
                fontWeight: active ? 700 : 600,
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── corridor class helpers (exported for use in screens) ─────────────────────

const ROMAN: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6,
};
const ROMAN_R: string[] = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];

function classBounds(klass: string): [number, number] {
  const parts = String(klass)
    .split(/[–-]/)
    .map((s) => s.trim());
  const lo = ROMAN[parts[0]] ?? 0;
  const hi = ROMAN[parts[parts.length - 1]] ?? lo;
  return [lo, hi];
}

export interface SectionLike {
  klass: string;
  [key: string]: unknown;
}

function riverClassRange(sections: SectionLike[]): [number, number] {
  let lo = 99;
  let hi = 0;
  sections.forEach((s) => {
    const [a, b] = classBounds(s.klass);
    lo = Math.min(lo, a);
    hi = Math.max(hi, b);
  });
  return [lo, hi];
}

export function classRangeLabel(sections: SectionLike[]): string {
  const [lo, hi] = riverClassRange(sections);
  return lo === hi ? ROMAN_R[lo] : `${ROMAN_R[lo]}–${ROMAN_R[hi]}`;
}

export function skillWord(sections: SectionLike[]): string {
  const [lo, hi] = riverClassRange(sections);
  if (hi - lo >= 2) return 'Mixed';
  const labels: Record<number, string> = {
    1: 'Easy',
    2: 'Novice',
    3: 'Intermediate',
    4: 'Advanced',
    5: 'Expert',
  };
  return labels[hi] ?? '—';
}

export function statusFromCfs(
  v: number,
  opt?: [number, number] | null,
): string {
  if (!opt) return 'good';
  const [lo, hi] = opt;
  if (v < lo) return 'low';
  if (v > hi * 1.3) return 'danger';
  if (v > hi) return 'high';
  return 'good';
}
