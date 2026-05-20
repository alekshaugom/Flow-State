import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useMyCrafts, useCraftMutations } from '../hooks/useCrafts';
import { AppHeader } from '../components/AppHeader';
import { CraftInlineCreator } from '../components/CraftInlineCreator';
import { Icon } from '../components/Icon';
import { CRAFTS } from '../lib/craftTypes';
import type { UserCraftEntry } from '../types';

const eyebrowStyle: React.CSSProperties = {
	fontFamily: 'var(--font-mono)',
	fontSize: 11,
	letterSpacing: '0.12em',
	textTransform: 'uppercase',
	color: 'var(--ink-3)',
};

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

function craftTypeLabel(id: string | null | undefined): string {
	const match = CRAFTS.find(c => c.id === id);
	return match ? match.short : (id || '—');
}

export function CraftsPage() {
	const { isAuthenticated, isLoading: authLoading } = useAuth();
	const navigate = useNavigate();
	const isDesktop = useMediaQuery('(min-width: 768px)');
	const { data, isLoading } = useMyCrafts();
	const [creating, setCreating] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);

	useEffect(() => {
		if (!authLoading && !isAuthenticated) navigate('/login', { replace: true });
	}, [authLoading, isAuthenticated, navigate]);

	if (!isAuthenticated) return null;

	const crafts = data?.crafts || [];
	const active = crafts.filter(c => !c.archivedAt);
	const archived = crafts.filter(c => c.archivedAt);

	const renderChrome = (children: React.ReactNode) => (
		<div style={{ fontFamily: 'var(--font-sans)', background: 'var(--bg-app)', minHeight: '100vh' }}>
			{isDesktop ? (
				<AppHeader activePage="logs" />
			) : (
				<header style={{
					height: 52, padding: '0 16px',
					borderBottom: '1px solid var(--rule)',
					background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
					display: 'flex', alignItems: 'center', gap: 12,
					position: 'sticky', top: 0, zIndex: 10,
				}}>
					<button onClick={() => navigate('/logs')} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--river-600)', fontSize: 15, fontWeight: 600, background: 'none', border: 'none', padding: 0 }}>
						<Icon name="chevron-left" size={18} color="var(--river-600)" />
						Logs
					</button>
					<span style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 700, color: 'var(--ink-0)' }}>Crafts</span>
					<span style={{ width: 60 }} />
				</header>
			)}
			<div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 80px' }}>
				{children}
			</div>
		</div>
	);

	return renderChrome(
		<>
			<div style={{ marginBottom: 14 }}>
				<div style={eyebrowStyle}>YOUR CRAFTS</div>
				<h1 style={{ margin: '4px 0 6px', fontSize: 22, fontWeight: 700, color: 'var(--ink-0)' }}>
					The boats you boat with
				</h1>
				<p style={{ color: 'var(--ink-3)', fontSize: 13, margin: 0 }}>
					Save a craft once, then pick it from a list on every log. Old logs keep their original name even if you rename or archive a craft later.
				</p>
			</div>

			{isLoading ? (
				<div style={{ color: 'var(--ink-3)' }}>Loading…</div>
			) : (
				<>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
						{active.length === 0 && !creating && (
							<div style={{
								padding: '18px 16px',
								borderRadius: 'var(--r-lg)',
								border: '1px dashed var(--rule)',
								background: 'var(--bg-tint)',
								color: 'var(--ink-3)',
								fontSize: 13,
							}}>No crafts yet. Add your first boat below.</div>
						)}
						{active.map(craft => (
							<CraftRow
								key={craft.id}
								craft={craft}
								editing={editingId === craft.id}
								onEdit={() => setEditingId(craft.id)}
								onCancelEdit={() => setEditingId(null)}
							/>
						))}
					</div>

					{!creating ? (
						<button
							type="button"
							onClick={() => setCreating(true)}
							style={{
								marginTop: 16,
								padding: '10px 16px',
								borderRadius: 'var(--r-md)',
								border: '1px solid var(--river-700)',
								background: 'var(--river-700)',
								color: '#fff',
								fontSize: 13,
								fontWeight: 600,
								cursor: 'pointer',
							}}
						>+ Add a craft</button>
					) : (
						<div style={{ marginTop: 16 }}>
							<CraftInlineCreator
								onCreated={() => setCreating(false)}
								onCancel={() => setCreating(false)}
							/>
						</div>
					)}

					{archived.length > 0 && (
						<div style={{ marginTop: 28 }}>
							<div style={{ ...eyebrowStyle, marginBottom: 8 }}>ARCHIVED · {archived.length}</div>
							<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
								{archived.map(craft => (
									<div key={craft.id} style={{
										padding: '10px 14px',
										borderRadius: 'var(--r-md)',
										border: '1px dashed var(--rule)',
										color: 'var(--ink-3)',
										fontSize: 13,
										display: 'flex',
										justifyContent: 'space-between',
										alignItems: 'center',
										gap: 10,
									}}>
										<span>
											<strong style={{ fontWeight: 600, color: 'var(--ink-2)' }}>{craft.name}</strong>
											<span style={{ marginLeft: 8, fontFamily: 'var(--font-mono)', fontSize: 11 }}>{craftTypeLabel(craft.craftType)}{craft.craftSize ? ` · ${craft.craftSize}` : ''}</span>
										</span>
										<span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>archived {craft.archivedAt?.slice(0, 10)}</span>
									</div>
								))}
							</div>
							<div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 8 }}>
								Archived crafts no longer show in the picker, but logs that reference them still display their original name.
							</div>
						</div>
					)}

					<div style={{ marginTop: 24, fontSize: 12, color: 'var(--ink-3)' }}>
						<Link to="/logs" style={{ color: 'var(--river-700)' }}>← Back to /logs</Link>
					</div>
				</>
			)}
		</>,
	);
}

function CraftRow({ craft, editing, onEdit, onCancelEdit }: {
	craft: UserCraftEntry;
	editing: boolean;
	onEdit: () => void;
	onCancelEdit: () => void;
}) {
	const { update, archive, setDefault } = useCraftMutations();
	const [name, setName] = useState(craft.name);
	const [craftType, setCraftType] = useState(craft.craftType);
	const [craftSize, setCraftSize] = useState(craft.craftSize || '');
	const [notes, setNotes] = useState(craft.notes || '');
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (editing) {
			setName(craft.name);
			setCraftType(craft.craftType);
			setCraftSize(craft.craftSize || '');
			setNotes(craft.notes || '');
			setError(null);
		}
	}, [editing, craft]);

	const onSave = async () => {
		setError(null);
		if (!name.trim()) { setError('Name is required'); return; }
		try {
			await update.mutateAsync({ id: craft.id, patch: {
				name: name.trim(),
				craftType,
				craftSize: craftSize.trim() || null,
				notes: notes.trim() || null,
			} });
			onCancelEdit();
		} catch (err: any) {
			setError(err?.message || 'Failed to save');
		}
	};

	const onArchive = async () => {
		if (!window.confirm(`Archive "${craft.name}"? Old logs that reference this craft will still display its name, but it won't appear in the picker.`)) return;
		try {
			await archive.mutateAsync(craft.id);
		} catch (err: any) {
			setError(err?.message || 'Failed to archive');
		}
	};

	if (editing) {
		return (
			<div style={{
				padding: '12px 14px',
				borderRadius: 'var(--r-lg)',
				border: '1px solid var(--river-200)',
				background: 'var(--river-50)',
				display: 'flex',
				flexDirection: 'column',
				gap: 10,
			}}>
				<div style={{ ...eyebrowStyle, color: 'var(--river-800)' }}>EDIT CRAFT</div>
				<div>
					<label style={labelStyle}>Name</label>
					<input style={inputStyle} value={name} onChange={e => setName(e.target.value)} />
				</div>
				<div>
					<label style={labelStyle}>Type</label>
					<div role="radiogroup" style={{ display: 'inline-flex', gap: 2, padding: 3, background: 'var(--bg-sunken)', borderRadius: 'var(--r-pill)', width: '100%' }}>
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
						<label style={labelStyle}>Size</label>
						<input style={inputStyle} value={craftSize} onChange={e => setCraftSize(e.target.value)} />
					</div>
					<div>
						<label style={labelStyle}>Notes</label>
						<input style={inputStyle} value={notes} onChange={e => setNotes(e.target.value)} />
					</div>
				</div>
				{error && <div style={{ padding: '6px 10px', borderRadius: 'var(--r-md)', background: '#fdecea', color: '#a02323', fontSize: 12 }}>{error}</div>}
				<div style={{ display: 'flex', gap: 8 }}>
					<button type="button" onClick={onSave} disabled={update.isPending} style={{
						padding: '8px 14px',
						borderRadius: 'var(--r-md)',
						border: '1px solid var(--river-700)',
						background: 'var(--river-700)',
						color: '#fff',
						fontSize: 12,
						fontWeight: 600,
						cursor: update.isPending ? 'wait' : 'pointer',
						opacity: update.isPending ? 0.6 : 1,
					}}>Save</button>
					<button type="button" onClick={onCancelEdit} style={{
						padding: '8px 12px',
						borderRadius: 'var(--r-md)',
						border: '1px solid var(--rule)',
						background: 'var(--bg-card)',
						color: 'var(--ink-2)',
						fontSize: 12,
						cursor: 'pointer',
					}}>Cancel</button>
				</div>
			</div>
		);
	}

	return (
		<div style={{
			padding: '12px 14px',
			borderRadius: 'var(--r-lg)',
			border: '1px solid var(--rule)',
			background: 'var(--bg-card)',
			display: 'flex',
			justifyContent: 'space-between',
			alignItems: 'flex-start',
			gap: 12,
		}}>
			<div style={{ minWidth: 0, flex: 1 }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
					<strong style={{ fontSize: 15, color: 'var(--ink-0)' }}>{craft.name}</strong>
					{craft.isDefault && (
						<span style={{
							padding: '2px 8px',
							borderRadius: 'var(--r-pill)',
							background: 'var(--river-100)',
							color: 'var(--river-800)',
							fontFamily: 'var(--font-mono)',
							fontSize: 9,
							letterSpacing: '0.06em',
							textTransform: 'uppercase',
						}}>default</span>
					)}
				</div>
				<div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>
					{craftTypeLabel(craft.craftType)}{craft.craftSize ? ` · ${craft.craftSize}` : ''}
				</div>
				{craft.notes && (
					<div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 4 }}>{craft.notes}</div>
				)}
			</div>
			<div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
				{!craft.isDefault && (
					<button
						type="button"
						onClick={() => setDefault.mutate(craft.id)}
						disabled={setDefault.isPending}
						style={{
							padding: '4px 10px',
							borderRadius: 'var(--r-md)',
							border: '1px solid var(--rule)',
							background: 'var(--bg-card)',
							color: 'var(--ink-2)',
							fontFamily: 'var(--font-mono)',
							fontSize: 10,
							textTransform: 'uppercase',
							letterSpacing: '0.04em',
							cursor: 'pointer',
						}}
					>Make default</button>
				)}
				<button
					type="button"
					onClick={onEdit}
					style={{
						padding: '4px 10px',
						borderRadius: 'var(--r-md)',
						border: '1px solid var(--rule)',
						background: 'var(--bg-card)',
						color: 'var(--ink-2)',
						fontFamily: 'var(--font-mono)',
						fontSize: 10,
						textTransform: 'uppercase',
						letterSpacing: '0.04em',
						cursor: 'pointer',
					}}
				>Edit</button>
				<button
					type="button"
					onClick={onArchive}
					disabled={archive.isPending}
					style={{
						padding: '4px 10px',
						borderRadius: 'var(--r-md)',
						border: '1px solid var(--rule)',
						background: 'var(--bg-card)',
						color: '#a02323',
						fontFamily: 'var(--font-mono)',
						fontSize: 10,
						textTransform: 'uppercase',
						letterSpacing: '0.04em',
						cursor: 'pointer',
					}}
				>Archive</button>
			</div>
		</div>
	);
}
