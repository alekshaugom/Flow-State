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

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useMyLogs } from '../hooks/useMyLogs';
import { useFollows } from '../hooks/useFollows';
import { usePreferences } from '../hooks/usePreferences';
import type { Appearance, FlowUnit, TempUnit, LengthUnit } from '../hooks/usePreferences';
import { Shell } from '../shell/Shell';
import { Icon } from '../ds';
import { api } from '../api';
import { flowUnitLabel } from '../lib/units';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Reusable controls ────────────────────────────────────────────────────────

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
      <span style={{ fontSize: 14.5, color: 'var(--fg-1)' }}>{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: 44,
          height: 26,
          borderRadius: 999,
          border: 'none',
          cursor: 'pointer',
          background: checked ? 'var(--flow-600)' : 'var(--border-strong)',
          position: 'relative',
          flexShrink: 0,
          transition: 'background 160ms',
          padding: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 20 : 2,
            width: 22,
            height: 22,
            borderRadius: 999,
            background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.22)',
            transition: 'left 160ms',
          }}
        />
      </button>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { label: string; value: T }[];
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        background: 'var(--bg-subtle)',
        borderRadius: 'var(--r-pill)',
        padding: 3,
        gap: 2,
      }}
    >
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          style={{
            fontSize: 13,
            fontWeight: 600,
            padding: '6px 14px',
            borderRadius: 'var(--r-pill)',
            border: 'none',
            cursor: 'pointer',
            background: value === opt.value ? 'var(--flow-600)' : 'transparent',
            color: value === opt.value ? 'var(--fg-on-brand)' : 'var(--fg-2)',
            transition: 'background 120ms, color 120ms',
            fontFamily: 'inherit',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 'var(--r-md)',
  border: '1px solid var(--rule)',
  background: 'var(--bg-card)',
  color: 'var(--fg-1)',
  fontSize: 14,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const subLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--fg-3)',
  marginBottom: 8,
};

// ─── Accordion Section Header ─────────────────────────────────────────────────

interface AccordionRowProps {
  id: string;
  icon: string;
  label: string;
  summary?: string;
  isFirst: boolean;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function AccordionRow({ id, icon, label, summary, isFirst, isOpen, onToggle, children }: AccordionRowProps) {
  return (
    <div>
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 13,
          padding: '13px 16px',
          textAlign: 'left',
          border: 'none',
          cursor: 'pointer',
          background: 'none',
          borderTop: isFirst ? 'none' : '1px solid var(--border)',
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            flex: 'none',
            background: 'var(--bg-subtle)',
            color: 'var(--flow-600)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon} size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--fg-1)' }}>{label}</div>
          {summary && (
            <div
              style={{
                fontSize: 13,
                color: 'var(--fg-3)',
                marginTop: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {summary}
            </div>
          )}
        </div>
        <Icon
          name="chevron-down"
          size={18}
          color="var(--fg-3)"
          style={{
            transform: isOpen ? 'rotate(180deg)' : undefined,
            transition: 'transform 200ms',
            flexShrink: 0,
          }}
        />
      </button>
      {isOpen && (
        <div
          style={{
            borderTop: '1px solid var(--border)',
            padding: '14px 16px 16px',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
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
                background: 'var(--flow-600)', color: 'var(--fg-on-brand)',
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

// ─── Account Panel ────────────────────────────────────────────────────────────

function AccountPanel({ user }: { user: any }) {
  const qc = useQueryClient();

  // Split name into first/last
  const nameParts = (user?.name ?? '').trim().split(/\s+/);
  const defaultFirst = user?.firstName ?? (nameParts.length >= 2 ? nameParts.slice(0, -1).join(' ') : nameParts[0] ?? '');
  const defaultLast = user?.lastName ?? (nameParts.length >= 2 ? nameParts[nameParts.length - 1] : '');

  const [firstName, setFirstName] = useState(defaultFirst);
  const [lastName, setLastName] = useState(defaultLast);
  const [savedFirst, setSavedFirst] = useState(defaultFirst);
  const [savedLast, setSavedLast] = useState(defaultLast);

  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const nameMutation = useMutation({
    mutationFn: ({ f, l }: { f: string; l: string }) => api.setMyName(f, l),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      setSavedFirst(firstName);
      setSavedLast(lastName);
    },
  });

  const pwMutation = useMutation({
    mutationFn: (pw: string) => api.setMyPassword(pw),
    onSuccess: () => {
      setPwSuccess('Password updated ✓');
      setNewPw('');
      setConfirmPw('');
    },
  });

  const handleNameBlur = () => {
    if (!firstName.trim()) return;
    if (firstName === savedFirst && lastName === savedLast) return;
    nameMutation.mutate({ f: firstName, l: lastName });
  };

  const handlePwBlur = () => {
    if (newPw.length >= 8 && newPw === confirmPw) {
      setPwSuccess('');
      pwMutation.mutate(newPw);
    }
  };

  const pwHint =
    newPw.length > 0 && newPw.length < 8
      ? 'At least 8 characters'
      : newPw.length >= 8 && confirmPw.length > 0 && newPw !== confirmPw
      ? "Passwords don't match"
      : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Name fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <div style={subLabelStyle}>First name</div>
          <input
            style={inputStyle}
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            onBlur={handleNameBlur}
            placeholder="First"
          />
        </div>
        <div>
          <div style={subLabelStyle}>Last name</div>
          <input
            style={inputStyle}
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            onBlur={handleNameBlur}
            placeholder="Last"
          />
        </div>
      </div>

      {/* Name save status */}
      {nameMutation.isPending && (
        <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>Saving…</div>
      )}
      {nameMutation.isSuccess && (
        <div style={{ fontSize: 12, color: 'var(--status-good)' }}>Saved ✓</div>
      )}
      {nameMutation.isError && (
        <div style={{ fontSize: 12, color: 'var(--status-high)' }}>
          {(nameMutation.error as Error)?.message ?? 'Error saving name'}
        </div>
      )}

      {/* Email (read-only) */}
      <div>
        <div style={subLabelStyle}>Email</div>
        <div
          style={{
            ...inputStyle,
            color: 'var(--fg-3)',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border)',
          }}
        >
          {user?.email ?? '—'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 5 }}>
          Email can't be changed.
        </div>
      </div>

      {/* Change password */}
      <div>
        <div style={subLabelStyle}>Change password</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            style={inputStyle}
            type="password"
            placeholder="New password"
            value={newPw}
            onChange={e => { setNewPw(e.target.value); setPwSuccess(''); }}
            onBlur={handlePwBlur}
          />
          <input
            style={inputStyle}
            type="password"
            placeholder="Confirm password"
            value={confirmPw}
            onChange={e => { setConfirmPw(e.target.value); setPwSuccess(''); }}
            onBlur={handlePwBlur}
          />
        </div>
        {pwHint && (
          <div style={{ fontSize: 12, color: 'var(--status-high)', marginTop: 5 }}>{pwHint}</div>
        )}
        {pwMutation.isPending && (
          <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 5 }}>Saving…</div>
        )}
        {pwSuccess && (
          <div style={{ fontSize: 12, color: 'var(--status-good)', marginTop: 5 }}>{pwSuccess}</div>
        )}
        {pwMutation.isError && (
          <div style={{ fontSize: 12, color: 'var(--status-high)', marginTop: 5 }}>
            {(pwMutation.error as Error)?.message ?? 'Error updating password'}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Signed-in view ───────────────────────────────────────────────────────────

function SignedInView() {
  const { user, capabilities, logout } = useAuth();
  const myLogs = useMyLogs();
  const follows = useFollows();
  const prefs = usePreferences();

  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (id: string) =>
    setOpenSection(prev => (prev === id ? null : id));

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

  // Summaries for accordion rows
  const alertsOnCount = [prefs.alerts.flowChanges, prefs.alerts.weeklyDigest, prefs.alerts.tripReminders].filter(Boolean).length;
  const unitsSummary = `${flowUnitLabel(prefs.units.flow)} · °${prefs.units.temp} · ${prefs.units.length}`;
  const appearanceSummary = prefs.appearance === 'dark' ? 'Dark' : 'Light';

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
          color: 'var(--fg-on-brand)', display: 'flex', alignItems: 'center',
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

      {/* Settings accordion */}
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
          {/* Account */}
          <AccordionRow
            id="account"
            icon="mail"
            label="Account"
            summary={email || undefined}
            isFirst={true}
            isOpen={openSection === 'account'}
            onToggle={() => toggleSection('account')}
          >
            <AccountPanel user={user} />
          </AccordionRow>

          {/* Alerts */}
          <AccordionRow
            id="alerts"
            icon="bell"
            label="Alerts"
            summary={`${alertsOnCount} on`}
            isFirst={false}
            isOpen={openSection === 'alerts'}
            onToggle={() => toggleSection('alerts')}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Toggle
                checked={prefs.alerts.flowChanges}
                onChange={v => prefs.setAlert('flowChanges', v)}
                label="Flow changes on followed sections"
              />
              <Toggle
                checked={prefs.alerts.weeklyDigest}
                onChange={v => prefs.setAlert('weeklyDigest', v)}
                label="Weekly digest email"
              />
              <Toggle
                checked={prefs.alerts.tripReminders}
                onChange={v => prefs.setAlert('tripReminders', v)}
                label="Trip reminders"
              />
            </div>
          </AccordionRow>

          {/* Units */}
          <AccordionRow
            id="units"
            icon="gauge"
            label="Units"
            summary={unitsSummary}
            isFirst={false}
            isOpen={openSection === 'units'}
            onToggle={() => toggleSection('units')}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={subLabelStyle}>Flow</div>
                <Segmented<FlowUnit>
                  value={prefs.units.flow}
                  onChange={v => prefs.setUnit('flow', v)}
                  options={[
                    { label: 'cfs', value: 'cfs' },
                    { label: 'm³/s', value: 'cms' },
                  ]}
                />
              </div>
              <div>
                <div style={subLabelStyle}>Temperature</div>
                <Segmented<TempUnit>
                  value={prefs.units.temp}
                  onChange={v => prefs.setUnit('temp', v)}
                  options={[
                    { label: '°F', value: 'F' },
                    { label: '°C', value: 'C' },
                  ]}
                />
              </div>
              <div>
                <div style={subLabelStyle}>Distance</div>
                <Segmented<LengthUnit>
                  value={prefs.units.length}
                  onChange={v => prefs.setUnit('length', v)}
                  options={[
                    { label: 'mi', value: 'mi' },
                    { label: 'km', value: 'km' },
                  ]}
                />
              </div>
            </div>
          </AccordionRow>

          {/* Appearance */}
          <AccordionRow
            id="appearance"
            icon="moon"
            label="Appearance"
            summary={appearanceSummary}
            isFirst={false}
            isOpen={openSection === 'appearance'}
            onToggle={() => toggleSection('appearance')}
          >
            <div>
              <div style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 12 }}>
                Switch between light and dark mode.
              </div>
              <Segmented<Appearance>
                value={prefs.appearance}
                onChange={v => prefs.setAppearance(v)}
                options={[
                  { label: 'Light', value: 'light' },
                  { label: 'Dark', value: 'dark' },
                ]}
              />
            </div>
          </AccordionRow>

          {/* Privacy */}
          <AccordionRow
            id="privacy"
            icon="shield-check"
            label="Privacy"
            summary=""
            isFirst={false}
            isOpen={openSection === 'privacy'}
            onToggle={() => toggleSection('privacy')}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Toggle
                checked={prefs.privacy.publicLogs}
                onChange={v => prefs.setPrivacy('publicLogs', v)}
                label="Public run log"
              />
              <Toggle
                checked={prefs.privacy.showInLeaderboards}
                onChange={v => prefs.setPrivacy('showInLeaderboards', v)}
                label="Show me in leaderboards"
              />
            </div>
          </AccordionRow>
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
