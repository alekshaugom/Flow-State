import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import { useMediaQuery } from './hooks/useMediaQuery';
import { DesktopShell } from './desktop/DesktopShell';
import { MobileDashboard } from './mobile/MobileDashboard';
import { MobileDetail } from './mobile/MobileDetail';
import { AdminPage } from './admin/AdminPage';

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
				<Route path="/admin" element={<AdminPage />} />
			</Routes>
		</BrowserRouter>
	);
}
