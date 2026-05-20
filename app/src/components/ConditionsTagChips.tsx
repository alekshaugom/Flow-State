import { useState } from 'react';

export const CURATED_CONDITION_TAGS = [
	'tons-of-rock',
	'frequent-highsides',
	'precision-oar-required',
	'advanced-maneuvers',
	'mellow-float',
	'cold-water',
	'crowded',
	'pristine',
	'wind',
	'swam',
] as const;

interface ConditionsTagChipsProps {
	value: string[];
	onChange: (tags: string[]) => void;
}

export function ConditionsTagChips({ value, onChange }: ConditionsTagChipsProps) {
	const [customInput, setCustomInput] = useState('');
	const selectedSet = new Set(value);
	const customs = value.filter(t => !(CURATED_CONDITION_TAGS as readonly string[]).includes(t));

	const toggle = (tag: string) => {
		if (selectedSet.has(tag)) onChange(value.filter(t => t !== tag));
		else onChange([...value, tag]);
	};

	const addCustom = () => {
		const t = customInput.trim().toLowerCase().replace(/\s+/g, '-');
		if (!t) return;
		if (selectedSet.has(t)) return setCustomInput('');
		onChange([...value, t]);
		setCustomInput('');
	};

	return (
		<fieldset style={{
			border: '1px solid var(--rule)',
			borderRadius: 'var(--r-lg)',
			padding: '14px 16px 16px',
			margin: 0,
			display: 'flex', flexDirection: 'column', gap: 12,
			background: 'var(--bg-card)',
		}}>
			<legend style={{
				fontFamily: 'var(--font-mono)',
				fontSize: 10,
				letterSpacing: '0.12em',
				textTransform: 'uppercase',
				color: 'var(--ink-3)',
				padding: '0 6px',
			}}>CONDITIONS</legend>

			<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
				{CURATED_CONDITION_TAGS.map(tag => {
					const sel = selectedSet.has(tag);
					return <Chip key={tag} label={tag} selected={sel} onClick={() => toggle(tag)} />;
				})}
				{customs.map(tag => (
					<Chip key={tag} label={tag} selected={true} onClick={() => toggle(tag)} />
				))}
			</div>

			<div style={{ display: 'flex', gap: 6 }}>
				<input
					placeholder='Add your own tag (e.g. "fish-eye-creek")'
					value={customInput}
					onChange={e => setCustomInput(e.target.value)}
					onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
					style={{
						flex: 1,
						padding: '8px 12px',
						borderRadius: 'var(--r-md)',
						border: '1px solid var(--rule)',
						background: 'var(--bg-card)',
						color: 'var(--ink-0)',
						fontSize: 13,
						fontFamily: 'inherit',
					}}
				/>
				<button
					type="button"
					onClick={addCustom}
					disabled={!customInput.trim()}
					style={{
						padding: '8px 14px',
						borderRadius: 'var(--r-md)',
						border: '1px solid var(--rule)',
						background: 'var(--bg-raised)',
						color: 'var(--ink-0)',
						cursor: customInput.trim() ? 'pointer' : 'not-allowed',
						opacity: customInput.trim() ? 1 : 0.5,
						fontSize: 13,
						fontWeight: 600,
					}}
				>+ Add</button>
			</div>
		</fieldset>
	);
}

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={selected}
			style={{
				padding: '5px 10px',
				borderRadius: 'var(--r-pill)',
				border: selected ? '1px solid var(--river-700)' : '1px solid var(--rule)',
				background: selected ? 'var(--river-100)' : 'var(--bg-sunken)',
				color: selected ? 'var(--river-800)' : 'var(--ink-2)',
				fontFamily: 'var(--font-mono)',
				fontSize: 11,
				cursor: 'pointer',
				whiteSpace: 'nowrap',
			}}
		>{label}</button>
	);
}

export function parseConditionTags(json: string | null | undefined): string[] {
	if (!json) return [];
	try {
		const parsed = JSON.parse(json);
		if (Array.isArray(parsed)) return parsed.filter(t => typeof t === 'string');
	} catch {}
	return [];
}

export function stringifyConditionTags(tags: string[]): string | null {
	if (!tags.length) return null;
	return JSON.stringify(tags);
}
