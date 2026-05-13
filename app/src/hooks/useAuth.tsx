import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

const DEV_BYPASS_KEY = 'flow-state-dev-bypass';

interface AuthUser {
	id: string;
	email: string;
	name: string;
	avatarUrl: string | null;
	status: 'waitlist' | 'approved' | 'denied';
	createdAt: string;
}

interface AuthState {
	isLoading: boolean;
	isAuthenticated: boolean;
	user: AuthUser | null;
	isApproved: boolean;
	isWaitlisted: boolean;
	isDev: boolean;
	login: () => void;
	logout: () => void;
	devBypass: () => void;
}

const DEV_USER: AuthUser = {
	id: 'dev_local',
	email: 'dev@localhost',
	name: 'Dev User',
	avatarUrl: null,
	status: 'approved',
	createdAt: new Date().toISOString(),
};

const AuthContext = createContext<AuthState | null>(null);

function hasDevBypass(): boolean {
	return import.meta.env.DEV && localStorage.getItem(DEV_BYPASS_KEY) === 'true';
}

export function AuthProvider({ children }: { children: ReactNode }) {
	const qc = useQueryClient();
	const [devActive, setDevActive] = useState(hasDevBypass);

	const { data, isLoading } = useQuery({
		queryKey: ['me'],
		queryFn: api.me,
		staleTime: 60_000,
		retry: false,
		enabled: !devActive,
	});

	const user = devActive ? DEV_USER : (data?.user ?? null);
	const authenticated = devActive ? true : (data?.authenticated ?? false);

	const devBypass = useCallback(() => {
		localStorage.setItem(DEV_BYPASS_KEY, 'true');
		setDevActive(true);
	}, []);

	const state: AuthState = {
		isLoading: devActive ? false : isLoading,
		isAuthenticated: authenticated,
		user,
		isApproved: user?.status === 'approved',
		isWaitlisted: user?.status === 'waitlist',
		isDev: import.meta.env.DEV,
		login: () => {
			window.location.href = '/oauth/google/login';
		},
		logout: () => {
			if (devActive) {
				localStorage.removeItem(DEV_BYPASS_KEY);
				setDevActive(false);
				return;
			}
			fetch('/oauth/google/logout', { method: 'POST' }).then(() => {
				qc.invalidateQueries({ queryKey: ['me'] });
				window.location.href = '/';
			});
		},
		devBypass,
	};

	return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error('useAuth must be used within AuthProvider');
	return ctx;
}
