/**
 * Corridor.tsx — immersive corridor screen (mobile + desktop).
 *
 * Mobile:   floating sky header → flow tile → sticky orientation well
 *           (schematic map + section tiles) → modules → log CTA
 * Desktop:  two-column: sections grid + left/right detail columns
 *
 * Data source: useCorridor(slug) → /CorridorView/:slug
 * Never renders invented data; modules that have no data are omitted entirely.
 */

import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCorridor } from '../hooks/useCorridor';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { usePreferences } from '../hooks/usePreferences';
import { flowValue, flowUnitLabel, formatTemp, formatLength } from '../lib/units';
import { Shell } from '../shell/Shell';
import {
  Icon,
  Module,
  SkyBg,
  PeriodFlowChart,
  statusColor,
  statusLabel,
  SnowpackModule,
  DamReleaseModule,
  ShuttleModule,
  GuidesModule,
} from '../ds';
import { GeoMap } from '../components/GeoMap';
import type { DesignStatus } from '../constants';

// ── helpers ────────────────────────────────────────────────────────────────────

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

const arrowBtn: React.CSSProperties = {
  ...navBtn,
  width: 30,
  height: 30,
};

function tryParseJson(raw: string | null | undefined): unknown {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function safeArr(val: unknown): string[] {
  if (Array.isArray(val)) return val.filter((x): x is string => typeof x === 'string');
  return [];
}

// ── Skeleton ────────────────────────────────────────────────────────────────

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

// ── GaugeFlowTile ─────────────────────────────────────────────────────────────

interface GaugeFlowTileProps {
  gauges: any[];
  activeGaugeId?: string | null;
  onGaugeSelect?: (gaugeId: string) => void;
}

// "Arkansas River below Granite, CO" -> "Granite"; "...at Parkdale, CO" -> "Parkdale"
function briefGaugeName(full: string): string {
  let s = (full || '').replace(/,\s*[A-Za-z]{2}\.?\s*$/, '');   // strip trailing ", CO"
  const parts = s.split(/\s+(?:at|near|below|above|blw|abv|nr)\s+/i);
  s = parts[parts.length - 1].trim();
  return s || full || 'Gauge';
}

function GaugeFlowTile({ gauges, activeGaugeId, onGaugeSelect }: GaugeFlowTileProps) {
  const { units } = usePreferences();
  // upriver (low sortIndex) on the left → downriver on the right
  const ordered = [...gauges].sort((a, b) => (a.sortIndex ?? 999) - (b.sortIndex ?? 999));
  const [gi, setGi] = useState(0);
  const n = ordered.length;
  // controlled by the active section's gauge (scroll lock / hover) when provided,
  // otherwise the locally-toggled index
  const activeIdx = activeGaugeId ? ordered.findIndex(gg => gg.id === activeGaugeId) : -1;
  const shownIdx = activeIdx >= 0 ? activeIdx : Math.min(gi, n - 1);
  const g = ordered[shownIdx];

  if (!g) return null;

  return (
    <div
      style={{
        borderRadius: 'var(--r-xl)',
        overflow: 'hidden',
        color: 'var(--fg-on-sky-1)',
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.08) 60%, rgba(255,255,255,0.05) 100%)',
        backdropFilter: 'blur(20px) saturate(150%)',
        WebkitBackdropFilter: 'blur(20px) saturate(150%)',
        boxShadow:
          '0 18px 40px rgba(6,19,33,0.30), inset 0 1px 0 rgba(255,255,255,0.30)',
        border: `1px solid var(--module-stroke)`,
        padding: '15px 16px 14px',
        marginBottom: 10,
      }}
    >
      {/* gauge selector — segmented switch, most upriver (left) → downriver (right) */}
      {n > 1 ? (
        <div
          style={{
            display: 'flex',
            gap: 2,
            padding: 3,
            background: 'rgba(255,255,255,0.08)',
            borderRadius: 'var(--r-pill)',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {ordered.map((gg, k) => {
            const active = k === shownIdx;
            return (
              <button
                key={gg.id ?? k}
                onClick={() => (onGaugeSelect ? onGaugeSelect(gg.id) : setGi(k))}
                style={{
                  flex: '1 1 auto',
                  minWidth: 56,
                  padding: '6px 10px',
                  border: 'none',
                  borderRadius: 'var(--r-pill)',
                  background: active ? 'rgba(255,255,255,0.92)' : 'transparent',
                  color: active ? 'var(--flow-700)' : 'var(--fg-on-sky-2)',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: active ? 700 : 600,
                  fontSize: 12.5,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {briefGaugeName(gg.name)}
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>
          {briefGaugeName(g.name)}
        </div>
      )}

      {/* period flow chart — the value tracks the active point (hover to scrub) */}
      {(g.history?.length > 1 || g.sparkline?.length > 1) ? (
        <div style={{ marginTop: 12 }}>
          <PeriodFlowChart
            history={g.history ?? (g.sparkline ?? []).map((v: number, i: number) => ({
              t: Date.now() - (((g.sparkline ?? []).length - 1 - i) * 86400000),
              v,
            }))}
            height={96}
            onSky
            bleedX={16}
            valueOverlay={{
              format: (v: number) => flowValue(v, units.flow),
              unit: flowUnitLabel(units.flow),
              trend: g.trend,
            }}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 12 }}>
          <span style={{ fontWeight: 300, fontSize: 34, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {g.currentFlow != null ? flowValue(g.currentFlow, units.flow) : '—'}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-on-sky-2)' }}>
            {flowUnitLabel(units.flow)}
          </span>
        </div>
      )}
    </div>
  );
}

// ── SectionTile ──────────────────────────────────────────────────────────────

interface SectionTileProps {
  section: any;
  selected: boolean;
  onSelect: () => void;
  onNavigate: () => void;
  onHover?: (id: string | null) => void;
  highlighted?: boolean;
}

function SectionTile({ section: s, selected, onSelect, onNavigate, onHover, highlighted }: SectionTileProps) {
  const sc = statusColor(s.status as DesignStatus);
  const sl = s.statusLabel ?? statusLabel(s.status as DesignStatus);
  const { units } = usePreferences();
  return (
    <div
      data-section-id={s.id}
      onClick={() => { onSelect(); onNavigate(); }}
      onMouseEnter={() => onHover?.(s.id)}
      onMouseLeave={() => onHover?.(null)}
      style={{
        background: selected
          ? 'var(--module-fill)'
          : 'rgba(255,255,255,0.07)',
        backdropFilter: 'var(--blur-module)',
        WebkitBackdropFilter: 'var(--blur-module)',
        boxShadow: highlighted
          ? '0 0 0 1.5px rgba(130,200,255,0.95), 0 0 22px 1px rgba(120,190,255,0.55), 0 16px 40px rgba(6,19,33,0.34)'
          : `inset 0 0 0 1px ${selected ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.12)'}`,
        transition: 'box-shadow .18s ease',
        borderRadius: 'var(--r-lg)',
        padding: '14px 16px',
        color: 'var(--fg-on-sky-1)',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              background: 'var(--bg-card)',
              color: sc,
              borderRadius: 8,
              padding: '3px 9px',
              fontWeight: 800,
              fontSize: 13,
              whiteSpace: 'nowrap',
            }}
          >
            {s.difficulty ?? '?'}
          </span>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{s.name}</div>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-on-sky-1)' }}>{sl}</span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 10,
        }}
      >
        {(s.putIn || s.takeOut) ? (
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--fg-on-sky-2)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Icon name="map-pin" size={12} />
            {[s.putIn, s.takeOut].filter(Boolean).join(' → ')}
          </div>
        ) : <div />}

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span
            style={{ fontSize: 22, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
          >
            {s.currentFlow != null ? flowValue(s.currentFlow, units.flow) : '—'}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-on-sky-2)' }}>
            {flowUnitLabel(units.flow)}
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginTop: 8,
          fontFamily: 'var(--font-mono)',
          fontSize: 11.5,
          color: 'var(--fg-on-sky-3)',
        }}
      >
        {s.lengthMiles != null && <span>{formatLength(s.lengthMiles, units.length)}</span>}
        <span
          style={{
            marginLeft: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            color: 'var(--fg-on-sky-2)',
            fontWeight: 700,
          }}
        >
          Details <Icon name="chevron-right" size={13} />
        </span>
      </div>
    </div>
  );
}

// ── AccessPointRow (accordion) ────────────────────────────────────────────────

interface AccessPointRowProps {
  ap: any;
  isFirst: boolean;
}

function AccessPointRow({ ap, isFirst }: AccessPointRowProps) {
  const [open, setOpen] = useState(false);
  const hasDetails = ap.notes || ap.directions;
  const mapsUrl =
    ap.latitude != null && ap.longitude != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${ap.latitude},${ap.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ap.name)}`;

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
          {ap.permitRequired && (
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
              Permit required
            </span>
          )}
          {ap.feeUsd != null && (
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
              ${ap.feeUsd}
            </span>
          )}
          {hasDetails && (
            <Icon
              name="chevron-down"
              size={18}
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
            {ap.parkingSpaces != null && (
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--fg-on-sky-3)',
                  marginBottom: 8,
                }}
              >
                {ap.parkingSpaces} parking spaces
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
      )}
    </div>
  );
}

// ── PermitModule ──────────────────────────────────────────────────────────────

interface PermitModuleProps {
  permits: Array<{
    id: string;
    name: string;
    agency: string;
    required: boolean | null;
    feeUsd: number | null;
    feeNote: string | null;
    season: string | null;
    detail: string | null;
    url: string | null;
  }>;
}

function PermitModule({ permits }: PermitModuleProps) {
  if (!permits?.length) return null;
  const p = permits[0];
  const feeDisplay = p.feeNote ?? (p.feeUsd != null ? `$${p.feeUsd}` : '—');
  const seasonDisplay = p.season ?? '—';
  const requiredLabel = p.required === true ? 'Required' : p.required === false ? 'Not required' : 'Check locally';

  return (
    <Module label="Permits & regulations" icon="shield-check" style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--fg-on-sky-1)' }}>{p.name}</div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11.5,
              color: 'var(--fg-on-sky-2)',
              marginTop: 2,
            }}
          >
            {p.agency}
          </div>
        </div>
        <span
          style={{
            flexShrink: 0,
            fontSize: 11.5,
            fontWeight: 700,
            color: 'var(--fg-on-sky-1)',
            background: 'var(--module-fill)',
            borderRadius: 'var(--r-pill)',
            padding: '5px 11px',
            whiteSpace: 'nowrap',
          }}
        >
          {requiredLabel}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 0,
          marginTop: 14,
          paddingTop: 12,
          borderTop: `1px solid var(--module-stroke)`,
        }}
      >
        {[['Fee', feeDisplay], ['Season', seasonDisplay]].map(([l, v], k) => (
          <div
            key={l as string}
            style={{
              flex: 1,
              borderLeft: k ? `1px solid var(--module-stroke)` : 'none',
              paddingLeft: k ? 12 : 0,
            }}
          >
            <div
              style={{
                fontSize: 10.5,
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
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--fg-on-sky-1)',
                marginTop: 5,
              }}
            >
              {v}
            </div>
          </div>
        ))}
      </div>

      {p.detail && (
        <div
          style={{
            fontSize: 13.5,
            color: 'var(--fg-on-sky-1)',
            lineHeight: 1.45,
            marginTop: 12,
          }}
        >
          {p.detail}
        </div>
      )}
    </Module>
  );
}

// ── WaterTempModule ───────────────────────────────────────────────────────────

interface WaterTempModuleProps {
  temps: Array<{
    gaugeId: string;
    label: string;
    tempF: number;
    timestamp: string;
  }>;
}

function WaterTempModule({ temps }: WaterTempModuleProps) {
  if (!temps?.length) return null;
  const { units } = usePreferences();
  const coldest = Math.min(...temps.map(t => t.tempF));
  const guideText =
    coldest < 50
      ? 'Cold — drysuit advised; cold-water immersion is a real risk.'
      : coldest < 60
      ? 'Cool — a wetsuit is recommended.'
      : 'Mild — splashwear is fine for most boaters.';
  const guideIcon = coldest < 50 ? 'triangle-alert' : 'droplet';
  const guideColor = coldest < 50 ? 'var(--status-low, #e05a2b)' : 'var(--flow-300)';

  return (
    <Module label="Water temperature" icon="thermometer" style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        {temps.map((t, i) => (
          <div
            key={t.gaugeId ?? i}
            style={{
              flex: 1,
              background: 'rgba(7,22,40,0.18)',
              borderRadius: 'var(--r-md)',
              padding: '11px 13px',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10.5,
                color: 'var(--fg-on-sky-2)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {t.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 5 }}>
              <span
                style={{
                  fontWeight: 300,
                  fontSize: 34,
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatTemp(t.tempF, units.temp)}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--fg-on-sky-3)',
                }}
              >
                {units.temp === 'C' ? 'C' : 'F'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          marginTop: 12,
          color: 'var(--fg-on-sky-1)',
        }}
      >
        <Icon name={guideIcon} size={16} color={guideColor} />
        <span style={{ fontSize: 13.5, lineHeight: 1.4 }}>{guideText}</span>
      </div>
    </Module>
  );
}

// ── CorridorWeatherTile ───────────────────────────────────────────────────────

const _conditionIconMap: Record<string, string> = {
  clear: 'sun',
  cloudy: 'cloud',
  fog: 'cloud-fog',
  rain: 'cloud-rain',
  snow: 'cloud-snow',
  thunderstorm: 'cloud-bolt',
};

function _condIcon(condition: string | null | undefined): string {
  if (!condition) return 'cloud';
  return _conditionIconMap[condition] ?? 'cloud';
}

function _hourLabel(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: 'numeric', hour12: true });
  } catch {
    return iso;
  }
}

interface CorridorWeatherTileProps {
  current: {
    tempF: number;
    condition: string;
    weatherCode: number;
    humidityPct: number;
    windMph: number;
    uvIndex: number;
    tempHighF: number;
    tempLowF: number;
  } | null;
  hourly: Array<{
    timestamp: string;
    tempF: number;
    condition: string;
    weatherCode: number;
  }>;
}

function CorridorWeatherTile({ current, hourly }: CorridorWeatherTileProps) {
  if (!current) return null;
  const { units } = usePreferences();

  const condIcon = _condIcon(current.condition);

  return (
    <Module label="Weather" icon="cloud" style={{ marginTop: 14 }}>
      {/* current conditions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          marginTop: 4,
        }}
      >
        <Icon name={condIcon} size={42} color="var(--fg-on-sky-1)" />
        <span
          style={{
            fontWeight: 200,
            fontSize: 62,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatTemp(current.tempF, units.temp)}
        </span>
      </div>

      <div
        style={{
          textAlign: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          color: 'var(--fg-on-sky-1)',
          marginTop: 6,
        }}
      >
        {current.condition} · H {formatTemp(current.tempHighF, units.temp)} · L {formatTemp(current.tempLowF, units.temp)}
      </div>

      {/* stat row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          marginTop: 16,
          paddingTop: 14,
          borderTop: `1px solid var(--module-stroke)`,
        }}
      >
        {(
          [
            ['wind', 'Wind', `${current.windMph} mph`],
            ['droplet', 'Humidity', `${current.humidityPct}%`],
            ['sun', 'UV index', String(current.uvIndex)],
          ] as [string, string, string][]
        ).map(([ic, label, val]) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                justifyContent: 'center',
                color: 'var(--fg-on-sky-2)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.09em',
                textTransform: 'uppercase',
              }}
            >
              <Icon name={ic} size={13} />
              {label}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 13.5,
                marginTop: 6,
                whiteSpace: 'nowrap',
              }}
            >
              {val}
            </div>
          </div>
        ))}
      </div>

      {/* hourly strip */}
      {hourly?.length > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            overflowX: 'auto',
            marginTop: 16,
            paddingTop: 14,
            borderTop: `1px solid var(--module-stroke)`,
            gap: 4,
          }}
        >
          {hourly.map((h, k) => (
            <div
              key={k}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 7,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--fg-on-sky-2)',
                  whiteSpace: 'nowrap',
                }}
              >
                {_hourLabel(h.timestamp)}
              </span>
              <Icon name={_condIcon(h.condition)} size={17} color="var(--fg-on-sky-1)" />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12.5,
                  fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatTemp(h.tempF, units.temp)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Module>
  );
}

// ── DamNote ───────────────────────────────────────────────────────────────────

function DamNote({ dams, corridorName }: { dams: any[]; corridorName: string }) {
  const upstreamDam = dams.find((d: any) => d.position === 'upstream-end');
  return (
    <Module label="Flow character" icon="droplet" style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, color: 'var(--fg-on-sky-1)' }}>
        <Icon
          name={upstreamDam ? 'triangle-alert' : 'waves'}
          size={22}
          color={upstreamDam ? 'var(--status-high, var(--high-fg))' : 'var(--flow-300)'}
        />
        <div style={{ fontSize: 14.5, lineHeight: 1.4 }}>
          {upstreamDam
            ? `Dam-controlled — ${upstreamDam.name} upstream`
            : `Free-flowing — the ${corridorName} tracks snowmelt directly`}
        </div>
      </div>
    </Module>
  );
}

// ── LogCTA ────────────────────────────────────────────────────────────────────

function LogCTA({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        marginTop: 14,
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
      <Icon name="flag" size={18} />
      {label}
    </button>
  );
}

// ── MobileCorridorContent ─────────────────────────────────────────────────────

interface CorridorContentProps {
  data: any;
  corridorSlug: string;
}

function MobileCorridorContent({ data, corridorSlug }: CorridorContentProps) {
  const navigate = useNavigate();
  const scRef = useRef<HTMLDivElement>(null);
  const [sy, setSy] = useState(0);
  const [selId, setSelId] = useState<string | null>(
    data.sections?.[0]?.id ?? null
  );

  const corridor = data.corridor;
  const watershed = data.watershed;
  const sections: any[] = data.sections ?? [];
  const accessPoints: any[] = data.accessPoints ?? [];
  const gauges: any[] = data.gauges ?? [];
  const dams: any[] = data.impassableDams ?? [];
  const shuttles: any[] = data.shuttleBusinesses ?? [];
  const outfitters: any[] = data.outfitters ?? [];

  const introFade = Math.max(0, 1 - sy / 46);

  const locationLabel = [watershed?.name, watershed?.region]
    .filter(Boolean)
    .join(' · ');

  // Sort access points for the schematic
  const sortedAPs = [...accessPoints].sort((a, b) => {
    const aR = a.riverMile ?? Infinity;
    const bR = b.riverMile ?? Infinity;
    if (aR !== bR) return aR - bR;
    return (a.sortIndex ?? 999) - (b.sortIndex ?? 999);
  });

  // Section access points: filter for the selected section
  const selectedSection = sections.find(s => s.id === selId);

  // Group access points by kind for the module
  const putIns = accessPoints.filter(ap => ap.kind === 'put-in');
  const takeOuts = accessPoints.filter(ap => ap.kind === 'take-out');
  const alternatives = accessPoints.filter(ap => ap.kind !== 'put-in' && ap.kind !== 'take-out');
  const orderedAPs = [...putIns, ...alternatives, ...takeOuts];

  return (
    <div
      ref={scRef}
      onScroll={() => setSy(scRef.current?.scrollTop ?? 0)}
      style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '0 14px 120px' }}
    >
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
          background:
            'linear-gradient(180deg, rgba(6,19,33,0.38) 0%, rgba(6,19,33,0.20) 100%), var(--sky-river, #1a6fa8)',
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
              fontSize: 19,
              fontWeight: 800,
              letterSpacing: '-0.015em',
              textShadow: '0 1px 6px rgba(6,19,33,0.55)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              padding: '0 4px',
            }}
          >
            {corridor?.name ?? corridorSlug}
          </div>
          <button onClick={() => navigate('/log')} style={navBtn}>
            <Icon name="flag" size={18} />
          </button>
        </div>
      </div>

      {/* ── location + summary (fades away on scroll) ── */}
      <div
        style={{
          textAlign: 'center',
          color: 'var(--fg-on-sky-1)',
          marginTop: 14,
          opacity: introFade,
          transform: `translateY(${-sy * 0.25}px)`,
          pointerEvents: introFade < 0.05 ? 'none' : 'auto',
          willChange: 'opacity, transform',
        }}
      >
        {locationLabel && (
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--fg-on-sky-2)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              textShadow: '0 1px 5px rgba(6,19,33,0.5)',
            }}
          >
            {locationLabel}
          </div>
        )}
        {(() => {
          const prose = (corridor?.summaryMd || corridor?.description || '').trim();
          return prose ? (
            <p
              style={{
                margin: '8px 0 0',
                fontSize: 14.5,
                color: 'var(--fg-on-sky-1)',
                lineHeight: 1.45,
                textWrap: 'pretty' as any,
                textShadow: '0 1px 4px rgba(6,19,33,0.45)',
              }}
            >
              {prose}
            </p>
          ) : null;
        })()}
      </div>

      {/* ── gauge flow tile ── */}
      {gauges.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <GaugeFlowTile gauges={gauges} />
        </div>
      )}

      {/* ── orientation well ── */}
      <div
        style={{
          position: 'relative',
          margin: '14px -14px 0',
          padding: '16px 14px 18px',
          borderRadius: 26,
          background:
            'linear-gradient(180deg, rgba(6,19,33,0.20) 0%, rgba(6,19,33,0.12) 50%, rgba(6,19,33,0.17) 100%)',
          boxShadow:
            'inset 0 10px 20px -10px rgba(6,19,33,0.70), inset 0 -10px 20px -10px rgba(6,19,33,0.60)',
        }}
      >
        {/* sticky schematic map */}
        <div
          style={{
            position: 'sticky',
            top: 116,
            zIndex: 20,
            borderRadius: 'var(--r-lg)',
            overflow: 'hidden',
            color: 'var(--fg-on-sky-1)',
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.07) 60%, rgba(255,255,255,0.05) 100%), var(--sky-river, #1a6fa8)',
            backdropFilter: 'blur(22px) saturate(150%)',
            WebkitBackdropFilter: 'blur(22px) saturate(150%)',
            boxShadow:
              '0 10px 22px rgba(6,19,33,0.38), inset 0 1px 0 rgba(255,255,255,0.24)',
            border: `1px solid var(--module-stroke)`,
            padding: 0,
          }}
        >
          {sections.length > 0 && (
            <GeoMap
              sections={sections.map(s => ({
                id: s.id,
                river: data.corridor?.name,
                section: s.name,
                classification: s.difficulty,
                now: s.currentFlow,
                status: s.status,
                statusLabel: s.statusLabel,
                trend: s.trend,
              }))}
              accessPoints={sortedAPs.map(ap => ({
                id: ap.id,
                name: ap.name,
                kind: ap.kind,
                latitude: ap.latitude,
                longitude: ap.longitude,
              }))}
              selectedSectionId={selId}
              onSectionClick={(id) => navigate('/section/' + id)}
              height={236}
              style={{ width: '100%', display: 'block' }}
            />
          )}
        </div>

        {/* section tiles — tuck under the sticky map */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: 12 }}>
          {sections.map(s => (
            <SectionTile
              key={s.id}
              section={s}
              selected={s.id === selId}
              onSelect={() => setSelId(s.id)}
              onNavigate={() => navigate(`/section/${s.id}`)}
            />
          ))}
        </div>

        {/* log CTA inside the well */}
        <LogCTA
          label={`Log a run on the ${corridor?.shortName ?? corridor?.name ?? 'river'}`}
          onClick={() => navigate('/log')}
        />
      </div>

      {/* ── detail modules ── */}

      {/* Access points */}
      {orderedAPs.length > 0 && (
        <Module label="Access points" icon="map-pin" style={{ marginTop: 14 }}>
          {orderedAPs.map((ap, i) => (
            <AccessPointRow key={ap.id} ap={ap} isFirst={i === 0} />
          ))}
        </Module>
      )}

      {/* Basin snowpack */}
      <SnowpackModule snowpack={data.snowpack ?? []} />

      {/* Dam / free-flowing note */}
      <DamNote dams={dams} corridorName={corridor?.name ?? 'river'} />

      {/* Dam release — only when we have real reservoir data */}
      {(data.reservoirs?.length ?? 0) > 0 && (
        <DamReleaseModule
          damFlow={data.damFlow}
          reservoirs={data.reservoirs}
          damControlled={true}
          riverName={corridor?.name ?? 'this river'}
        />
      )}

      {/* Shuttle services — omit if empty */}
      <ShuttleModule businesses={shuttles} />

      {/* Guides — omit if empty */}
      <GuidesModule outfitters={outfitters} />

      {/* Permits & regulations */}
      <PermitModule permits={data.permits ?? []} />

      {/* Water temperature */}
      <WaterTempModule temps={data.waterTemps ?? []} />

      {/* Weather (current + hourly) */}
      <CorridorWeatherTile
        current={data.weatherCurrent ?? null}
        hourly={data.weatherHourly ?? []}
      />

      {/* Attribution footer */}
      <div
        style={{
          textAlign: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--fg-on-sky-3)',
          marginTop: 22,
        }}
      >
        Flow data via USGS & Colorado DWR · gauge readings updated every 15 min
      </div>
    </div>
  );
}

// ── DesktopCorridorContent ────────────────────────────────────────────────────

const heroMiniTile: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)',
  backdropFilter: 'var(--blur-module)',
  WebkitBackdropFilter: 'var(--blur-module)',
  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)',
  borderRadius: 'var(--r-lg)',
  padding: '12px 14px',
  color: 'var(--fg-on-sky-1)',
};
const heroMiniLabel: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontFamily: 'var(--font-mono)',
  fontSize: 10.5,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--fg-on-sky-3)',
};

function damMiniView(entry: any) {
  const r = entry?.reservoir ?? null;
  const name = typeof r === 'string' ? r : (r?.name ?? null);
  const plannedUrl = typeof r === 'string' ? null : (r?.plannedReleaseUrl ?? null);
  const outflow = entry?.latest?.outflowCfs ?? null;
  const diversion = entry?.diversion ?? null;
  const cfs = diversion?.damControlledCfs ?? outflow ?? null;
  return { name, plannedUrl, outflow, diversion, cfs };
}

const shortDamName = (n: string | null) => (n ? n.replace(/\s+Reservoir$/, '') : '');

// Compact hero tile mirroring DamReleaseModule's controlling/contributing logic:
// a single controlling dam (≈100% of flow), one upstream release, or the combined
// release from multiple upstream dams — whichever fits the active section.
function SectionDamMini({ damFlow }: { damFlow: any }) {
  const [hover, setHover] = useState(false);
  const mode = damFlow?.mode ?? 'none';

  // No dam on this reach → this tile becomes the flow-character note.
  if (!damFlow || mode === 'none') {
    return (
      <div style={heroMiniTile}>
        <div style={heroMiniLabel}><Icon name="waves" size={13} /> Flow character</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.4, marginTop: 7, color: 'var(--fg-on-sky-1)' }}>
          Free-flowing — tracks snowmelt directly
        </div>
      </div>
    );
  }

  // Multiple contributing dams → combined headline + largest contributor.
  const contributors: any[] = damFlow.contributors ?? [];
  if (mode === 'contributing' && contributors.length >= 2) {
    const combined = damFlow.combinedCfs;
    // Largest release first; list every contributing dam (don't hide any).
    const rows = contributors
      .map(damMiniView)
      .sort((a, b) => (b.outflow ?? -1) - (a.outflow ?? -1));
    return (
      <div style={heroMiniTile}>
        <div style={heroMiniLabel}><Icon name="droplet" size={13} /> Dam releases</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 7 }}>
          <span style={{ fontWeight: 300, fontSize: 26, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {combined != null ? Math.round(combined).toLocaleString() : '—'}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-on-sky-2)' }}>cfs</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-on-sky-3)' }}>combined</span>
        </div>
        <div style={{ marginTop: 9, paddingTop: 9, borderTop: '1px solid var(--module-stroke)', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {rows.map((r, i) => (
            <div key={r.name ?? i} style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11.5, lineHeight: 1.2 }}>
              <span style={{ color: 'var(--fg-on-sky-1)', fontVariantNumeric: 'tabular-nums', minWidth: 46, textAlign: 'right' }}>
                {r.outflow != null ? Math.round(r.outflow).toLocaleString() : '—'}
              </span>
              <span style={{ color: 'var(--fg-on-sky-3)' }}>cfs</span>
              <span style={{ color: 'var(--fg-on-sky-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shortDamName(r.name)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Controlling dam (≈100%) or a single upstream release → one-dam headline.
  const entry = mode === 'controlling' ? damFlow.controlling : contributors[0];
  const v = damMiniView(entry);
  const grossCfs = v.diversion?.grossCfs ?? null;
  const divertedCfs = v.diversion?.divertedCfs ?? null;
  const hasDiversion = divertedCfs != null && divertedCfs > 0;
  // show the dam-news link on hover; when there's no diversion note to swap, show it always
  const showLink = hover || !hasDiversion;

  return (
    <div style={heroMiniTile} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div style={heroMiniLabel}><Icon name="droplet" size={13} /> Dam release</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 7 }}>
        <span style={{ fontWeight: 300, fontSize: 26, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {v.cfs != null ? Math.round(v.cfs).toLocaleString() : '—'}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-on-sky-2)' }}>cfs</span>
        {hasDiversion && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-on-sky-3)' }}>in-river</span>
        )}
        {mode === 'controlling' && !hasDiversion && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-on-sky-3)' }}>· 100%</span>
        )}
      </div>
      {v.name && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg-on-sky-3)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</div>
      )}
      <div style={{ marginTop: 6, fontSize: 10.5, lineHeight: 1.3, minHeight: 14, fontFamily: 'var(--font-mono)' }}>
        {showLink
          ? (v.plannedUrl ? (
              <a href={v.plannedUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--fg-on-sky-2)', textDecoration: 'none' }}>
                See dam news →
              </a>
            ) : null)
          : <span style={{ color: 'var(--fg-on-sky-3)' }}>{grossCfs != null ? Math.round(grossCfs).toLocaleString() : '—'} released − {Math.round(divertedCfs).toLocaleString()} diverted</span>}
      </div>
    </div>
  );
}

function SectionStatsMini({ section }: { section: any }) {
  const stat = (label: string, value: any, unit: string) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--fg-on-sky-3)' }}>{label}</div>
      <div style={{ fontWeight: 300, fontSize: 19, lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' }}>
        {value ?? '—'}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--fg-on-sky-2)', marginLeft: 2 }}>{unit}</span>
      </div>
    </div>
  );
  return (
    <div style={heroMiniTile}>
      <div style={{ ...heroMiniLabel, marginBottom: 8 }}>Section</div>
      <div style={{ display: 'flex', gap: 8 }}>
        {stat('Grad', section?.gradientFtPerMile, 'ft/mi')}
        {stat('Vel', section?.velocityFps, 'ft/s')}
        {stat('Drop', section?.elevationDropFt, 'ft')}
      </div>
    </div>
  );
}

function DesktopCorridorContent({ data, corridorSlug }: CorridorContentProps) {
  const navigate = useNavigate();
  const [selId, setSelId] = useState<string | null>(
    data.sections?.[0]?.id ?? null
  );

  const corridor = data.corridor;
  const watershed = data.watershed;
  const sections: any[] = data.sections ?? [];
  const accessPoints: any[] = data.accessPoints ?? [];
  const gauges: any[] = data.gauges ?? [];
  const dams: any[] = data.impassableDams ?? [];
  const shuttles: any[] = data.shuttleBusinesses ?? [];
  const outfitters: any[] = data.outfitters ?? [];

  const locationLabel = [watershed?.name, watershed?.region]
    .filter(Boolean)
    .join(' · ');

  const sortedAPs = [...accessPoints].sort((a, b) => {
    const aR = a.riverMile ?? Infinity;
    const bR = b.riverMile ?? Infinity;
    if (aR !== bR) return aR - bR;
    return (a.sortIndex ?? 999) - (b.sortIndex ?? 999);
  });

  const putIns = accessPoints.filter(ap => ap.kind === 'put-in');
  const takeOuts = accessPoints.filter(ap => ap.kind === 'take-out');
  const alternatives = accessPoints.filter(ap => ap.kind !== 'put-in' && ap.kind !== 'take-out');
  const orderedAPs = [...putIns, ...alternatives, ...takeOuts];

  // hovering a section card highlights it on the map and shifts the gauge chart
  // to that section's gauge
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);
  const [lockedSectionId, setLockedSectionId] = useState<string | null>(() => sections[0]?.id ?? null);

  // active section = hovered (override) ?? scroll-locked (topmost card not behind the map)
  const activeSectionId = hoveredSectionId ?? lockedSectionId;
  const activeGaugeId =
    sections.find((s: any) => s.id === activeSectionId)?.primaryGaugeId ?? null;

  // only gauges that correlate with a section appear in the toggle
  const sectionGaugeIds = new Set(sections.map((s: any) => s.primaryGaugeId));
  const toggleGauges = gauges.filter((g: any) => sectionGaugeIds.has(g.id));

  // section-aware dam + stats tiles in the hero follow the active (glowing) section
  const activeSection = sections.find((s: any) => s.id === activeSectionId) ?? null;

  const mapWrapRef = useRef<HTMLDivElement | null>(null);
  const cardsRef = useRef<HTMLDivElement | null>(null);
  const suppressSpyRef = useRef(false);
  const lockedRef = useRef<string | null>(lockedSectionId);
  lockedRef.current = lockedSectionId;

  // scroll spy: lock the glow + gauge onto the topmost section card not yet tucked
  // behind the sticky map
  useEffect(() => {
    const compute = () => {
      if (suppressSpyRef.current) return;
      const mapEl = mapWrapRef.current;
      const cardsEl = cardsRef.current;
      if (!mapEl || !cardsEl) return;
      const mapBottom = mapEl.getBoundingClientRect().bottom;
      const cards = Array.from(cardsEl.querySelectorAll('[data-section-id]'));
      let activeId: string | null = null;
      // the glowing card must be fully clear of the map; once its top slips behind
      // the map's bottom edge it bumps to the next card. The last card is exempt —
      // the `!activeId` fallback below keeps it lit even while covered.
      for (const c of cards) {
        if (c.getBoundingClientRect().top >= mapBottom - 2) {
          activeId = c.getAttribute('data-section-id');
          break;
        }
      }
      if (!activeId && cards.length) {
        activeId = cards[cards.length - 1].getAttribute('data-section-id');
      }
      if (activeId && activeId !== lockedRef.current) setLockedSectionId(activeId);
    };
    compute();
    // called directly (no rAF) so it also runs in headless/background tabs
    window.addEventListener('scroll', compute, { passive: true });
    window.addEventListener('resize', compute);
    return () => {
      window.removeEventListener('scroll', compute);
      window.removeEventListener('resize', compute);
    };
  }, [sections.length]);

  // toggling a gauge scrolls to the most-upriver section using it; the scroll spy
  // then locks the glow + gauge onto it
  const onGaugeSelect = (gaugeId: string) => {
    const target = sections.find((s: any) => s.primaryGaugeId === gaugeId);
    if (!target) return;
    setLockedSectionId(target.id);
    suppressSpyRef.current = true;
    const cardEl = cardsRef.current?.querySelector(
      `[data-section-id="${target.id}"]`,
    ) as HTMLElement | null;
    const mapEl = mapWrapRef.current;
    if (cardEl && mapEl) {
      const mapBottom = mapEl.getBoundingClientRect().bottom;
      const delta = cardEl.getBoundingClientRect().top - (mapBottom + 12);
      window.scrollBy({ top: delta, behavior: 'smooth' });
    }
    window.setTimeout(() => { suppressSpyRef.current = false; }, 700);
  };

  const logBtn = (
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
      <Icon name="flag" size={17} />Log a run
    </button>
  );

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
          background:
            'linear-gradient(180deg, rgba(6,19,33,0.5) 0%, rgba(6,19,33,0.12) 100%)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          color: 'var(--fg-on-sky-1)',
        }}
      >
        <button onClick={() => navigate(-1)} style={navBtn}>
          <Icon name="chevron-left" size={22} />
        </button>
        <div style={{ minWidth: 0, flex: 1 }}>
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
            {corridor?.name ?? corridorSlug}
          </div>
          {locationLabel && (
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--fg-on-sky-2)',
                marginTop: 2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {locationLabel}
            </div>
          )}
        </div>
        {logBtn}
      </div>

      {/* ── river summary prose ── */}
      {(() => {
        const prose = (corridor?.summaryMd || corridor?.description || '').trim();
        return prose ? (
          <div style={{ padding: '16px 36px 0', maxWidth: 1320, margin: '0 auto' }}>
            <p
              style={{
                margin: 0,
                fontSize: 16,
                color: 'var(--fg-on-sky-1)',
                lineHeight: 1.5,
                maxWidth: 760,
                textWrap: 'pretty' as any,
              }}
            >
              {prose}
            </p>
          </div>
        ) : null;
      })()}

      <div style={{ padding: '24px 36px 60px', maxWidth: 1320, margin: '0 auto' }}>
        {/* HERO — gauge (left) + orientation well (right). The grid stretches so the
            gauge's sticky range matches the well height: the gauge stays pinned while
            sections tuck under the map and exits together with the well. Detail modules
            live in the DETAILS grid below, so nothing on the left scrolls until the
            well is exiting. */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
            gap: 22,
            marginTop: 0,
            alignItems: 'stretch',
          }}
        >
          {/* hero left — sticky panel: gauge chart + section-aware dam & stats tiles
              (all pinned together, exit with the well) */}
          <div>
            <div style={{ position: 'sticky', top: 96, zIndex: 5, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {gauges.length > 0 && (
                <GaugeFlowTile gauges={toggleGauges} activeGaugeId={activeGaugeId} onGaugeSelect={onGaugeSelect} />
              )}
              {activeSection && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 2px 8px' }}>
                    {activeSection.difficulty && (
                      <span style={{ background: 'var(--bg-card)', color: statusColor(activeSection.status as DesignStatus), borderRadius: 7, padding: '2px 7px', fontWeight: 800, fontSize: 11.5, whiteSpace: 'nowrap' }}>
                        {activeSection.difficulty}
                      </span>
                    )}
                    <span style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: '-0.01em' }}>{activeSection.name}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <SectionDamMini damFlow={activeSection?.damFlow} />
                    <SectionStatsMini section={activeSection} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* hero right — orientation well (map + section cards) */}
          <div>
            {sections.length > 0 && (
              <div
                style={{
                  position: 'relative',
                  padding: '16px 14px 18px',
                  borderRadius: 26,
                  background:
                    'linear-gradient(180deg, rgba(6,19,33,0.20) 0%, rgba(6,19,33,0.12) 50%, rgba(6,19,33,0.17) 100%)',
                  boxShadow:
                    'inset 0 10px 20px -10px rgba(6,19,33,0.70), inset 0 -10px 20px -10px rgba(6,19,33,0.60)',
                }}
              >
                {/* sticky schematic map — section cards tuck under it as the column
                    scrolls. top clears the 87px sticky glass header bar so the map's
                    top edge is never hidden behind it. */}
                <div
                  ref={mapWrapRef}
                  style={{
                    position: 'sticky',
                    top: 96,
                    zIndex: 20,
                    borderRadius: 'var(--r-lg)',
                    overflow: 'hidden',
                    color: 'var(--fg-on-sky-1)',
                    background:
                      'linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.07) 60%, rgba(255,255,255,0.05) 100%), var(--sky-river, #1a6fa8)',
                    backdropFilter: 'blur(22px) saturate(150%)',
                    WebkitBackdropFilter: 'blur(22px) saturate(150%)',
                    boxShadow:
                      '0 10px 22px rgba(6,19,33,0.38), inset 0 1px 0 rgba(255,255,255,0.24)',
                    border: '1px solid var(--module-stroke)',
                    padding: 0,
                  }}
                >
                  <GeoMap
                    sections={sections.map(s => ({
                      id: s.id,
                      river: data.corridor?.name,
                      section: s.name,
                      classification: s.difficulty,
                      now: s.currentFlow,
                      status: s.status,
                      statusLabel: s.statusLabel,
                      trend: s.trend,
                    }))}
                    accessPoints={sortedAPs.map(ap => ({
                      id: ap.id,
                      name: ap.name,
                      kind: ap.kind,
                      latitude: ap.latitude,
                      longitude: ap.longitude,
                    }))}
                    selectedSectionId={activeSectionId}
                    onSectionClick={(id) => navigate('/section/' + id)}
                    height={300}
                    style={{ width: '100%', display: 'block' }}
                  />
                </div>

                {/* section cards tuck under the map */}
                <div ref={cardsRef} style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: 12 }}>
                  {sections.map(s => (
                    <SectionTile
                      key={s.id}
                      section={s}
                      selected={s.id === selId}
                      highlighted={s.id === activeSectionId}
                      onSelect={() => setSelId(s.id)}
                      onNavigate={() => navigate(`/section/${s.id}`)}
                      onHover={setHoveredSectionId}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* DETAILS — conditions + services, revealed after the hero scrolls away */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
            gap: 22,
            marginTop: 16,
            alignItems: 'start',
          }}
        >
          {/* details left — conditions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <CorridorWeatherTile
              current={data.weatherCurrent ?? null}
              hourly={data.weatherHourly ?? []}
            />
            <SnowpackModule snowpack={data.snowpack ?? []} />
            {orderedAPs.length > 0 && (
              <Module label="Access points" icon="map-pin">
                {orderedAPs.map((ap, i) => (
                  <AccessPointRow key={ap.id} ap={ap} isFirst={i === 0} />
                ))}
              </Module>
            )}
            <ShuttleModule businesses={shuttles} />
          </div>

          {/* details right — guides, permits, water temp */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <GuidesModule outfitters={outfitters} />
            <PermitModule permits={data.permits ?? []} />
            <WaterTempModule temps={data.waterTemps ?? []} />
          </div>
        </div>

        {/* bottom log CTA */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 34 }}>
          <button
            onClick={() => navigate('/log')}
            style={{
              width: '100%',
              maxWidth: 420,
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
            }}
          >
            <Icon name="flag" size={18} />
            Log a run on the {corridor?.shortName ?? corridor?.name ?? 'river'}
          </button>
        </div>

        {/* attribution */}
        <div
          style={{
            textAlign: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: 11.5,
            color: 'var(--fg-on-sky-3)',
            marginTop: 24,
          }}
        >
          Flow data via USGS & Colorado DWR · gauge readings updated every 15 min
        </div>
      </div>
    </>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function CorridorSkeleton() {
  return (
    <div style={{ padding: '0 14px' }}>
      <div style={{ height: 110, background: 'var(--module-fill)', borderRadius: 22, marginTop: 0 }} />
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <PulseSkeleton height={160} />
        <PulseSkeleton height={80} />
        <PulseSkeleton height={80} />
      </div>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function Corridor() {
  const { corridorSlug } = useParams<{ corridorSlug: string }>();
  const navigate = useNavigate();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const { data, isLoading, isError } = useCorridor(corridorSlug);

  if (!corridorSlug) {
    navigate('/', { replace: true });
    return null;
  }

  // ── loading ──
  if (isLoading) {
    return (
      <Shell active="rivers" light={false}>
        <style>{`@keyframes fsPulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
        {isDesktop ? (
          <div style={{ padding: '52px 36px', color: 'var(--fg-on-sky-1)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 700 }}>
              <PulseSkeleton height={44} radius={10} />
              <PulseSkeleton height={180} />
              <PulseSkeleton height={80} />
              <PulseSkeleton height={80} />
            </div>
          </div>
        ) : (
          <div style={{ position: 'relative', minHeight: '100vh' }}>
            <CorridorSkeleton />
          </div>
        )}
      </Shell>
    );
  }

  // ── error ──
  if (isError || !data) {
    return (
      <Shell active="rivers" light={false}>
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
          <Icon name="waves" size={42} color="var(--fg-on-sky-3)" />
          <div style={{ fontSize: 18, fontWeight: 700 }}>Unable to load corridor</div>
          <div style={{ fontSize: 14, color: 'var(--fg-on-sky-2)' }}>
            Check your connection and try again.
          </div>
          <button
            onClick={() => navigate('/')}
            style={{
              ...navBtn,
              width: 'auto',
              padding: '10px 20px',
              borderRadius: 'var(--r-pill)',
              fontSize: 15,
              fontWeight: 700,
              fontFamily: 'var(--font-sans)',
              background: 'var(--module-fill)',
            }}
          >
            Back to rivers
          </button>
        </div>
      </Shell>
    );
  }

  // ── desktop ──
  if (isDesktop) {
    return (
      <Shell active="rivers" light={false}>
        <style>{`@keyframes fsPulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
        <DesktopCorridorContent data={data} corridorSlug={corridorSlug} />
      </Shell>
    );
  }

  // ── mobile (immersive sky) ──
  return (
    <Shell active="rivers" light={false}>
      <style>{`@keyframes fsPulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
      <SkyBg sky="river" style={{ position: 'fixed', inset: 0 }}>
        <MobileCorridorContent data={data} corridorSlug={corridorSlug} />
      </SkyBg>
    </Shell>
  );
}
