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
import { Shell } from '../shell/Shell';
import { FlowGauge } from '../components/FlowGauge';
import {
  Icon,
  Module,
  SkyBg,
  FlowChart,
  statusColor,
} from '../ds';
import { GeoMap } from '../components/GeoMap';
import { STATUS_COLORS } from '../constants';
import type { DesignStatus } from '../constants';

// ── helpers ─────────────────────────────────────────────────────────────────

const navBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.16)',
  border: 'none',
  borderRadius: 99,
  width: 38,
  height: 38,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  cursor: 'pointer',
  backdropFilter: 'blur(8px)',
  flexShrink: 0,
  WebkitTapHighlightColor: 'transparent',
};

const PERIOD_OPTIONS: Array<{ label: string; days: number }> = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: '1Y', days: 365 },
];

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
        background: 'rgba(255,255,255,0.12)',
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
        background: 'rgba(255,255,255,0.16)',
        borderRadius: 'var(--r-pill)',
        padding: '5px 10px',
        fontSize: 12.5,
        fontWeight: 700,
        color: '#fff',
        whiteSpace: 'nowrap',
      }}
    >
      {icon && <Icon name={icon} size={13} />}
      {label}
    </span>
  );
}

// ── AccessRow (accordion) ─────────────────────────────────────────────────

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
    <div style={{ borderTop: isFirst ? 'none' : '1px solid rgba(255,255,255,0.12)' }}>
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
          color: '#fff',
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
            background: 'rgba(255,255,255,0.16)',
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

// ── RapidRow (expandable) ─────────────────────────────────────────────────

function RapidRow({ rapid, isFirst }: { rapid: any; isFirst: boolean }) {
  const [open, setOpen] = useState(false);
  const hazards = safeStrArr(tryParseJson(rapid.hazardsJson));
  const lines = safeStrArr(tryParseJson(rapid.linesJson));
  const hasDetails = hazards.length > 0 || lines.length > 0 || rapid.scoutPortageNotes;

  return (
    <div style={{ borderTop: isFirst ? 'none' : '1px solid rgba(255,255,255,0.14)' }}>
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
          color: '#fff',
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
              background: 'rgba(255,255,255,0.16)',
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

// ── WeatherModule ─────────────────────────────────────────────────────────

const conditionToIcon: Record<string, string> = {
  'clear': 'sun',
  'partly-cloudy': 'cloud-sun',
  'cloudy': 'cloud',
  'fog': 'cloud-fog',
  'rain': 'cloud-rain',
  'snow': 'cloud-snow',
  'thunderstorm': 'cloud-bolt',
};

function dayShort(iso: string, idx: number): string {
  if (idx === 0) return 'Today';
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  return date.toLocaleDateString(undefined, { weekday: 'short' });
}

function WeatherModule({ forecast }: { forecast: any[] }) {
  if (!forecast?.length) return null;
  const today = forecast[0];
  const todayCond = today?.condition ?? null;
  const todayIcon = conditionToIcon[todayCond] ?? 'cloud';
  const todayHigh = today?.tempHighF != null ? Math.round(today.tempHighF) : null;
  const todayLow = today?.tempLowF != null ? Math.round(today.tempLowF) : null;

  return (
    <Module label="Weather" icon="cloud" style={{ marginTop: 14 }}>
      {/* current day summary */}
      {today && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: 14,
            paddingBottom: 14,
            borderBottom: '1px solid rgba(255,255,255,0.14)',
          }}
        >
          <Icon name={todayIcon} size={36} color="#fff" />
          <div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 300,
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
                color: '#fff',
              }}
            >
              {todayHigh != null ? `${todayHigh}°` : '—'}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--fg-on-sky-2)',
                marginTop: 3,
              }}
            >
              {todayCond ?? 'Unknown'} · Low {todayLow != null ? `${todayLow}°` : '—'}
              {today.precipProb > 0 ? ` · ${Math.round(today.precipProb)}% precip` : ''}
            </div>
          </div>
        </div>
      )}

      {/* multi-day strip */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
        {forecast.slice(0, 10).map((w: any, idx: number) => {
          const cond = w.condition ?? null;
          const ic = conditionToIcon[cond] ?? 'cloud';
          const hi = w.tempHighF != null ? Math.round(w.tempHighF) : null;
          const lo = w.tempLowF != null ? Math.round(w.tempLowF) : null;
          const precip = w.precipProb != null && w.precipProb > 0 ? Math.round(w.precipProb) : null;
          return (
            <div
              key={w.date ?? idx}
              style={{
                flex: '0 0 auto',
                width: 54,
                padding: '8px 4px',
                borderRadius: 'var(--r-md)',
                background: idx === 0 ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.10)',
                border: idx === 0 ? '1px solid rgba(255,255,255,0.35)' : '1px solid rgba(255,255,255,0.14)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <div
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.75)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                }}
              >
                {dayShort(w.date, idx)}
              </div>
              <Icon name={ic} size={18} color="#fff" strokeWidth={1.6} />
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#fff',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {hi != null ? `${hi}°` : '—'}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--fg-on-sky-3)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {lo != null ? `${lo}°` : '—'}
              </div>
              {precip != null && (
                <div
                  style={{
                    fontSize: 9,
                    color: 'rgba(126,186,228,0.85)',
                    fontWeight: 600,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {precip}%
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--fg-on-sky-3)',
          marginTop: 8,
        }}
      >
        Open-Meteo · {forecast.length}-day forecast
      </div>
    </Module>
  );
}

// ── SnowpackModule ────────────────────────────────────────────────────────

function SnowpackModule({ snowpack }: { snowpack: any[] }) {
  if (!snowpack?.length) return null;
  const s = snowpack[0];
  const pct = s?.latest?.swePercentMedian ?? null;
  const swe = s?.latest?.sweInches ?? null;
  const depth = s?.latest?.snowDepthInches ?? null;
  const basin = s?.basin ?? null;
  if (pct == null && swe == null) return null;

  const statusWord =
    pct == null ? null
    : pct >= 130 ? 'Above normal'
    : pct >= 90 ? 'Near normal'
    : pct >= 70 ? 'Below normal'
    : 'Well below normal';

  return (
    <Module label="Basin snowpack" icon="snowflake" style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        {pct != null && (
          <>
            <span
              style={{
                fontWeight: 300,
                fontSize: 44,
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {Math.round(pct)}%
            </span>
            <span style={{ fontSize: 14, color: 'var(--fg-on-sky-2)' }}>of normal</span>
            {statusWord && (
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#fff',
                }}
              >
                {statusWord}
              </span>
            )}
          </>
        )}
      </div>
      {basin && (
        <div
          style={{
            fontSize: 14.5,
            fontWeight: 700,
            color: '#fff',
            marginTop: 10,
          }}
        >
          {basin}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          marginTop: 14,
          paddingTop: 12,
          borderTop: '1px solid rgba(255,255,255,0.14)',
          gap: 0,
        }}
      >
        {[
          ['SWE', swe != null ? `${swe.toFixed(1)} in` : null],
          ['Depth', depth != null ? `${Math.round(depth)} in` : null],
        ]
          .filter(([, v]) => v != null)
          .map(([l, v], k) => (
            <div
              key={l as string}
              style={{
                flex: 1,
                borderLeft: k ? '1px solid rgba(255,255,255,0.12)' : 'none',
                paddingLeft: k ? 12 : 0,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.09em',
                  textTransform: 'uppercase',
                  color: 'var(--fg-on-sky-3)',
                }}
              >
                {l}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  marginTop: 6,
                }}
              >
                {v}
              </div>
            </div>
          ))}
      </div>
    </Module>
  );
}

// ── DamReleaseModule ──────────────────────────────────────────────────────

function DamReleaseModule({
  reservoirs,
  damControlled,
  riverName,
}: {
  reservoirs: any[];
  damControlled: boolean;
  riverName: string;
}) {
  const res = reservoirs?.[0];
  const outflow = res?.latest?.outflowCfs ?? null;
  const resName = res?.reservoir ?? null;

  if (!res && !damControlled) return null;

  if (!res) {
    // damControlled but no reservoir data yet
    return (
      <Module label="Dam release" icon="droplet" style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, color: 'var(--fg-on-sky-1)' }}>
          <Icon name="triangle-alert" size={22} color="var(--status-high, var(--high-fg))" />
          <div style={{ fontSize: 14.5, lineHeight: 1.4 }}>
            Dam-controlled — release data unavailable.
          </div>
        </div>
      </Module>
    );
  }

  return (
    <Module label="Dam release" icon="droplet" style={{ marginTop: 14 }}>
      {outflow != null && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span
            style={{
              fontWeight: 300,
              fontSize: 40,
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {outflow.toLocaleString()}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--fg-on-sky-2)' }}>
            cfs outflow
          </span>
        </div>
      )}
      {resName && (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--fg-on-sky-3)',
            marginTop: 8,
          }}
        >
          {resName}
        </div>
      )}
      {!outflow && !resName && (
        <div style={{ fontSize: 14.5, color: 'var(--fg-on-sky-1)' }}>
          Release data unavailable for {riverName}.
        </div>
      )}
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
  const [days, setDays] = useState(30);

  if (isLoading) {
    return (
      <div style={{ padding: '0 14px 60px' }}>
        {/* header placeholder */}
        <div style={{ height: 110, background: 'rgba(255,255,255,0.10)', borderRadius: 22, marginTop: 0 }} />
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
          color: '#fff',
        }}
      >
        <Icon name="waves" size={42} color="rgba(255,255,255,0.35)" />
        <div style={{ fontSize: 18, fontWeight: 700 }}>Unable to load section</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
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
    ? `USGS ${gaugeInfo.id ?? ''} · ${gaugeInfo.name ?? 'gauge'}`
    : 'USGS instantaneous values';

  // Slice history for the selected period
  const cutoff = Date.now() - days * 24 * 3600_000;
  const histSlice = detail.history.filter(p => p.t >= cutoff);
  const chartData = histSlice.map(p => ({ v: p.v }));

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
          color: '#fff',
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
      <div style={{ textAlign: 'center', color: '#fff', marginTop: 20 }}>
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
              color: '#fff',
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
                background: 'rgba(255,255,255,0.16)',
                borderRadius: 'var(--r-pill)',
                padding: '5px 10px',
                fontSize: 12.5,
                fontWeight: 700,
                color: '#fff',
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
                background: 'rgba(255,255,255,0.16)',
                borderRadius: 'var(--r-pill)',
                padding: '5px 10px',
                fontSize: 12.5,
                fontWeight: 700,
                color: '#fff',
              }}
            >
              {detail.miles} mi
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
            color: '#fff',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.08) 60%, rgba(255,255,255,0.05) 100%)',
            backdropFilter: 'blur(20px) saturate(150%)',
            WebkitBackdropFilter: 'blur(20px) saturate(150%)',
            boxShadow: '0 18px 40px rgba(6,19,33,0.30), inset 0 1px 0 rgba(255,255,255,0.30)',
            border: '1px solid rgba(255,255,255,0.18)',
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
                {detail.now.toLocaleString()}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                cfs
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700 }}>
                {detail.statusLabel}
              </span>
            </div>
          )}

          {/* chart */}
          {chartData.length > 1 ? (
            <FlowChart
              data={chartData}
              optimal={optimal}
              nowIndex={chartData.length - 1}
              height={130}
              onSky
            />
          ) : (
            <div
              style={{
                height: 80,
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
              <span>Optimal {thresholds.idealLo.toLocaleString()}–{thresholds.idealHi.toLocaleString()} cfs</span>
              <span>{gaugeInfo?.id ? `USGS ${gaugeInfo.id}` : ''}</span>
            </div>
          )}

          {/* period toggle */}
          <div
            style={{
              display: 'flex',
              gap: 4,
              marginTop: 12,
              background: 'rgba(7,22,40,0.22)',
              borderRadius: 'var(--r-pill)',
              padding: 3,
            }}
          >
            {PERIOD_OPTIONS.map(opt => {
              const on = days === opt.days;
              return (
                <button
                  key={opt.days}
                  onClick={() => setDays(opt.days)}
                  style={{
                    flex: 1,
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: 'var(--r-pill)',
                    padding: '7px 0',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 12.5,
                    fontWeight: 700,
                    background: on ? 'rgba(255,255,255,0.92)' : 'transparent',
                    color: on ? 'var(--flow-700)' : '#fff',
                    transition: 'background 0.15s',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── section map ── */}
      <Module label="Section map" icon="map" style={{ marginTop: 14 }}>
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
          style={{ borderRadius: 8, overflow: 'hidden' }}
        />
      </Module>

      {/* ── access accordion ── */}
      {(putInName || takeOutName) && (
        <Module label="Access" icon="navigation" style={{ marginTop: 14, paddingBottom: 6 }}>
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
      )}

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
  const [days, setDays] = useState(30);

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
          color: '#fff',
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
    ? `USGS ${gaugeInfo.id ?? ''} · ${gaugeInfo.name ?? 'gauge'}`
    : 'USGS instantaneous values';

  const cutoff = Date.now() - days * 24 * 3600_000;
  const histSlice = detail.history.filter(p => p.t >= cutoff);
  const chartData = histSlice.map(p => ({ v: p.v }));

  const thresholds = detail.thresholds;
  const optimal: [number, number] | undefined =
    thresholds.idealLo > 0 && thresholds.idealHi > thresholds.idealLo
      ? [thresholds.idealLo, thresholds.idealHi]
      : undefined;

  const putInName = detail.putIn;
  const takeOutName = detail.takeOut;

  const makeMapsUrl = (name: string | null) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name ?? 'river access')}`;

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
          color: '#fff',
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
              color: 'rgba(255,255,255,0.66)',
              marginTop: 2,
            }}
          >
            {detail.river} · {detail.classification}
            {detail.miles ? ` · ${detail.miles} mi` : ''}
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
            border: '1px solid rgba(255,255,255,0.18)',
            boxShadow: '0 14px 32px rgba(6,19,33,0.28)',
            color: '#fff',
          }}
        >
          {detail.now != null ? (
            <FlowGauge
              currentFlow={detail.now}
              thresholds={thresholds}
              size={130}
            />
          ) : (
            <div style={{ fontSize: 56, fontWeight: 200, color: '#fff', lineHeight: 1 }}>—</div>
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
              {detail.now != null ? `${detail.now.toLocaleString()} cfs` : '—'}
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: '#fff',
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
                    background: 'rgba(255,255,255,0.16)',
                    borderRadius: 'var(--r-pill)',
                    padding: '5px 10px',
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: '#fff',
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
                color: '#fff',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.08) 60%, rgba(255,255,255,0.05) 100%)',
                backdropFilter: 'blur(20px) saturate(150%)',
                WebkitBackdropFilter: 'blur(20px) saturate(150%)',
                boxShadow: '0 18px 40px rgba(6,19,33,0.30), inset 0 1px 0 rgba(255,255,255,0.30)',
                border: '1px solid rgba(255,255,255,0.18)',
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
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10.5,
                      color: 'var(--fg-on-sky-3)',
                      marginTop: 2,
                    }}
                  >
                    {optimal
                      ? `Optimal ${thresholds.idealLo.toLocaleString()}–${thresholds.idealHi.toLocaleString()} cfs`
                      : gaugeInfo?.id ? `USGS ${gaugeInfo.id}` : ''}
                  </div>
                </div>
                {/* period toggle */}
                <div
                  style={{
                    display: 'flex',
                    gap: 3,
                    background: 'rgba(7,22,40,0.22)',
                    borderRadius: 'var(--r-pill)',
                    padding: 3,
                  }}
                >
                  {PERIOD_OPTIONS.map(opt => {
                    const on = days === opt.days;
                    return (
                      <button
                        key={opt.days}
                        onClick={() => setDays(opt.days)}
                        style={{
                          border: 'none',
                          cursor: 'pointer',
                          borderRadius: 'var(--r-pill)',
                          padding: '6px 12px',
                          fontFamily: 'var(--font-sans)',
                          fontSize: 12,
                          fontWeight: 700,
                          background: on ? 'rgba(255,255,255,0.92)' : 'transparent',
                          color: on ? 'var(--flow-700)' : '#fff',
                          transition: 'background 0.15s',
                          WebkitTapHighlightColor: 'transparent',
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {chartData.length > 1 ? (
                <FlowChart
                  data={chartData}
                  optimal={optimal}
                  nowIndex={chartData.length - 1}
                  height={160}
                  onSky
                />
              ) : (
                <div
                  style={{
                    height: 100,
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
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10.5,
                  color: 'var(--fg-on-sky-3)',
                  marginTop: 6,
                  textAlign: 'right',
                }}
              >
                {gaugeInfo?.id ? `USGS ${gaugeInfo.id}` : ''}
              </div>
            </div>

            {/* access accordion */}
            {(putInName || takeOutName) && (
              <Module label="Access" icon="navigation" style={{ paddingBottom: 6 }}>
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
            )}

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
          </div>

          {/* right column — map, snowpack, dam */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Module label="Section map" icon="map">
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
                style={{ borderRadius: 8, overflow: 'hidden' }}
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
