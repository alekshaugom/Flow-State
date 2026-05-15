import { Link } from 'react-router-dom';

export interface BreadcrumbSegment {
	slug: string;
	name: string;
	href: string;
}

interface BreadcrumbProps {
	segments: BreadcrumbSegment[];
}

const wrap: React.CSSProperties = {
	display: 'flex',
	alignItems: 'center',
	flexWrap: 'wrap',
	gap: 4,
	fontFamily: 'var(--font-mono)',
	fontSize: 11,
	letterSpacing: '0.04em',
	color: 'var(--ink-3)',
};

const sep: React.CSSProperties = {
	color: 'var(--ink-4)',
	padding: '0 2px',
	userSelect: 'none',
};

const linkStyle: React.CSSProperties = {
	color: 'var(--ink-3)',
	textDecoration: 'none',
};

const currentStyle: React.CSSProperties = {
	color: 'var(--ink-1)',
	fontWeight: 600,
};

export function Breadcrumb({ segments }: BreadcrumbProps) {
	if (!segments || segments.length === 0) return null;
	return (
		<nav aria-label="Breadcrumb" style={wrap}>
			{segments.map((seg, i) => {
				const isLast = i === segments.length - 1;
				return (
					<span key={seg.slug + i} style={{ display: 'inline-flex', alignItems: 'center' }}>
						{i > 0 && <span style={sep}> / </span>}
						{isLast ? (
							<span style={currentStyle} aria-current="page">{seg.name}</span>
						) : (
							<Link to={seg.href} style={linkStyle}>{seg.name}</Link>
						)}
					</span>
				);
			})}
		</nav>
	);
}
