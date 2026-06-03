import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { RequireCapability } from './RequireCapability';

const inputStyle: React.CSSProperties = {
	width: '100%',
	padding: '7px 10px',
	borderRadius: 'var(--r-md)',
	border: '1px solid var(--rule)',
	background: 'var(--bg-card)',
	color: 'var(--ink-0)',
	fontSize: 13,
	fontFamily: 'var(--font-sans)',
	boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
	display: 'block',
	fontSize: 11,
	fontFamily: 'var(--font-mono)',
	letterSpacing: '0.08em',
	textTransform: 'uppercase' as const,
	color: 'var(--ink-3)',
	fontWeight: 500,
	marginBottom: 4,
};

const ENTITY_TYPE_OPTIONS: { value: string; label: string }[] = [
	{ value: 'access-point',     label: 'Access point' },
	{ value: 'rapid',            label: 'Rapid' },
	{ value: 'shuttle-business', label: 'Shuttle service' },
	{ value: 'outfitter',        label: 'Outfitter' },
	{ value: 'photo',            label: 'Photo' },
	{ value: 'other',            label: 'Other' },
];

interface PostBountyFormProps {
	sectionId: string;
	corridorId?: string | null;
	onDone?: () => void;
	/** Invalidation keys to refresh on success */
	corridorSlug?: string;
}

function FormInner({ sectionId, corridorId, onDone, corridorSlug }: PostBountyFormProps) {
	const qc = useQueryClient();
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
	const [selectedEntityType, setSelectedEntityType] = useState('access-point');
	const [fundKarma, setFundKarma] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [submitted, setSubmitted] = useState(false);

	const mutation = useMutation({
		mutationFn: () => {
			// interim: integer holds karma points (slice 23b); becomes USD-cents when real payments land (slice 23)
			const karma = parseInt(fundKarma, 10);
			if (!karma || karma <= 0) throw new Error('Initial karma stake required (> 0)');
			return api.postBounty({
				title: title.trim(),
				description: description.trim(),
				acceptanceCriteria: acceptanceCriteria.trim(),
				sectionId,
				entityType: selectedEntityType,
				entityId: null,
				corridorId: corridorId ?? null,
				fundCents: karma,
			});
		},
		onSuccess: () => {
			setSubmitted(true);
			qc.invalidateQueries({ queryKey: ['riverDetail'] });
			qc.invalidateQueries({ queryKey: ['corridor'] });
			if (corridorSlug) qc.invalidateQueries({ queryKey: ['corridor', corridorSlug] });
			setTimeout(() => {
				setSubmitted(false);
				onDone?.();
			}, 2500);
		},
		onError: (e: any) => setError(e?.message || 'Failed to post bounty'),
	});

	if (submitted) {
		return (
			<div style={{
				padding: '12px 16px', borderRadius: 'var(--r-lg)',
				background: 'var(--green-50, #f0fdf4)', border: '1px solid var(--green-200, #bbf7d0)',
				fontSize: 13, color: 'var(--green-700, #15803d)', fontWeight: 500,
			}}>
				Bounty posted! Funds held in escrow until awarded.
			</div>
		);
	}

	return (
		<form
			onSubmit={e => {
				e.preventDefault();
				setError(null);
				if (!title.trim()) { setError('Title is required'); return; }
				if (!acceptanceCriteria.trim()) { setError('Acceptance criteria is required'); return; }
				const karma = parseInt(fundKarma, 10);
				if (!karma || karma <= 0) { setError('Initial karma stake required (> 0)'); return; }
				mutation.mutate();
			}}
			style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
		>
			<div>
				<label style={labelStyle}>Title *</label>
				<input
					type="text"
					value={title}
					onChange={e => setTitle(e.target.value)}
					style={inputStyle}
					placeholder="e.g. Add current photo of upper section"
					maxLength={200}
					required
				/>
			</div>

			<div>
				<label style={labelStyle}>Description</label>
				<textarea
					value={description}
					onChange={e => setDescription(e.target.value)}
					rows={2}
					style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-sans)' }}
					placeholder="Additional context for contributors…"
				/>
			</div>

			<div>
				<label style={labelStyle}>Contribution type *</label>
				<select
					value={selectedEntityType}
					onChange={e => setSelectedEntityType(e.target.value)}
					style={inputStyle}
					required
				>
					{ENTITY_TYPE_OPTIONS.map(opt => (
						<option key={opt.value} value={opt.value}>{opt.label}</option>
					))}
				</select>
			</div>

			<div>
				<label style={labelStyle}>Acceptance criteria *</label>
				<textarea
					value={acceptanceCriteria}
					onChange={e => setAcceptanceCriteria(e.target.value)}
					rows={3}
					style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-sans)' }}
					placeholder="Concrete checklist of what a valid submission must include…"
					required
				/>
			</div>

			<div style={{ maxWidth: 180 }}>
				<label style={labelStyle}>Karma to stake *</label>
				<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
					<span style={{ fontSize: 14, color: 'var(--ink-2)' }}>✦</span>
					<input
						type="number"
						min="1"
						step="1"
						value={fundKarma}
						onChange={e => setFundKarma(e.target.value)}
						style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }}
						placeholder="0"
						required
					/>
				</div>
				<div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
					{/* interim: deducted from karma balance (slice 23b) */}
					Deducted from your karma balance
				</div>
			</div>

			{error && (
				<div style={{ fontSize: 12, color: 'var(--red-600, #dc2626)' }}>{error}</div>
			)}

			<div style={{ display: 'flex', gap: 10 }}>
				<button
					type="submit"
					disabled={mutation.isPending}
					style={{
						padding: '8px 16px', borderRadius: 'var(--r-md)',
						background: 'var(--river-700)', color: '#fff',
						border: 'none', fontSize: 13, fontWeight: 600,
						cursor: mutation.isPending ? 'wait' : 'pointer',
						opacity: mutation.isPending ? 0.6 : 1,
					}}
				>
					{mutation.isPending ? 'Posting…' : 'Post bounty'}
				</button>
				{onDone && (
					<button
						type="button"
						onClick={onDone}
						style={{
							padding: '8px 16px', borderRadius: 'var(--r-md)',
							background: 'transparent', color: 'var(--ink-2)',
							border: '1px solid var(--rule)', fontSize: 13, fontWeight: 500,
							cursor: 'pointer',
						}}
					>
						Cancel
					</button>
				)}
			</div>
		</form>
	);
}

export function PostBountyForm(props: PostBountyFormProps) {
	return (
		<RequireCapability capability="canFund">
			<FormInner {...props} />
		</RequireCapability>
	);
}

