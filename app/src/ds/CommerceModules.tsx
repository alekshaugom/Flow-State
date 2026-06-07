/**
 * CommerceModules.tsx — shared guide/shuttle modules used on both
 * the Corridor page and the Section detail page.
 *
 * Extracted from Corridor.tsx so they can be reused without duplication.
 */

import { Icon } from './Icon';
import { Module } from './Module';

// ── helpers ────────────────────────────────────────────────────────────────────

function tryParseJson(raw: string | null | undefined): unknown {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function safeArr(val: unknown): string[] {
  if (Array.isArray(val)) return val.filter((x): x is string => typeof x === 'string');
  return [];
}

// ── ShuttleModule ─────────────────────────────────────────────────────────────

export function ShuttleModule({ businesses }: { businesses: any[] }) {
  if (!businesses.length) return null;
  return (
    <Module label="Shuttle services" icon="bus" style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {businesses.map((s: any, i: number) => {
          const rates = tryParseJson(s.ratesJson);
          const rateLines = safeArr(rates);
          return (
            <div
              key={s.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '12px 0',
                borderTop: i ? '1px solid rgba(255,255,255,0.12)' : 'none',
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 11,
                  flexShrink: 0,
                  background: 'rgba(255,255,255,0.16)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="bus" size={19} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{s.name}</div>
                {s.notes && (
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11.5,
                      color: 'var(--fg-on-sky-2)',
                      marginTop: 2,
                    }}
                  >
                    {s.notes}
                  </div>
                )}
                {rateLines.length > 0 && (
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      color: 'var(--fg-on-sky-3)',
                      marginTop: 4,
                    }}
                  >
                    {rateLines.join(' · ')}
                  </div>
                )}
              </div>
              {s.phone && (
                <a
                  href={`tel:${s.phone}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: 'var(--flow-700)',
                    background: 'rgba(255,255,255,0.9)',
                    borderRadius: 'var(--r-pill)',
                    padding: '5px 11px',
                    textDecoration: 'none',
                    flexShrink: 0,
                  }}
                >
                  <Icon name="phone" size={12} />Call
                </a>
              )}
            </div>
          );
        })}
      </div>
    </Module>
  );
}

// ── GuidesModule ──────────────────────────────────────────────────────────────

export function GuidesModule({ outfitters }: { outfitters: any[] }) {
  if (!outfitters.length) return null;
  return (
    <Module label="Guides on this corridor" icon="users" style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {outfitters.map((o: any, i: number) => {
          const trips = tryParseJson(o.tripTypesJson);
          const tripList = safeArr(trips);
          return (
            <div
              key={o.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 0',
                borderTop: i ? '1px solid rgba(255,255,255,0.12)' : 'none',
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 11,
                  flexShrink: 0,
                  background: 'rgba(255,255,255,0.16)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 15,
                }}
              >
                {o.name?.[0] ?? 'G'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {o.name}
                </div>
                {tripList.length > 0 && (
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11.5,
                      color: 'var(--fg-on-sky-2)',
                      marginTop: 2,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {tripList.join(' · ')}
                  </div>
                )}
                {o.notes && !tripList.length && (
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11.5,
                      color: 'var(--fg-on-sky-2)',
                      marginTop: 2,
                    }}
                  >
                    {o.notes}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {o.phone && (
                  <a
                    href={`tel:${o.phone}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: 'var(--flow-700)',
                      background: 'rgba(255,255,255,0.9)',
                      borderRadius: 'var(--r-pill)',
                      padding: '5px 11px',
                      textDecoration: 'none',
                    }}
                  >
                    <Icon name="phone" size={12} />Call
                  </a>
                )}
                {o.website && (
                  <a
                    href={o.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: 'var(--flow-700)',
                      background: 'rgba(255,255,255,0.9)',
                      borderRadius: 'var(--r-pill)',
                      padding: '5px 11px',
                      textDecoration: 'none',
                    }}
                  >
                    <Icon name="external-link" size={12} />Web
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Module>
  );
}
