interface IconProps {
	name: string;
	size?: number;
	color?: string;
	strokeWidth?: number;
}

export function Icon({ name, size = 16, color = 'currentColor', strokeWidth = 2 }: IconProps) {
	const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
	switch (name) {
		case 'arrow-up':      return <svg {...props}><path d="M12 19V5M5 12l7-7 7 7"/></svg>;
		case 'arrow-down':    return <svg {...props}><path d="M12 5v14M5 12l7 7 7-7"/></svg>;
		case 'arrow-right':   return <svg {...props}><path d="M5 12h14M12 5l7 7-7 7"/></svg>;
		case 'minus':         return <svg {...props}><path d="M5 12h14"/></svg>;
		case 'chevron-right': return <svg {...props}><path d="M9 6l6 6-6 6"/></svg>;
		case 'chevron-left':  return <svg {...props}><path d="M15 6l-6 6 6 6"/></svg>;
		case 'mountain':      return <svg {...props}><path d="M3 20l5-9 4 6 3-4 6 7H3z"/><path d="M11 11l-3-5"/></svg>;
		case 'droplet':       return <svg {...props}><path d="M12 3s-6 7-6 12a6 6 0 0012 0c0-5-6-12-6-12z"/></svg>;
		case 'snowflake':     return <svg {...props}><path d="M12 2v20M4 6l16 12M20 6L4 18M2 12h20"/></svg>;
		case 'dam':           return <svg {...props}><path d="M4 4h16v6H4z"/><path d="M4 10v10M20 10v10M4 14h16M4 18h16"/></svg>;
		case 'search':        return <svg {...props}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>;
		case 'pin':           return <svg {...props}><path d="M12 22s7-7.58 7-13a7 7 0 10-14 0c0 5.42 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/></svg>;
		case 'clock':         return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
		case 'sliders':       return <svg {...props}><path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>;
		case 'star':          return <svg {...props}><path d="M12 3l2.7 5.5L21 9.3l-4.5 4.4 1.1 6.3L12 17l-5.6 3 1.1-6.3L3 9.3l6.3-.8L12 3z"/></svg>;
		case 'star-fill':     return <svg {...props} fill={color} stroke={color}><path d="M12 3l2.7 5.5L21 9.3l-4.5 4.4 1.1 6.3L12 17l-5.6 3 1.1-6.3L3 9.3l6.3-.8L12 3z"/></svg>;
		case 'refresh':       return <svg {...props}><path d="M3 12a9 9 0 0115-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 01-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>;
		case 'bell':          return <svg {...props}><path d="M6 8a6 6 0 0112 0c0 7 3 7 3 9H3c0-2 3-2 3-9z"/><path d="M10 21a2 2 0 004 0"/></svg>;
		case 'wave':          return <svg {...props}><path d="M2 12c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"/><path d="M2 17c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"/></svg>;
		case 'list':          return <svg {...props}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>;
		case 'map':           return <svg {...props}><path d="M9 3L3 6v15l6-3 6 3 6-3V3l-6 3-6-3z"/><path d="M9 3v15M15 6v15"/></svg>;
		default: return null;
	}
}
