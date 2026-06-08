import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { RiverMap } from '../components/RiverMap';
import { AppHeader } from '../components/AppHeader';
import { Icon } from '../components/Icon';

export function MapPage() {
	const navigate = useNavigate();
	const isDesktop = useMediaQuery('(min-width: 768px)');
	const headerH = isDesktop ? 64 : 52;

	return (
		<div style={{ fontFamily: 'var(--font-sans)', background: 'var(--bg-app)' }}>
			{isDesktop ? (
				<div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1100 }}>
					<AppHeader activePage="map" />
				</div>
			) : (
				<header style={{
					height: headerH, padding: '0 16px',
					borderBottom: '1px solid var(--rule)',
					background: 'var(--rail-surface-bg)', backdropFilter: 'blur(12px)',
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
