import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useRiverDetail } from '../hooks/useRiverDetail';
import { useMyLog } from '../hooks/useMyLogs';
import { useLogMutations } from '../hooks/useLogMutations';
import { CraftPicker } from '../components/CraftPicker';
import { ConditionsTagChips, parseConditionTags, stringifyConditionTags } from '../components/ConditionsTagChips';
import { MultiDayDateField } from '../components/MultiDayDateField';
import { useMyCrafts } from '../hooks/useCrafts';
import type { CampingNight, UserCraftEntry } from '../types';

const labelStyle: React.CSSProperties = {
	fontFamily: 'var(--font-mono)',
	fontSize: 10,
	letterSpacing: '0.10em',
	textTransform: 'uppercase',
	color: 'var(--ink-3)',
	fontWeight: 500,
	marginBottom: 6,
	display: 'block',
};

const inputStyle: React.CSSProperties = {
	width: '100%',
	padding: '10px 12px',
	borderRadius: 'var(--r-md)',
	border: '1px solid var(--rule)',
	background: 'var(--bg-card)',
	color: 'var(--ink-0)',
	fontSize: 14,
	fontFamily: 'inherit',
	boxSizing: 'border-box',
};

const todayDate = () => new Date().toISOString().slice(0, 10);

function parseCampingFromJson(json: string | null | undefined): CampingNight[] {
	if (!json) return [];
	try {
		const parsed = JSON.parse(json);
		if (!Array.isArray(parsed)) return [];
		return parsed
			.filter((e: any) => e && typeof e.date === 'string' && typeof e.location === 'string')
			.map((e: any) => ({ date: e.date, location: e.location }));
	} catch {
		return [];
	}
}

interface LogTripPageProps {
	mode?: 'new' | 'edit';
}

export function LogTripPage({ mode = 'new' }: LogTripPageProps) {
	const { isAuthenticated, isLoading: authLoading } = useAuth();
	const navigate = useNavigate();
	const params = useParams<{ id?: string }>();
	const [search] = useSearchParams();

	useEffect(() => {
		if (!authLoading && !isAuthenticated) navigate('/login', { replace: true });
	}, [authLoading, isAuthenticated, navigate]);

	const sectionIdFromUrl = search.get('sectionId') || undefined;
	const dateFromUrl = search.get('date') || undefined;
	const logId = mode === 'edit' ? params.id : undefined;
	const editingLog = useMyLog(logId);
	const editSectionId = editingLog.data?.sectionId;
	const sectionId = editSectionId || sectionIdFromUrl;
	const section = useRiverDetail(sectionId);

	const [craftId, setCraftId] = useState<string | null>(null);
	const [crewSize, setCrewSize] = useState<number | ''>('');
	const [durationHours, setDurationHours] = useState<number | ''>('');
	const [date, setDate] = useState(dateFromUrl || todayDate());
	const [endDate, setEndDate] = useState('');
	const [camping, setCamping] = useState<CampingNight[]>([]);
	const [putIn, setPutIn] = useState('');
	const [takeOut, setTakeOut] = useState('');
	const [notes, setNotes] = useState('');
	const [tags, setTags] = useState<string[]>([]);
	const [hydrated, setHydrated] = useState(false);
	const [dirty, setDirty] = useState(false);

	const myCrafts = useMyCrafts();

	useEffect(() => {
		if (hydrated) return;
		if (mode === 'edit') {
			if (!editingLog.data) return;
			const l = editingLog.data;
			setCraftId((l as any).craftId ?? null);
			setCrewSize(typeof l.crewSize === 'number' ? l.crewSize : '');
			setDurationHours(typeof l.durationHours === 'number' ? l.durationHours : '');
			setDate(l.date);
			setEndDate((l as any).endDate || '');
			setCamping(parseCampingFromJson((l as any).campingJson));
			setPutIn(l.putIn ?? '');
			setTakeOut(l.takeOut ?? '');
			setNotes(l.notes ?? '');
			setTags(parseConditionTags(l.conditionsTags));
			setHydrated(true);
		} else if (section.data && !hydrated) {
			const sec = section.data;
			setPutIn(p => p || sec.putIn || '');
			setTakeOut(t => t || sec.takeOut || '');
			// Auto-apply default craft on new logs once crafts have loaded.
			const defaultCraft = myCrafts.data?.crafts.find(c => c.isDefault && !c.archivedAt);
			if (defaultCraft) setCraftId(defaultCraft.id);
			setHydrated(true);
		}
	}, [mode, editingLog.data, section.data, hydrated, myCrafts.data]);

	const onCraftPicked = (selected: UserCraftEntry | null) => {
		setCraftId(selected?.id ?? null);
		markDirty();
	};

	useEffect(() => {
		if (!dirty) return;
		const handler = (e: BeforeUnloadEvent) => {
			e.preventDefault();
			e.returnValue = '';
		};
		window.addEventListener('beforeunload', handler);
		return () => window.removeEventListener('beforeunload', handler);
	}, [dirty]);

	const mutations = useLogMutations();
	const [submitError, setSubmitError] = useState<string | null>(null);

	const canSubmit = useMemo(() => {
		return !!sectionId && !!date && !!craftId && !mutations.create.isPending && !mutations.update.isPending;
	}, [sectionId, date, craftId, mutations.create.isPending, mutations.update.isPending]);

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!sectionId) return;
		if (!craftId) {
			setSubmitError('Pick a saved craft, or save a new one.');
			return;
		}
		setSubmitError(null);

		const isMultiDay = !!endDate && endDate !== date && endDate > date;
		const cleanedCamping = isMultiDay
			? camping.filter(n => n.location && n.location.trim()).map(n => ({ date: n.date, location: n.location.trim() }))
			: [];

		const input = {
			sectionId,
			date,
			endDate: isMultiDay ? endDate : null,
			camping: cleanedCamping,
			craftId,
			crewSize: crewSize === '' ? null : Number(crewSize),
			durationHours: durationHours === '' ? null : Number(durationHours),
			putIn: putIn || null,
			takeOut: takeOut || null,
			notes: notes || null,
			conditionsTags: stringifyConditionTags(tags),
		};

		try {
			if (mode === 'edit' && logId) {
				await mutations.update.mutateAsync({ id: logId, patch: input });
			} else {
				await mutations.create.mutateAsync(input);
			}
			setDirty(false);
			navigate(`/section/${encodeURIComponent(sectionId)}`);
		} catch (err: any) {
			setSubmitError(err?.message || 'Failed to save log');
		}
	};

	const onDelete = async () => {
		if (!logId || !sectionId) return;
		if (!window.confirm('Delete this log? This cannot be undone.')) return;
		try {
			await mutations.remove.mutateAsync({ id: logId, sectionId });
			navigate(`/section/${encodeURIComponent(sectionId)}`);
		} catch (err: any) {
			setSubmitError(err?.message || 'Failed to delete');
		}
	};

	const onCancel = () => {
		if (dirty && !window.confirm('Discard unsaved changes?')) return;
		if (sectionId) navigate(`/section/${encodeURIComponent(sectionId)}`);
		else navigate('/');
	};

	const markDirty = () => { if (!dirty) setDirty(true); };

	if (!isAuthenticated) return null;
	if (!sectionId) return <NoSectionFallback />;

	const sectionName = section.data?.section || sectionId;

	return (
		<div style={{ maxWidth: 680, margin: '0 auto', padding: 'max(env(safe-area-inset-top), 16px) 16px 80px' }}>
			<div style={{ marginBottom: 18 }}>
				<div style={{
					fontFamily: 'var(--font-mono)',
					fontSize: 11,
					letterSpacing: '0.12em',
					textTransform: 'uppercase',
					color: 'var(--ink-3)',
				}}>
					{mode === 'edit' ? '// EDIT LOG' : '// LOG A TRIP'}
				</div>
				<h1 style={{
					fontSize: 22, fontWeight: 700, margin: '4px 0 2px', color: 'var(--ink-0)',
				}}>{sectionName}</h1>
				<div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
					Flow at trip is resolved automatically when the daily rollup runs (lazy retry for 7 days).
				</div>
			</div>

			<form onSubmit={onSubmit} onChange={markDirty} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
				<MultiDayDateField
					date={date}
					endDate={endDate}
					camping={camping}
					onChange={p => {
						if (p.date !== undefined) setDate(p.date);
						if (p.endDate !== undefined) setEndDate(p.endDate);
						if (p.camping !== undefined) setCamping(p.camping);
						markDirty();
					}}
				/>

				<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
					<div>
						<label style={labelStyle} htmlFor="duration">Duration (hrs)</label>
						<input
							id="duration"
							type="number"
							min={0.25}
							max={48}
							step={0.25}
							style={inputStyle}
							placeholder="3.5"
							value={durationHours}
							onChange={e => setDurationHours(e.target.value === '' ? '' : Number(e.target.value))}
						/>
					</div>
					<div>
						<label style={labelStyle} htmlFor="crew-size">Crew size</label>
						<input
							id="crew-size"
							type="number"
							min={1}
							max={50}
							style={inputStyle}
							placeholder="5"
							value={crewSize}
							onChange={e => setCrewSize(e.target.value === '' ? '' : Number(e.target.value))}
						/>
					</div>
				</div>

				<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
					<div style={{
						fontFamily: 'var(--font-mono)',
						fontSize: 10,
						letterSpacing: '0.10em',
						textTransform: 'uppercase',
						color: 'var(--ink-3)',
					}}>// SAVED CRAFT</div>
					<CraftPicker selectedCraftId={craftId} onChange={onCraftPicked} />
				</div>

				<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
					<div>
						<label style={labelStyle} htmlFor="put-in">Put-in</label>
						<input
							id="put-in"
							style={inputStyle}
							value={putIn}
							onChange={e => setPutIn(e.target.value)}
							placeholder="Default from section"
						/>
					</div>
					<div>
						<label style={labelStyle} htmlFor="take-out">Take-out</label>
						<input
							id="take-out"
							style={inputStyle}
							value={takeOut}
							onChange={e => setTakeOut(e.target.value)}
							placeholder="Default from section"
						/>
					</div>
				</div>

				<ConditionsTagChips value={tags} onChange={(t) => { setTags(t); markDirty(); }} />

				<div>
					<label style={labelStyle} htmlFor="notes">Notes</label>
					<textarea
						id="notes"
						style={{ ...inputStyle, minHeight: 140, resize: 'vertical', fontFamily: 'inherit' }}
						placeholder="What happened on this run? Lines, surprises, conditions."
						value={notes}
						onChange={e => setNotes(e.target.value)}
					/>
				</div>

				{submitError && (
					<div style={{
						padding: '10px 12px',
						borderRadius: 'var(--r-md)',
						background: '#fdecea',
						color: '#a02323',
						fontSize: 13,
					}}>{submitError}</div>
				)}

				<div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
					<button
						type="submit"
						disabled={!canSubmit}
						style={{
							padding: '11px 20px',
							borderRadius: 'var(--r-md)',
							border: '1px solid var(--river-700)',
							background: 'var(--river-700)',
							color: '#fff',
							fontWeight: 600,
							fontSize: 14,
							cursor: canSubmit ? 'pointer' : 'not-allowed',
							opacity: canSubmit ? 1 : 0.6,
						}}
					>{mode === 'edit' ? 'Save changes' : 'Log this trip'}</button>
					<button
						type="button"
						onClick={onCancel}
						style={{
							padding: '11px 18px',
							borderRadius: 'var(--r-md)',
							border: '1px solid var(--rule)',
							background: 'var(--bg-card)',
							color: 'var(--ink-1)',
							fontSize: 14,
							cursor: 'pointer',
						}}
					>Cancel</button>
					{mode === 'edit' && (
						<button
							type="button"
							onClick={onDelete}
							style={{
								marginLeft: 'auto',
								padding: '11px 14px',
								borderRadius: 'var(--r-md)',
								border: '1px solid var(--rule)',
								background: 'var(--bg-card)',
								color: '#a02323',
								fontSize: 13,
								cursor: 'pointer',
							}}
						>Delete log</button>
					)}
				</div>
			</form>
		</div>
	);
}

function NoSectionFallback() {
	return (
		<div style={{ maxWidth: 480, margin: '80px auto', padding: 20, textAlign: 'center' }}>
			<div style={{
				fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em',
				textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8,
			}}>// LOG A TRIP</div>
			<p style={{ fontSize: 14, color: 'var(--ink-2)' }}>
				Open a section from the home page and tap <strong>+ Log a trip</strong> on its detail page to log a run there.
			</p>
		</div>
	);
}
