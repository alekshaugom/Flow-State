import { useNavigate } from 'react-router-dom';
import { Icon } from '../ds';
import type { TabId } from './types';

interface MobileTabBarProps {
  active: TabId;
}

const TABS: { id: TabId; icon: string; label: string; href: string }[] = [
  { id: 'rivers',  icon: 'waves',   label: 'Rivers',  href: '/' },
  { id: 'trips',   icon: 'compass', label: 'Trips',   href: '/trips' },
  { id: 'log',     icon: 'flag',    label: 'Log',     href: '/log' },
  { id: 'profile', icon: 'user',    label: 'Profile', href: '/profile' },
];

export function MobileTabBar({ active }: MobileTabBarProps) {
  const navigate = useNavigate();

  return (
    <div
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 16,
        zIndex: 40,
        display: 'flex',
        justifyContent: 'space-around',
        background: 'var(--rail-surface-bg)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        border: '1px solid var(--border, rgba(0,0,0,0.10))',
        borderRadius: 'var(--r-xl, 22px)',
        padding: '9px 6px 8px',
        boxShadow: 'var(--shadow-md, 0 4px 16px rgba(0,0,0,0.14))',
      }}
    >
      {TABS.map(t => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => navigate(t.href)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              color: on ? 'var(--flow-600, #1e78c0)' : 'var(--fg-3, #6b7886)',
              fontFamily: 'var(--font-sans)',
              fontSize: 10.5,
              fontWeight: 600,
            }}
          >
            <Icon name={t.icon} size={23} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
