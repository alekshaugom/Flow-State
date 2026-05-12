import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { RiverMap } from '../components/RiverMap';
import { NavLink } from '../desktop/NavLink';
import { Icon } from '../components/Icon';

export function MapPage() {
	const navigate = useNavigate();
	const isDesktop = useMediaQuery('(min-width: 768px)');
	const headerH = isDesktop ? 64 : 52;

	return (
		<div style={{ fontFamily: 'var(--font-sans)', background: 'var(--bg-app)' }}>
			{/* Header */}
			{isDesktop ? (
				<header style={{
					height: headerH, padding: '0 28px',
					borderBottom: '1px solid var(--rule)',
					background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
					display: 'flex', alignItems: 'center', justifyContent: 'space-between',
					position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1100,
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
							<NavLink onClick={() => navigate('/')}>Rivers</NavLink>
							<NavLink active>Map</NavLink>
							<NavLink onClick={() => navigate('/admin')}>Admin</NavLink>
						</nav>
					</div>
				</header>
			) : (
				<header style={{
					height: headerH, padding: '0 16px',
					borderBottom: '1px solid var(--rule)',
					background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
					display: 'flex', alignItems: 'center', gap: 12,
					position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1100,
				}}>
					<button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--river-600)', fontSize: 15, fontWeight: 600 }}>
						<Icon name="chevron-left" size={18} color="var(--river-600)" />
						Rivers
					</button>
					<span style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 700, color: 'var(--ink-0)' }}>Map</span>
					<div style={{ width: 60 }} />
				</header>
			)}

			{/* Map with explicit viewport dimensions */}
			<RiverMap style={{
				position: 'fixed',
				top: headerH,
				left: 0,
				width: '100vw',
				height: `calc(100vh - ${headerH}px)`,
			}} />
		</div>
	);
}
