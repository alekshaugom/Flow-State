/**
 * Log screen — simplified river log.
 *
 * List: useMyLogs() entries, each showing section name (resolved via dashboard
 * section map), date, put-in→take-out, flowAtTripCfs, and note.
 *
 * "Log a run" modal sheet: pick a section (from useDashboard sections grouped
 * by corridor), pick a date, optional note → createLog({ sectionId, date,
 * putIn, takeOut, notes }). The backend resolves flowAtTripCfs.
 *
 * No crafts, no participants, no multi-day, no conditions tags.
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useMyLogs } from '../hooks/useMyLogs';
import { useLogMutations } from '../hooks/useLogMutations';
import { useDashboard } from '../hooks/useDashboard';
import { Shell } from '../shell/Shell';
import { Icon, statusColor, statusLabel } from '../ds';
import type { RiverLogEntry, RiverLogInput } from '../types';
import type { DashboardSection } from '../types';

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  if (!iso) return iso;
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[m - 1]} ${d}, ${y}`;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function yesterdayIso(): string {
  const d = new Date(Date.now() - 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Group dashboard sections by corridorName (fall back to "Other")
interface CorridorGroup {
  corridorName: string;
  sections: DashboardSection[];
}
function groupByCorridorName(sections: DashboardSection[]): CorridorGroup[] {
  const map = new Map<string, DashboardSection[]>();
  for (const s of sections) {
    const key = s.corridorName ?? 'Other';
    const arr = map.get(key) ?? [];
    arr.push(s);
    map.set(key, arr);
  }
  return Array.from(map.entries()).map(([corridorName, secs]) => ({
    corridorName,
    sections: secs.sort((a, b) => (a.sortIndex ?? 999) - (b.sortIndex ?? 999)),
  }));
}

// ─── Chip ───────────────────────────────────────────────────────────────────

interface ChipProps {
  active: boolean;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}
function Chip({ active, label, disabled = false, onClick }: ChipProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        flex: 'none',
        border: `1.5px solid ${active ? 'var(--flow-600)' : 'var(--border)'}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: active ? 'var(--flow-600)' : 'var(--bg-surface)',
        color: active ? '#fff' : disabled ? 'var(--fg-4)' : 'var(--fg-2)',
        opacity: disabled ? 0.5 : 1,
        borderRadius: 'var(--r-pill)',
        padding: '9px 14px',
        fontFamily: 'var(--font-sans)',
        fontSize: 13.5,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

// ─── Log run sheet ───────────────────────────────────────────────────────────

type LogInput = Pick<RiverLogInput, 'sectionId' | 'date' | 'notes'>;

interface LogRunSheetProps {
  groups: CorridorGroup[];
  onClose: () => void;
  onSave: (input: LogInput) => void;
  saving: boolean;
}

function LogRunSheet({ groups, onClose, onSave, saving }: LogRunSheetProps) {
  const allSections = groups.flatMap(g => g.sections);
  const [sectionId, setSectionId] = useState<string>(allSections[0]?.id ?? '');
  const [dateMode, setDateMode] = useState<'Today' | 'Yesterday' | 'Pick'>('Today');
  const [customDate, setCustomDate] = useState<string>(todayIso());
  const [note, setNote] = useState('');

  const section = allSections.find(s => s.id === sectionId) ?? allSections[0];

  const dateValue = dateMode === 'Today'
    ? todayIso()
    : dateMode === 'Yesterday'
      ? yesterdayIso()
      : customDate;

  const lbl: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 9,
  };

  const handleSave = () => {
    if (!section) return;
    onSave({
      sectionId: section.id,
      date: dateValue,
      notes: note.trim() || null,
    });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg-app, #f5f7f9)',
      overflowY: 'auto', zIndex: 200,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '56px 20px 8px',
      }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'var(--bg-subtle)', border: 'none', borderRadius: 99,
            width: 38, height: 38, display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: 'var(--fg-1)', cursor: 'pointer',
          }}
        >
          <Icon name="chevron-left" size={22} />
        </button>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--fg-1)' }}>Log a run</div>
        <div style={{ width: 38 }} />
      </div>

      <div style={{ padding: '12px 20px 40px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* Section picker — grouped by corridor */}
        <div>
          <div style={lbl}>Section</div>
          {groups.map(g => (
            <div key={g.corridorName} style={{ marginBottom: 10 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: 'var(--fg-4)', marginBottom: 6,
              }}>
                {g.corridorName}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {g.sections.map(s => (
                  <Chip
                    key={s.id}
                    active={s.id === sectionId}
                    label={s.section}
                    onClick={() => setSectionId(s.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Date */}
        <div>
          <div style={lbl}>Date</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['Today', 'Yesterday', 'Pick'] as const).map(d => (
              <Chip
                key={d}
                active={d === dateMode}
                label={d === 'Pick' ? 'Pick a date' : d}
                onClick={() => setDateMode(d)}
              />
            ))}
          </div>
          {dateMode === 'Pick' && (
            <input
              type="date"
              value={customDate}
              max={todayIso()}
              onChange={e => setCustomDate(e.target.value)}
              style={{
                marginTop: 10,
                padding: '10px 12px',
                border: '1.5px solid var(--border)',
                borderRadius: 'var(--r-md)',
                background: 'var(--bg-surface)',
                color: 'var(--fg-1)',
                fontFamily: 'var(--font-sans)',
                fontSize: 14,
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
          )}
        </div>

        {/* Live readout for selected section */}
        {section && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)', padding: '14px 16px',
          }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-1)' }}>
                {section.river} — {section.section}
              </div>
              {section.corridorName && (
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 12,
                  color: 'var(--fg-3)', marginTop: 2,
                }}>
                  {section.corridorName}
                </div>
              )}
            </div>
            {section.now != null && (
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: 20, fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums', color: 'var(--fg-1)',
                }}>
                  {Math.round(section.now).toLocaleString()}{' '}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-3)' }}>
                    cfs
                  </span>
                </div>
                <div style={{
                  fontSize: 12, fontWeight: 700,
                  color: statusColor(section.status),
                }}>
                  {statusLabel(section.status)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Note */}
        <div>
          <div style={lbl}>Note (optional)</div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Conditions, highlights…"
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '10px 12px',
              border: '1.5px solid var(--border)',
              borderRadius: 'var(--r-md)',
              background: 'var(--bg-surface)',
              color: 'var(--fg-1)',
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              resize: 'vertical',
            }}
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !section}
          style={{
            border: 'none', cursor: saving ? 'wait' : 'pointer',
            background: 'var(--flow-600)', color: '#fff',
            fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 16,
            padding: '15px', borderRadius: 'var(--r-pill)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: saving ? 0.7 : 1,
          }}
        >
          <Icon name="check" size={18} />
          {saving ? 'Saving…' : 'Save to river log'}
        </button>
      </div>
    </div>
  );
}

// ─── Log entry row ───────────────────────────────────────────────────────────

interface LogRowProps {
  entry: RiverLogEntry;
  sectionName: string;
  riverName: string;
}
function LogRow({ entry, sectionName, riverName }: LogRowProps) {
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-sm)', padding: '14px 16px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', gap: 12,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16.5, fontWeight: 700, color: 'var(--fg-1)' }}>
            {sectionName}
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-3)',
            marginTop: 4, display: 'flex', alignItems: 'center', gap: 5,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            <Icon name="map-pin" size={12} />
            <span>{riverName}</span>
            {(entry.putIn || entry.takeOut) && (
              <span> · {entry.putIn ?? '—'} → {entry.takeOut ?? '—'}</span>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right', flex: 'none' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--flow-600)' }}>
            {formatDate(entry.date)}
          </div>
          {entry.flowAtTripCfs != null && (
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--fg-2)',
              marginTop: 2, fontVariantNumeric: 'tabular-nums',
            }}>
              {Math.round(entry.flowAtTripCfs).toLocaleString()} cfs
            </div>
          )}
        </div>
      </div>
      {entry.notes && (
        <div style={{ fontSize: 14, color: 'var(--fg-2)', marginTop: 9, lineHeight: 1.4 }}>
          {entry.notes}
        </div>
      )}
    </div>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export function Log() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);

  const myLogs = useMyLogs();
  const dashboard = useDashboard();
  const { create } = useLogMutations();

  // Build a map sectionId → { section name, river name } from dashboard data
  const sectionNameMap = useMemo<Map<string, { section: string; river: string }>>(() => {
    const m = new Map<string, { section: string; river: string }>();
    if (!dashboard.data) return m;
    for (const s of dashboard.data.sections) {
      m.set(s.id, { section: s.section, river: s.river });
    }
    return m;
  }, [dashboard.data]);

  const groups = useMemo<CorridorGroup[]>(() => {
    if (!dashboard.data) return [];
    return groupByCorridorName(dashboard.data.sections);
  }, [dashboard.data]);

  const logs: RiverLogEntry[] = myLogs.data?.logs ?? [];

  const handleSave = async (input: LogInput) => {
    await create.mutateAsync(input as RiverLogInput);
    setSheetOpen(false);
  };

  // Signed-out state
  if (!authLoading && !isAuthenticated) {
    return (
      <Shell active="log" light>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '80vh', gap: 16,
          color: 'var(--fg-1)', padding: '0 24px', textAlign: 'center',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: 99,
            background: 'var(--flow-100)', color: 'var(--flow-600)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="compass" size={34} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--fg-1)' }}>
            Sign in to view your river log
          </div>
          <div style={{ fontSize: 15, color: 'var(--fg-3)', maxWidth: 280, lineHeight: 1.5 }}>
            Track your runs and see flow conditions at the time of each trip.
          </div>
          <Link
            to="/login"
            style={{
              marginTop: 8, padding: '14px 28px', borderRadius: 'var(--r-pill)',
              background: 'var(--flow-600)', color: '#fff',
              fontWeight: 700, fontSize: 16, textDecoration: 'none',
            }}
          >
            Sign in
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell active="log" light>
      {/* Page header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '56px 20px 8px',
      }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--fg-1)' }}>River log</div>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          style={{
            background: 'var(--flow-600)', border: 'none', borderRadius: 99,
            width: 38, height: 38, display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#fff', cursor: 'pointer',
          }}
        >
          <Icon name="plus" size={20} />
        </button>
      </div>

      {/* Count sub-label */}
      {logs.length > 0 && (
        <div style={{ padding: '4px 20px 6px', fontSize: 14, color: 'var(--fg-3)' }}>
          {logs.length} {logs.length === 1 ? 'run' : 'runs'} logged
        </div>
      )}

      {/* Log entries */}
      <div style={{ padding: '8px 16px 120px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {myLogs.isLoading ? (
          <div style={{ color: 'var(--fg-3)', padding: 24, textAlign: 'center' }}>
            Loading your logs…
          </div>
        ) : logs.length === 0 ? (
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)', padding: '40px 24px', textAlign: 'center',
            color: 'var(--fg-3)',
          }}>
            <div style={{ marginBottom: 12 }}>No runs logged yet.</div>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              style={{
                border: 'none', cursor: 'pointer', background: 'var(--flow-600)',
                color: '#fff', fontFamily: 'var(--font-sans)', fontWeight: 700,
                fontSize: 14, padding: '10px 20px', borderRadius: 'var(--r-pill)',
              }}
            >
              Log your first run
            </button>
          </div>
        ) : (
          logs.map(entry => {
            const names = sectionNameMap.get(entry.sectionId);
            return (
              <LogRow
                key={entry.id}
                entry={entry}
                sectionName={names?.section ?? entry.sectionId}
                riverName={names?.river ?? ''}
              />
            );
          })
        )}
      </div>

      {/* Log run sheet (full-screen modal) */}
      {sheetOpen && groups.length > 0 && (
        <LogRunSheet
          groups={groups}
          onClose={() => setSheetOpen(false)}
          onSave={handleSave}
          saving={create.isPending}
        />
      )}
    </Shell>
  );
}
