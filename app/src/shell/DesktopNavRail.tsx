import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../ds';
import type { TabId } from './types';

interface DesktopNavRailProps {
  active: TabId;
  light?: boolean;
}

const TAB_ITEMS: { id: TabId; icon: string; label: string; href: string }[] = [
  { id: 'rivers', icon: 'waves',   label: 'Rivers',  href: '/' },
  { id: 'trips',  icon: 'compass', label: 'Trips',   href: '/trips' },
  { id: 'log',    icon: 'flag',    label: 'Log',     href: '/log' },
  { id: 'profile',icon: 'user',    label: 'Profile', href: '/profile' },
];

export function DesktopNavRail({ active, light = false }: DesktopNavRailProps) {
  const navigate = useNavigate();

  const railBg   = light
    ? 'var(--rail-surface-bg)'
    : 'linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.05) 100%)';
  const railBdr  = light
    ? '1px solid var(--rail-surface-border)'
    : '1px solid var(--module-stroke)';
  const idleClr  = light ? 'var(--fg-3, #6b7886)' : 'var(--fg-on-sky-2)';
  const onBg     = light ? 'var(--flow-100, #e8f3fd)' : 'rgba(255,255,255,0.92)';
  const onClr    = 'var(--flow-700, #1a5ea6)';

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        alignSelf: 'start',
        height: '100vh',
        zIndex: 30,
        width: 92,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '26px 0 22px',
        gap: 26,
        background: railBg,
        borderRight: railBdr,
        backdropFilter: 'blur(22px) saturate(150%)',
        WebkitBackdropFilter: 'blur(22px) saturate(150%)',
      }}
    >
      {/* Logo */}
      <Link to="/" style={{ display: 'block', flexShrink: 0 }}>
        <img
          src="/brand/flowstate-icon.svg"
          alt="Flow State"
          style={{ width: 42, height: 42, borderRadius: 12, boxShadow: '0 6px 16px rgba(6,19,33,0.4)' }}
        />
      </Link>

      {/* Tab buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', alignItems: 'center' }}>
        {TAB_ITEMS.map(t => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              onClick={() => navigate(t.href)}
              title={t.label}
              style={{
                width: 62,
                padding: '11px 0 9px',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 18,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 5,
                background: on ? onBg : 'transparent',
                color: on ? onClr : idleClr,
                fontFamily: 'var(--font-sans)',
                fontSize: 11,
                fontWeight: 700,
                boxShadow: (on && !light) ? '0 6px 16px rgba(6,19,33,0.28)' : 'none',
                transition: 'background 0.18s',
              }}
            >
              <Icon name={t.icon} size={23} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Bottom: settings + avatar placeholder */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <button
          onClick={() => navigate('/profile')}
          title="Settings"
          style={{
            width: 44, height: 44, borderRadius: 99, border: 'none', cursor: 'pointer',
            background: light ? 'var(--bg-subtle, #f5f7f9)' : 'var(--module-fill)',
            color: light ? 'var(--fg-2, #45525f)' : 'var(--fg-on-sky-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name="settings" size={20} />
        </button>
        <button
          onClick={() => navigate('/profile')}
          title="Profile"
          style={{
            width: 44, height: 44, borderRadius: 99, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(160deg, var(--flow-400, #4ea8e0), var(--flow-700, #1a5ea6))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 15, color: 'var(--fg-on-brand)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 12px rgba(6,19,33,0.35)',
          }}
        >
          <Icon name="user" size={18} />
        </button>
      </div>
    </nav>
  );
}
