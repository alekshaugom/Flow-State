/**
 * Section.tsx — immersive section-detail screen (mobile + desktop).
 *
 * Mobile:   floating sky header → hero gauge → discharge chart →
 *           section map → access accordion → rapids → weather →
 *           snowpack → dam release → log CTA → attribution
 * Desktop:  two-column layout with the same modules.
 *
 * Data source: useRiverDetail(sectionId) → DetailViewModel
 * Modules whose data is absent are omitted entirely — no placeholders.
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRiverDetail } from '../hooks/useRiverDetail';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { usePreferences } from '../hooks/usePreferences';
import { flowValue, flowUnitLabel, formatTemp, formatLength } from '../lib/units';
import { Shell } from '../shell/Shell';
import { FlowGauge } from '../components/FlowGauge';
import {
  Icon,
  Module,
  MetricTile,
  SkyBg,
  PeriodFlowChart,
  statusColor,
  WeatherModule,
  SnowpackModule,
  DamReleaseModule,
  ShuttleModule,
  GuidesModule,
} from '../ds';
import { GeoMap } from '../components/GeoMap';
import { STATUS_COLORS } from '../constants';
import type { DesignStatus } from '../constants';

// ── helpers ─────────────────────────────────────────────────────────────────

function gaugeSourceLabel(id?: string | null): string { return id?.startsWith('cdss-') ? 'CDSS' : 'USGS'; }

const navBtn: React.CSSProperties = {
  background: 'var(--module-fill)',
  border: 'none',
  borderRadius: 99,
  width: 38,
  height: 38,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--fg-on-sky-1)',
  cursor: 'pointer',
  backdropFilter: 'blur(8px)',
  flexShrink: 0,
  WebkitTapHighlightColor: 'transparent',
};

function tryParseJson(raw: string | null | undefined): unknown {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function safeStrArr(val: unknown): string[] {
  if (Array.isArray(val)) return val.filter((x): x is string => typeof x === 'string');
  if (typeof val === 'string' && val.trim()) return [val];
  return [];
}

// ── PulseSkeleton ─────────────────────────────────────────────────────────

function PulseSkeleton({ height = 80, radius = 16 }: { height?: number; radius?: number }) {
  return (
    <div
      style={{
        height,
        borderRadius: radius,
        background: 'var(--module-fill)',
        animation: 'fsPulse 1.5s ease-in-out infinite',
      }}
    />
  );
}

// ── TrendBadge ────────────────────────────────────────────────────────────

function TrendBadge({ trend, pct }: { trend: 'up' | 'down' | 'stable'; pct: number }) {
  const icon =
    trend === 'up' ? 'trending-up'
    : trend === 'down' ? 'trending-down'
    : null;
  const label =
    trend === 'up' ? (pct > 0 ? `+${pct}%` : 'Rising')
    : trend === 'down' ? (pct > 0 ? `-${pct}%` : 'Falling')
    : 'Steady';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: 'var(--module-fill)',
        borderRadius: 'var(--r-pill)',
        padding: '5px 10px',
        fontSize: 12.5,
        fontWeight: 700,
        color: 'var(--fg-on-sky-1)',
        whiteSpace: 'nowrap',
      }}
    >
      {icon && <Icon name={icon} size={13} />}
      {label}
    </span>
  );
}

// ── arrowBtn (for section nav) ────────────────────────────────────────────────

const arrowBtn: React.CSSProperties = {
  background: 'var(--module-fill)',
  border: 'none',
  borderRadius: 99,
  width: 32,
  height: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--fg-on-sky-1)',
  cursor: 'pointer',
  backdropFilter: 'blur(8px)',
  flexShrink: 0,
  WebkitTapHighlightColor: 'transparent',
};

// ── AccessRow (accordion) — string-based fallback ─────────────────────────────

interface AccessRowProps {
  icon: string;
  roleLabel: string;
  name: string;
  mapsUrl: string;
  isFirst: boolean;
}

function AccessRow({ icon, roleLabel, name, mapsUrl, isFirst }: AccessRowProps) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: isFirst ? 'none' : `1px solid var(--module-stroke)` }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '11px 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--fg-on-sky-1)',
          textAlign: 'left',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            flexShrink: 0,
            background: 'var(--module-fill)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon} size={17} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10.5,
              color: 'var(--fg-on-sky-2)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {roleLabel}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 1 }}>{name}</div>
        </div>
        <Icon
          name="chevron-down"
          size={18}
          color="var(--fg-on-sky-2)"
          style={{
            transition: 'transform 0.2s',
            transform: open ? 'rotate(180deg)' : undefined,
          }}
        />
      </button>
      <div
        style={{
          maxHeight: open ? 180 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.26s ease',
        }}
      >
        <div style={{ paddingLeft: 46, paddingBottom: 13 }}>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              textDecoration: 'none',
              background: 'rgba(255,255,255,0.92)',
              color: 'var(--flow-700)',
              fontWeight: 700,
              fontSize: 13.5,
              borderRadius: 'var(--r-pill)',
              padding: '8px 14px',
            }}
          >
            <Icon name="navigation" size={14} />Get directions
          </a>
        </div>
      </div>
    </div>
  );
}

// ── AccessPointRow (accordion) — rich AP object ───────────────────────────────
// Used when detail.sectionAccess is present (preferred path).

interface AccessPointRowProps {
  ap: any;
  isFirst: boolean;
}

function AccessPointRow({ ap, isFirst }: AccessPointRowProps) {
  const [open, setOpen] = useState(false);
  const hasDetails = !!(ap.notes || ap.directions);

  const mapsUrl =
    ap.latitude != null && ap.longitude != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${ap.latitude},${ap.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ap.name ?? 'river access')}`;

  const icon =
    ap.kind === 'put-in' ? 'navigation'
    : ap.kind === 'take-out' ? 'flag'
    : 'map-pin';

  const roleLabel =
    ap.kind === 'put-in' ? 'Put-in'
    : ap.kind === 'take-out' ? 'Take-out'
    : ap.kind === 'alternative' ? 'Alternative access'
    : 'Access point';

  return (
    <div style={{ borderTop: isFirst ? 'none' : `1px solid var(--module-stroke)` }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '11px 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--fg-on-sky-1)',
          textAlign: 'left',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            flexShrink: 0,
            background: 'var(--module-fill)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon} size={17} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10.5,
              color: 'var(--fg-on-sky-2)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {roleLabel}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 1 }}>{ap.name}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {ap.fee != null && (
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                background: 'var(--module-fill)',
                borderRadius: 'var(--r-pill)',
                padding: '3px 8px',
                whiteSpace: 'nowrap',
              }}
            >
              ${ap.fee}
            </span>
          )}
          <Icon
            name="chevron-down"
            size={18}
            color="var(--fg-on-sky-2)"
            style={{
              transition: 'transform 0.2s',
              transform: open ? 'rotate(180deg)' : undefined,
            }}
          />
        </div>
      </button>
      <div
        style={{
          maxHeight: open ? 320 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.26s ease',
        }}
      >
        <div style={{ paddingLeft: 46, paddingBottom: 13 }}>
          {ap.notes && (
            <div
              style={{
                fontSize: 13.5,
                color: 'var(--fg-on-sky-1)',
                lineHeight: 1.5,
                marginBottom: 8,
              }}
            >
              {ap.notes}
            </div>
          )}
          {ap.directions && (
            <div
              style={{
                fontSize: 13,
                color: 'var(--fg-on-sky-2)',
                lineHeight: 1.45,
                marginBottom: 8,
              }}
            >
              {ap.directions}
            </div>
          )}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              textDecoration: 'none',
              background: 'rgba(255,255,255,0.92)',
              color: 'var(--flow-700)',
              fontWeight: 700,
              fontSize: 13.5,
              borderRadius: 'var(--r-pill)',
              padding: '8px 14px',
            }}
          >
            <Icon name="navigation" size={14} />Get directions
          </a>
        </div>
      </div>
    </div>
  );
}

// ── RapidRow (expandable) ─────────────────────────────────────────────────

function RapidRow({ rapid, isFirst }: { rapid: any; isFirst: boolean }) {
  const [open, setOpen] = useState(false);
  const hazards = safeStrArr(tryParseJson(rapid.hazardsJson));
  const lines = safeStrArr(tryParseJson(rapid.linesJson));
  const hasDetails = hazards.length > 0 || lines.length > 0 || rapid.scoutPortageNotes;

  return (
    <div style={{ borderTop: isFirst ? 'none' : `1px solid var(--module-stroke)` }}>
      <button
        onClick={() => hasDetails ? setOpen(o => !o) : undefined}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '11px 0',
          background: 'none',
          border: 'none',
          cursor: hasDetails ? 'pointer' : 'default',
          color: 'var(--fg-on-sky-1)',
          textAlign: 'left',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              fontWeight: 700,
              background: 'var(--module-fill)',
              borderRadius: 6,
              padding: '2px 9px',
              whiteSpace: 'nowrap',
            }}
          >
            Class {rapid.classRating}
          </span>
          <span style={{ fontSize: 15.5, fontWeight: 600 }}>{rapid.name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {rapid.riverMile != null && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--fg-on-sky-3)',
              }}
            >
              mi {rapid.riverMile}
            </span>
          )}
          {hasDetails && (
            <Icon
              name="chevron-down"
              size={16}
              color="var(--fg-on-sky-2)"
              style={{
                transition: 'transform 0.2s',
                transform: open ? 'rotate(180deg)' : undefined,
              }}
            />
          )}
        </div>
      </button>

      {hasDetails && (
        <div
          style={{
            maxHeight: open ? 400 : 0,
            overflow: 'hidden',
            transition: 'max-height 0.28s ease',
          }}
        >
          <div style={{ paddingBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {hazards.length > 0 && (
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--fg-on-sky-3)',
                    marginBottom: 4,
                  }}
                >
                  Hazards
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--fg-on-sky-1)', lineHeight: 1.5 }}>
                  {hazards.join(' · ')}
                </div>
              </div>
            )}
            {lines.length > 0 && (
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--fg-on-sky-3)',
                    marginBottom: 4,
                  }}
                >
                  Lines
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--fg-on-sky-1)', lineHeight: 1.5 }}>
                  {lines.join(' · ')}
                </div>
              </div>
            )}
            {rapid.scoutPortageNotes && (
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--fg-on-sky-3)',
                    marginBottom: 4,
                  }}
                >
                  Scout / portage
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--fg-on-sky-1)', lineHeight: 1.5 }}>
                  {rapid.scoutPortageNotes}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// WeatherModule, SnowpackModule, DamReleaseModule are imported from '../ds'

// ── GradientVelocityModule ────────────────────────────────────────────────
// Renders a 2-up (or 3-up) MetricTile grid for gradient, velocity, and optionally
// elevation drop. Returns null when all values are null.

interface GradientVelocityProps {
  gradient: number | null;
  velocity: number | null;
  elevationDrop: number | null;
}

function GradientVelocityModule({ gradient, velocity, elevationDrop }: GradientVelocityProps) {
  const hasAny = gradient != null || velocity != null || elevationDrop != null;
  if (!hasAny) return null;

  const cols = [gradient, velocity, elevationDrop].filter(v => v != null).length;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 12,
        marginTop: 14,
      }}
    >
      {gradient != null && (
        <Module>
          <MetricTile icon="trending-down" label="Gradient" value={gradient} unit="ft/mi" />
        </Module>
      )}
      {velocity != null && (
        <Module>
          <MetricTile icon="wind" label="Velocity" value={velocity} unit="ft/s" />
        </Module>
      )}
      {elevationDrop != null && (
        <Module>
          <MetricTile icon="arrow-down" label="Elev. drop" value={elevationDrop} unit="ft" />
        </Module>
      )}
    </div>
  );
}

// ── HistoricContextModule ─────────────────────────────────────────────────
// Shows the current flow vs the long-term record for this date:
//   • big pct-of-median headline
//   • cfs line: today vs n-yr median
//   • range bar with median tick + today marker
//   • footer percentile note

interface HistoricCtx {
  pct: number;
  word: string;
  percentileApprox: number;
  median: number;
  min: number;
  max: number;
  p10: number;
  p90: number;
  years: number;
  current: number;
}

function HistoricContextModule({ ctx }: { ctx: HistoricCtx | null }) {
  if (!ctx) return null;
  const { units } = usePreferences();

  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const range = ctx.max - ctx.min;
  const fr = (v: number) => range > 0 ? Math.max(0, Math.min(1, (v - ctx.min) / range)) : 0;

  const medianFr = fr(ctx.median);
  const currentFr = fr(ctx.current);

  return (
    <Module label="Historic context" icon="clock" style={{ marginTop: 14 }}>
      {/* headline row */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span
          style={{
            fontWeight: 300,
            fontSize: 38,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--fg-on-sky-1)',
          }}
        >
          {ctx.pct}%
        </span>
        <span style={{ fontSize: 14, color: 'var(--fg-on-sky-2)' }}>
          of median for {dateLabel}
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 14.5,
            fontWeight: 700,
            color: 'var(--fg-on-sky-1)',
            whiteSpace: 'nowrap',
          }}
        >
          {ctx.word}
        </span>
      </div>

      {/* flow summary line */}
      <div
        style={{
          fontSize: 13,
          color: 'var(--fg-on-sky-1)',
          marginTop: 5,
        }}
      >
        Today{' '}
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          {flowValue(ctx.current, units.flow)}
        </span>{' '}
        {flowUnitLabel(units.flow)} · {ctx.years}-yr median{' '}
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          {flowValue(ctx.median, units.flow)}
        </span>{' '}
        {flowUnitLabel(units.flow)}
      </div>

      {/* range bar */}
      <div style={{ marginTop: 18, marginBottom: 4 }}>
        <div
          style={{
            position: 'relative',
            height: 6,
            borderRadius: 3,
            background: 'var(--module-fill)',
          }}
        >
          {/* median tick */}
          <div
            style={{
              position: 'absolute',
              top: -4,
              left: `calc(${medianFr * 100}% - 1px)`,
              width: 2,
              height: 14,
              background: 'var(--fg-on-sky-3)',
              borderRadius: 1,
            }}
          />
          {/* today marker */}
          <div
            style={{
              position: 'absolute',
              top: -4,
              left: `calc(${currentFr * 100}% - 7px)`,
              width: 14,
              height: 14,
              borderRadius: 99,
              background: 'var(--fg-on-sky-1)',
              boxShadow: '0 0 0 2px var(--flow-600), 0 1px 3px rgba(6,19,33,0.4)',
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--fg-on-sky-3)',
            marginTop: 8,
          }}
        >
          <span>Low {flowValue(ctx.min, units.flow)}</span>
          <span>High {flowValue(ctx.max, units.flow)}</span>
        </div>
      </div>

      {/* footer */}
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--fg-on-sky-3)',
          marginTop: 8,
        }}
      >
        {ctx.percentileApprox}th percentile · {ctx.years}-yr record
      </div>
    </Module>
  );
}

// ── MobileSectionContent ──────────────────────────────────────────────────

interface SectionContentProps {
  sectionId: string;
}

function MobileSectionContent({ sectionId }: SectionContentProps) {
  const navigate = useNavigate();
  const { data: detail, isLoading, isError } = useRiverDetail(sectionId);
  const { units } = usePreferences();

  if (isLoading) {
    return (
      <div style={{ padding: '0 14px 60px' }}>
        {/* header placeholder */}
        <div style={{ height: 110, background: 'var(--module-fill)', borderRadius: 22, marginTop: 0 }} />
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PulseSkeleton height={200} />
          <PulseSkeleton height={160} />
          <PulseSkeleton height={120} />
        </div>
      </div>
    );
  }

  if (isError || !detail) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          gap: 16,
          padding: 24,
          color: 'var(--fg-on-sky-1)',
        }}
      >
        <Icon name="waves" size={42} color="rgba(255,255,255,0.35)" />
        <div style={{ fontSize: 18, fontWeight: 700 }}>Unable to load section</div>
        <div style={{ fontSize: 14, color: 'var(--fg-on-sky-3)', textAlign: 'center' }}>
          Check your connection and try again.
        </div>
        <button onClick={() => navigate(-1)} style={{ ...navBtn, width: 'auto', padding: '10px 20px', borderRadius: 'var(--r-pill)', fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-sans)' }}>
          Go back
        </button>
      </div>
    );
  }

  const sc = STATUS_COLORS[detail.status as DesignStatus];
  const gaugeInfo = detail.gauges?.[0];
  const gaugeAttribution = gaugeInfo
    ? `${gaugeSourceLabel(gaugeInfo.id)} ${gaugeInfo.id ?? ''} · ${gaugeInfo.name ?? 'gauge'}`
    : 'Live gauge readings';

  // Thresholds for FlowGauge: it uses `thresholds` directly (Thresholds type)
  const thresholds = detail.thresholds;

  // Optimal band for FlowChart
  const optimal: [number, number] | undefined =
    thresholds.idealLo > 0 && thresholds.idealHi > thresholds.idealLo
      ? [thresholds.idealLo, thresholds.idealHi]
      : undefined;

  // Access rows
  const putInName = detail.putIn;
  const takeOutName = detail.takeOut;

  const makeMapsUrl = (name: string | null, lat?: number | null, lng?: number | null) => {
    if (lat != null && lng != null) {
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name ?? 'river access')}`;
  };

  // Section nav from siblingSections
  const siblings = detail.siblingSections ?? [];
  const sibIdx = siblings.findIndex(s => s.id === detail.id);
  const prevSib = sibIdx > 0 ? siblings[sibIdx - 1] : null;
  const nextSib = sibIdx >= 0 && sibIdx < siblings.length - 1 ? siblings[sibIdx + 1] : null;

  const hasRapids = detail.rapids?.length > 0;
  const hasWeather = detail.weatherForecast?.length > 0;
  const hasSnowpack = detail.snowpack?.length > 0;
  const hasDamData = detail.reservoirs?.length > 0 || detail.damControlled;

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '0 14px 80px' }}>
      {/* ── sticky floating header ── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          margin: '0 -14px',
          padding: '52px 14px 14px',
          color: 'var(--fg-on-sky-1)',
          borderBottomLeftRadius: 22,
          borderBottomRightRadius: 22,
          boxShadow: '0 12px 28px rgba(6,19,33,0.42)',
          background: 'linear-gradient(180deg, rgba(6,19,33,0.38) 0%, rgba(6,19,33,0.20) 100%), var(--sky-river, #1a6fa8)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => navigate(-1)} style={navBtn}>
            <Icon name="chevron-left" size={22} />
          </button>
          <div
            style={{
              flex: 1,
              textAlign: 'center',
              minWidth: 0,
              padding: '0 4px',
            }}
          >
            <div
              style={{
                fontSize: 17,
                fontWeight: 800,
                letterSpacing: '-0.015em',
                textShadow: '0 1px 6px rgba(6,19,33,0.55)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {detail.section}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--fg-on-sky-2)',
                marginTop: 1,
              }}
            >
              {detail.river} · {detail.classification}
            </div>
          </div>
          <button style={navBtn}>
            <Icon name="bookmark" size={18} />
          </button>
        </div>
      </div>

      {/* ── hero ── */}
      <div style={{ textAlign: 'center', color: 'var(--fg-on-sky-1)', marginTop: 20 }}>
        {detail.now != null ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <FlowGauge
              currentFlow={detail.now}
              thresholds={thresholds}
              size={148}
            />
          </div>
        ) : (
          <div
            style={{
              fontSize: 64,
              fontWeight: 200,
              lineHeight: 1,
              color: 'var(--fg-on-sky-1)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            —
          </div>
        )}

        {/* status + cfs label */}
        <div style={{ marginTop: 6 }}>
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: statusColor(detail.status as DesignStatus),
            }}
          >
            {detail.statusLabel}
          </span>
        </div>

        {/* badges row */}
        <div
          style={{
            display: 'inline-flex',
            gap: 8,
            marginTop: 12,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <TrendBadge trend={detail.trend} pct={detail.trendPct} />
          {(putInName || takeOutName) && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'var(--module-fill)',
                borderRadius: 'var(--r-pill)',
                padding: '5px 10px',
                fontSize: 12.5,
                fontWeight: 700,
                color: 'var(--fg-on-sky-1)',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon name="map-pin" size={12} />
              {[putInName, takeOutName].filter(Boolean).join(' → ')}
            </span>
          )}
          {detail.miles != null && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'var(--module-fill)',
                borderRadius: 'var(--r-pill)',
                padding: '5px 10px',
                fontSize: 12.5,
                fontWeight: 700,
                color: 'var(--fg-on-sky-1)',
              }}
            >
              {formatLength(detail.miles, units.length)}
            </span>
          )}
        </div>
      </div>

      {/* ── discharge chart ── */}
      <div style={{ marginTop: 16 }}>
        <div
          style={{
            borderRadius: 'var(--r-xl)',
            overflow: 'hidden',
            color: 'var(--fg-on-sky-1)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.08) 60%, rgba(255,255,255,0.05) 100%)',
            backdropFilter: 'blur(20px) saturate(150%)',
            WebkitBackdropFilter: 'blur(20px) saturate(150%)',
            boxShadow: '0 18px 40px rgba(6,19,33,0.30), inset 0 1px 0 rgba(255,255,255,0.30)',
            border: `1px solid var(--module-stroke)`,
            padding: '15px 16px 14px',
          }}
        >
          {/* gauge name */}
          {gaugeInfo?.name && (
            <div
              style={{
                fontSize: 15,
                fontWeight: 800,
                textAlign: 'center',
                letterSpacing: '-0.01em',
                marginBottom: 10,
              }}
            >
              {gaugeInfo.name}
            </div>
          )}

          {/* current cfs + status */}
          {detail.now != null && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
              <span
                style={{
                  fontWeight: 300,
                  fontSize: 38,
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                  color: statusColor(detail.status as DesignStatus),
                }}
              >
                {flowValue(detail.now, units.flow)}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--fg-on-sky-2)' }}>
                {flowUnitLabel(units.flow)}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700 }}>
                {detail.statusLabel}
              </span>
            </div>
          )}

          {/* chart — full-width via bleedX offsetting the tile's 16px side padding */}
          <PeriodFlowChart
            history={detail.history}
            optimal={optimal}
            height={130}
            onSky
            bleedX={16}
          />

          {/* optimal band note */}
          {optimal && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontFamily: 'var(--font-mono)',
                fontSize: 10.5,
                color: 'var(--fg-on-sky-3)',
                marginTop: 4,
              }}
            >
              <span>Optimal {flowValue(thresholds.idealLo, units.flow)}–{flowValue(thresholds.idealHi, units.flow)} {flowUnitLabel(units.flow)}</span>
              <span>{gaugeInfo?.id ? `${gaugeSourceLabel(gaugeInfo.id)} ${gaugeInfo.id}` : ''}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── historic context ── */}
      <HistoricContextModule ctx={detail.historicContext ?? null} />

      {/* ── gradient + velocity ── */}
      <GradientVelocityModule
        gradient={detail.gradient ?? null}
        velocity={detail.velocity ?? null}
        elevationDrop={detail.elevationDrop ?? null}
      />

      {/* ── section map ── */}
      <Module label="Section map" icon="map" flush style={{ marginTop: 14 }}>
        <GeoMap
          sections={[{
            id: sectionId,
            river: detail.river,
            section: detail.section,
            classification: detail.classification,
            now: detail.now,
            status: detail.status,
            statusLabel: detail.statusLabel,
            trend: detail.trend === 'up' ? 'up' : detail.trend === 'down' ? 'down' : 'stable',
          }]}
          height={200}
          style={{ width: '100%', display: 'block' }}
        />
      </Module>

      {/* ── access accordion ── */}
      {(() => {
        const sa = detail.sectionAccess;
        if (sa) {
          // Rich AP path: drive from sectionAccess object
          const apRows: Array<{ ap: any; isFirst: boolean }> = [];
          if (sa.putIn) apRows.push({ ap: { ...sa.putIn, kind: 'put-in' }, isFirst: apRows.length === 0 });
          for (const alt of (sa.alternatives ?? [])) {
            apRows.push({ ap: { ...alt, kind: 'alternative' }, isFirst: apRows.length === 0 });
          }
          if (sa.takeOut) apRows.push({ ap: { ...sa.takeOut, kind: 'take-out' }, isFirst: apRows.length === 0 });
          if (!apRows.length) return null;

          // Section nav header content
          const navHeader = (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
              {prevSib ? (
                <button onClick={() => navigate(`/section/${prevSib.id}`)} style={arrowBtn}>
                  <Icon name="chevron-left" size={17} />
                </button>
              ) : (
                <span style={{ width: 32, height: 32, flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--fg-on-sky-3)',
                    letterSpacing: '0.13em',
                    textTransform: 'uppercase',
                  }}
                >
                  Access
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {detail.section}
                </div>
              </div>
              {nextSib ? (
                <button onClick={() => navigate(`/section/${nextSib.id}`)} style={arrowBtn}>
                  <Icon name="chevron-right" size={17} />
                </button>
              ) : (
                <span style={{ width: 32, height: 32, flexShrink: 0 }} />
              )}
            </div>
          );

          return (
            <Module label="" icon="navigation" style={{ marginTop: 14, paddingBottom: 6 }}>
              <div style={{ marginBottom: 6, color: 'var(--fg-on-sky-1)' }}>{navHeader}</div>
              {apRows.map(({ ap, isFirst }) => (
                <AccessPointRow key={ap.id ?? ap.name} ap={ap} isFirst={isFirst} />
              ))}
            </Module>
          );
        }

        // Fallback: string-based put-in/take-out
        if (!putInName && !takeOutName) return null;
        return (
          <Module label="Access" icon="navigation" style={{ marginTop: 14, paddingBottom: 6 }}>
            {siblings.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', marginBottom: 6, color: 'var(--fg-on-sky-1)' }}>
                {prevSib ? (
                  <button onClick={() => navigate(`/section/${prevSib.id}`)} style={arrowBtn}>
                    <Icon name="chevron-left" size={17} />
                  </button>
                ) : (
                  <span style={{ width: 32, height: 32, flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-on-sky-3)', letterSpacing: '0.13em', textTransform: 'uppercase' }}>Access</div>
                  <div style={{ fontSize: 15, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{detail.section}</div>
                </div>
                {nextSib ? (
                  <button onClick={() => navigate(`/section/${nextSib.id}`)} style={arrowBtn}>
                    <Icon name="chevron-right" size={17} />
                  </button>
                ) : (
                  <span style={{ width: 32, height: 32, flexShrink: 0 }} />
                )}
              </div>
            )}
            {putInName && (
              <AccessRow
                icon="navigation"
                roleLabel="Put-in"
                name={putInName}
                mapsUrl={makeMapsUrl(putInName)}
                isFirst={true}
              />
            )}
            {takeOutName && (
              <AccessRow
                icon="flag"
                roleLabel="Take-out"
                name={takeOutName}
                mapsUrl={makeMapsUrl(takeOutName)}
                isFirst={!putInName}
              />
            )}
          </Module>
        );
      })()}

      {/* ── rapids ── */}
      {hasRapids && (
        <Module label="Rapids" icon="triangle-alert" style={{ marginTop: 14 }}>
          {detail.rapids.map((r: any, i: number) => (
            <RapidRow key={r.id ?? r.name ?? i} rapid={r} isFirst={i === 0} />
          ))}
        </Module>
      )}

      {/* ── weather ── */}
      {hasWeather && <WeatherModule forecast={detail.weatherForecast} />}

      {/* ── snowpack ── */}
      {hasSnowpack && <SnowpackModule snowpack={detail.snowpack} />}

      {/* ── dam release ── */}
      {hasDamData && (
        <DamReleaseModule
          reservoirs={detail.reservoirs}
          damControlled={detail.damControlled}
          riverName={detail.river}
        />
      )}

      {/* ── guides + shuttle ── */}
      <GuidesModule outfitters={detail.outfitters ?? []} />
      <ShuttleModule businesses={detail.shuttleBusinesses ?? []} />

      {/* ── log CTA ── */}
      <button
        onClick={() => navigate('/log')}
        style={{
          width: '100%',
          marginTop: 16,
          border: 'none',
          cursor: 'pointer',
          background: 'rgba(255,255,255,0.92)',
          color: 'var(--flow-700)',
          fontFamily: 'var(--font-sans)',
          fontWeight: 700,
          fontSize: 16,
          padding: '15px',
          borderRadius: 'var(--r-pill)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <Icon name="flag" size={18} />Log this run
      </button>

      {/* ── attribution footer ── */}
      <div
        style={{
          textAlign: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--fg-on-sky-3)',
          marginTop: 18,
        }}
      >
        {gaugeAttribution} · Updated {detail.updatedAt ? new Date(detail.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'recently'}
      </div>
    </div>
  );
}

// ── DesktopSectionContent ─────────────────────────────────────────────────

function DesktopSectionContent({ sectionId }: SectionContentProps) {
  const navigate = useNavigate();
  const { data: detail, isLoading, isError } = useRiverDetail(sectionId);
  const { units } = usePreferences();

  if (isLoading) {
    return (
      <div style={{ padding: '52px 36px', maxWidth: 1100, margin: '0 auto' }}>
        <PulseSkeleton height={44} radius={10} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, marginTop: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <PulseSkeleton height={200} />
            <PulseSkeleton height={120} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <PulseSkeleton height={160} />
            <PulseSkeleton height={120} />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !detail) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          gap: 16,
          padding: 24,
          color: 'var(--fg-on-sky-1)',
        }}
      >
        <Icon name="waves" size={42} color="rgba(255,255,255,0.35)" />
        <div style={{ fontSize: 18, fontWeight: 700 }}>Unable to load section</div>
        <button onClick={() => navigate(-1)} style={{ ...navBtn, width: 'auto', padding: '10px 20px', borderRadius: 'var(--r-pill)', fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-sans)' }}>
          Go back
        </button>
      </div>
    );
  }

  const sc = STATUS_COLORS[detail.status as DesignStatus];
  const gaugeInfo = detail.gauges?.[0];
  const gaugeAttribution = gaugeInfo
    ? `${gaugeSourceLabel(gaugeInfo.id)} ${gaugeInfo.id ?? ''} · ${gaugeInfo.name ?? 'gauge'}`
    : 'Live gauge readings';

  const thresholds = detail.thresholds;
  const optimal: [number, number] | undefined =
    thresholds.idealLo > 0 && thresholds.idealHi > thresholds.idealLo
      ? [thresholds.idealLo, thresholds.idealHi]
      : undefined;

  const putInName = detail.putIn;
  const takeOutName = detail.takeOut;

  const makeMapsUrl = (name: string | null, lat?: number | null, lng?: number | null) => {
    if (lat != null && lng != null) {
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name ?? 'river access')}`;
  };

  // Section nav from siblingSections
  const siblings = detail.siblingSections ?? [];
  const sibIdx = siblings.findIndex(s => s.id === detail.id);
  const prevSib = sibIdx > 0 ? siblings[sibIdx - 1] : null;
  const nextSib = sibIdx >= 0 && sibIdx < siblings.length - 1 ? siblings[sibIdx + 1] : null;

  const hasRapids = detail.rapids?.length > 0;
  const hasWeather = detail.weatherForecast?.length > 0;
  const hasSnowpack = detail.snowpack?.length > 0;
  const hasDamData = detail.reservoirs?.length > 0 || detail.damControlled;

  return (
    <>
      {/* sticky header bar */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 25,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '20px 36px',
          background: 'linear-gradient(180deg, rgba(6,19,33,0.5) 0%, rgba(6,19,33,0.12) 100%)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          color: 'var(--fg-on-sky-1)',
        }}
      >
        <button onClick={() => navigate(-1)} style={navBtn}>
          <Icon name="chevron-left" size={22} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {detail.section}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--fg-on-sky-2)',
              marginTop: 2,
            }}
          >
            {detail.river} · {detail.classification}
            {detail.miles ? ` · ${formatLength(detail.miles, units.length)}` : ''}
          </div>
        </div>
        <button
          onClick={() => navigate('/log')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            border: 'none',
            cursor: 'pointer',
            background: 'rgba(255,255,255,0.92)',
            color: 'var(--flow-700)',
            fontFamily: 'var(--font-sans)',
            fontWeight: 700,
            fontSize: 14.5,
            borderRadius: 'var(--r-pill)',
            padding: '11px 18px',
            flexShrink: 0,
          }}
        >
          <Icon name="flag" size={17} />Log this run
        </button>
      </div>

      <div style={{ padding: '28px 36px 60px', maxWidth: 1100, margin: '0 auto' }}>
        {/* hero row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 28,
            marginBottom: 28,
            padding: '20px 24px',
            borderRadius: 'var(--r-xl)',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 100%)',
            backdropFilter: 'blur(20px) saturate(150%)',
            WebkitBackdropFilter: 'blur(20px) saturate(150%)',
            border: `1px solid var(--module-stroke)`,
            boxShadow: '0 14px 32px rgba(6,19,33,0.28)',
            color: 'var(--fg-on-sky-1)',
          }}
        >
          {detail.now != null ? (
            <FlowGauge
              currentFlow={detail.now}
              thresholds={thresholds}
              size={130}
            />
          ) : (
            <div style={{ fontSize: 56, fontWeight: 200, color: 'var(--fg-on-sky-1)', lineHeight: 1 }}>—</div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 40,
                fontWeight: 300,
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
                color: statusColor(detail.status as DesignStatus),
              }}
            >
              {detail.now != null ? `${flowValue(detail.now, units.flow)} ${flowUnitLabel(units.flow)}` : '—'}
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--fg-on-sky-1)',
                marginTop: 6,
              }}
            >
              {detail.statusLabel}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <TrendBadge trend={detail.trend} pct={detail.trendPct} />
              {(putInName || takeOutName) && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    background: 'var(--module-fill)',
                    borderRadius: 'var(--r-pill)',
                    padding: '5px 10px',
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: 'var(--fg-on-sky-1)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Icon name="map-pin" size={12} />
                  {[putInName, takeOutName].filter(Boolean).join(' → ')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* two-column layout */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,3fr) minmax(0,2fr)',
            gap: 22,
            alignItems: 'start',
          }}
        >
          {/* left column — chart, access, rapids, weather */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* discharge chart */}
            <div
              style={{
                borderRadius: 'var(--r-xl)',
                color: 'var(--fg-on-sky-1)',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.08) 60%, rgba(255,255,255,0.05) 100%)',
                backdropFilter: 'blur(20px) saturate(150%)',
                WebkitBackdropFilter: 'blur(20px) saturate(150%)',
                boxShadow: '0 18px 40px rgba(6,19,33,0.30), inset 0 1px 0 rgba(255,255,255,0.30)',
                border: `1px solid var(--module-stroke)`,
                padding: '18px 20px 16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 14,
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em' }}>
                    {gaugeInfo?.name ?? 'Discharge'}
                  </div>
                  {optimal && (
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10.5,
                        color: 'var(--fg-on-sky-3)',
                        marginTop: 2,
                      }}
                    >
                      {`Optimal ${flowValue(thresholds.idealLo, units.flow)}–${flowValue(thresholds.idealHi, units.flow)} ${flowUnitLabel(units.flow)}`}
                    </div>
                  )}
                </div>
              </div>
              {/* chart — full-width via bleedX offsetting the tile's 20px side padding */}
              <PeriodFlowChart
                history={detail.history}
                optimal={optimal}
                height={160}
                onSky
                bleedX={20}
              />
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10.5,
                  color: 'var(--fg-on-sky-3)',
                  marginTop: 6,
                  textAlign: 'right',
                }}
              >
                {gaugeInfo?.id ? `${gaugeSourceLabel(gaugeInfo.id)} ${gaugeInfo.id}` : ''}
              </div>
            </div>

            {/* historic context */}
            <HistoricContextModule ctx={detail.historicContext ?? null} />

            {/* gradient + velocity */}
            <GradientVelocityModule
              gradient={detail.gradient ?? null}
              velocity={detail.velocity ?? null}
              elevationDrop={detail.elevationDrop ?? null}
            />

            {/* access accordion */}
            {(() => {
              const sa = detail.sectionAccess;
              if (sa) {
                const apRows: Array<{ ap: any; isFirst: boolean }> = [];
                if (sa.putIn) apRows.push({ ap: { ...sa.putIn, kind: 'put-in' }, isFirst: apRows.length === 0 });
                for (const alt of (sa.alternatives ?? [])) {
                  apRows.push({ ap: { ...alt, kind: 'alternative' }, isFirst: apRows.length === 0 });
                }
                if (sa.takeOut) apRows.push({ ap: { ...sa.takeOut, kind: 'take-out' }, isFirst: apRows.length === 0 });
                if (!apRows.length) return null;

                const navHeader = (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                    {prevSib ? (
                      <button onClick={() => navigate(`/section/${prevSib.id}`)} style={arrowBtn}>
                        <Icon name="chevron-left" size={17} />
                      </button>
                    ) : (
                      <span style={{ width: 32, height: 32, flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-on-sky-3)', letterSpacing: '0.13em', textTransform: 'uppercase' }}>Access</div>
                      <div style={{ fontSize: 15, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{detail.section}</div>
                    </div>
                    {nextSib ? (
                      <button onClick={() => navigate(`/section/${nextSib.id}`)} style={arrowBtn}>
                        <Icon name="chevron-right" size={17} />
                      </button>
                    ) : (
                      <span style={{ width: 32, height: 32, flexShrink: 0 }} />
                    )}
                  </div>
                );

                return (
                  <Module label="" icon="navigation" style={{ paddingBottom: 6 }}>
                    <div style={{ marginBottom: 6, color: 'var(--fg-on-sky-1)' }}>{navHeader}</div>
                    {apRows.map(({ ap, isFirst }) => (
                      <AccessPointRow key={ap.id ?? ap.name} ap={ap} isFirst={isFirst} />
                    ))}
                  </Module>
                );
              }

              if (!putInName && !takeOutName) return null;
              return (
                <Module label="Access" icon="navigation" style={{ paddingBottom: 6 }}>
                  {siblings.length > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', marginBottom: 6, color: 'var(--fg-on-sky-1)' }}>
                      {prevSib ? (
                        <button onClick={() => navigate(`/section/${prevSib.id}`)} style={arrowBtn}>
                          <Icon name="chevron-left" size={17} />
                        </button>
                      ) : (
                        <span style={{ width: 32, height: 32, flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-on-sky-3)', letterSpacing: '0.13em', textTransform: 'uppercase' }}>Access</div>
                        <div style={{ fontSize: 15, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{detail.section}</div>
                      </div>
                      {nextSib ? (
                        <button onClick={() => navigate(`/section/${nextSib.id}`)} style={arrowBtn}>
                          <Icon name="chevron-right" size={17} />
                        </button>
                      ) : (
                        <span style={{ width: 32, height: 32, flexShrink: 0 }} />
                      )}
                    </div>
                  )}
                  {putInName && (
                    <AccessRow
                      icon="navigation"
                      roleLabel="Put-in"
                      name={putInName}
                      mapsUrl={makeMapsUrl(putInName)}
                      isFirst={true}
                    />
                  )}
                  {takeOutName && (
                    <AccessRow
                      icon="flag"
                      roleLabel="Take-out"
                      name={takeOutName}
                      mapsUrl={makeMapsUrl(takeOutName)}
                      isFirst={!putInName}
                    />
                  )}
                </Module>
              );
            })()}

            {/* rapids */}
            {hasRapids && (
              <Module label="Rapids" icon="triangle-alert">
                {detail.rapids.map((r: any, i: number) => (
                  <RapidRow key={r.id ?? r.name ?? i} rapid={r} isFirst={i === 0} />
                ))}
              </Module>
            )}

            {/* weather */}
            {hasWeather && <WeatherModule forecast={detail.weatherForecast} />}

            {/* shuttle */}
            <ShuttleModule businesses={detail.shuttleBusinesses ?? []} />
          </div>

          {/* right column — map, snowpack, dam, guides */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Module label="Section map" icon="map" flush>
              <GeoMap
                sections={[{
                  id: sectionId,
                  river: detail.river,
                  section: detail.section,
                  classification: detail.classification,
                  now: detail.now,
                  status: detail.status,
                  statusLabel: detail.statusLabel,
                  trend: detail.trend === 'up' ? 'up' : detail.trend === 'down' ? 'down' : 'stable',
                }]}
                height={220}
                style={{ width: '100%', display: 'block' }}
              />
            </Module>

            {hasSnowpack && <SnowpackModule snowpack={detail.snowpack} />}
            {hasDamData && (
              <DamReleaseModule
                reservoirs={detail.reservoirs}
                damControlled={detail.damControlled}
                riverName={detail.river}
              />
            )}

            {/* guides */}
            <GuidesModule outfitters={detail.outfitters ?? []} />
          </div>
        </div>

        {/* attribution */}
        <div
          style={{
            textAlign: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: 11.5,
            color: 'var(--fg-on-sky-3)',
            marginTop: 28,
          }}
        >
          {gaugeAttribution} · Updated{' '}
          {detail.updatedAt
            ? new Date(detail.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'recently'}
        </div>
      </div>
    </>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function Section() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const navigate = useNavigate();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (!sectionId) {
    navigate('/', { replace: true });
    return null;
  }

  if (isDesktop) {
    return (
      <Shell active="rivers" light={false}>
        <style>{`@keyframes fsPulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
        <DesktopSectionContent sectionId={sectionId} />
      </Shell>
    );
  }

  return (
    <Shell active="rivers" light={false}>
      <style>{`@keyframes fsPulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
      <SkyBg sky="river" style={{ position: 'fixed', inset: 0 }}>
        <MobileSectionContent sectionId={sectionId} />
      </SkyBg>
    </Shell>
  );
}
