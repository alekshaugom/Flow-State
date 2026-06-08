import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export type FlowUnit = 'cfs' | 'cms';
export type TempUnit = 'F' | 'C';
export type LengthUnit = 'mi' | 'km';
export type Appearance = 'light' | 'dark';

export interface Preferences {
	units: { flow: FlowUnit; temp: TempUnit; length: LengthUnit };
	appearance: Appearance;
	alerts: { flowChanges: boolean; weeklyDigest: boolean; tripReminders: boolean };
	privacy: { publicLogs: boolean; showInLeaderboards: boolean };
}

const DEFAULTS: Preferences = {
	units: { flow: 'cfs', temp: 'F', length: 'mi' },
	appearance: 'light',
	alerts: { flowChanges: true, weeklyDigest: false, tripReminders: true },
	privacy: { publicLogs: false, showInLeaderboards: true },
};

const STORAGE_KEY = 'flow-state-prefs';

function load(): Preferences {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return DEFAULTS;
		const p = JSON.parse(raw);
		return {
			units: { ...DEFAULTS.units, ...(p.units ?? {}) },
			appearance: p.appearance === 'dark' ? 'dark' : 'light',
			alerts: { ...DEFAULTS.alerts, ...(p.alerts ?? {}) },
			privacy: { ...DEFAULTS.privacy, ...(p.privacy ?? {}) },
		};
	} catch {
		return DEFAULTS;
	}
}

interface PrefsContextValue extends Preferences {
	setUnit: <K extends keyof Preferences['units']>(k: K, v: Preferences['units'][K]) => void;
	setAppearance: (v: Appearance) => void;
	setAlert: (k: keyof Preferences['alerts'], v: boolean) => void;
	setPrivacy: (k: keyof Preferences['privacy'], v: boolean) => void;
}

const Ctx = createContext<PrefsContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
	const [prefs, setPrefs] = useState<Preferences>(load);

	useEffect(() => {
		try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
	}, [prefs]);

	useEffect(() => {
		document.documentElement.dataset.theme = prefs.appearance;
	}, [prefs.appearance]);

	const setUnit = useCallback(<K extends keyof Preferences['units']>(k: K, v: Preferences['units'][K]) =>
		setPrefs(p => ({ ...p, units: { ...p.units, [k]: v } })), []);
	const setAppearance = useCallback((v: Appearance) => setPrefs(p => ({ ...p, appearance: v })), []);
	const setAlert = useCallback((k: keyof Preferences['alerts'], v: boolean) =>
		setPrefs(p => ({ ...p, alerts: { ...p.alerts, [k]: v } })), []);
	const setPrivacy = useCallback((k: keyof Preferences['privacy'], v: boolean) =>
		setPrefs(p => ({ ...p, privacy: { ...p.privacy, [k]: v } })), []);

	return (
		<Ctx.Provider value={{ ...prefs, setUnit, setAppearance, setAlert, setPrivacy }}>
			{children}
		</Ctx.Provider>
	);
}

export function usePreferences(): PrefsContextValue {
	const c = useContext(Ctx);
	if (!c) throw new Error('usePreferences must be used within PreferencesProvider');
	return c;
}
