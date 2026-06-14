/**
 * ConditionModules.tsx — shared condition-tile components.
 *
 * Extracted from Section.tsx so the same modules can be used on the
 * corridor page without re-implementing them.
 *
 * Exports: WeatherModule, SnowpackModule, DamReleaseModule
 */

import type { CSSProperties, Key } from 'react';
import { Module } from './Module';
import { Icon } from './Icon';

// ── helpers ───────────────────────────────────────────────────────────────────

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

// ── WeatherModule ─────────────────────────────────────────────────────────────

export function WeatherModule({ forecast }: { forecast: any[] }) {
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
            borderBottom: `1px solid var(--module-stroke)`,
          }}
        >
          <Icon name={todayIcon} size={36} color="var(--fg-on-sky-1)" />
          <div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 300,
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
                color: 'var(--fg-on-sky-1)',
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
                background: 'var(--module-fill)',
                border: idx === 0 ? '1px solid rgba(255,255,255,0.35)' : `1px solid var(--module-stroke)`,
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
                  color: 'var(--fg-on-sky-2)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                }}
              >
                {dayShort(w.date, idx)}
              </div>
              <Icon name={ic} size={18} color="var(--fg-on-sky-1)" strokeWidth={1.6} />
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--fg-on-sky-1)',
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
                    color: 'var(--flow-300)',
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

// ── SnowpackModule ────────────────────────────────────────────────────────────

export function SnowpackModule({ snowpack }: { snowpack: any[] }) {
  if (!snowpack?.length) return null;
  const s = snowpack[0];
  const pct = s?.latest?.swePercentMedian ?? null;
  const swe = s?.latest?.sweInches ?? null;
  const depth = s?.latest?.snowDepthInches ?? null;
  const basinRaw = s?.basin ?? null;
  const basin = typeof basinRaw === 'string' ? basinRaw : (basinRaw?.name ?? null);
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
                  color: 'var(--fg-on-sky-1)',
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
            color: 'var(--fg-on-sky-1)',
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
          borderTop: `1px solid var(--module-stroke)`,
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
                borderLeft: k ? `1px solid var(--module-stroke)` : 'none',
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

// ── DamReleaseModule ──────────────────────────────────────────────────────────
//
// Renders the dam picture for a reach. Prefers the structured `damFlow` model
// (lib/dam-flow.ts) which distinguishes a single *controlling* dam (releases
// ~100% of flow — show one big number) from *multiple contributing* dams on
// different tributaries (show each release + a combined subtotal). Falls back to
// the legacy single-reservoir rendering when `damFlow` is absent.

interface DamView {
  name: string | null;
  outflow: number | null;
  plannedUrl: string | null;
  plannedNote: string | null;
  diversion: any;
}

function damView(entry: any): DamView {
  const resRaw = entry?.reservoir ?? null;
  return {
    name: typeof resRaw === 'string' ? resRaw : (resRaw?.name ?? null),
    outflow: entry?.latest?.outflowCfs ?? null,
    plannedUrl: typeof resRaw === 'string' ? null : (resRaw?.plannedReleaseUrl ?? null),
    plannedNote: typeof resRaw === 'string' ? null : (resRaw?.plannedReleaseNote ?? null),
    diversion: entry?.diversion ?? null,
  };
}

const damBigNumberStyle: CSSProperties = {
  fontWeight: 300,
  fontSize: 40,
  lineHeight: 1,
  fontVariantNumeric: 'tabular-nums',
};

function ControlChip({ label }: { label: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily: 'var(--font-mono)',
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'var(--fg-on-sky-2)',
        background: 'var(--module-fill)',
        border: '1px solid var(--module-stroke)',
        borderRadius: 'var(--r-sm, 6px)',
        padding: '3px 7px',
      }}
    >
      {label}
    </span>
  );
}

function PlannedLink({ url, note }: { url: string; note: string | null }) {
  return (
    <div style={{ fontSize: 11.5, color: 'var(--fg-on-sky-3)', marginTop: 8, lineHeight: 1.4 }}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={note || undefined}
        style={{ color: 'var(--fg-on-sky-2)', textDecoration: 'none' }}
      >
        Planned releases: announced by operator →
      </a>
    </div>
  );
}

// The release → diverted → dam-controlled (+ tributary = reach) chain for dams
// with a major diversion between the dam and the reach (e.g. the Gunnison Tunnel).
function DiversionChain({ outflow, diversion }: { outflow: number; diversion: any }) {
  const reachFlow = diversion?.reachFlowCfs ?? null;
  const tributaryGain = diversion?.tributaryGainCfs ?? null;
  const hasTributary = reachFlow != null && tributaryGain != null && tributaryGain > Math.max(5, reachFlow * 0.03);
  return (
    <div
      style={{
        marginTop: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        fontFamily: 'var(--font-mono)',
        fontSize: 11.5,
        lineHeight: 1.5,
        color: 'var(--fg-on-sky-3)',
      }}
    >
      <span>Releases {Math.round(outflow).toLocaleString()} cfs</span>
      <span>− {diversion.name} diverts ~{Math.round(diversion.divertedCfs).toLocaleString()} cfs</span>
      {hasTributary && (
        <>
          <span>+ ~{Math.round(tributaryGain).toLocaleString()} cfs tributary gains</span>
          <span style={{ color: 'var(--fg-on-sky-2)' }}>= {Math.round(reachFlow).toLocaleString()} cfs total in this reach</span>
        </>
      )}
    </div>
  );
}

function FeederNote({ feeders }: { feeders: any[] }) {
  const names = feeders.map(f => damView(f).name).filter(Boolean);
  if (!names.length) return null;
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-on-sky-3)', marginTop: 8, lineHeight: 1.45 }}>
      Fed upstream by {names.join(' · ')}
    </div>
  );
}

// A single headline dam (used by both controlling mode and single-contributor mode).
function SingleDam({ entry, label, feeders }: { entry: any; label: string; feeders: any[] }) {
  const v = damView(entry);
  const div = v.diversion;
  const hasDiversion = div != null && div.damControlledCfs != null && v.outflow != null;
  const bigValue = hasDiversion ? div.damControlledCfs : v.outflow;
  const bigLabel = hasDiversion ? 'cfs dam-controlled' : label;
  return (
    <>
      {bigValue != null && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={damBigNumberStyle}>{Math.round(bigValue).toLocaleString()}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--fg-on-sky-2)' }}>{bigLabel}</span>
        </div>
      )}
      {v.name && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-on-sky-3)', marginTop: 8 }}>{v.name}</div>
      )}
      {hasDiversion && <DiversionChain outflow={v.outflow!} diversion={div} />}
      <FeederNote feeders={feeders} />
      {bigValue == null && v.name && (
        <div style={{ fontSize: 13, color: 'var(--fg-on-sky-3)', marginTop: 8 }}>Release data updating.</div>
      )}
      {v.plannedUrl && <PlannedLink url={v.plannedUrl} note={v.plannedNote} />}
    </>
  );
}

// Multiple contributing dams: combined headline + a per-dam breakdown list.
function ContributingDams({ damFlow }: { damFlow: any }) {
  const contributors: any[] = damFlow.contributors ?? [];
  const combined: number | null = damFlow.combinedCfs ?? null;
  const reachFlow: number | null = damFlow.reachFlowCfs ?? null;
  const n = contributors.length;

  // Share-of-reach context, only when it's sane (dam release ≤ ~the reach flow).
  let pct: number | null = null;
  if (combined != null && reachFlow != null && reachFlow > 0 && combined <= reachFlow * 1.15) {
    pct = Math.max(0, Math.min(100, Math.round((combined / reachFlow) * 100)));
  }

  return (
    <>
      {combined != null && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={damBigNumberStyle}>{Math.round(combined).toLocaleString()}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--fg-on-sky-2)' }}>cfs combined release</span>
        </div>
      )}

      {/* per-dam breakdown */}
      <div
        style={{
          marginTop: combined != null ? 12 : 0,
          paddingTop: combined != null ? 12 : 0,
          borderTop: combined != null ? '1px solid var(--module-stroke)' : 'none',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {contributors.map((c, i) => {
          const v = damView(c);
          return (
            <div
              key={(c?.reservoir?.id ?? v.name ?? i) as Key}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 10,
                padding: '6px 0',
                borderTop: i ? '1px solid var(--module-stroke)' : 'none',
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--fg-on-sky-1)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {v.name ?? 'Unknown dam'}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--fg-on-sky-2)', fontVariantNumeric: 'tabular-nums', flex: '0 0 auto' }}>
                {v.outflow != null ? `${Math.round(v.outflow).toLocaleString()} cfs` : '—'}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-on-sky-3)', marginTop: 10, lineHeight: 1.45 }}>
        {pct != null
          ? `~${pct}% of this reach's ${Math.round(reachFlow!).toLocaleString()} cfs is dam release`
          : `Combined release from ${n} upstream dams · the reach also carries snowmelt and tributary inflow`}
      </div>
      <FeederNote feeders={damFlow.feeders ?? []} />
    </>
  );
}

export function DamReleaseModule({
  damFlow,
  reservoirs,
  damControlled,
  riverName,
}: {
  damFlow?: any;
  reservoirs?: any[];
  damControlled?: boolean;
  riverName?: string;
}) {
  const df = damFlow && damFlow.mode && damFlow.mode !== 'none' ? damFlow : null;

  // ── structured path ──
  if (df) {
    if (df.mode === 'controlling' && df.controlling) {
      return (
        <Module label="Dam release" icon="droplet" style={{ marginTop: 14 }}>
          <SingleDam entry={df.controlling} label="cfs released" feeders={df.feeders ?? []} />
          <div style={{ marginTop: 10 }}>
            <ControlChip label="Controls ~100% of flow" />
          </div>
        </Module>
      );
    }
    if (df.mode === 'contributing') {
      const contributors: any[] = df.contributors ?? [];
      return (
        <Module label={contributors.length >= 2 ? 'Upstream dam releases' : 'Dam release'} icon="droplet" style={{ marginTop: 14 }}>
          {contributors.length >= 2
            ? <ContributingDams damFlow={df} />
            : <SingleDam entry={contributors[0]} label="cfs upstream release" feeders={df.feeders ?? []} />}
        </Module>
      );
    }
  }

  // ── legacy fallback (no structured damFlow) ──
  const res = reservoirs?.[0];
  if (!res && !damControlled) return null;
  if (!res) {
    return (
      <Module label="Dam release" icon="droplet" style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, color: 'var(--fg-on-sky-1)' }}>
          <Icon name="triangle-alert" size={22} color="var(--status-high, var(--high-fg))" />
          <div style={{ fontSize: 14.5, lineHeight: 1.4 }}>Dam-controlled — release data unavailable.</div>
        </div>
      </Module>
    );
  }
  const v = damView(res);
  return (
    <Module label="Dam release" icon="droplet" style={{ marginTop: 14 }}>
      <SingleDam entry={res} label="cfs outflow" feeders={[]} />
      {v.outflow == null && !v.name && (
        <div style={{ fontSize: 14.5, color: 'var(--fg-on-sky-1)' }}>Release data unavailable for {riverName}.</div>
      )}
    </Module>
  );
}
