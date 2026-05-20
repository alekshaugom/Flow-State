interface EyebrowProps {
	children: React.ReactNode;
	color?: string;
}

export function Eyebrow({ children, color }: EyebrowProps) {
	return (
		<div style={{
			fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em',
			textTransform: 'uppercase', color: color || 'var(--river-600)',
			fontWeight: 500,
		}}>
			{children}
		</div>
	);
}
