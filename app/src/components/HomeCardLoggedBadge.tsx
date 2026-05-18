interface HomeCardLoggedBadgeProps {
	count: number;
}

export function HomeCardLoggedBadge({ count }: HomeCardLoggedBadgeProps) {
	if (!count || count < 1) return null;
	return (
		<span style={{
			position: 'absolute',
			top: 8,
			right: 10,
			fontFamily: 'var(--font-mono)',
			fontSize: 10,
			letterSpacing: '0.08em',
			color: 'var(--ink-3)',
			textTransform: 'uppercase',
			pointerEvents: 'none',
		}}>// {count} {count === 1 ? 'TRIP' : 'TRIPS'}</span>
	);
}
