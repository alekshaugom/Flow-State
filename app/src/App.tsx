import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RiversHome } from './screens/RiversHome';
import { TripsStub } from './screens/TripsStub';
import { Section } from './screens/Section';
import { SectionRedirect } from './pages/SectionRedirect';

const MapPage          = lazy(() => import('./pages/MapPage').then(m => ({ default: m.MapPage })));
const AdminPage        = lazy(() => import('./admin/AdminPage').then(m => ({ default: m.AdminPage })));
const LoginPage        = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const AccountSetupPage = lazy(() => import('./pages/AccountSetupPage').then(m => ({ default: m.AccountSetupPage })));
const WatershedPage    = lazy(() => import('./pages/WatershedPage').then(m => ({ default: m.WatershedPage })));
const CorridorPage     = lazy(() => import('./pages/CorridorPage').then(m => ({ default: m.CorridorPage })));
const LogTripPage      = lazy(() => import('./pages/LogTripPage').then(m => ({ default: m.LogTripPage })));
const EditLogPage      = lazy(() => import('./pages/EditLogPage').then(m => ({ default: m.EditLogPage })));
const SectionLogsPage  = lazy(() => import('./pages/SectionLogsPage').then(m => ({ default: m.SectionLogsPage })));
const ProfileSetupPage = lazy(() => import('./pages/ProfileSetupPage').then(m => ({ default: m.ProfileSetupPage })));
const MyLogsPage       = lazy(() => import('./pages/MyLogsPage').then(m => ({ default: m.MyLogsPage })));
const CraftsPage       = lazy(() => import('./pages/CraftsPage').then(m => ({ default: m.CraftsPage })));
const AcceptInvitePage = lazy(() => import('./pages/AcceptInvitePage').then(m => ({ default: m.AcceptInvitePage })));
const WorldRiverPage   = lazy(() => import('./pages/WorldRiverPage').then(m => ({ default: m.WorldRiverPage })));
const ModerationQueuePage = lazy(() => import('./pages/ModerationQueuePage').then(m => ({ default: m.ModerationQueuePage })));

export function App() {
	return (
		<BrowserRouter>
			<Routes>
				{/* ── New IA routes ── */}
				<Route index element={<RiversHome />} />
				<Route path="/trips" element={<TripsStub />} />

				{/* ── Existing routes (unchanged, point at existing pages) ── */}
				<Route path="/corridor/:corridorSlug" element={<Suspense><CorridorPage /></Suspense>} />
				<Route path="/section/:sectionId"     element={<Section />} />

				<Route path="/log"         element={<Suspense><MyLogsPage /></Suspense>} />
				<Route path="/profile"     element={<Suspense><ProfileSetupPage /></Suspense>} />

				{/* Legacy / secondary routes — kept intact */}
				<Route path="/section/:sectionId/logs" element={<Suspense><SectionLogsPage /></Suspense>} />
				<Route path="/logs"                    element={<Suspense><MyLogsPage /></Suspense>} />
				<Route path="/logs/crafts"             element={<Suspense><CraftsPage /></Suspense>} />
				<Route path="/log/new"                 element={<Suspense><LogTripPage /></Suspense>} />
				<Route path="/log/:id/edit"            element={<Suspense><EditLogPage /></Suspense>} />
				<Route path="/watershed/:watershedSlug" element={<Suspense><WatershedPage /></Suspense>} />
				<Route path="/login"                   element={<Suspense><LoginPage /></Suspense>} />
				<Route path="/login/setup"             element={<Suspense><AccountSetupPage /></Suspense>} />
				<Route path="/share/:token"            element={<Suspense><AcceptInvitePage /></Suspense>} />
				<Route path="/map"                     element={<Suspense><MapPage /></Suspense>} />
				<Route path="/river/:slug"             element={<Suspense><WorldRiverPage /></Suspense>} />
				<Route path="/admin"                   element={<Suspense><AdminPage /></Suspense>} />
				<Route path="/moderation"              element={<Suspense><ModerationQueuePage /></Suspense>} />
			</Routes>
		</BrowserRouter>
	);
}
