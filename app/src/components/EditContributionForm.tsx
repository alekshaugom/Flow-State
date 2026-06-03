import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { RequireCapability } from './RequireCapability';

// ---------------------------------------------------------------------------
// Field descriptors — mirrors lib/contributions/entity-registry.ts for
// access-point. Re-declared inline to avoid Vite cross-root import issues.
// ---------------------------------------------------------------------------
type FieldType = 'text' | 'longtext' | 'number' | 'boolean' | 'enum' | 'latlng';

interface FieldDescriptor {
	key: string;
	label: string;
	type: FieldType;
	enumValues?: readonly string[];
	min?: number;
	max?: number;
	required?: boolean;
}

const ACCESS_POINT_FIELDS: FieldDescriptor[] = [
	{ key: 'name',          label: 'Name',            type: 'text',    required: true },
	{ key: 'kind',          label: 'Kind',            type: 'enum',    enumValues: ['put-in', 'take-out', 'both', 'trailer_ramp', 'slide_rails', 'carry_in', 'carry_out', 'horse_pack_in', 'fly_in', 'other'] },
	{ key: 'directions',    label: 'Directions',      type: 'longtext' },
	{ key: 'permitRequired',label: 'Permit required', type: 'boolean' },
	{ key: 'feeUsd',        label: 'Fee (USD)',        type: 'number',  min: 0 },
	{ key: 'parkingSpaces', label: 'Parking spaces',  type: 'number',  min: 0 },
	{ key: 'latitude',      label: 'Latitude',        type: 'latlng',  min: -90,  max: 90 },
	{ key: 'longitude',     label: 'Longitude',       type: 'latlng',  min: -180, max: 180 },
	{ key: 'riverMile',     label: 'River mile',      type: 'number',  min: 0 },
	{ key: 'notes',         label: 'Notes',           type: 'longtext' },
	{ key: 'altNames',      label: 'Alt names (comma-separated)', type: 'text' },
];

const RAPID_FIELDS: FieldDescriptor[] = [
	{ key: 'name',              label: 'Name',                  type: 'text',     required: true },
	{ key: 'classRating',       label: 'Class rating',          type: 'text' },
	{ key: 'riverMile',         label: 'River mile',            type: 'number',   min: 0 },
	{ key: 'latitude',          label: 'Latitude',              type: 'latlng',   min: -90,  max: 90 },
	{ key: 'longitude',         label: 'Longitude',             type: 'latlng',   min: -180, max: 180 },
	{ key: 'scoutPortageNotes', label: 'Scout / portage notes', type: 'longtext' },
	{ key: 'linesJson',         label: 'Lines (JSON)',           type: 'longtext' },
	{ key: 'hazardsJson',       label: 'Hazards (JSON)',         type: 'longtext' },
	{ key: 'classByFlowJson',   label: 'Class by flow (JSON)',   type: 'longtext' },
];

const SHUTTLE_BUSINESS_FIELDS: FieldDescriptor[] = [
	{ key: 'name',               label: 'Name',                     type: 'text',     required: true },
	{ key: 'phone',              label: 'Phone',                    type: 'text' },
	{ key: 'website',            label: 'Website',                  type: 'text' },
	{ key: 'serviceCorridorIds', label: 'Service corridors (JSON)', type: 'longtext' },
	{ key: 'ratesJson',          label: 'Rates (JSON)',             type: 'longtext' },
	{ key: 'notes',              label: 'Notes',                    type: 'longtext' },
];

const OUTFITTER_FIELDS: FieldDescriptor[] = [
	{ key: 'name',               label: 'Name',                     type: 'text',     required: true },
	{ key: 'licenseNumber',      label: 'License number',           type: 'text' },
	{ key: 'licenseState',       label: 'License state',            type: 'text' },
	{ key: 'phone',              label: 'Phone',                    type: 'text' },
	{ key: 'website',            label: 'Website',                  type: 'text' },
	{ key: 'serviceCorridorIds', label: 'Service corridors (JSON)', type: 'longtext' },
	{ key: 'tripTypesJson',      label: 'Trip types (JSON)',        type: 'longtext' },
	{ key: 'notes',              label: 'Notes',                    type: 'longtext' },
];

const ENTITY_FIELDS: Record<string, FieldDescriptor[]> = {
	'access-point': ACCESS_POINT_FIELDS,
	'rapid': RAPID_FIELDS,
	'shuttle-business': SHUTTLE_BUSINESS_FIELDS,
	'outfitter': OUTFITTER_FIELDS,
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface EditContributionFormProps {
	entityType: string;
	entityId: string | null;
	op: 'edit' | 'create';
	initial?: Record<string, any>;
	onDone?: () => void;
	/** Optional: link this submission to a bounty (slice 22). */
	bountyId?: string | null;
}

// ---------------------------------------------------------------------------
// Shared input styles
// ---------------------------------------------------------------------------
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
	textTransform: 'uppercase',
	color: 'var(--ink-3)',
	fontWeight: 500,
	marginBottom: 4,
};

const fieldWrapStyle: React.CSSProperties = {
	display: 'flex',
	flexDirection: 'column',
	gap: 4,
};

// ---------------------------------------------------------------------------
// Sign-in / membership fallback
// ---------------------------------------------------------------------------
function SignInPrompt() {
	return (
		<div style={{
			padding: '12px 16px',
			borderRadius: 'var(--r-lg)',
			background: 'var(--bg-sunken)',
			border: '1px solid var(--rule)',
			fontSize: 13,
			color: 'var(--ink-3)',
		}}>
			<a href="/login" style={{ color: 'var(--river-600)', fontWeight: 600, textDecoration: 'none' }}>
				Sign in
			</a>{' '}
			or become a member to suggest edits.
		</div>
	);
}

// ---------------------------------------------------------------------------
// Field renderer
// ---------------------------------------------------------------------------
function FieldInput({
	field,
	value,
	onChange,
}: {
	field: FieldDescriptor;
	value: any;
	onChange: (val: any) => void;
}) {
	if (field.type === 'boolean') {
		return (
			<label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-1)', cursor: 'pointer' }}>
				<input
					type="checkbox"
					checked={!!value}
					onChange={e => onChange(e.target.checked)}
					style={{ width: 16, height: 16 }}
				/>
				{field.label}
			</label>
		);
	}

	if (field.type === 'enum' && field.enumValues) {
		return (
			<div style={fieldWrapStyle}>
				<span style={labelStyle}>{field.label}</span>
				<select
					value={value ?? ''}
					onChange={e => onChange(e.target.value || undefined)}
					style={{ ...inputStyle }}
				>
					<option value="">— select —</option>
					{field.enumValues.map(v => (
						<option key={v} value={v}>{v}</option>
					))}
				</select>
			</div>
		);
	}

	if (field.type === 'longtext') {
		return (
			<div style={fieldWrapStyle}>
				<span style={labelStyle}>{field.label}</span>
				<textarea
					value={value ?? ''}
					onChange={e => onChange(e.target.value || undefined)}
					rows={3}
					style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-sans)' }}
				/>
			</div>
		);
	}

	if (field.type === 'number' || field.type === 'latlng') {
		return (
			<div style={fieldWrapStyle}>
				<span style={labelStyle}>{field.label}</span>
				<input
					type="number"
					value={value ?? ''}
					min={field.min}
					max={field.max}
					step="any"
					onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
					style={inputStyle}
				/>
			</div>
		);
	}

	// Default: text
	return (
		<div style={fieldWrapStyle}>
			<span style={labelStyle}>{field.label}</span>
			<input
				type="text"
				value={value ?? ''}
				onChange={e => onChange(e.target.value || undefined)}
				style={inputStyle}
			/>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Main form
// ---------------------------------------------------------------------------
function FormInner({ entityType, entityId, op, initial = {}, onDone, bountyId }: EditContributionFormProps) {
	const qc = useQueryClient();
	const fields = ENTITY_FIELDS[entityType] ?? [];

	// Local form state: starts from `initial`
	const [values, setValues] = useState<Record<string, any>>(() => ({ ...initial }));
	const [submitted, setSubmitted] = useState(false);

	const mutation = useMutation({
		mutationFn: () => {
			// For edits: only send keys that differ from initial (changed/filled).
			// For creates: send all non-undefined.
			const payload: Record<string, any> = {};
			for (const f of fields) {
				const v = values[f.key];
				if (v === undefined || v === '') continue;
				if (op === 'edit' && initial[f.key] === v) continue; // unchanged
				payload[f.key] = v;
			}
			return api.submitContribution(entityType, entityId, op, payload, bountyId ?? null);
		},
		onSuccess: () => {
			setSubmitted(true);
			// Invalidate corridor (all slugs) + riverDetail so cards refresh.
			qc.invalidateQueries({ queryKey: ['corridor'] });
			qc.invalidateQueries({ queryKey: ['riverDetail'] });
			setTimeout(() => {
				setSubmitted(false);
				onDone?.();
			}, 2500);
		},
	});

	if (submitted) {
		return (
			<div style={{
				padding: '12px 16px',
				borderRadius: 'var(--r-lg)',
				background: 'var(--green-50, #f0fdf4)',
				border: '1px solid var(--green-200, #bbf7d0)',
				fontSize: 13,
				color: 'var(--green-700, #15803d)',
				fontWeight: 500,
			}}>
				Submitted — pending verification. Thank you!
			</div>
		);
	}

	const setField = (key: string, val: any) => setValues(v => ({ ...v, [key]: val }));

	return (
		<form
			onSubmit={e => {
				e.preventDefault();
				mutation.mutate();
			}}
			style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
		>
			{fields.map(f => (
				f.type === 'boolean' ? (
					<FieldInput
						key={f.key}
						field={f}
						value={values[f.key]}
						onChange={v => setField(f.key, v)}
					/>
				) : (
					<FieldInput
						key={f.key}
						field={f}
						value={values[f.key]}
						onChange={v => setField(f.key, v)}
					/>
				)
			))}

			{mutation.isError && (
				<div style={{ fontSize: 12, color: 'var(--red-600, #dc2626)' }}>
					{String((mutation.error as Error)?.message ?? 'Failed to submit')}
				</div>
			)}

			<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
				<button
					type="submit"
					disabled={mutation.isPending}
					style={{
						padding: '8px 16px',
						borderRadius: 'var(--r-md)',
						background: 'var(--river-700)',
						color: '#fff',
						border: 'none',
						fontSize: 13,
						fontWeight: 600,
						cursor: mutation.isPending ? 'wait' : 'pointer',
						opacity: mutation.isPending ? 0.6 : 1,
					}}
				>
					{mutation.isPending ? 'Submitting…' : op === 'create' ? 'Submit new' : 'Submit edit'}
				</button>
				{onDone && (
					<button
						type="button"
						onClick={onDone}
						style={{
							padding: '8px 16px',
							borderRadius: 'var(--r-md)',
							background: 'transparent',
							color: 'var(--ink-2)',
							border: '1px solid var(--rule)',
							fontSize: 13,
							fontWeight: 500,
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

export function EditContributionForm(props: EditContributionFormProps) {
	return (
		<RequireCapability capability="canContribute" fallback={<SignInPrompt />}>
			<FormInner {...props} />
		</RequireCapability>
	);
}

