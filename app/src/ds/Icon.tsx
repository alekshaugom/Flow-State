import { CSSProperties } from 'react';

export interface IconProps {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  fill?: boolean;
  style?: CSSProperties;
}

// Lucide-style inline SVG paths. Stroke 2, round caps/joins, 24 viewBox.
const ICON_PATHS: Record<string, string> = {
  waves:
    'M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5s2.5 2 5 2 2.5-2 5-2 1.9.5 2.5 1M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 1.9.5 2.5 1M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 1.9.5 2.5 1',
  droplet: 'M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z',
  snowflake:
    'M12 2v20M4.93 7.5l14.14 9M19.07 7.5L4.93 16.5M12 5l-2.5 2M12 5l2.5 2M12 19l-2.5-2M12 19l2.5-2M5.8 9.2 3 9M5.8 9.2 5 12M18.2 9.2 21 9M18.2 9.2 19 12',
  mountain: 'm8 3 4 8 5-5 5 15H2L8 3z',
  'mountain-snow':
    'm8 3 4 8 5-5 5 15H2L8 3zM4.14 15.08c2.62-1.57 5.24-1.43 7.86.42 2.74 1.94 5.49 2 8.23.19',
  wind: 'M12.8 19.6A2 2 0 1 0 14 16H2M17.5 8A2.5 2.5 0 1 1 19.5 12H2M9.8 4.4A2 2 0 1 1 11 8H2',
  sun: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  cloud: 'M17.5 19a4.5 4.5 0 1 0 0-9 6 6 0 1 0-11.6 2.1A4 4 0 0 0 6 19z',
  'cloud-rain':
    'M16 13v6M8 13v6M12 15v6M17.5 15a4.5 4.5 0 0 0 0-9 6 6 0 1 0-11.6 2.1A4 4 0 0 0 6 15',
  'cloud-sun':
    'M12 2v2M4.2 4.2l1.4 1.4M2 12h2M4.2 19.8l1.4-1.4M20 12c0 4.42-3.58 8-8 8a8 8 0 1 1 6.32-12.89M22 12h-2',
  thermometer: 'M14 14.76V4a2 2 0 0 0-4 0v10.76a4 4 0 1 0 4 0z',
  gauge: 'm12 14 4-4M3.34 19a10 10 0 1 1 17.32 0',
  'map-pin':
    'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  navigation: 'm3 11 19-9-9 19-2-8-8-2z',
  'triangle-alert':
    'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3zM12 9v4M12 17h.01',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0',
  bookmark: 'm19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z',
  map: 'M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3zM9 3v15M15 6v15',
  'layout-grid': 'M4 4h7v7H4zM13 4h7v7h-7zM13 13h7v7h-7zM4 13h7v7H4z',
  'chevron-right': 'm9 18 6-6-6-6',
  'chevron-left': 'm15 18-6-6 6-6',
  'chevron-down': 'm6 9 6 6 6-6',
  'chevron-up': 'm18 15-6-6-6 6',
  sunrise:
    'M12 2v6M5.6 9.6 4.2 8.2M1 18h2M21 18h2M19.8 8.2l-1.4 1.4M23 22H1M16 18a4 4 0 0 0-8 0M8 6l4-4 4 4',
  sunset:
    'M12 10V2M5.6 12.6 4.2 14M1 18h2M21 18h2M19.8 14l-1.4-1.4M23 22H1M16 18a4 4 0 0 0-8 0M16 6l-4 4-4-4',
  fish: 'M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6zM18 12v.01M6.5 12C5 12 2 13 2 16c2.5 0 3.5-1 4.5-1.5M12 18c0 1 .5 2 1 3M12 6c0-1 .5-2 1-3',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3',
  plus: 'M12 5v14M5 12h14',
  x: 'M18 6 6 18M6 6l12 12',
  share:
    'M12 2v13M16 6l-4-4-4 4M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7',
  layers:
    'm12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.84zM2 12.5l8.58 3.91a2 2 0 0 0 1.66 0L21 12.5M2 17l8.58 3.91a2 2 0 0 0 1.66 0L21 17',
  'trending-up': 'M16 7h6v6M22 7l-8.5 8.5-5-5L2 17',
  'trending-down': 'M16 17h6v-6M22 17l-8.5-8.5-5 5L2 7',
  clock:
    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  'arrow-up': 'M12 19V5M5 12l7-7 7 7',
  'arrow-down': 'M12 5v14M19 12l-7 7-7-7',
  'arrow-right': 'M5 12h14M12 5l7 7-7 7',
  'arrow-left': 'M19 12H5M12 19l-7-7 7-7',
  ruler:
    'M21.3 8.7 8.7 21.3a1 1 0 0 1-1.4 0l-4.6-4.6a1 1 0 0 1 0-1.4L15.3 2.7a1 1 0 0 1 1.4 0l4.6 4.6a1 1 0 0 1 0 1.4zM14.5 12.5l-2 2M11.5 9.5l-2 2M8.5 6.5l-2 2M17.5 15.5l-2 2',
  calendar:
    'M8 2v4M16 2v4M3 8h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  move: 'M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20',
  sliders:
    'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  locate: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3',
  flag: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7',
  minus: 'M5 12h14',
  pencil: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z',
  users:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  user: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z',
  settings:
    'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1zM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  'log-out':
    'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  moon: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z',
  mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 7l-10 6L2 7',
  check: 'M20 6 9 17l-5-5',
  'shield-check':
    'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4',
  star: 'm12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01z',
  'circle-dot':
    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  compass:
    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm4.24-13.24-2.12 6.36-6.36 2.12 2.12-6.36z',
  bus: 'M8 6v6M16 6v6M2 12h20M18 18h2a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2M7 18h10M6 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM18 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  phone:
    'M15.05 5A5 5 0 0 1 19 8.95M15.05 1A9 9 0 0 1 23 8.94M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z',
  ship: 'M3 17l1.5 5h15L21 17M2 9h20M5 9V5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v4M12 4v5M8 13v4M16 13v4',
  'external-link':
    'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3',
};

// Icons where the fill mode is the default (navigation, bookmark, star).
const FILL_DEFAULT: Record<string, boolean> = {
  navigation: true,
  bookmark: true,
  star: true,
};

export function Icon({
  name,
  size = 16,
  color = 'currentColor',
  strokeWidth = 2,
  fill = false,
  style,
}: IconProps): React.ReactElement | null {
  const d = ICON_PATHS[name];
  if (!d) return null;
  const filled = fill || FILL_DEFAULT[name] === true;
  // Split on capital M so multi-subpath icons get clean joins.
  const subs = d.split(/(?=M)/).filter(Boolean);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block', flex: 'none', ...style }}
    >
      {subs.map((s, i) => (
        <path
          key={i}
          d={s}
          fill={filled && i === 0 ? color : 'none'}
        />
      ))}
    </svg>
  );
}
