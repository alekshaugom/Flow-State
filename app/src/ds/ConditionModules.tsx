/**
 * ConditionModules.tsx — shared condition-tile components.
 *
 * Extracted from Section.tsx so the same modules can be used on the
 * corridor page without re-implementing them.
 *
 * Exports: WeatherModule, SnowpackModule, DamReleaseModule
 */

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

// ── DamReleaseModule ──────────────────────────────────────────────────────────

export function DamReleaseModule({
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
  const resRaw = res?.reservoir ?? null;
  const resName = typeof resRaw === 'string' ? resRaw : (resRaw?.name ?? null);

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
