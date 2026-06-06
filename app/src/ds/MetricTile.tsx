import { CSSProperties } from 'react';
import { Icon } from './Icon';

export interface MetricTileProps {
  icon?: string;
  label: string;
  value: string | number;
  unit?: string;
  foot?: string;
  style?: CSSProperties;
}

export function MetricTile({ icon, label, value, unit, foot, style }: MetricTileProps) {
  return (
    <div style={style}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          color: 'var(--fg-on-sky-2)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        {icon && <Icon name={icon} size={14} />}
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <span
          style={{
            fontWeight: 300,
            fontSize: 34,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </span>
        {unit && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              color: 'var(--fg-on-sky-2)',
            }}
          >
            {unit}
          </span>
        )}
      </div>
      {foot && (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11.5,
            color: 'var(--fg-on-sky-3)',
            marginTop: 6,
          }}
        >
          {foot}
        </div>
      )}
    </div>
  );
}
