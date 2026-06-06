/**
 * Admin screen — data-pipeline ops + waitlist user management.
 *
 * Gating: capabilities.isAdmin (or dev bypass via useAuth).
 * Tabs: "Data" and "Users".
 * Does NOT carry over AdminRequestsPanel (world-river requests are being removed).
 *
 * Design: light content surface, white cards, Manrope/Inter, sentence case.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shell } from '../shell/Shell';
import { Icon } from '../ds';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api';
import type {
  AdminLoginLinkResult,
  AdminInviteUserResult,
  AdminLoginTokenList,
  AdminDeleteUserResult,
  AdminInviteUserInput,
} from '../types';

// ─── Local interfaces (narrow API shapes) ──────────────────────────────────

interface SeedStatusData {
  seeded: boolean;
  counts: { rivers: number; sections: number; gauges: number };
}

interface IngestionStatusData {
  worker_started: boolean;
  last_gauge_fetch: string | null;
  last_snow_fetch: string | null;
}

interface IngestionLogRow {
  id: string;
  sourceId: string;
  status: 'success' | 'error' | 'running';
  recordsProcessed: number | null;
  durationMs: number | null;
  timestamp: string | null;
  errors: string | null;
}

interface DataHealthSource {
  id: string;
  type: string;
  lastFetchAgeMin: number | null;
  lastLog: { recordsProcessed: number } | null;
  data: { ageMin: number | null; totalRows: number };
}

interface DataHealthData {
  sources: DataHealthSource[];
  tables: Record<string, { totalRows: number; ageMin: number | null }>;
}

interface WaitlistUser {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  avatarUrl?: string | null;
  status: 'waitlist' | 'approved' | 'denied';
  role?: string | null;
  lastLoginAt?: string | null;
}

// ─── Style tokens (local, light surface) ───────────────────────────────────

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid var(--border, #e2e8f0)',
  borderRadius: 12,
  padding: 20,
  boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,.06))',
};

const sectionLabel: React.CSSProperties = {
  fontFamily: 'var(--font-mono, monospace)',
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  color: 'var(--flow-600, #2563eb)',
  fontWeight: 500,
  marginBottom: 6,
};

const tableHeaderCell: React.CSSProperties = {
  padding: '8px 10px',
  fontFamily: 'var(--font-mono, monospace)',
  fontSize: 10,
  letterSpacing: '0.10em',
  textTransform: 'uppercase' as const,
  color: 'var(--ink-3, #94a3b8)',
  fontWeight: 500,
  borderBottom: '1px solid var(--border, #e2e8f0)',
};

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 14px', borderRadius: 8,
  background: 'var(--flow-600, #2563eb)', color: '#fff',
  border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '7px 13px', borderRadius: 8,
  background: '#fff', color: 'var(--fg-1, #0d1620)',
  border: '1px solid var(--border, #e2e8f0)',
  fontSize: 12, fontWeight: 600, cursor: 'pointer',
};

const btnDanger: React.CSSProperties = {
  ...btnSecondary,
  color: '#a02323',
  border: '1px solid #fca5a5',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid var(--border, #e2e8f0)',
  background: '#fff',
  color: 'var(--fg-1, #0d1620)',
  fontSize: 13,
  fontFamily: 'inherit',
  boxSizing: 'border-box' as const,
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono, monospace)',
  fontSize: 10,
  letterSpacing: '0.10em',
  textTransform: 'uppercase' as const,
  color: 'var(--ink-3, #94a3b8)',
  fontWeight: 500,
  marginBottom: 4,
  display: 'block',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function displayName(u: WaitlistUser): string {
  const first = (u.firstName || '').trim();
  const last = (u.lastName || '').trim();
  if (first || last) return [first, last].filter(Boolean).join(' ');
  return u.name || '—';
}

function timeAgo(ts: string | null | undefined): string {
  if (!ts) return '—';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  waitlist: { bg: '#fef9c3', color: '#854d0e' },
  approved: { bg: '#dcfce7', color: '#166534' },
  denied:   { bg: '#fee2e2', color: '#991b1b' },
};

// ─── Inline-message component ────────────────────────────────────────────────

function Msg({ text, variant }: { text: string; variant?: 'success' | 'error' }) {
  const bg = variant === 'error' ? '#fdecea' : '#eff6ff';
  const color = variant === 'error' ? '#a02323' : '#1d4ed8';
  return (
    <div style={{
      padding: '8px 12px', borderRadius: 8,
      background: bg, color, fontSize: 12,
    }}>
      {text}
    </div>
  );
}

// ─── Tab type ───────────────────────────────────────────────────────────────

type AdminTab = 'data' | 'users';

// ─── Not authorized state ───────────────────────────────────────────────────

function NotAuthorized() {
  const navigate = useNavigate();
  const auth = useAuth();
  return (
    <div style={{ ...card, maxWidth: 460, margin: '80px auto', textAlign: 'center', padding: 48 }}>
      <Icon name="shield" size={36} color="var(--ink-3, #94a3b8)" />
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg-1)', margin: '16px 0 8px' }}>
        Not authorized
      </h2>
      <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: '0 0 20px' }}>
        Admin access is required to view this page.
      </p>
      {!auth.isAuthenticated && (
        <button style={btnPrimary} onClick={() => navigate('/login')}>
          Sign in
        </button>
      )}
    </div>
  );
}

// ─── Data ops tab ────────────────────────────────────────────────────────────

function DataTab() {
  const qc = useQueryClient();
  const [msg, setMsg] = useState<{ text: string; variant?: 'success' | 'error' } | null>(null);
  const [forecastId, setForecastId] = useState('');

  const seedStatus   = useQuery({ queryKey: ['seedStatus'],    queryFn: () => api.seedStatus()    as Promise<SeedStatusData> });
  const ingestion    = useQuery({ queryKey: ['ingestion'],     queryFn: () => api.ingestionStatus() as Promise<IngestionStatusData>, refetchInterval: 10_000 });
  const logs         = useQuery({ queryKey: ['ingestionLogs'], queryFn: () => api.ingestionLogs()  as Promise<IngestionLogRow[]>,    refetchInterval: 30_000 });
  const health       = useQuery({ queryKey: ['dataHealth'],    queryFn: () => api.dataHealth()     as Promise<DataHealthData>,       refetchInterval: 30_000 });

  const seedMutation = useMutation({
    mutationFn: api.seed,
    onSuccess: (d: any) => {
      setMsg({ text: `Seeded: ${d.rivers} rivers, ${d.sections} sections, ${d.gauges} gauges`, variant: 'success' });
      qc.invalidateQueries({ queryKey: ['seedStatus'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (e: Error) => setMsg({ text: `Seed failed: ${e.message}`, variant: 'error' }),
  });

  const ingestMutation = useMutation({
    mutationFn: (args: { action: string; source?: string }) => api.triggerIngestion(args.action, args),
    onSuccess: (d: any) => {
      setMsg({ text: `Ingestion triggered: ${JSON.stringify(d)}`, variant: 'success' });
      qc.invalidateQueries({ queryKey: ['ingestion'] });
      qc.invalidateQueries({ queryKey: ['ingestionLogs'] });
    },
    onError: (e: Error) => setMsg({ text: `Ingestion failed: ${e.message}`, variant: 'error' }),
  });

  const forecastMutation = useMutation({
    mutationFn: (sectionId: string) => api.triggerForecast(sectionId),
    onSuccess: (d: any) => setMsg({ text: `Forecast triggered: ${JSON.stringify(d)}`, variant: 'success' }),
    onError: (e: Error) => setMsg({ text: `Forecast failed: ${e.message}`, variant: 'error' }),
  });

  const busy = seedMutation.isPending || ingestMutation.isPending || forecastMutation.isPending;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {msg && <Msg text={msg.text} variant={msg.variant} />}

      {/* Top row: Seed + Ingestion controls */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Seed */}
        <div style={card}>
          <div style={sectionLabel}>Database</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-1)', margin: '0 0 10px' }}>
            Seed data
          </h3>
          {seedStatus.data && (
            <div style={{ fontSize: 12, color: 'var(--ink-2, #64748b)', marginBottom: 12, lineHeight: 1.6 }}>
              {seedStatus.data.seeded ? (
                <>
                  {seedStatus.data.counts.rivers} rivers ·{' '}
                  {seedStatus.data.counts.sections} sections ·{' '}
                  {seedStatus.data.counts.gauges} gauges
                </>
              ) : (
                <span style={{ color: '#a02323' }}>Not seeded yet</span>
              )}
            </div>
          )}
          <button style={btnPrimary} disabled={busy} onClick={() => seedMutation.mutate()}>
            <Icon name="refresh" size={13} color="#fff" />
            {seedMutation.isPending ? 'Seeding…' : 'Run seed'}
          </button>
        </div>

        {/* Ingestion status */}
        <div style={card}>
          <div style={sectionLabel}>Worker</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-1)', margin: '0 0 10px' }}>
            Ingestion status
          </h3>
          {ingestion.data && (
            <div style={{ fontSize: 12, color: 'var(--ink-2, #64748b)', lineHeight: 1.7, marginBottom: 12 }}>
              <div>
                Worker:{' '}
                <span style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  color: ingestion.data.worker_started ? '#166534' : '#a02323',
                }}>
                  {ingestion.data.worker_started ? 'Running' : 'Stopped'}
                </span>
              </div>
              <div>Last gauge: <span style={{ fontFamily: 'var(--font-mono, monospace)' }}>{ingestion.data.last_gauge_fetch || 'Never'}</span></div>
              <div>Last snow: <span style={{ fontFamily: 'var(--font-mono, monospace)' }}>{ingestion.data.last_snow_fetch || 'Never'}</span></div>
            </div>
          )}
        </div>
      </div>

      {/* Ingestion trigger buttons */}
      <div style={card}>
        <div style={sectionLabel}>Ingestion</div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-1)', margin: '0 0 12px' }}>
          Trigger ingestion
        </h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={btnPrimary} disabled={busy} onClick={() => ingestMutation.mutate({ action: 'run' })}>
            Fetch all
          </button>
          <button style={btnSecondary} disabled={busy} onClick={() => ingestMutation.mutate({ action: 'run', source: 'usgs' })}>
            Gauges (USGS)
          </button>
          <button style={btnSecondary} disabled={busy} onClick={() => ingestMutation.mutate({ action: 'run', source: 'cdss' })}>
            Gauges (CDSS)
          </button>
          <button style={btnSecondary} disabled={busy} onClick={() => ingestMutation.mutate({ action: 'run', source: 'noaa' })}>
            Weather
          </button>
          <button style={btnSecondary} disabled={busy} onClick={() => ingestMutation.mutate({ action: 'run', source: 'snotel' })}>
            Snow (SNOTEL)
          </button>
          <button style={btnSecondary} disabled={busy} onClick={() => ingestMutation.mutate({ action: 'run', source: 'bor' })}>
            Reservoir (BOR)
          </button>
          <button style={btnSecondary} disabled={busy} onClick={() => ingestMutation.mutate({ action: 'rebuild-snapshots' })}>
            Rebuild snapshots
          </button>
        </div>
      </div>

      {/* Forecast trigger */}
      <div style={card}>
        <div style={sectionLabel}>Forecast</div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-1)', margin: '0 0 12px' }}>
          Run forecast
        </h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 220 }}>
            <label style={labelStyle} htmlFor="forecast-section-id">Section ID</label>
            <input
              id="forecast-section-id"
              style={inputStyle}
              value={forecastId}
              onChange={e => setForecastId(e.target.value)}
              placeholder="e.g. arkansas_headwaters_fractions"
            />
          </div>
          <button
            style={btnPrimary}
            disabled={busy || !forecastId.trim()}
            onClick={() => {
              forecastMutation.mutate(forecastId.trim());
            }}
          >
            {forecastMutation.isPending ? 'Running…' : 'Run forecast'}
          </button>
        </div>
      </div>

      {/* Data health */}
      <div style={card}>
        <div style={sectionLabel}>Health</div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-1)', margin: '0 0 12px' }}>
          Data source health
        </h3>
        {health.isLoading && (
          <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Loading…</div>
        )}
        {health.data && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Source', 'Type', 'Last fetch', 'Last records', 'Latest data', 'Total rows'].map(h => (
                    <th key={h} style={{
                      ...tableHeaderCell,
                      textAlign: (h === 'Last records' || h === 'Total rows') ? 'right' : 'left',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(health.data.sources || []).map(s => {
                  const records = s.lastLog?.recordsProcessed;
                  const recordColor = records === 0 || records == null ? 'var(--ink-3)' : '#166534';
                  const totalRows = s.data?.totalRows ?? 0;
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border, #e2e8f0)' }}>
                      <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono, monospace)', fontWeight: 600 }}>{s.id}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--ink-3)' }}>{s.type}</td>
                      <td style={{ padding: '8px 10px', fontSize: 11, color: 'var(--ink-2)' }}>
                        {s.lastFetchAgeMin != null ? `${s.lastFetchAgeMin}m ago` : '—'}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono, monospace)', color: recordColor }}>
                        {records != null ? records : '—'}
                      </td>
                      <td style={{ padding: '8px 10px', fontSize: 11, color: 'var(--ink-2)' }}>
                        {s.data?.ageMin != null ? `${s.data.ageMin}m ago` : '—'}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono, monospace)', color: totalRows === 0 ? '#a02323' : 'inherit' }}>
                        {totalRows.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {health.data.tables && Object.keys(health.data.tables).length > 0 && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border, #e2e8f0)' }}>
                <div style={{ ...labelStyle, marginBottom: 8 }}>Tables</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {Object.entries(health.data.tables).map(([name, info]) => (
                    <div key={name} style={{
                      padding: '6px 12px', borderRadius: 8,
                      background: 'var(--bg-subtle, #f8fafc)',
                      border: '1px solid var(--border, #e2e8f0)',
                      fontFamily: 'var(--font-mono, monospace)',
                      fontSize: 11,
                      color: info.totalRows > 0 ? 'var(--fg-1)' : '#a02323',
                    }}>
                      <span style={{ fontWeight: 600 }}>{name}</span>
                      <span style={{ color: 'var(--ink-3)', margin: '0 5px' }}>·</span>
                      <span>{info.totalRows.toLocaleString()} rows</span>
                      {info.ageMin != null && (
                        <>
                          <span style={{ color: 'var(--ink-3)', margin: '0 5px' }}>·</span>
                          <span style={{ color: 'var(--ink-3)' }}>{info.ageMin}m ago</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ingestion log */}
      <div style={card}>
        <div style={sectionLabel}>History</div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-1)', margin: '0 0 12px' }}>
          Recent ingestion log
        </h3>
        {logs.isLoading && (
          <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Loading…</div>
        )}
        {logs.data && Array.isArray(logs.data) && logs.data.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Source', 'Status', 'Records', 'Duration', 'Time', 'Errors'].map(h => (
                    <th key={h} style={{
                      ...tableHeaderCell,
                      textAlign: (h === 'Records' || h === 'Duration') ? 'right' : 'left',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(logs.data as IngestionLogRow[]).map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border, #e2e8f0)' }}>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono, monospace)' }}>{log.sourceId}</td>
                    <td style={{
                      padding: '8px 10px', fontWeight: 600,
                      color: log.status === 'success' ? '#166534' : log.status === 'error' ? '#a02323' : 'var(--ink-3)',
                    }}>{log.status}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono, monospace)' }}>
                      {log.recordsProcessed ?? '—'}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono, monospace)' }}>
                      {log.durationMs != null ? `${log.durationMs}ms` : '—'}
                    </td>
                    <td style={{ padding: '8px 10px', fontSize: 11, color: 'var(--ink-2)' }}>
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                    </td>
                    <td style={{
                      padding: '8px 10px', color: '#a02323',
                      maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {log.errors || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !logs.isLoading && (
          <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
            No ingestion logs yet. Trigger an ingestion run to see results.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Users tab ───────────────────────────────────────────────────────────────

function UsersTab() {
  const qc = useQueryClient();
  const waitlist = useQuery({
    queryKey: ['adminWaitlist'],
    queryFn: () => api.adminWaitlist() as Promise<{ users: WaitlistUser[] }>,
    refetchInterval: 30_000,
  });

  const [search, setSearch] = useState('');
  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const allUsers: WaitlistUser[] = waitlist.data?.users || [];
  const users = allUsers.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return displayName(u).toLowerCase().includes(q)
      || (u.email || '').toLowerCase().includes(q);
  });

  const waitlistedCount = allUsers.filter(u => u.status === 'waitlist').length;
  const approvedCount   = allUsers.filter(u => u.status === 'approved').length;

  const actionMutation = useMutation({
    mutationFn: ({ userId, action }: { userId: string; action: 'approve' | 'deny' | 'revoke' }) =>
      api.adminWaitlistAction(userId, action),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminWaitlist'] }),
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string | null }) =>
      role ? api.adminGrantRole(userId, role) : api.adminRevokeRole(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminWaitlist'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) =>
      api.adminDeleteUser(userId) as Promise<AdminDeleteUserResult>,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminWaitlist'] }),
  });

  if (waitlist.isLoading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>Loading users…</div>;
  }

  if (waitlist.isError) {
    return (
      <div style={{ ...card, color: '#a02323', fontSize: 13 }}>
        Failed to load users.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary counts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        {[
          { label: 'Total users',   value: allUsers.length, color: 'var(--fg-1)' },
          { label: 'Approved',      value: approvedCount,   color: '#166534' },
          { label: 'Waitlisted',    value: waitlistedCount, color: '#854d0e' },
        ].map(tile => (
          <div key={tile.label} style={card}>
            <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 28, fontWeight: 500, color: tile.color }}>
              {tile.value}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{tile.label}</div>
          </div>
        ))}
      </div>

      {/* Invite */}
      {inviteOpen ? (
        <InviteUserForm
          onClose={() => setInviteOpen(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ['adminWaitlist'] })}
        />
      ) : (
        <div>
          <button style={btnPrimary} onClick={() => setInviteOpen(true)}>
            + Invite user
          </button>
        </div>
      )}

      {/* Delete success banner */}
      {deleteMutation.isSuccess && deleteMutation.data && (
        <Msg
          variant="success"
          text={`Deleted user + ${deleteMutation.data.deleted.logs} logs, ${deleteMutation.data.deleted.crafts} crafts, ${deleteMutation.data.deleted.tokens} tokens.`}
        />
      )}

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', borderRadius: 8,
        background: '#fff', border: '1px solid var(--border, #e2e8f0)',
      }}>
        <Icon name="search" size={14} color="var(--ink-3)" />
        <input
          type="text"
          placeholder="Search by name or email"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontSize: 13, color: 'var(--fg-1)', fontFamily: 'var(--font-sans)',
          }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
            <Icon name="x-mark" size={13} color="var(--ink-3)" />
          </button>
        )}
      </div>

      {/* User rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {users.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
            {search ? 'No users match your search.' : 'No users yet.'}
          </div>
        ) : (
          users.map(u => {
            const sc = STATUS_COLORS[u.status] || STATUS_COLORS.waitlist;
            const isOpen = openUserId === u.id;
            return (
              <div key={u.id} style={card}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', gap: 12, flexWrap: 'wrap',
                }}>
                  {/* Identity */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />
                    ) : (
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'var(--bg-subtle, #f8fafc)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon name="user" size={14} color="var(--ink-3)" />
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-1)' }}>{displayName(u)}</div>
                      <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11, color: 'var(--ink-3)' }}>
                        {u.email || u.id}
                        <span style={{ margin: '0 5px' }}>·</span>
                        {u.lastLoginAt ? `last seen ${timeAgo(u.lastLoginAt)}` : 'no logins'}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '2px 10px', borderRadius: 99,
                      fontSize: 11, fontWeight: 600,
                      background: sc.bg, color: sc.color,
                    }}>{u.status}</span>

                    {u.status === 'waitlist' && (
                      <>
                        <button style={btnSecondary} disabled={actionMutation.isPending}
                          onClick={() => actionMutation.mutate({ userId: u.id, action: 'approve' })}>
                          Approve
                        </button>
                        <button style={btnSecondary} disabled={actionMutation.isPending}
                          onClick={() => actionMutation.mutate({ userId: u.id, action: 'deny' })}>
                          Deny
                        </button>
                      </>
                    )}

                    {u.status === 'approved' && (
                      <>
                        {(u.role === 'admin' || u.role === 'superadmin') ? (
                          <button style={btnSecondary} disabled={roleMutation.isPending}
                            onClick={() => roleMutation.mutate({ userId: u.id, role: null })}>
                            Revoke admin
                          </button>
                        ) : (
                          <button style={btnSecondary} disabled={roleMutation.isPending}
                            onClick={() => roleMutation.mutate({ userId: u.id, role: 'admin' })}>
                            Grant admin
                          </button>
                        )}
                        <button style={btnSecondary}
                          onClick={() => setOpenUserId(isOpen ? null : u.id)}>
                          {isOpen ? 'Hide credentials' : 'Credentials'}
                        </button>
                        <button style={btnDanger} disabled={deleteMutation.isPending}
                          onClick={() => {
                            const n = displayName(u);
                            if (!window.confirm(`Delete ${n} (${u.email ?? u.id})?\n\nThis purges their account and all data. Cannot be undone.`)) return;
                            deleteMutation.mutate(u.id);
                          }}>
                          Delete
                        </button>
                      </>
                    )}

                    {u.status === 'denied' && (
                      <button style={btnSecondary} disabled={actionMutation.isPending}
                        onClick={() => actionMutation.mutate({ userId: u.id, action: 'approve' })}>
                        Approve
                      </button>
                    )}
                  </div>
                </div>

                {isOpen && u.status === 'approved' && (
                  <UserCredentialControls
                    userId={u.id}
                    onChange={() => qc.invalidateQueries({ queryKey: ['adminWaitlist'] })}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Invite user form ────────────────────────────────────────────────────────

function InviteUserForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AdminInviteUserResult | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const invite = useMutation({
    mutationFn: () => {
      const input: AdminInviteUserInput = {
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      };
      return api.adminInviteUser(input);
    },
    onSuccess: res => {
      setError(null);
      setResult(res);
      onCreated();
    },
    onError: (e: Error) => setError(e.message || 'Failed to invite user'),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !firstName.trim() || !lastName.trim()) {
      setError('Email, first name, and last name are required.');
      return;
    }
    invite.mutate();
  };

  const onCopyLink = async () => {
    if (!result?.link?.url) return;
    await navigator.clipboard.writeText(result.link.url).catch(() => {});
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  if (result) {
    return (
      <div style={{
        ...card,
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#1d4ed8' }}>
          User invited
        </div>
        <div style={{ fontSize: 14, color: 'var(--fg-1)' }}>
          <strong>{result.user.name}</strong>{' '}
          <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12, color: 'var(--ink-2)' }}>{result.user.email}</span>
        </div>
        <div style={{ fontSize: 12, color: '#1d4ed8' }}>
          Send this one-time login link to the user. Expires in 24h.
        </div>
        <div style={{
          padding: '8px 10px', borderRadius: 6,
          background: '#fff', fontFamily: 'var(--font-mono, monospace)', fontSize: 11,
          wordBreak: 'break-all', color: 'var(--fg-1)',
          border: '1px solid var(--border, #e2e8f0)',
        }}>
          {result.link.url}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btnPrimary} onClick={onCopyLink}>
            {linkCopied ? 'Copied ✓' : 'Copy link'}
          </button>
          <button style={btnSecondary} onClick={() => { setResult(null); setEmail(''); setFirstName(''); setLastName(''); setLinkCopied(false); }}>
            Invite another
          </button>
          <button style={btnSecondary} onClick={onClose}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={labelStyle}>Invite new user</div>
        <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 18, padding: 0 }}>×</button>
      </div>
      <div>
        <label style={labelStyle} htmlFor="invite-email">Email</label>
        <input id="invite-email" type="email" autoComplete="off" style={inputStyle}
          value={email} onChange={e => setEmail(e.target.value)} required />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={labelStyle} htmlFor="invite-first">First name</label>
          <input id="invite-first" style={inputStyle} value={firstName}
            onChange={e => setFirstName(e.target.value)} required />
        </div>
        <div>
          <label style={labelStyle} htmlFor="invite-last">Last name</label>
          <input id="invite-last" style={inputStyle} value={lastName}
            onChange={e => setLastName(e.target.value)} required />
        </div>
      </div>
      {error && <Msg text={error} variant="error" />}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" style={btnPrimary} disabled={invite.isPending}>
          {invite.isPending ? 'Inviting…' : 'Invite user'}
        </button>
        <button type="button" style={btnSecondary} onClick={onClose}>Cancel</button>
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
        User is created approved. A one-time login link lets them set their password on first click.
      </div>
    </form>
  );
}

// ─── Credential controls (login link + token management) ────────────────────

function UserCredentialControls({ userId, onChange }: { userId: string; onChange: () => void }) {
  const [password, setPassword] = useState('');
  const [pwMsg, setPwMsg] = useState<{ text: string; variant: 'success' | 'error' } | null>(null);
  const [linkResult, setLinkResult] = useState<AdminLoginLinkResult | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const tokensQuery = useQuery({
    queryKey: ['adminLoginTokens', userId],
    queryFn: () => api.adminListLoginTokens(userId) as Promise<AdminLoginTokenList>,
  });

  const setPasswordMutation = useMutation({
    mutationFn: () => api.adminSetPassword(userId, password),
    onSuccess: res => {
      setPwMsg({ text: res.hadPriorPassword ? 'Password updated.' : 'Password set.', variant: 'success' });
      setPassword('');
      onChange();
    },
    onError: (e: Error) => setPwMsg({ text: e.message || 'Failed to set password', variant: 'error' }),
  });

  const createLinkMutation = useMutation({
    mutationFn: () => api.adminCreateLoginLink(userId) as Promise<AdminLoginLinkResult>,
    onSuccess: res => {
      setLinkResult(res);
      setLinkError(null);
      tokensQuery.refetch();
    },
    onError: (e: Error) => setLinkError(e.message || 'Failed to create link'),
  });

  const revokeMutation = useMutation({
    mutationFn: (tokenId: string) => api.adminRevokeLoginToken(userId, tokenId),
    onSuccess: () => tokensQuery.refetch(),
  });

  const onSetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (password.length < 8) { setPwMsg({ text: 'Password must be at least 8 characters.', variant: 'error' }); return; }
    setPasswordMutation.mutate();
  };

  const onCopyLink = async () => {
    if (!linkResult?.url) return;
    await navigator.clipboard.writeText(linkResult.url).catch(() => {});
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const activeTokens = (tokensQuery.data?.tokens || []).filter(t => !t.usedAt);

  return (
    <div style={{
      marginTop: 14, paddingTop: 14,
      borderTop: '1px dashed var(--border, #e2e8f0)',
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      {/* Set password */}
      <form onSubmit={onSetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={labelStyle}>Set password</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="password"
            autoComplete="new-password"
            style={{ ...inputStyle, flex: 1 }}
            placeholder="New password (8+ chars)"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <button type="submit" style={btnSecondary} disabled={setPasswordMutation.isPending || password.length < 8}>
            {setPasswordMutation.isPending ? 'Saving…' : 'Set'}
          </button>
        </div>
        {pwMsg && <Msg text={pwMsg.text} variant={pwMsg.variant} />}
      </form>

      {/* Login link */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={labelStyle}>One-time login link</div>
        {linkResult ? (
          <div style={{
            padding: '10px 12px', borderRadius: 8,
            background: '#eff6ff', border: '1px solid #bfdbfe',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <div style={{
              padding: '6px 8px', borderRadius: 6,
              background: '#fff', fontFamily: 'var(--font-mono, monospace)',
              fontSize: 11, wordBreak: 'break-all', color: 'var(--fg-1)',
              border: '1px solid var(--border, #e2e8f0)',
            }}>{linkResult.url}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btnSecondary} onClick={onCopyLink}>{linkCopied ? 'Copied ✓' : 'Copy link'}</button>
              <button style={btnSecondary} onClick={() => setLinkResult(null)}>Dismiss</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button style={btnSecondary} onClick={() => createLinkMutation.mutate()} disabled={createLinkMutation.isPending}>
              {createLinkMutation.isPending ? 'Generating…' : 'Generate login link'}
            </button>
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Expires in 24h, single-use.</span>
          </div>
        )}
        {linkError && <Msg text={linkError} variant="error" />}

        {activeTokens.length > 0 && (
          <div style={{ marginTop: 4 }}>
            <div style={{ ...labelStyle, marginBottom: 4 }}>{activeTokens.length} active token{activeTokens.length !== 1 ? 's' : ''}</div>
            {activeTokens.map(t => (
              <div key={t.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 8px', borderRadius: 6,
                border: '1px solid var(--border, #e2e8f0)',
                background: '#fff', marginBottom: 4,
              }}>
                <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11, color: 'var(--ink-2)' }}>
                  …{t.id.slice(-12)}
                </span>
                <button
                  style={{ ...btnSecondary, padding: '4px 10px', fontSize: 11 }}
                  onClick={() => revokeMutation.mutate(t.id)}
                  disabled={revokeMutation.isPending}
                >Revoke</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Root Admin screen ───────────────────────────────────────────────────────

export function Admin() {
  const auth = useAuth();
  const [tab, setTab] = useState<AdminTab>('data');

  // Same gating logic as AdminPage: isAdmin capability, with dev bypass already
  // baked into useAuth (dev bypass sets capabilities.isAdmin = true).
  const isAdmin = auth.capabilities?.isAdmin ?? false;

  return (
    <Shell active="profile" light>
      <div style={{
        position: 'relative', minHeight: '100vh',
        paddingBottom: 80, overflowY: 'auto',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px 0' }}>

          {/* Page header */}
          <div style={sectionLabel}>System controls</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--fg-1)', margin: '4px 0 20px', letterSpacing: '-0.02em' }}>
            Admin
          </h1>

          {/* Gate */}
          {!auth.isLoading && !isAdmin ? (
            <NotAuthorized />
          ) : (
            <>
              {/* Tabs */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
                {(['data', 'users'] as AdminTab[]).map(t => (
                  <button key={t} onClick={() => setTab(t)} style={{
                    padding: '7px 16px', borderRadius: 8,
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    background: tab === t ? '#fff' : 'transparent',
                    color: tab === t ? 'var(--fg-1)' : 'var(--ink-3, #94a3b8)',
                    border: tab === t ? '1px solid var(--border, #e2e8f0)' : '1px solid transparent',
                    boxShadow: tab === t ? 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,.06))' : 'none',
                  }}>
                    {t === 'data' ? 'Data ops' : 'Users'}
                  </button>
                ))}
              </div>

              {tab === 'data' ? <DataTab /> : <UsersTab />}
            </>
          )}
        </div>
      </div>
    </Shell>
  );
}
