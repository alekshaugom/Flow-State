import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import { useMediaQuery } from './hooks/useMediaQuery';
import { DesktopShell } from './desktop/DesktopShell';
import { MobileDashboard } from './mobile/MobileDashboard';
import { MobileDetail } from './mobile/MobileDetail';

const MapPage = lazy(() => import('./pages/MapPage').then(m => ({ default: m.MapPage })));
const AdminPage = lazy(() => import('./admin/AdminPage').then(m => ({ default: m.AdminPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));

function ResponsiveHome() {
	const isDesktop = useMediaQuery('(min-width: 768px)');
	return isDesktop ? <DesktopShell /> : <MobileDashboard />;
}

function ResponsiveSection() {
	const { sectionId } = useParams<{ sectionId: string }>();
	const isDesktop = useMediaQuery('(min-width: 768px)');
	if (isDesktop) return <DesktopShell />;
	return sectionId ? <MobileDetail sectionId={sectionId} /> : <MobileDashboard />;
}

export function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route index element={<ResponsiveHome />} />
				<Route path="/section/:sectionId" element={<ResponsiveSection />} />
				<Route path="/login" element={<Suspense><LoginPage /></Suspense>} />
				<Route path="/map" element={<Suspense><MapPage /></Suspense>} />
				<Route path="/admin" element={<Suspense><AdminPage /></Suspense>} />
			</Routes>
		</BrowserRouter>
	);
}
