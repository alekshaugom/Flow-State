import { CSSProperties } from 'react';
import { Icon } from './Icon';

export interface StatusBadgeProps {
  color: string;
  label: string;
  bg?: string;
  dark?: boolean;
  icon?: string;
  style?: CSSProperties;
}

/**
 * Dot-LESS colored pill badge. Hard brand rule: NO decorative dots.
 * `color` and `bg` are full CSS color strings — e.g. statusColor(status),
 * "var(--flow-300)", or "rgba(255,255,255,0.4)".
 * `dark` switches to a light-transparent background for sky surfaces.
 */
export function StatusBadge({
  color,
  label,
  bg,
  dark = false,
  icon,
  style,
}: StatusBadgeProps) {
  const fgColor = color;
  let bgColor: string;
  if (bg) {
    bgColor = bg;
  } else if (dark) {
    bgColor = 'var(--module-fill)';
  } else {
    bgColor = `color-mix(in srgb, ${fgColor} 15%, transparent)`;
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 11px',
        borderRadius: 'var(--r-pill)',
        fontSize: 12.5,
        fontWeight: 700,
        color: fgColor,
        background: bgColor,
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={13} />}
      {label}
    </span>
  );
}
