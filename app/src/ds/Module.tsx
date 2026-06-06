import { CSSProperties, ReactNode } from 'react';
import { Icon } from './Icon';

export interface ModuleProps {
  label?: string;
  icon?: string;
  children?: ReactNode;
  style?: CSSProperties;
  onClick?: () => void;
}

export function Module({ label, icon, children, style, onClick }: ModuleProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--module-fill)',
        backdropFilter: 'var(--blur-module)',
        WebkitBackdropFilter: 'var(--blur-module)',
        boxShadow: 'inset 0 0 0 1px var(--module-stroke)',
        borderRadius: 'var(--r-lg)',
        padding: 15,
        color: '#fff',
        cursor: onClick ? 'pointer' : 'default',
        WebkitTapHighlightColor: 'transparent',
        ...style,
      }}
    >
      {label && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            color: 'var(--fg-on-sky-2)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.13em',
            textTransform: 'uppercase',
            marginBottom: 12,
          }}
        >
          {icon && <Icon name={icon} size={14} />}
          {label}
        </div>
      )}
      {children}
    </div>
  );
}
