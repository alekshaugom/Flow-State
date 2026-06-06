import { CSSProperties } from 'react';

export interface BigStatProps {
  value: string | number;
  unit?: string;
  /** Full CSS color string for the status sub-line, e.g. statusColor(status) or "var(--flow-300)". */
  statusColor?: string;
  sub?: string;
  style?: CSSProperties;
}

export function BigStat({ value, unit, statusColor, sub, style }: BigStatProps) {
  return (
    <div style={{ textAlign: 'center', color: '#fff', ...style }}>
      <div style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 6 }}>
        <span
          style={{
            fontWeight: 300,
            fontSize: 92,
            lineHeight: 1,
            letterSpacing: '-0.03em',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </span>
        {unit && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 20,
              marginTop: 16,
              color: 'var(--fg-on-sky-2)',
            }}
          >
            {unit}
          </span>
        )}
      </div>
      {sub && (
        <div
          style={{
            marginTop: 4,
            fontSize: 18,
            fontWeight: 600,
            color: statusColor || '#fff',
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
