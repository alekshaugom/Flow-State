import { CSSProperties, ReactNode } from 'react';

export type SkyVariant =
  | 'dawn'
  | 'day'
  | 'cloud'
  | 'dusk'
  | 'night'
  | 'storm'
  | 'river'
  | 'alpine';

export interface SkyBgProps {
  sky?: SkyVariant;
  children?: ReactNode;
  style?: CSSProperties;
}

export function SkyBg({ sky = 'day', children, style }: SkyBgProps) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `var(--sky-${sky})`,
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* top protection scrim */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 160,
          background: 'var(--scrim-top)',
          pointerEvents: 'none',
        }}
      />
      {/* bottom protection scrim */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 200,
          background: 'var(--scrim-bottom)',
          pointerEvents: 'none',
        }}
      />
      {children}
    </div>
  );
}
