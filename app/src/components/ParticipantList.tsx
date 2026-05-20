import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import type { ParticipantView } from '../types';

interface ParticipantListProps {
	tripId: string;
	participants: ParticipantView[];
}

function parseCraftSequence(json: string | null): Array<{ craftName: string | null; craftType: string | null }> {
	if (!json) return [];
	try {
		const parsed = JSON.parse(json);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter((e: any) => e && typeof e === 'object');
	} catch {
		return [];
	}
}

function formatCraftSequence(json: string | null): string | null {
	const seq = parseCraftSequence(json);
	if (seq.length === 0) return null;
	return seq.map(e => e.craftName || e.craftType || 'craft').join(' → ');
}

export function ParticipantList({ tripId, participants }: ParticipantListProps) {
	if (!participants || participants.length <= 1) {
		// Single-participant trips render the legacy log-card body — no participant block needed.
		return null;
	}
	return (
		<div style={{
			marginTop: 6,
			paddingTop: 10,
			borderTop: '1px dashed var(--rule)',
			display: 'flex',
			flexDirection: 'column',
			gap: 10,
		}}>
			<div style={{
				fontFamily: 'var(--font-mono)',
				fontSize: 10,
				letterSpacing: '0.10em',
				textTransform: 'uppercase',
				color: 'var(--ink-3)',
			}}>// PARTICIPANTS ({participants.length})</div>
			{participants.map(p => (
				<ParticipantRow key={p.userId} tripId={tripId} participant={p} />
			))}
		</div>
	);
}

interface ParticipantRowProps {
	tripId: string;
	participant: ParticipantView;
}

function ParticipantRow({ tripId, participant }: ParticipantRowProps) {
	const qc = useQueryClient();
	const [editing, setEditing] = useState(false);
	const [draftNotes, setDraftNotes] = useState(participant.notes || '');
	const [draftPrivate, setDraftPrivate] = useState(participant.notesPrivate);

	const participantId = `${tripId}_${participant.userId}`;
	const patch = useMutation({
		mutationFn: () => api.patchParticipant(participantId, { notes: draftNotes, notesPrivate: draftPrivate }),
		onSuccess: () => {
			setEditing(false);
			qc.invalidateQueries({ queryKey: ['my-logs'] });
			qc.invalidateQueries({ queryKey: ['section-logs'] });
			qc.invalidateQueries({ queryKey: ['river-detail'] });
		},
	});

	const craftSeq = formatCraftSequence(participant.craftSequenceJson);

	return (
		<div style={{
			padding: '8px 10px',
			borderRadius: 'var(--r-md)',
			background: participant.isSelf ? 'var(--bg-sunken)' : 'transparent',
			border: participant.isSelf ? '1px solid var(--rule)' : 'none',
			fontSize: 13,
		}}>
			<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
				<span style={{ fontWeight: 600, color: 'var(--ink-0)' }}>
					{participant.name || 'Participant'}
				</span>
				{participant.isSelf && (
					<span style={{
						fontFamily: 'var(--font-mono)',
						fontSize: 9,
						letterSpacing: '0.10em',
						textTransform: 'uppercase',
						color: 'var(--ink-3)',
						padding: '2px 6px',
						background: 'var(--bg-card)',
						borderRadius: 'var(--r-pill)',
						border: '1px solid var(--rule)',
					}}>you</span>
				)}
				{craftSeq && (
					<span style={{ color: 'var(--ink-3)', fontSize: 12 }}>· {craftSeq}</span>
				)}
				{participant.notesPrivate && !participant.isSelf && (
					<span style={{ color: 'var(--ink-4)', fontSize: 11, fontStyle: 'italic' }}>(private notes)</span>
				)}
			</div>

			{editing && participant.isSelf ? (
				<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
					<textarea
						value={draftNotes}
						onChange={e => setDraftNotes(e.target.value)}
						style={{
							width: '100%',
							minHeight: 80,
							padding: '8px 10px',
							borderRadius: 'var(--r-md)',
							border: '1px solid var(--rule)',
							background: 'var(--bg-card)',
							color: 'var(--ink-0)',
							fontSize: 13,
							resize: 'vertical',
							boxSizing: 'border-box',
							fontFamily: 'inherit',
						}}
						placeholder="Your own notes on this trip"
					/>
					<label style={{ fontSize: 11, color: 'var(--ink-3)', display: 'flex', gap: 6, alignItems: 'center' }}>
						<input
							type="checkbox"
							checked={draftPrivate}
							onChange={e => setDraftPrivate(e.target.checked)}
						/>
						Private — only I can see these notes
					</label>
					<div style={{ display: 'flex', gap: 6 }}>
						<button
							type="button"
							onClick={() => patch.mutate()}
							disabled={patch.isPending}
							style={{
								padding: '6px 12px',
								borderRadius: 'var(--r-md)',
								border: '1px solid var(--river-700)',
								background: 'var(--river-700)',
								color: '#fff',
								fontSize: 12,
								cursor: 'pointer',
							}}
						>{patch.isPending ? 'Saving…' : 'Save'}</button>
						<button
							type="button"
							onClick={() => { setEditing(false); setDraftNotes(participant.notes || ''); setDraftPrivate(participant.notesPrivate); }}
							style={{
								padding: '6px 12px',
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
			) : participant.notes ? (
				<div style={{ color: 'var(--ink-2)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
					{participant.notes}
					{participant.isSelf && (
						<button
							type="button"
							onClick={() => setEditing(true)}
							style={{
								marginLeft: 8,
								padding: '2px 8px',
								borderRadius: 'var(--r-sm)',
								border: '1px solid var(--rule)',
								background: 'transparent',
								color: 'var(--ink-3)',
								fontSize: 10,
								cursor: 'pointer',
								fontFamily: 'var(--font-mono)',
								letterSpacing: '0.08em',
								textTransform: 'uppercase',
							}}
						>edit</button>
					)}
				</div>
			) : participant.isSelf ? (
				<button
					type="button"
					onClick={() => setEditing(true)}
					style={{
						padding: '4px 10px',
						borderRadius: 'var(--r-md)',
						border: '1px dashed var(--rule)',
						background: 'transparent',
						color: 'var(--ink-3)',
						fontSize: 12,
						cursor: 'pointer',
					}}
				>+ Add your notes on this trip</button>
			) : null}
		</div>
	);
}
