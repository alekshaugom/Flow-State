/**
 * CorridorSchematic — SVG schematic diagram of a corridor.
 *
 * CorridorMap  – full corridor: vertical spine of colored section segments
 *               between labeled access-point nodes.
 * SectionMap   – single section: put-in → take-out with section's access points.
 *
 * Ported from /tmp/flow-design-extract/ui_kits/app/corridormap.jsx,
 * fed by REAL data from useCorridor() via CorridorView.ts.
 */

import { statusColor } from './status';
import type { DesignStatus } from '../constants';

// ── shared types ──────────────────────────────────────────────────────────────

export interface SchematicSection {
  id: string;
  name: string;
  status: DesignStatus;
  difficulty?: string | null;
  corridorMileSpan?: { startMile: number; endMile: number } | null;
}

export interface SchematicAccessPoint {
  id: string;
  name: string;
  kind: string;
  sortIndex?: number | null;
  riverMile?: number | null;
}

export interface SchematicGauge {
  id: string;
  name: string;
  currentFlow: number | null;
  unit: string;
  riverMile?: number | null;
}

// ── bezier segment helper ─────────────────────────────────────────────────────

/** Smooth cubic bezier from point a to point b (slight S-curve). */
function seg(a: [number, number], b: [number, number]): string {
  const mx = (a[0] + b[0]) / 2;
  const dy = b[1] - a[1];
  return `M ${a[0]} ${a[1]} C ${mx} ${a[1] + dy * 0.3}, ${mx} ${b[1] - dy * 0.3}, ${b[0]} ${b[1]}`;
}

// ── CorridorMap ───────────────────────────────────────────────────────────────

export interface CorridorMapProps {
  sections: SchematicSection[];
  accessPoints: SchematicAccessPoint[];
  selectedSectionId?: string | null;
  onSelectSection?: (id: string) => void;
  gauges?: SchematicGauge[];
  height?: number;
}

/**
 * Vertical spine schematic for a full corridor.
 * Nodes = access points (sorted by riverMile → sortIndex).
 * Segments = sections (colored by status).
 * Gauge markers overlay the nearest node.
 */
export function CorridorMap({
  sections,
  accessPoints,
  selectedSectionId,
  onSelectSection,
  gauges = [],
  height,
}: CorridorMapProps) {
  const n = sections.length;
  if (n === 0) return null;

  const W = 320;
  const H = height ?? Math.max(200, 70 + n * 96);

  // Sort sections upstream→downstream using corridorMileSpan.startMile or index
  const sortedSections = [...sections].sort((a, b) => {
    const aM = a.corridorMileSpan?.startMile ?? Infinity;
    const bM = b.corridorMileSpan?.startMile ?? Infinity;
    if (aM !== bM) return aM - bM;
    return 0;
  });

  // Sort access points by riverMile → sortIndex → alpha
  const sortedAPs = [...accessPoints].sort((a, b) => {
    const aR = a.riverMile ?? Infinity;
    const bR = b.riverMile ?? Infinity;
    if (aR !== bR) return aR - bR;
    const aI = a.sortIndex ?? 999;
    const bI = b.sortIndex ?? 999;
    return aI - bI;
  });

  // Build n+1 node points with gentle horizontal oscillation
  const nodeCount = n + 1;
  const nodes: Array<[number, number]> = [];
  for (let i = 0; i < nodeCount; i++) {
    const x = 150 + 86 * Math.sin(i * 1.25 + 0.4);
    const y = 36 + (i / n) * (H - 72);
    nodes.push([x, y]);
  }

  // Map access points to node indices (best-effort: up to nodeCount labels)
  const apLabels = sortedAPs.slice(0, nodeCount);
  // Pad if fewer APs than nodes
  while (apLabels.length < nodeCount) {
    apLabels.push({ id: `pad-${apLabels.length}`, name: '', kind: 'other' });
  }

  // Find a gauge to show — first one with a flow value, matched to closest node
  const gaugeToShow = gauges.find(g => g.currentFlow != null) ?? null;
  // Gauge node index: pick the node closest to the gauge's river mile
  let gaugeNodeIdx = 0;
  if (gaugeToShow?.riverMile != null) {
    const gRM = gaugeToShow.riverMile;
    let best = Infinity;
    sortedAPs.slice(0, nodeCount).forEach((ap, i) => {
      const d = Math.abs((ap.riverMile ?? 0) - gRM);
      if (d < best) { best = d; gaugeNodeIdx = i; }
    });
  }

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 360, margin: '0 auto' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          <filter id="cmGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* faint underlay for every segment */}
        {sortedSections.map((_, i) => (
          <path
            key={`u${i}`}
            d={seg(nodes[i], nodes[i + 1])}
            fill="none"
            stroke="var(--module-stroke)"
            strokeWidth="9"
            strokeLinecap="round"
          />
        ))}

        {/* colored section segments */}
        {sortedSections.map((s, i) => {
          const on = s.id === selectedSectionId;
          return (
            <path
              key={s.id}
              d={seg(nodes[i], nodes[i + 1])}
              fill="none"
              stroke={statusColor(s.status)}
              strokeWidth={on ? 8 : 5.5}
              strokeLinecap="round"
              filter={on ? 'url(#cmGlow)' : undefined}
              opacity={on ? 1 : 0.92}
              style={{ cursor: onSelectSection ? 'pointer' : 'default' }}
              onClick={() => onSelectSection?.(s.id)}
            />
          );
        })}

        {/* access-point node circles */}
        {nodes.map((p, i) => (
          <g key={`n${i}`}>
            <circle
              cx={p[0]}
              cy={p[1]}
              r="7"
              fill="var(--bg-card)"
              stroke={
                i === 0
                  ? 'var(--alpine-600, #2b6fa8)'
                  : i === n
                  ? 'var(--flow-600, #1a5ea6)'
                  : 'var(--ink-500, #7b8fa6)'
              }
              strokeWidth="3"
            />
          </g>
        ))}

        {/* gauge callout ring at its closest node */}
        {gaugeToShow && (() => {
          const gp = nodes[gaugeNodeIdx];
          if (!gp) return null;
          return (
            <circle
              cx={gp[0]}
              cy={gp[1]}
              r="12"
              fill="none"
              stroke="rgba(56,189,248,0.7)"
              strokeWidth="2.5"
            />
          );
        })()}
      </svg>

      {/* access-point labels positioned over the SVG */}
      {nodes.map((p, i) => {
        const ap = apLabels[i];
        if (!ap?.name) return null;
        const leftSide = p[0] > W / 2;
        const isFirst = i === 0;
        const isLast = i === n;
        const roleLabel = isFirst ? 'Put-in' : isLast ? 'Take-out' : 'Access';

        return (
          <div
            key={`lab${i}`}
            style={{
              position: 'absolute',
              left: `${(p[0] / W) * 100}%`,
              top: `${(p[1] / H) * 100}%`,
              transform: `translate(${leftSide ? '-100%' : '0'}, -50%)`,
              paddingLeft: leftSide ? 0 : 18,
              paddingRight: leftSide ? 18 : 0,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              textAlign: leftSide ? 'right' : 'left',
            }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--fg-on-sky-1)', textShadow: '0 1px 3px rgba(0,0,0,0.45)' }}>
              {ap.name}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--fg-on-sky-3)' }}>
              {roleLabel}
            </div>
          </div>
        );
      })}

      {/* section class chips at segment midpoints */}
      {sortedSections.map((s, i) => {
        const a = nodes[i];
        const b = nodes[i + 1];
        if (!a || !b) return null;
        const mx = (a[0] + b[0]) / 2;
        const my = (a[1] + b[1]) / 2;
        const on = s.id === selectedSectionId;
        return (
          <button
            key={`chip${s.id}`}
            onClick={() => onSelectSection?.(s.id)}
            style={{
              position: 'absolute',
              left: `${(mx / W) * 100}%`,
              top: `${(my / H) * 100}%`,
              transform: 'translate(-50%,-50%)',
              border: 'none',
              cursor: onSelectSection ? 'pointer' : 'default',
              borderRadius: 'var(--r-pill)',
              padding: on ? '5px 11px' : '3px 9px',
              background: on ? 'var(--bg-card)' : 'rgba(255,255,255,0.92)',
              color: statusColor(s.status),
              fontWeight: 800,
              fontSize: on ? 13 : 11.5,
              boxShadow: '0 2px 8px rgba(6,19,33,0.25)',
              whiteSpace: 'nowrap',
            }}
          >
            {s.difficulty ?? '?'}
          </button>
        );
      })}

      {/* gauge callout label */}
      {gaugeToShow && (() => {
        const gp = nodes[gaugeNodeIdx];
        if (!gp) return null;
        const labelLeft = gp[0] > W / 2;
        const isLast = gaugeNodeIdx === nodes.length - 1;
        return (
          <div
            style={{
              position: 'absolute',
              left: `${(gp[0] / W) * 100}%`,
              top: `${(gp[1] / H) * 100}%`,
              transform: `translate(${labelLeft ? '-100%' : '0'}, ${isLast ? 'calc(-100% - 20px)' : '17px'})`,
              paddingLeft: labelLeft ? 0 : 18,
              paddingRight: labelLeft ? 18 : 0,
              zIndex: 7,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'var(--bg-card)',
                color: 'var(--flow-700)',
                borderRadius: 'var(--r-pill)',
                padding: '4px 10px',
                boxShadow: '0 2px 8px rgba(6,19,33,0.25)',
                whiteSpace: 'nowrap',
                fontWeight: 800,
                fontSize: 11.5,
              }}
            >
              {gaugeToShow.currentFlow!.toLocaleString()} {gaugeToShow.unit}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── SectionMap ────────────────────────────────────────────────────────────────

export interface SectionMapProps {
  section: {
    status: DesignStatus;
    putIn?: string | null;
    takeOut?: string | null;
  };
  accessPoints?: SchematicAccessPoint[];
  height?: number;
}

/**
 * Single-section schematic: put-in → take-out with any intermediate access points.
 * Vertical flow; sides alternate so labels never collide.
 */
export function SectionMap({ section, accessPoints = [], height }: SectionMapProps) {
  const put = section.putIn ?? 'Put-in';
  const take = section.takeOut ?? 'Take-out';

  // Intermediate access points (not put-in or take-out by name)
  const mids = accessPoints
    .filter(ap =>
      ap.kind !== 'put-in' &&
      ap.kind !== 'take-out' &&
      ap.name !== put &&
      ap.name !== take
    )
    .sort((a, b) => (a.sortIndex ?? 999) - (b.sortIndex ?? 999))
    .map(ap => ap.name);

  const pts = [put, ...mids, take];
  const n = pts.length;
  const W = 320;
  const H = height ?? Math.max(106, 44 + n * 62);
  const cx = W / 2;

  const nodes: Array<[number, number, string]> = pts.map((name, i) => {
    const t = n === 1 ? 0 : i / (n - 1);
    const x = cx + (i % 2 === 0 ? -1 : 1) * 26;
    const y = 28 + t * (H - 56);
    return [x, y, name];
  });

  // Build smooth path through nodes
  let d = '';
  if (n === 1) {
    d = `M ${cx - 60} ${nodes[0][1] - 14} C ${cx - 20} ${nodes[0][1] + 10}, ${cx + 20} ${nodes[0][1] - 10}, ${cx + 60} ${nodes[0][1] + 14}`;
    nodes[0][0] = cx;
  } else {
    d = `M ${nodes[0][0]} ${nodes[0][1]}`;
    for (let i = 1; i < n; i++) {
      const a = nodes[i - 1];
      const b = nodes[i];
      const my = (a[1] + b[1]) / 2;
      d += ` C ${a[0]} ${my}, ${b[0]} ${my}, ${b[0]} ${b[1]}`;
    }
  }

  const roleOf = (i: number) =>
    i === 0 ? 'Put-in' : i === n - 1 ? 'Take-out' : 'Access';

  const dotStroke = (i: number) =>
    i === 0
      ? 'var(--alpine-600, #2b6fa8)'
      : i === n - 1
      ? 'var(--flow-600, #1a5ea6)'
      : 'var(--ink-500, #7b8fa6)';

  // Arrowhead near take-out
  let arrowPath: string | null = null;
  if (n > 1) {
    const b = nodes[n - 1];
    const a = nodes[n - 2];
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const ax = b[0] - Math.cos(ang) * 16;
    const ay = b[1] - Math.sin(ang) * 16;
    arrowPath = `M ${ax - Math.cos(ang - 0.5) * 9} ${ay - Math.sin(ang - 0.5) * 9} L ${ax} ${ay} L ${ax - Math.cos(ang + 0.5) * 9} ${ay - Math.sin(ang + 0.5) * 9}`;
  }

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 360, margin: '0 auto' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* underlay */}
        <path d={d} fill="none" stroke="var(--module-stroke)" strokeWidth="10" strokeLinecap="round" />
        {/* colored section path */}
        <path
          d={d}
          fill="none"
          stroke={statusColor(section.status)}
          strokeWidth="5.5"
          strokeLinecap="round"
        />
        {/* arrowhead */}
        {arrowPath && (
          <path
            d={arrowPath}
            fill="none"
            stroke="var(--fg-on-sky-1)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />
        )}
        {/* nodes */}
        {nodes.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r="7" fill="var(--bg-card)" stroke={dotStroke(i)} strokeWidth="3" />
        ))}
      </svg>

      {/* labels */}
      {nodes.map((p, i) => {
        const leftSide = p[0] >= cx;
        return (
          <div
            key={`sl${i}`}
            style={{
              position: 'absolute',
              left: `${(p[0] / W) * 100}%`,
              top: `${(p[1] / H) * 100}%`,
              transform: `translate(${leftSide ? '-100%' : '0'}, -50%)`,
              paddingLeft: leftSide ? 0 : 16,
              paddingRight: leftSide ? 16 : 0,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              textAlign: leftSide ? 'right' : 'left',
            }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--fg-on-sky-1)', textShadow: '0 1px 3px rgba(0,0,0,0.45)' }}>
              {p[2]}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--fg-on-sky-3)' }}>
              {roleOf(i)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
