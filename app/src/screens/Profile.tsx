/**
 * Profile screen — signed-in paddler identity + stats + settings.
 *
 * Stats:
 *   - Runs logged:  myLogs.data.total
 *   - Rivers:       distinct corridorIds from myLogs entries (corridors run)
 *   - Bookmarks:    follows.corridorIds.size + follows.sectionIds.size
 *
 * Sign-out: calls auth.logout() (Google OAuth logout + invalidate 'me' query).
 * Admin link: shown only when capabilities.isAdmin.
 * Signed-out: sign-in prompt linking to /login.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useMyLogs } from '../hooks/useMyLogs';
import { useFollows } from '../hooks/useFollows';
import { Shell } from '../shell/Shell';
import { Icon } from '../ds';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Signed-out state ─────────────────────────────────────────────────────────

function SignedOutView() {
  return (
    <Shell active="profile" light>
      <div style={{
        position: 'relative', minHeight: '100vh', overflowY: 'auto',
        paddingBottom: 110,
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '56px 20px 0',
        }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--fg-1)' }}>Profile</div>
        </div>
        <div style={{
          padding: '24px 24px 0',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', textAlign: 'center',
        }}>
          <div style={{
            width: 76, height: 76, borderRadius: 99,
            background: 'var(--flow-100)', color: 'var(--flow-600)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginTop: 16,
          }}>
            <Icon name="user" size={36} />
          </div>
          <div style={{
            fontSize: 22, fontWeight: 800, color: 'var(--fg-1)', marginTop: 18,
          }}>
            Sign in to Flow State
          </div>
          <div style={{
            fontSize: 15, color: 'var(--fg-2)', lineHeight: 1.5,
            marginTop: 8, maxWidth: 280,
          }}>
            Save rivers, bookmark sections, and sync your run log across devices.
          </div>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 11, marginTop: 28 }}>
            <Link
              to="/login"
              style={{
                width: '100%', boxSizing: 'border-box',
                border: 'none', cursor: 'pointer',
                background: 'var(--flow-600)', color: '#fff',
                fontFamily: 'var(--font-sans)', fontWeight: 700,
                fontSize: 16, padding: '15px', borderRadius: 'var(--r-pill)',
                textDecoration: 'none', textAlign: 'center', display: 'block',
              }}
            >
              Continue with email
            </Link>
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)',
            marginTop: 20, lineHeight: 1.5,
          }}>
            By continuing you agree to the Terms<br />&amp; Privacy Policy.
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ─── Settings rows config ─────────────────────────────────────────────────────

interface SettingRow {
  id: string;
  icon: string;
  label: string;
  value?: string;
}

const SETTINGS_ROWS: SettingRow[] = [
  { id: 'account', icon: 'mail', label: 'Account' },
  { id: 'alerts', icon: 'bell', label: 'Alerts' },
  { id: 'units', icon: 'gauge', label: 'Units', value: 'cfs · °F · ft' },
  { id: 'appearance', icon: 'moon', label: 'Appearance' },
  { id: 'privacy', icon: 'shield-check', label: 'Privacy' },
];

// ─── Stat cell ───────────────────────────────────────────────────────────────

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{
        fontSize: 24, fontWeight: 800, color: 'var(--fg-1)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {n}
      </div>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
        textTransform: 'uppercase', color: 'var(--fg-3)', marginTop: 3,
      }}>
        {label}
      </div>
    </div>
  );
}

// ─── Signed-in view ───────────────────────────────────────────────────────────

function SignedInView() {
  const { user, capabilities, logout } = useAuth();
  const myLogs = useMyLogs();
  const follows = useFollows();

  // Runs logged
  const runsCount = myLogs.data?.total ?? myLogs.data?.logs.length ?? 0;

  // Distinct corridors from logs (rivers run)
  const riversCount = useMemo(() => {
    const logs = myLogs.data?.logs ?? [];
    const corridors = new Set<string>();
    for (const l of logs) {
      if (l.corridorId) corridors.add(l.corridorId);
    }
    return corridors.size;
  }, [myLogs.data]);

  // Bookmarks = corridors + sections followed
  const bookmarksCount = follows.corridorIds.size + follows.sectionIds.size;

  const name = user?.name ?? 'Paddler';
  const email = user?.email ?? '';
  const avatarLetters = initials(name);

  const settingsRows: SettingRow[] = SETTINGS_ROWS.map(r =>
    r.id === 'account' ? { ...r, value: email } : r,
  );

  return (
    <div style={{ minHeight: '100vh', overflowY: 'auto', paddingBottom: 110 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '56px 20px 8px', position: 'relative',
      }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--fg-1)' }}>Profile</div>
      </div>

      {/* Identity */}
      <div style={{
        padding: '8px 20px 0',
        display: 'flex', alignItems: 'center', gap: 15,
      }}>
        <div style={{
          width: 66, height: 66, borderRadius: 99, flex: 'none',
          background: 'linear-gradient(145deg,#1a6fa8,#3aa0c9)',
          color: '#fff', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 24, fontWeight: 800,
          boxShadow: 'var(--shadow-md)',
        }}>
          {avatarLetters}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 21, fontWeight: 800, color: 'var(--fg-1)' }}>{name}</div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 13,
            color: 'var(--fg-3)', marginTop: 2,
          }}>
            {email}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{
        margin: '18px 16px 0',
        display: 'flex',
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-sm)', padding: '16px 0',
      }}>
        <Stat n={runsCount} label="Runs logged" />
        <div style={{ width: 1, background: 'var(--border)' }} />
        <Stat n={riversCount} label="Rivers" />
        <div style={{ width: 1, background: 'var(--border)' }} />
        <Stat n={bookmarksCount} label="Bookmarks" />
      </div>

      {/* Settings */}
      <div style={{ margin: '20px 16px 0' }}>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.13em',
          textTransform: 'uppercase', color: 'var(--fg-3)', padding: '0 8px 8px',
        }}>
          Settings
        </div>
        <div style={{
          background: 'var(--bg-surface)', borderRadius: 'var(--r-lg)',
          border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
        }}>
          {settingsRows.map((s, i) => (
            <button
              key={s.id}
              type="button"
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                gap: 13, padding: '13px 16px', textAlign: 'left',
                border: 'none', cursor: 'default', background: 'none',
                borderTop: i ? '1px solid var(--border)' : 'none',
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 10, flex: 'none',
                background: 'var(--bg-subtle)', color: 'var(--flow-600)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={s.icon} size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--fg-1)' }}>
                  {s.label}
                </div>
                {s.value && (
                  <div style={{
                    fontSize: 13, color: 'var(--fg-3)', marginTop: 1,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {s.value}
                  </div>
                )}
              </div>
              <Icon name="chevron-right" size={18} color="var(--fg-3)" />
            </button>
          ))}
        </div>
      </div>

      {/* Admin link — only for admins */}
      {capabilities?.isAdmin && (
        <div style={{ margin: '12px 16px 0' }}>
          <Link
            to="/admin"
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', padding: '13px 16px',
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-sm)',
              textDecoration: 'none', color: 'var(--fg-1)',
              fontWeight: 600, fontSize: 15.5,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, flex: 'none',
                background: 'var(--bg-subtle)', color: 'var(--flow-600)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="settings" size={18} />
              </div>
              Admin
            </div>
            <Icon name="chevron-right" size={18} color="var(--fg-3)" />
          </Link>
        </div>
      )}

      {/* Sign out */}
      <div style={{ margin: '16px 16px 0' }}>
        <button
          type="button"
          onClick={logout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 9, padding: '14px', cursor: 'pointer',
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-sm)',
            color: 'var(--status-high)', fontFamily: 'var(--font-sans)',
            fontWeight: 700, fontSize: 15.5,
          }}
        >
          <Icon name="log-out" size={18} />
          Sign out
        </button>
      </div>

      <div style={{
        textAlign: 'center', fontFamily: 'var(--font-mono)',
        fontSize: 11, color: 'var(--fg-3)', marginTop: 16,
      }}>
        Flow State · v2.0
      </div>
    </div>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function Profile() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Shell active="profile" light>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '60vh', color: 'var(--fg-3)',
        }}>
          Loading…
        </div>
      </Shell>
    );
  }

  if (!isAuthenticated) {
    return <SignedOutView />;
  }

  return (
    <Shell active="profile" light>
      <SignedInView />
    </Shell>
  );
}
