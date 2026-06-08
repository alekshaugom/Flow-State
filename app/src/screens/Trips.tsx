/**
 * Trips screen — guided outfitter listing + non-transactional trip detail.
 *
 * Data: useOutfitters() fetches real /Outfitter/ records.
 *   Each outfitter has: id, name, phone, website, licenseNumber, licenseState,
 *   serviceCorridorIds, tripTypesJson, notes.
 *
 * TripDetailView shows outfitter info + BookingControls (presentational only —
 * booking is not implemented; a clear disclaimer links to phone/website).
 *
 * Route: /trips → listing, /trips/:outfitterId → detail (handled via URL params
 * inside this screen — no separate lazy chunk needed).
 *
 * Footer: "Trips are run by independent licensed outfitters. Conditions data stays free."
 */

import { useState } from 'react';
import { useParams, useNavigate, Routes, Route } from 'react-router-dom';
import { Shell } from '../shell/Shell';
import { Icon } from '../ds';
import { useOutfitters } from '../hooks/useOutfitters';
import type { Outfitter } from '../hooks/useOutfitters';

// ─── Trip type parsing ────────────────────────────────────────────────────────

interface TripType {
  label: string;
  durationHours?: number;
  price?: number;
}

function parseTripTypes(json: string | null): TripType[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t: unknown): t is TripType =>
      typeof t === 'object' && t !== null && 'label' in t,
    );
  } catch {
    return [];
  }
}

function outfitterTitle(outfitter: Outfitter): string {
  const types = parseTripTypes(outfitter.tripTypesJson);
  if (types.length > 0) return types[0].label;
  return `Guided trip by ${outfitter.name}`;
}

// ─── Booking controls (airline-style, presentational only) ────────────────────

interface BookingDay {
  d: string;
  n: number;
  cond: 'good' | 'low' | 'high';
  price: number;
}

// Fixed presentational days — not connected to live data (by design)
const BOOKING_DAYS: BookingDay[] = [
  { d: 'Thu', n: 12, cond: 'good', price: 189 },
  { d: 'Fri', n: 13, cond: 'good', price: 189 },
  { d: 'Sat', n: 14, cond: 'high', price: 209 },
  { d: 'Sun', n: 15, cond: 'good', price: 189 },
  { d: 'Mon', n: 16, cond: 'low', price: 169 },
];

const FARE_OPTIONS = ['Half day', 'Full day', 'Overnight'] as const;

function BookingControls() {
  const [day, setDay] = useState(0);
  const [fare, setFare] = useState(1);
  const [guests, setGuests] = useState(2);
  const total = BOOKING_DAYS[day].price * guests + (fare === 2 ? 120 * guests : 0);

  const lbl: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 9,
  };
  const stepBtn: React.CSSProperties = {
    width: 34, height: 34, borderRadius: 99,
    border: '1px solid var(--border)', background: 'var(--bg-surface)',
    color: 'var(--flow-600)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Date strip */}
      <div>
        <div style={lbl}>Choose a date</div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
          {BOOKING_DAYS.map((dd, i) => {
            const on = i === day;
            const condColor = `var(--status-${dd.cond})`;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setDay(i)}
                style={{
                  flex: 'none', width: 72, padding: '10px 0 9px',
                  borderRadius: 'var(--r-md)', cursor: 'pointer',
                  border: `1.5px solid ${on ? 'var(--flow-600)' : 'var(--border)'}`,
                  background: on ? 'var(--flow-100)' : 'var(--bg-surface)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 11.5, color: 'var(--fg-3)', fontWeight: 600 }}>{dd.d}</div>
                <div style={{
                  fontSize: 19, fontWeight: 700, color: 'var(--fg-1)',
                  fontVariantNumeric: 'tabular-nums', lineHeight: 1.1,
                }}>
                  {dd.n}
                </div>
                <div style={{
                  width: 7, height: 7, borderRadius: 99,
                  background: condColor, margin: '6px auto 4px',
                }} />
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-2)' }}>
                  ${dd.price}
                </div>
              </button>
            );
          })}
        </div>
        <div style={{
          fontSize: 12, color: 'var(--fg-3)', marginTop: 7,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Icon name="waves" size={13} color="var(--fg-3)" />
          Dot shows forecast river condition that day
        </div>
      </div>

      {/* Trip length segmented */}
      <div>
        <div style={lbl}>Trip length</div>
        <div style={{
          display: 'flex', background: 'var(--bg-subtle)',
          borderRadius: 'var(--r-pill)', padding: 4,
        }}>
          {FARE_OPTIONS.map((f, i) => (
            <button
              key={f}
              type="button"
              onClick={() => setFare(i)}
              style={{
                flex: 1, border: 'none', cursor: 'pointer',
                padding: '9px 0', borderRadius: 'var(--r-pill)',
                fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 600,
                background: i === fare ? 'var(--bg-surface)' : 'transparent',
                color: i === fare ? 'var(--flow-700, #1a5e8a)' : 'var(--fg-3)',
                boxShadow: i === fare ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Paddlers stepper */}
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '12px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="users" size={18} color="var(--fg-2)" />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-1)' }}>Paddlers</div>
            <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>Ages 12+</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            type="button"
            onClick={() => setGuests(Math.max(1, guests - 1))}
            style={stepBtn}
          >
            <Icon name="minus" size={16} />
          </button>
          <span style={{
            fontSize: 17, fontWeight: 700, width: 18,
            textAlign: 'center', fontVariantNumeric: 'tabular-nums',
            color: 'var(--fg-1)',
          }}>
            {guests}
          </span>
          <button
            type="button"
            onClick={() => setGuests(Math.min(8, guests + 1))}
            style={stepBtn}
          >
            <Icon name="plus" size={16} />
          </button>
        </div>
      </div>

      {/* Assurance */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--fg-3)' }}>
        <Icon name="shield-check" size={15} color="var(--fg-3)" />
        Free cancellation up to 48 hrs · Licensed outfitter
      </div>

      {/* Price summary */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderTop: '1px solid var(--border)', paddingTop: 14,
      }}>
        <div>
          <div style={{
            fontSize: 22, fontWeight: 800, color: 'var(--fg-1)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            ${total.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>
            {guests} paddler{guests > 1 ? 's' : ''} · {FARE_OPTIONS[fare]}
          </div>
        </div>
        {/* Continue is non-transactional — does nothing */}
        <button
          type="button"
          onClick={() => undefined}
          style={{
            border: 'none', cursor: 'default',
            background: 'var(--flow-600)', color: 'var(--fg-on-brand)',
            fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700,
            padding: '14px 26px', borderRadius: 'var(--r-pill)',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          Continue<Icon name="arrow-right" size={18} />
        </button>
      </div>
    </div>
  );
}

// ─── Photo placeholder ────────────────────────────────────────────────────────

const TONE_GRADIENTS: Record<string, string> = {
  flow: 'linear-gradient(135deg,#1a6fa8,#3aa0c9)',
  alpine: 'linear-gradient(135deg,#2b6fa8,#7fb6cf)',
  dusk: 'linear-gradient(135deg,#6b4a82,#c8633f)',
  snow: 'linear-gradient(135deg,#3a5f8f,#9fc2dc)',
};
function PhotoSlot({ tone, h }: { tone: string; h: number }) {
  const grad = TONE_GRADIENTS[tone] ?? TONE_GRADIENTS.flow;
  return (
    <div style={{
      height: h, background: grad, overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--fg-on-sky-3)',
    }}>
      <Icon name="ship" size={34} />
    </div>
  );
}

// ─── Trip listing card ────────────────────────────────────────────────────────

const TONES = ['flow', 'dusk', 'alpine', 'snow'];

interface TripListingProps {
  outfitter: Outfitter;
  tone: string;
  onOpen: () => void;
}
function TripListing({ outfitter, tone, onOpen }: TripListingProps) {
  const title = outfitterTitle(outfitter);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onOpen(); }}
      style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden', cursor: 'pointer',
      }}
    >
      <PhotoSlot tone={tone} h={120} />
      <div style={{ padding: '13px 15px' }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', gap: 10,
        }}>
          <div>
            <div style={{ fontSize: 16.5, fontWeight: 700, color: 'var(--fg-1)' }}>{title}</div>
            <div style={{ fontSize: 13, color: 'var(--fg-3)', marginTop: 2 }}>{outfitter.name}</div>
          </div>
          {outfitter.licenseState && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 12, fontWeight: 600, color: 'var(--fg-2)',
              background: 'var(--bg-subtle)', border: '1px solid var(--border)',
              borderRadius: 'var(--r-pill)', padding: '4px 8px', flex: 'none',
              whiteSpace: 'nowrap',
            }}>
              <Icon name="shield-check" size={13} />
              {outfitter.licenseState} licensed
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 9 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 12.5, fontFamily: 'var(--font-mono)', color: 'var(--fg-3)',
          }}>
            <Icon name="waves" size={13} />
            {outfitter.notes ? outfitter.notes.split(' ').slice(0, 4).join(' ') + '…' : 'River guided trips'}
          </span>
        </div>
        <div style={{
          display: 'flex', alignItems: 'flex-end',
          justifyContent: 'flex-end', marginTop: 10,
        }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 14, fontWeight: 700, color: 'var(--flow-600)',
          }}>
            View details<Icon name="chevron-right" size={15} />
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Trip detail view ─────────────────────────────────────────────────────────

interface TripDetailViewProps {
  outfitter: Outfitter;
  tone: string;
  onBack: () => void;
}
function TripDetailView({ outfitter, tone, onBack }: TripDetailViewProps) {
  const title = outfitterTitle(outfitter);
  return (
    <div style={{ position: 'relative', minHeight: '100vh', paddingBottom: 40 }}>
      {/* Photo hero */}
      <div style={{ position: 'relative' }}>
        <PhotoSlot tone={tone} h={220} />
        <button
          type="button"
          onClick={onBack}
          style={{
            position: 'absolute', top: 54, left: 16,
            background: 'rgba(255,255,255,0.92)', border: 'none', borderRadius: 99,
            width: 38, height: 38, display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: 'var(--fg-1)',
            cursor: 'pointer', boxShadow: 'var(--shadow-sm)',
          }}
        >
          <Icon name="chevron-left" size={22} />
        </button>
      </div>

      {/* Sheet */}
      <div style={{
        background: 'var(--bg-app, #f5f7f9)',
        borderRadius: '24px 24px 0 0',
        marginTop: -22, position: 'relative',
        padding: '22px 20px 0',
      }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', gap: 12,
        }}>
          <div>
            <div style={{
              fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em',
              color: 'var(--fg-1)', lineHeight: 1.15,
            }}>
              {title}
            </div>
            <div style={{ fontSize: 14, color: 'var(--fg-3)', marginTop: 3 }}>
              {outfitter.name}
            </div>
          </div>
          {outfitter.licenseState && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 13, fontWeight: 600, color: 'var(--fg-2)', flex: 'none', marginTop: 3,
            }}>
              <Icon name="shield-check" size={15} color="var(--fg-3)" />
              {outfitter.licenseState} licensed
            </div>
          )}
        </div>

        {/* Meta row */}
        <div style={{ display: 'flex', gap: 16, marginTop: 14, marginBottom: 18, flexWrap: 'wrap' }}>
          {[
            ['waves', 'River trips'],
            ['clock', 'Half & full day'],
            ['users', 'Up to 8'],
            ['shield-check', 'Licensed'],
          ].map(([ic, v]) => (
            <div key={v} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 13, color: 'var(--fg-2)', fontWeight: 600,
            }}>
              <Icon name={ic} size={16} color="var(--fg-3)" />{v}
            </div>
          ))}
        </div>

        {outfitter.notes && (
          <div style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--fg-2)', marginBottom: 22 }}>
            {outfitter.notes}
          </div>
        )}

        {/* Non-transactional disclaimer */}
        <div style={{
          background: 'var(--bg-subtle)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)', padding: '12px 14px', marginBottom: 20,
          fontSize: 13.5, color: 'var(--fg-2)', lineHeight: 1.5,
        }}>
          <strong style={{ color: 'var(--fg-1)' }}>Booking is not yet available</strong>
          {' '}— contact the outfitter directly to reserve your spot.
          <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {outfitter.phone && (
              <a
                href={`tel:${outfitter.phone.replace(/\D/g, '')}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 'var(--r-pill)',
                  background: 'var(--bg-surface)', border: '1px solid var(--border)',
                  color: 'var(--flow-600)', fontWeight: 600, fontSize: 13.5,
                  textDecoration: 'none',
                }}
              >
                <Icon name="phone" size={14} />{outfitter.phone}
              </a>
            )}
            {outfitter.website && (
              <a
                href={outfitter.website}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 'var(--r-pill)',
                  background: 'var(--bg-surface)', border: '1px solid var(--border)',
                  color: 'var(--flow-600)', fontWeight: 600, fontSize: 13.5,
                  textDecoration: 'none',
                }}
              >
                <Icon name="external-link" size={14} />Website
              </a>
            )}
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--border)', margin: '0 0 20px' }} />

        {/* Presentational booking controls */}
        <BookingControls />

        {/* Footer */}
        <div style={{
          textAlign: 'center', fontFamily: 'var(--font-mono)',
          fontSize: 11, color: 'var(--fg-3)', margin: '24px 0 0', lineHeight: 1.5,
        }}>
          Trips are run by independent licensed outfitters. Conditions data stays free.
        </div>
      </div>
    </div>
  );
}

// ─── Trips listing screen ─────────────────────────────────────────────────────

function TripsListing() {
  const outfitters = useOutfitters();
  const navigate = useNavigate();

  const list = outfitters.data ?? [];

  return (
    <div style={{ minHeight: '100vh', overflowY: 'auto', paddingBottom: 110 }}>
      {/* Header */}
      <div style={{ padding: '56px 20px 8px' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--fg-1)' }}>Trips</div>
        <div style={{ fontSize: 14, color: 'var(--fg-3)', marginTop: 2 }}>
          Guided trips on Colorado rivers
        </div>
      </div>

      {/* Condition banner */}
      <div style={{
        margin: '8px 20px 4px',
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--status-good-bg, rgba(34,197,94,0.1))',
        borderRadius: 'var(--r-md)', padding: '11px 14px',
      }}>
        <Icon name="waves" size={18} color="var(--status-good)" />
        <div style={{ fontSize: 13.5, color: 'var(--fg-2)', lineHeight: 1.4 }}>
          <strong style={{ color: 'var(--fg-1)' }}>Check conditions</strong> before booking —
          live gauge data is free and always on the rivers tab.
        </div>
      </div>

      <div style={{ padding: '10px 20px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {outfitters.isLoading && (
          <div style={{ color: 'var(--fg-3)', padding: 24, textAlign: 'center' }}>
            Loading outfitters…
          </div>
        )}
        {outfitters.isError && (
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)', padding: 24, textAlign: 'center', color: 'var(--fg-3)',
          }}>
            Could not load outfitters. Check back soon.
          </div>
        )}
        {!outfitters.isLoading && !outfitters.isError && list.length === 0 && (
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)', padding: '40px 24px', textAlign: 'center',
            color: 'var(--fg-3)',
          }}>
            No licensed outfitters on file yet — check back soon.
          </div>
        )}
        {list.map((o, i) => (
          <TripListing
            key={o.id}
            outfitter={o}
            tone={TONES[i % TONES.length]}
            onOpen={() => navigate(`/trips/${encodeURIComponent(o.id)}`)}
          />
        ))}
      </div>

      <div style={{
        textAlign: 'center', fontFamily: 'var(--font-mono)',
        fontSize: 11, color: 'var(--fg-3)', margin: '20px 24px 0', lineHeight: 1.5,
      }}>
        Trips are run by independent licensed outfitters. Conditions data stays free.
      </div>
    </div>
  );
}

// ─── Trip detail screen ───────────────────────────────────────────────────────

function TripDetailScreen() {
  const { outfitterId } = useParams<{ outfitterId: string }>();
  const navigate = useNavigate();
  const outfitters = useOutfitters();

  const outfitter = outfitters.data?.find(o => o.id === outfitterId);

  if (outfitters.isLoading) {
    return (
      <Shell active="trips" light>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '60vh', color: 'var(--fg-3)',
        }}>
          Loading…
        </div>
      </Shell>
    );
  }

  if (!outfitter) {
    return (
      <Shell active="trips" light>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '60vh', gap: 12,
          color: 'var(--fg-3)', padding: '0 24px', textAlign: 'center',
        }}>
          <div>Outfitter not found.</div>
          <button
            type="button"
            onClick={() => navigate('/trips')}
            style={{
              padding: '10px 20px', borderRadius: 'var(--r-pill)',
              background: 'var(--flow-600)', color: 'var(--fg-on-brand)', border: 'none',
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            Back to trips
          </button>
        </div>
      </Shell>
    );
  }

  const idx = outfitters.data?.findIndex(o => o.id === outfitterId) ?? 0;
  const tone = TONES[idx % TONES.length];

  return (
    <Shell active="trips" light>
      <TripDetailView
        outfitter={outfitter}
        tone={tone}
        onBack={() => navigate('/trips')}
      />
    </Shell>
  );
}

// ─── Main export (routing wrapper) ───────────────────────────────────────────

export function Trips() {
  return (
    <Shell active="trips" light>
      <TripsListing />
    </Shell>
  );
}

// Named export for the detail sub-route (used by App.tsx)
export { TripDetailScreen };
