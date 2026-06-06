import { Shell } from '../shell/Shell';
import { Icon } from '../ds';

/**
 * Phase 6 placeholder for the Trips tab.
 * Rendered inside the light Shell so it's clearly distinct from the sky home.
 */
export function TripsStub() {
  return (
    <Shell active="trips" light>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 16,
          color: 'var(--fg-1, #0d1620)',
          padding: '0 24px',
          textAlign: 'center',
        }}
      >
        <Icon name="compass" size={48} color="var(--flow-500, #2e8fd4)" />
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em' }}>Trips</h1>
        <p style={{ margin: 0, fontSize: 16, color: 'var(--fg-3, #6b7886)', maxWidth: 320, lineHeight: 1.5 }}>
          Trip planning and history is coming in the next phase.
        </p>
      </div>
    </Shell>
  );
}
