import { CSSProperties, ReactNode } from 'react';
import { Icon } from './Icon';

export interface ModuleProps {
  label?: string;
  icon?: string;
  children?: ReactNode;
  style?: CSSProperties;
  onClick?: () => void;
  /** When true: padding is removed so a child (e.g. a map) fills edge-to-edge.
   *  If a label is also provided it is rendered as an absolute overlay pill
   *  at the top-left so it stays readable without occupying layout space. */
  flush?: boolean;
}

export function Module({ label, icon, children, style, onClick, flush }: ModuleProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--module-fill)',
        backdropFilter: 'var(--blur-module)',
        WebkitBackdropFilter: 'var(--blur-module)',
        boxShadow: 'inset 0 0 0 1px var(--module-stroke)',
        borderRadius: 'var(--r-lg)',
        padding: flush ? 0 : 15,
        overflow: flush ? 'hidden' : undefined,
        position: flush ? 'relative' : undefined,
        color: 'var(--fg-on-sky-1)',
        cursor: onClick ? 'pointer' : 'default',
        WebkitTapHighlightColor: 'transparent',
        ...style,
      }}
    >
      {label && !flush && (
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
      {label && flush && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            zIndex: 2,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--module-fill-dark, rgba(6,19,33,0.62))',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            borderRadius: 'var(--r-pill)',
            padding: '4px 9px',
            color: 'var(--fg-on-sky-2)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.13em',
            textTransform: 'uppercase',
            pointerEvents: 'none',
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
