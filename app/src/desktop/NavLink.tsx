interface NavLinkProps {
	children: React.ReactNode;
	active?: boolean;
	onClick?: () => void;
}

export function NavLink({ children, active, onClick }: NavLinkProps) {
	return (
		<button onClick={onClick} style={{
			padding: '8px 14px', borderRadius: 'var(--r-md)',
			color: active ? 'var(--ink-0)' : 'var(--ink-3)',
			background: active ? 'var(--bg-sunken)' : 'transparent',
			fontSize: 13, fontWeight: 600,
		}}>{children}</button>
	);
}
