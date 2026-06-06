import { RiverMap } from '../components/RiverMap';

interface MapRailProps {
  corridorCount: number;
}

/**
 * Desktop sticky right rail embedding the existing RiverMap with frosted chrome.
 * The RiverMap fetches its own data via useDashboard internally.
 */
export function MapRail({ corridorCount }: MapRailProps) {
  return (
    <aside
      style={{
        position: 'sticky',
        top: 0,
        alignSelf: 'start',
        height: '100vh',
        zIndex: 20,
        width: 438,
        boxSizing: 'border-box',
        padding: '22px 22px 22px 0',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          flex: 1,
          position: 'relative',
          borderRadius: 26,
          overflow: 'hidden',
          boxShadow: '0 16px 40px rgba(6,19,33,0.34), inset 0 1px 0 rgba(255,255,255,0.18)',
          border: '1px solid rgba(255,255,255,0.16)',
        }}
      >
        <RiverMap style={{ width: '100%', height: '100%' }} />

        {/* Frosted label overlay */}
        <div
          style={{
            position: 'absolute',
            top: 14,
            left: 14,
            zIndex: 500,
            pointerEvents: 'none',
            background: 'rgba(7,22,40,0.62)',
            WebkitBackdropFilter: 'blur(12px) saturate(140%)',
            backdropFilter: 'blur(12px) saturate(140%)',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 13,
            padding: '9px 13px',
            color: '#fff',
            boxShadow: '0 6px 18px rgba(6,19,33,0.4)',
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 800 }}>All rivers</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'rgba(255,255,255,0.72)', marginTop: 2 }}>
            {corridorCount} {corridorCount === 1 ? 'corridor' : 'corridors'} · tap a section
          </div>
        </div>
      </div>
    </aside>
  );
}
