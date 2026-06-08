import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import 'maplibre-gl/dist/maplibre-gl.css';
import { App } from './App';
import { AuthProvider } from './hooks/useAuth';
import { PreferencesProvider } from './hooks/usePreferences';
import './tokens.css';
import './global.css';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: { staleTime: 5 * 60_000, retry: 2 },
	},
});

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<PreferencesProvider>
				<AuthProvider>
					<App />
				</AuthProvider>
			</PreferencesProvider>
		</QueryClientProvider>
	</StrictMode>
);
