import { CRAFTS } from '../lib/craftTypes';
import { CURATED_CONDITION_TAGS } from './ConditionsTagChips';

interface LogFilterBarProps {
	craft: string | null;
	tag: string | null;
	watershedId: string | null;
	view: 'watershed' | 'year';
	watersheds: { id: string; name: string }[];
	onChange: (patch: Partial<{ craft: string | null; tag: string | null; watershedId: string | null; view: 'watershed' | 'year' }>) => void;
	resultSummary: string;
}

const selectStyle: React.CSSProperties = {
	padding: '8px 10px',
	borderRadius: 'var(--r-md)',
	border: '1px solid var(--rule)',
	background: 'var(--bg-card)',
	color: 'var(--ink-0)',
	fontSize: 13,
	fontFamily: 'inherit',
	cursor: 'pointer',
	minWidth: 140,
};

const labelStyle: React.CSSProperties = {
	fontFamily: 'var(--font-mono)',
	fontSize: 10,
	letterSpacing: '0.10em',
	textTransform: 'uppercase',
	color: 'var(--ink-3)',
	marginBottom: 4,
	display: 'block',
};

export function LogFilterBar({ craft, tag, watershedId, view, watersheds, onChange, resultSummary }: LogFilterBarProps) {
	return (
		<div style={{
			display: 'flex',
			flexDirection: 'column',
			gap: 10,
			padding: '12px 14px',
			background: 'var(--bg-card)',
			border: '1px solid var(--rule)',
			borderRadius: 'var(--r-lg)',
		}}>
			<div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
				<div>
					<label style={labelStyle}>View</label>
					<div role="radiogroup" style={{
						display: 'inline-flex',
						gap: 2,
						padding: 3,
						background: 'var(--bg-sunken)',
						borderRadius: 'var(--r-pill)',
					}}>
						{(['watershed', 'year'] as const).map(v => {
							const sel = view === v;
							return (
								<button
									key={v}
									type="button"
									role="radio"
									aria-checked={sel}
									onClick={() => onChange({ view: v })}
									style={{
										padding: '6px 14px',
										borderRadius: 'var(--r-pill)',
										background: sel ? 'var(--bg-card)' : 'transparent',
										color: sel ? 'var(--ink-0)' : 'var(--ink-3)',
										border: sel ? '1px solid var(--rule)' : '1px solid transparent',
										fontSize: 12,
										fontWeight: sel ? 600 : 500,
										textTransform: 'capitalize',
										cursor: 'pointer',
									}}
								>{v}</button>
							);
						})}
					</div>
				</div>

				<div>
					<label style={labelStyle} htmlFor="filter-craft">Craft</label>
					<select
						id="filter-craft"
						style={selectStyle}
						value={craft || ''}
						onChange={e => onChange({ craft: e.target.value || null })}
					>
						<option value="">All crafts</option>
						{CRAFTS.map(c => <option key={c.id} value={c.id}>{c.short}</option>)}
					</select>
				</div>

				<div>
					<label style={labelStyle} htmlFor="filter-tag">Tag</label>
					<select
						id="filter-tag"
						style={selectStyle}
						value={tag || ''}
						onChange={e => onChange({ tag: e.target.value || null })}
					>
						<option value="">All conditions</option>
						{CURATED_CONDITION_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
					</select>
				</div>

				<div>
					<label style={labelStyle} htmlFor="filter-watershed">Watershed</label>
					<select
						id="filter-watershed"
						style={selectStyle}
						value={watershedId || ''}
						onChange={e => onChange({ watershedId: e.target.value || null })}
					>
						<option value="">All watersheds</option>
						{watersheds.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
					</select>
				</div>

				{(craft || tag || watershedId) && (
					<button
						type="button"
						onClick={() => onChange({ craft: null, tag: null, watershedId: null })}
						style={{
							padding: '7px 12px',
							borderRadius: 'var(--r-pill)',
							border: '1px solid var(--rule)',
							background: 'var(--bg-card)',
							color: 'var(--ink-3)',
							fontFamily: 'var(--font-mono)',
							fontSize: 11,
							letterSpacing: '0.04em',
							cursor: 'pointer',
							alignSelf: 'flex-end',
						}}
					>Clear filters</button>
				)}
			</div>

			<div style={{
				fontFamily: 'var(--font-mono)',
				fontSize: 11,
				letterSpacing: '0.06em',
				color: 'var(--ink-3)',
			}}>{resultSummary}</div>
		</div>
	);
}
