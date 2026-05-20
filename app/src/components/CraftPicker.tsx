import { useState } from 'react';
import { CRAFTS } from '../lib/craftTypes';
import { useMyCrafts } from '../hooks/useCrafts';
import { CraftInlineCreator } from './CraftInlineCreator';
import type { UserCraftEntry } from '../types';

interface CraftPickerProps {
	selectedCraftId: string | null;
	onChange: (craft: UserCraftEntry | null) => void;
}

function craftShortLabel(craft: UserCraftEntry): string {
	const typeLabel = CRAFTS.find(c => c.id === craft.craftType)?.short || craft.craftType;
	const bits = [typeLabel];
	if (craft.craftSize) bits.push(craft.craftSize);
	return bits.join(' · ');
}

export function CraftPicker({ selectedCraftId, onChange }: CraftPickerProps) {
	const { data, isLoading } = useMyCrafts();
	const [open, setOpen] = useState(false);
	const [creating, setCreating] = useState(false);

	const crafts = data?.crafts || [];
	const active = crafts.filter(c => !c.archivedAt);
	const selected = crafts.find(c => c.id === selectedCraftId) || null;

	if (isLoading) {
		return (
			<div style={{
				padding: '10px 12px',
				borderRadius: 'var(--r-md)',
				background: 'var(--bg-sunken)',
				color: 'var(--ink-3)',
				fontSize: 12,
				fontFamily: 'var(--font-mono)',
			}}>LOADING CRAFTS</div>
		);
	}

	if (active.length === 0 && !creating) {
		return (
			<div style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				gap: 10,
				padding: '10px 12px',
				borderRadius: 'var(--r-md)',
				border: '1px dashed var(--rule)',
				background: 'var(--bg-tint)',
			}}>
				<span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
					No saved crafts yet. Save one to reuse it on every log.
				</span>
				<button
					type="button"
					onClick={() => setCreating(true)}
					style={{
						padding: '5px 12px',
						borderRadius: 'var(--r-pill)',
						border: '1px solid var(--river-700)',
						background: 'var(--river-700)',
						color: '#fff',
						fontFamily: 'var(--font-mono)',
						fontSize: 11,
						fontWeight: 600,
						letterSpacing: '0.04em',
						cursor: 'pointer',
					}}
				>+ New craft</button>
			</div>
		);
	}

	if (creating) {
		return (
			<CraftInlineCreator
				onCreated={(craft) => {
					setCreating(false);
					setOpen(false);
					onChange(craft);
				}}
				onCancel={() => setCreating(false)}
				defaultCraftType={selected?.craftType}
			/>
		);
	}

	return (
		<div style={{ position: 'relative' }}>
			<button
				type="button"
				onClick={() => setOpen(o => !o)}
				style={{
					width: '100%',
					padding: '10px 12px',
					borderRadius: 'var(--r-md)',
					border: '1px solid var(--rule)',
					background: 'var(--bg-card)',
					color: 'var(--ink-0)',
					fontSize: 13,
					fontFamily: 'inherit',
					textAlign: 'left',
					cursor: 'pointer',
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					gap: 10,
				}}
			>
				<span>
					{selected ? (
						<>
							<strong style={{ fontWeight: 600 }}>{selected.name}</strong>
							<span style={{ color: 'var(--ink-3)', marginLeft: 8, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
								{craftShortLabel(selected)}
							</span>
							{selected.isDefault && (
								<span style={{
									marginLeft: 8,
									padding: '1px 6px',
									borderRadius: 'var(--r-pill)',
									background: 'var(--river-100)',
									color: 'var(--river-800)',
									fontFamily: 'var(--font-mono)',
									fontSize: 9,
									letterSpacing: '0.06em',
									textTransform: 'uppercase',
								}}>default</span>
							)}
						</>
					) : (
						<span style={{ color: 'var(--ink-3)' }}>Pick a saved craft, or use the inline fields below</span>
					)}
				</span>
				<span style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{open ? '▲' : '▾'}</span>
			</button>

			{open && (
				<div style={{
					position: 'absolute',
					top: 'calc(100% + 4px)',
					left: 0,
					right: 0,
					zIndex: 50,
					borderRadius: 'var(--r-md)',
					border: '1px solid var(--rule)',
					background: 'var(--bg-card)',
					boxShadow: 'var(--shadow-card)',
					padding: 6,
					maxHeight: 320,
					overflowY: 'auto',
				}}>
					{active.map(c => {
						const sel = c.id === selectedCraftId;
						return (
							<button
								key={c.id}
								type="button"
								onClick={() => { onChange(c); setOpen(false); }}
								style={{
									width: '100%',
									textAlign: 'left',
									padding: '8px 10px',
									borderRadius: 'var(--r-sm)',
									background: sel ? 'var(--river-50)' : 'transparent',
									border: 'none',
									color: 'var(--ink-0)',
									fontFamily: 'inherit',
									fontSize: 13,
									cursor: 'pointer',
									display: 'flex',
									justifyContent: 'space-between',
									gap: 8,
								}}
							>
								<span>
									<strong style={{ fontWeight: 600 }}>{c.name}</strong>
									<span style={{ color: 'var(--ink-3)', marginLeft: 8, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
										{craftShortLabel(c)}
									</span>
								</span>
								{c.isDefault && (
									<span style={{ color: 'var(--river-700)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>★</span>
								)}
							</button>
						);
					})}
					<div style={{ height: 1, background: 'var(--rule)', margin: '4px 0' }} />
					<button
						type="button"
						onClick={() => { setCreating(true); setOpen(false); }}
						style={{
							width: '100%',
							textAlign: 'left',
							padding: '8px 10px',
							borderRadius: 'var(--r-sm)',
							background: 'transparent',
							border: 'none',
							color: 'var(--river-700)',
							fontFamily: 'var(--font-mono)',
							fontSize: 12,
							letterSpacing: '0.04em',
							fontWeight: 600,
							cursor: 'pointer',
						}}
					>+ New craft</button>
					{selected && (
						<button
							type="button"
							onClick={() => { onChange(null); setOpen(false); }}
							style={{
								width: '100%',
								textAlign: 'left',
								padding: '8px 10px',
								borderRadius: 'var(--r-sm)',
								background: 'transparent',
								border: 'none',
								color: 'var(--ink-3)',
								fontFamily: 'var(--font-mono)',
								fontSize: 11,
								letterSpacing: '0.04em',
								cursor: 'pointer',
							}}
						>Clear selection (type in inline fields)</button>
					)}
				</div>
			)}
		</div>
	);
}
