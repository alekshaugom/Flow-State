import { useState } from 'react';
import { CRAFTS, type CraftType } from '../lib/craftTypes';
import { useCraftMutations } from '../hooks/useCrafts';
import type { UserCraftEntry } from '../types';

interface CraftInlineCreatorProps {
	onCreated: (craft: UserCraftEntry) => void;
	onCancel: () => void;
	defaultCraftType?: CraftType | string;
}

const labelStyle: React.CSSProperties = {
	fontFamily: 'var(--font-mono)',
	fontSize: 10,
	letterSpacing: '0.10em',
	textTransform: 'uppercase',
	color: 'var(--ink-3)',
	fontWeight: 500,
	marginBottom: 4,
	display: 'block',
};

const inputStyle: React.CSSProperties = {
	width: '100%',
	padding: '8px 10px',
	borderRadius: 'var(--r-md)',
	border: '1px solid var(--rule)',
	background: 'var(--bg-card)',
	color: 'var(--ink-0)',
	fontSize: 13,
	fontFamily: 'inherit',
	boxSizing: 'border-box',
};

export function CraftInlineCreator({ onCreated, onCancel, defaultCraftType = 'raft' }: CraftInlineCreatorProps) {
	const [name, setName] = useState('');
	const [craftType, setCraftType] = useState<string>(defaultCraftType);
	const [craftSize, setCraftSize] = useState('');
	const [notes, setNotes] = useState('');
	const [error, setError] = useState<string | null>(null);
	const { create } = useCraftMutations();

	const onSave = async (e: React.FormEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setError(null);
		if (!name.trim()) { setError('Name is required'); return; }
		try {
			const craft = await create.mutateAsync({
				name: name.trim(),
				craftType,
				craftSize: craftSize.trim() || null,
				notes: notes.trim() || null,
			});
			onCreated(craft);
		} catch (err: any) {
			setError(err?.message || 'Failed to save craft');
		}
	};

	const stopBubble = (e: React.SyntheticEvent) => e.stopPropagation();

	return (
		<div
			onClick={stopBubble}
			onChange={stopBubble}
			style={{
				border: '1px solid var(--river-200)',
				background: 'var(--river-50)',
				borderRadius: 'var(--r-md)',
				padding: '12px 14px',
				display: 'flex',
				flexDirection: 'column',
				gap: 10,
			}}
		>
			<div style={{
				fontFamily: 'var(--font-mono)',
				fontSize: 10,
				letterSpacing: '0.10em',
				textTransform: 'uppercase',
				color: 'var(--river-800)',
			}}>NEW CRAFT</div>

			<div>
				<label style={labelStyle} htmlFor="new-craft-name">Name</label>
				<input
					id="new-craft-name"
					style={inputStyle}
					placeholder='e.g. "Slipper Pickle"'
					value={name}
					onChange={e => setName(e.target.value)}
					autoFocus
				/>
			</div>

			<div>
				<label style={labelStyle}>Type</label>
				<div role="radiogroup" style={{
					display: 'inline-flex',
					gap: 2,
					padding: 3,
					background: 'var(--bg-sunken)',
					borderRadius: 'var(--r-pill)',
					width: '100%',
				}}>
					{CRAFTS.map(c => {
						const sel = craftType === c.id;
						return (
							<button
								key={c.id}
								type="button"
								role="radio"
								aria-checked={sel}
								onClick={() => setCraftType(c.id)}
								style={{
									flex: 1,
									padding: '6px 8px',
									borderRadius: 'var(--r-pill)',
									background: sel ? 'var(--bg-card)' : 'transparent',
									color: sel ? 'var(--ink-0)' : 'var(--ink-3)',
									border: sel ? '1px solid var(--rule)' : '1px solid transparent',
									fontSize: 11,
									fontWeight: sel ? 600 : 500,
									cursor: 'pointer',
								}}
							>{c.short}</button>
						);
					})}
				</div>
			</div>

			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
				<div>
					<label style={labelStyle} htmlFor="new-craft-size">Size</label>
					<input
						id="new-craft-size"
						style={inputStyle}
						placeholder='e.g. "14 ft"'
						value={craftSize}
						onChange={e => setCraftSize(e.target.value)}
					/>
				</div>
				<div>
					<label style={labelStyle} htmlFor="new-craft-notes">Notes (opt.)</label>
					<input
						id="new-craft-notes"
						style={inputStyle}
						placeholder="stiff floor, 18ft frame…"
						value={notes}
						onChange={e => setNotes(e.target.value)}
					/>
				</div>
			</div>

			{error && (
				<div style={{
					padding: '6px 10px',
					borderRadius: 'var(--r-md)',
					background: '#fdecea',
					color: '#a02323',
					fontSize: 12,
				}}>{error}</div>
			)}

			<div style={{ display: 'flex', gap: 8 }}>
				<button
					type="button"
					onClick={onSave}
					disabled={create.isPending}
					style={{
						padding: '8px 14px',
						borderRadius: 'var(--r-md)',
						border: '1px solid var(--river-700)',
						background: 'var(--river-700)',
						color: '#fff',
						fontSize: 12,
						fontWeight: 600,
						cursor: create.isPending ? 'wait' : 'pointer',
						opacity: create.isPending ? 0.6 : 1,
					}}
				>Save craft</button>
				<button
					type="button"
					onClick={onCancel}
					style={{
						padding: '8px 12px',
						borderRadius: 'var(--r-md)',
						border: '1px solid var(--rule)',
						background: 'var(--bg-card)',
						color: 'var(--ink-2)',
						fontSize: 12,
						cursor: 'pointer',
					}}
				>Cancel</button>
			</div>
		</div>
	);
}
