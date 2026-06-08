import { ReactNode } from 'react';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { DesktopNavRail } from './DesktopNavRail';
import { MobileTabBar } from './MobileTabBar';
import type { TabId } from './types';

const homeBg =
  'radial-gradient(120% 60% at 50% -8%, rgba(126,186,228,0.42) 0%, rgba(126,186,228,0) 60%), linear-gradient(176deg, #08233f 0%, #103e6b 40%, #1c5e95 74%, #2f7cb4 100%)';

// Theme-aware: --shell-surface-bg is a light gradient by default and a dark
// gradient under [data-theme="dark"] (see tokens.css), so dark mode reskins
// the shell backdrop too.
const lightBg = 'var(--shell-surface-bg)';

interface ShellProps {
  active: TabId;
  light?: boolean;
  children: ReactNode;
}

/**
 * Responsive app shell.
 *
 * Desktop (≥768px): CSS grid 92px | content. Fixed backdrop layer + sticky DesktopNavRail.
 * Mobile (<768px):  Full-bleed content + fixed MobileTabBar at bottom.
 *
 * `light` switches the immersive sky gradient to a light content surface.
 */
export function Shell({ active, light = false, children }: ShellProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return (
      <div
        style={{
          minHeight: '100vh',
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: '92px minmax(0,1fr)',
          fontFamily: 'var(--font-sans)',
          color: light ? 'var(--fg-1, #0d1620)' : 'var(--fg-on-sky-1)',
        }}
      >
        {/* Fixed backdrop */}
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: light ? lightBg : homeBg,
            zIndex: 0,
          }}
        />
        {/* Top scrim (sky-only) */}
        {!light && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              height: 140,
              background: 'linear-gradient(180deg, rgba(6,19,33,0.28) 0%, rgba(6,19,33,0) 100%)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />
        )}

        <DesktopNavRail active={active} light={light} />

        <main style={{ position: 'relative', zIndex: 10, minWidth: 0 }}>
          {children}
        </main>
      </div>
    );
  }

  // Mobile
  return (
    <div
      style={{
        minHeight: '100vh',
        position: 'relative',
        background: light ? lightBg : homeBg,
        fontFamily: 'var(--font-sans)',
        color: light ? 'var(--fg-1, #0d1620)' : 'var(--fg-on-sky-1)',
      }}
    >
      {children}
      <MobileTabBar active={active} />
    </div>
  );
}
