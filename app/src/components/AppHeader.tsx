import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { Icon } from './Icon';
import { api } from '../api';

function NavLink({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
	return (
		<button onClick={onClick} style={{
			padding: '8px 14px', borderRadius: 'var(--r-md)',
			color: active ? 'var(--ink-0)' : 'var(--ink-3)',
			background: active ? 'var(--bg-sunken)' : 'transparent',
			border: active ? '1px solid var(--rule)' : '1px solid transparent',
			fontSize: 13, fontWeight: 600, cursor: 'pointer',
		}}>{children}</button>
	);
}

export function AppHeader({ activePage }: { activePage: 'rivers' | 'map' | 'logs' | 'admin' | 'moderation' }) {
	const navigate = useNavigate();
	const auth = useAuth();
	const showAdmin = auth.isAuthenticated && !!auth.capabilities?.isAdmin;

	// Fetch caller's reputation tier to gate the Moderation nav link.
	// Only fires when authenticated; staleTime keeps it cheap (one fetch per minute).
	const repQuery = useQuery({
		queryKey: ['reputation', 'me'],
		queryFn: () => api.getReputation(),
		staleTime: 60_000,
		enabled: auth.isAuthenticated,
	});
	const callerTier = repQuery.data?.tier ?? 'new';
	const showModeration = auth.isAuthenticated && (
		!!auth.capabilities?.isAdmin ||
		callerTier === 'trusted' ||
		callerTier === 'moderator'
	);

	return (
		<header style={{
			height: 64, padding: '0 28px',
			borderBottom: '1px solid var(--rule)',
			background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
			WebkitBackdropFilter: 'blur(12px)',
			display: 'flex', alignItems: 'center', justifyContent: 'space-between',
			flexShrink: 0,
			position: 'sticky', top: 0, zIndex: 30,
		}}>
			<div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/')}>
					<svg width="28" height="28" viewBox="0 0 28 28" fill="none">
						<rect width="28" height="28" rx="8" fill="var(--river-700)"/>
						<path d="M5 18 C 8 14, 11 22, 14 18 S 20 14, 23 18" stroke="var(--ideal-line)" strokeWidth="2" strokeLinecap="round" fill="none"/>
						<path d="M5 13 C 8 9, 11 17, 14 13 S 20 9, 23 13" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7"/>
					</svg>
					<span style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink-0)', letterSpacing: '-0.01em' }}>
						Flow State
					</span>
				</div>
				<nav style={{ display: 'flex', gap: 4 }}>
					<NavLink active={activePage === 'rivers'} onClick={() => navigate('/')}>Rivers</NavLink>
					<NavLink active={activePage === 'map'} onClick={() => navigate('/map')}>Map</NavLink>
					{auth.isAuthenticated && (
						<NavLink active={activePage === 'logs'} onClick={() => navigate('/logs')}>Logs</NavLink>
					)}
					{showAdmin && (
						<NavLink active={activePage === 'admin'} onClick={() => navigate('/admin')}>Admin</NavLink>
					)}
					{showModeration && (
						<NavLink active={activePage === 'moderation'} onClick={() => navigate('/moderation')}>Moderation</NavLink>
					)}
				</nav>
			</div>
			<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
				{auth.isAuthenticated ? (
					<>
						<button onClick={() => navigate('/profile')} style={{
							display: 'flex', alignItems: 'center',
							padding: '8px 12px', borderRadius: 'var(--r-pill)',
							background: 'var(--bg-sunken)', border: '1px solid var(--rule)',
							fontSize: 12, fontWeight: 600, color: 'var(--ink-2)',
							fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', cursor: 'pointer',
						}}>Profile</button>
						<button onClick={auth.logout} style={{
							display: 'flex', alignItems: 'center', gap: 6,
							padding: '8px 14px', borderRadius: 'var(--r-pill)',
							background: 'var(--bg-sunken)', border: '1px solid var(--rule)',
							fontSize: 13, fontWeight: 600, color: 'var(--ink-1)', cursor: 'pointer',
						}}>
							<Icon name="user" size={14} color="var(--ink-2)" />
							{auth.user?.name?.split(' ')[0] || 'Account'}
						</button>
					</>
				) : (
					<button onClick={() => navigate('/login')} style={{
						display: 'flex', alignItems: 'center', gap: 6,
						padding: '8px 14px', borderRadius: 'var(--r-pill)',
						background: 'var(--river-700)', color: 'white',
						fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
					}}>
						<Icon name="user" size={14} color="white" />
						Sign in
					</button>
				)}
			</div>
		</header>
	);
}
