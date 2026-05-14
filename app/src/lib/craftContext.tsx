import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import {
	readStoredCraft, readStoredSkill,
	writeStoredCraft, writeStoredSkill,
	type CraftType, type SkillLevel,
} from './craftTypes';

interface CraftContextValue {
	craft: CraftType;
	skill: SkillLevel;
	setCraft: (c: CraftType) => void;
	setSkill: (s: SkillLevel) => void;
}

const CraftContext = createContext<CraftContextValue | null>(null);

export function CraftProvider({ children }: { children: ReactNode }) {
	const [craft, setCraftState] = useState<CraftType>(() => readStoredCraft());
	const [skill, setSkillState] = useState<SkillLevel>(() => readStoredSkill());

	const setCraft = useCallback((c: CraftType) => {
		setCraftState(c);
		writeStoredCraft(c);
	}, []);
	const setSkill = useCallback((s: SkillLevel) => {
		setSkillState(s);
		writeStoredSkill(s);
	}, []);

	return (
		<CraftContext.Provider value={{ craft, skill, setCraft, setSkill }}>
			{children}
		</CraftContext.Provider>
	);
}

export function useCraftSkill(): CraftContextValue {
	const ctx = useContext(CraftContext);
	if (!ctx) throw new Error('useCraftSkill must be used within CraftProvider');
	return ctx;
}
