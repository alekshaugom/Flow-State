import { useEffect, useMemo } from 'react';
import type { CampingNight } from '../types';

interface MultiDayDateFieldProps {
	date: string;
	endDate: string;
	camping: CampingNight[];
	onChange: (patch: Partial<{ date: string; endDate: string; camping: CampingNight[] }>) => void;
}

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

function addDays(dateStr: string, days: number): string {
	if (!dateStr) return '';
	const d = new Date(dateStr + 'T00:00:00Z');
	if (isNaN(d.getTime())) return '';
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
}

function nightsBetween(date: string, endDate: string): number {
	if (!date || !endDate) return 0;
	const a = Date.parse(date + 'T00:00:00Z');
	const b = Date.parse(endDate + 'T00:00:00Z');
	if (isNaN(a) || isNaN(b) || b <= a) return 0;
	return Math.round((b - a) / 86_400_000);
}

export function MultiDayDateField({ date, endDate, camping, onChange }: MultiDayDateFieldProps) {
	const isMultiDay = !!endDate && endDate !== date && endDate > date;
	const nights = nightsBetween(date, endDate);

	const nightDates = useMemo<string[]>(() => {
		if (!isMultiDay) return [];
		const out: string[] = [];
		for (let i = 0; i < nights; i++) out.push(addDays(date, i));
		return out;
	}, [date, nights, isMultiDay]);

	// Whenever the day range changes, keep camping entries aligned to the night list.
	useEffect(() => {
		if (!isMultiDay) {
			if (camping.length > 0) onChange({ camping: [] });
			return;
		}
		const byDate = new Map(camping.map(n => [n.date, n.location]));
		const realigned = nightDates.map(d => ({ date: d, location: byDate.get(d) || '' }));
		const same =
			realigned.length === camping.length &&
			realigned.every((n, i) => camping[i] && camping[i].date === n.date && camping[i].location === n.location);
		if (!same) onChange({ camping: realigned });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isMultiDay, nightDates.join('|')]);

	const setNightLocation = (nightDate: string, location: string) => {
		const next = camping.map(n => (n.date === nightDate ? { ...n, location } : n));
		onChange({ camping: next });
	};

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
			<div style={{ display: 'grid', gridTemplateColumns: isMultiDay ? '1fr 1fr' : '1fr', gap: 12 }}>
				<div>
					<label style={labelStyle} htmlFor="trip-start">{isMultiDay ? 'Start date' : 'Date'}</label>
					<input
						id="trip-start"
						type="date"
						style={inputStyle}
						value={date}
						onChange={e => onChange({ date: e.target.value })}
						required
					/>
				</div>
				{isMultiDay && (
					<div>
						<label style={labelStyle} htmlFor="trip-end">End date</label>
						<input
							id="trip-end"
							type="date"
							style={inputStyle}
							value={endDate}
							min={date}
							max={addDays(date, 14)}
							onChange={e => onChange({ endDate: e.target.value })}
						/>
					</div>
				)}
			</div>

			{!isMultiDay && (
				<button
					type="button"
					onClick={() => onChange({ endDate: addDays(date || new Date().toISOString().slice(0, 10), 1) })}
					style={{
						alignSelf: 'flex-start',
						padding: '6px 12px',
						borderRadius: 'var(--r-pill)',
						border: '1px solid var(--rule)',
						background: 'var(--bg-card)',
						color: 'var(--ink-2)',
						fontFamily: 'var(--font-mono)',
						fontSize: 11,
						letterSpacing: '0.04em',
						cursor: 'pointer',
					}}
				>+ Make this a multi-day trip</button>
			)}

			{isMultiDay && (
				<div style={{
					border: '1px solid var(--rule)',
					borderRadius: 'var(--r-lg)',
					padding: '12px 14px',
					background: 'var(--bg-card)',
					display: 'flex',
					flexDirection: 'column',
					gap: 10,
				}}>
					<div style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						gap: 10,
					}}>
						<span style={labelStyle}>// {nights} {nights === 1 ? 'NIGHT' : 'NIGHTS'} CAMPED</span>
						<button
							type="button"
							onClick={() => onChange({ endDate: '', camping: [] })}
							style={{
								padding: '4px 10px',
								borderRadius: 'var(--r-pill)',
								border: '1px solid var(--rule)',
								background: 'var(--bg-card)',
								color: 'var(--ink-3)',
								fontFamily: 'var(--font-mono)',
								fontSize: 10,
								letterSpacing: '0.04em',
								textTransform: 'uppercase',
								cursor: 'pointer',
							}}
						>Back to single-day</button>
					</div>
					{nightDates.map(nightDate => {
						const entry = camping.find(n => n.date === nightDate);
						return (
							<div key={nightDate} style={{
								display: 'grid',
								gridTemplateColumns: '90px 1fr',
								gap: 10,
								alignItems: 'center',
							}}>
								<span style={{
									fontFamily: 'var(--font-mono)',
									fontSize: 11,
									color: 'var(--ink-3)',
									letterSpacing: '0.04em',
								}}>{nightDate}</span>
								<input
									placeholder="Camp location (optional)"
									style={{ ...inputStyle, padding: '8px 10px' }}
									value={entry?.location || ''}
									onChange={e => setNightLocation(nightDate, e.target.value)}
								/>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
