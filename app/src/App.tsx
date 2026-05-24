import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import { useMediaQuery } from './hooks/useMediaQuery';
import { DesktopShell } from './desktop/DesktopShell';
import { MobileDashboard } from './mobile/MobileDashboard';
import { MobileDetail } from './mobile/MobileDetail';

const MapPage = lazy(() => import('./pages/MapPage').then(m => ({ default: m.MapPage })));
const AdminPage = lazy(() => import('./admin/AdminPage').then(m => ({ default: m.AdminPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const AccountSetupPage = lazy(() => import('./pages/AccountSetupPage').then(m => ({ default: m.AccountSetupPage })));
const WatershedPage = lazy(() => import('./pages/WatershedPage').then(m => ({ default: m.WatershedPage })));
const CorridorPage = lazy(() => import('./pages/CorridorPage').then(m => ({ default: m.CorridorPage })));
const LogTripPage = lazy(() => import('./pages/LogTripPage').then(m => ({ default: m.LogTripPage })));
const EditLogPage = lazy(() => import('./pages/EditLogPage').then(m => ({ default: m.EditLogPage })));
const SectionLogsPage = lazy(() => import('./pages/SectionLogsPage').then(m => ({ default: m.SectionLogsPage })));
const ProfileSetupPage = lazy(() => import('./pages/ProfileSetupPage').then(m => ({ default: m.ProfileSetupPage })));
const MyLogsPage = lazy(() => import('./pages/MyLogsPage').then(m => ({ default: m.MyLogsPage })));
const CraftsPage = lazy(() => import('./pages/CraftsPage').then(m => ({ default: m.CraftsPage })));
const AcceptInvitePage = lazy(() => import('./pages/AcceptInvitePage').then(m => ({ default: m.AcceptInvitePage })));
const WorldRiverPage = lazy(() => import('./pages/WorldRiverPage').then(m => ({ default: m.WorldRiverPage })));

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
				<Route path="/section/:sectionId/logs" element={<Suspense><SectionLogsPage /></Suspense>} />
				<Route path="/logs" element={<Suspense><MyLogsPage /></Suspense>} />
				<Route path="/logs/crafts" element={<Suspense><CraftsPage /></Suspense>} />
				<Route path="/log/new" element={<Suspense><LogTripPage /></Suspense>} />
				<Route path="/log/:id/edit" element={<Suspense><EditLogPage /></Suspense>} />
				<Route path="/profile" element={<Suspense><ProfileSetupPage /></Suspense>} />
				<Route path="/watershed/:watershedSlug" element={<Suspense><WatershedPage /></Suspense>} />
				<Route path="/corridor/:corridorSlug" element={<Suspense><CorridorPage /></Suspense>} />
				<Route path="/login" element={<Suspense><LoginPage /></Suspense>} />
				<Route path="/login/setup" element={<Suspense><AccountSetupPage /></Suspense>} />
				<Route path="/share/:token" element={<Suspense><AcceptInvitePage /></Suspense>} />
				<Route path="/map" element={<Suspense><MapPage /></Suspense>} />
				<Route path="/river/:slug" element={<Suspense><WorldRiverPage /></Suspense>} />
				<Route path="/admin" element={<Suspense><AdminPage /></Suspense>} />
			</Routes>
		</BrowserRouter>
	);
}
