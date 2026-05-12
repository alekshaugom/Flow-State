interface SectionHeadProps {
	title: string;
	eyebrow: string;
}

export function SectionHead({ title, eyebrow }: SectionHeadProps) {
	return (
		<div style={{ marginBottom: 10 }}>
			<div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--river-600)', fontWeight: 500 }}>
				<span style={{ color: 'var(--ink-4)' }}>{'// '}</span>{eyebrow}
			</div>
			<h2 style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 700, color: 'var(--ink-0)', letterSpacing: '-0.01em' }}>
				{title}
			</h2>
		</div>
	);
}
