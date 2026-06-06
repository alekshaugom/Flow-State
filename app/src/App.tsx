import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RiversHome } from './screens/RiversHome';
import { Trips, TripDetailScreen } from './screens/Trips';
import { Log } from './screens/Log';
import { Profile } from './screens/Profile';
import { Section } from './screens/Section';
import { Admin } from './screens/Admin';

const MapPage          = lazy(() => import('./pages/MapPage').then(m => ({ default: m.MapPage })));
const LoginPage        = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const AccountSetupPage = lazy(() => import('./pages/AccountSetupPage').then(m => ({ default: m.AccountSetupPage })));
const CorridorPage     = lazy(() => import('./pages/CorridorPage').then(m => ({ default: m.CorridorPage })));

export function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route index element={<RiversHome />} />
				<Route path="/trips" element={<Trips />} />
				<Route path="/trips/:outfitterId" element={<TripDetailScreen />} />
				<Route path="/log" element={<Log />} />
				<Route path="/profile" element={<Profile />} />
				<Route path="/corridor/:corridorSlug" element={<Suspense><CorridorPage /></Suspense>} />
				<Route path="/section/:sectionId"     element={<Section />} />
				<Route path="/login"                   element={<Suspense><LoginPage /></Suspense>} />
				<Route path="/login/setup"             element={<Suspense><AccountSetupPage /></Suspense>} />
				<Route path="/map"                     element={<Suspense><MapPage /></Suspense>} />
				<Route path="/admin"                   element={<Admin />} />
			</Routes>
		</BrowserRouter>
	);
}
