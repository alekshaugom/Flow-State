import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseConditionTags } from './ConditionsTagChips';
import { BigCFS } from './BigCFS';
import { StatusPill } from './StatusPill';
import { mapStatusToDesign } from '../constants';
import type { CampingNight, RiverLogEntry, UserProfileEntry } from '../types';

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

const MONTHS = [
	'January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December',
];

function ordinalSuffix(day: number): string {
	const tens = day % 100;
	if (tens >= 11 && tens <= 13) return 'th';
	switch (day % 10) {
		case 1: return 'st';
		case 2: return 'nd';
		case 3: return 'rd';
		default: return 'th';
	}
}

function parseYmd(s: string): { year: number; month: number; day: number } | null {
	if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
	const [y, m, d] = s.split('-').map(p => parseInt(p, 10));
	if (!Number.isFinite(y) || m < 1 || m > 12 || d < 1 || d > 31) return null;
	return { year: y, month: m, day: d };
}

function formatLong(s: string): string {
	const p = parseYmd(s);
	if (!p) return s;
	return `${MONTHS[p.month - 1]} ${p.day}${ordinalSuffix(p.day)}, ${p.year}`;
}

// Mirrors lib/log/trip-date-pure.ts — kept inline to avoid Vite cross-root imports.
function formatTripDate(date: string, endDate: string | null, tripNights: number): { label: string; nightsLabel: string | null } {
	const start = parseYmd(date);
	if (!start) return { label: date, nightsLabel: null };

	const isMultiDay = !!endDate && endDate !== date && tripNights > 0;
	if (!isMultiDay) return { label: formatLong(date), nightsLabel: null };

	const end = parseYmd(endDate as string);
	const nightsLabel = `${tripNights} ${tripNights === 1 ? 'night' : 'nights'}`;
	if (!end) return { label: formatLong(date), nightsLabel };

	if (end.year === start.year) {
		return {
			label: `${MONTHS[start.month - 1]} ${start.day}${ordinalSuffix(start.day)} → ${MONTHS[end.month - 1]} ${end.day}${ordinalSuffix(end.day)}, ${end.year}`,
			nightsLabel,
		};
	}
	return {
		label: `${formatLong(date)} → ${formatLong(endDate as string)}`,
		nightsLabel,
	};
}

export interface RiverLogCardThresholds {
	flowLow: number;
	flowRunnable: number;
	flowIdealMin: number;
	flowIdealMax: number;
	flowHigh: number;
	flowExpert: number;
	flowDangerous: number;
}

// Mirrors lib/utils.ts getFlowStatus — kept inline to avoid Vite cross-root imports.
function getFlowStatus(value: number, t: RiverLogCardThresholds): string {
	if (value <= 0) return 'no-flow';
	if (value < t.flowLow) return 'too-low';
	if (value < t.flowRunnable) return 'low';
	if (value >= t.flowDangerous) return 'dangerous';
	if (value >= t.flowExpert) return 'expert-only';
	if (value >= t.flowHigh) return 'high';
	if (value >= t.flowIdealMin && value <= t.flowIdealMax) return 'ideal';
	return 'runnable';
}

interface RiverLogCardProps {
	log: RiverLogEntry;
	profile?: UserProfileEntry | null;
	canEdit?: boolean;
	sectionThresholds?: RiverLogCardThresholds | null;
}

function priorTripCount(profile: UserProfileEntry | null | undefined, sectionId: string): number {
	if (!profile?.preExistingTripCountsJson) return 0;
	try {
		const parsed = JSON.parse(profile.preExistingTripCountsJson);
		const n = parsed?.[sectionId];
		return typeof n === 'number' && n > 0 ? n : 0;
	} catch {
		return 0;
	}
}

export function RiverLogCard({ log, profile, canEdit = true, sectionThresholds }: RiverLogCardProps) {
	const navigate = useNavigate();
	const [expanded, setExpanded] = useState(false);
	const tags = parseConditionTags(log.conditionsTags);
	const camping = useMemo(() => parseCampingFromJson(log.campingJson), [log.campingJson]);
	const prior = priorTripCount(profile, log.sectionId);
	const dateView = formatTripDate(log.date, log.endDate, log.tripNights);
	const flow = log.flowAtTripCfs != null ? Math.round(log.flowAtTripCfs) : null;
	const designStatus = (flow != null && sectionThresholds)
		? mapStatusToDesign(getFlowStatus(flow, sectionThresholds))
		: null;

	const notesClamp: React.CSSProperties = expanded ? {} : {
		display: '-webkit-box',
		WebkitLineClamp: 3,
		WebkitBoxOrient: 'vertical',
		overflow: 'hidden',
	};

	return (
		<article style={{
			background: 'var(--bg-card)',
			border: '1px solid var(--rule)',
			borderRadius: 'var(--r-lg)',
			padding: '14px 14px 12px',
			boxShadow: 'var(--shadow-card)',
			position: 'relative',
			display: 'flex',
			flexDirection: 'column',
			gap: 10,
		}}>
			<div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
				<div style={{ minWidth: 0, flex: 1 }}>
					<div style={{
						fontSize: 14,
						fontWeight: 600,
						color: 'var(--ink-0)',
						letterSpacing: '-0.005em',
						lineHeight: 1.3,
					}}>
						{dateView.label}
						{log.craftName && (
							<>
								<span style={{ color: 'var(--ink-4)', margin: '0 6px', fontWeight: 400 }}>·</span>
								<span style={{ color: 'var(--ink-1)', fontWeight: 500 }}>{log.craftName}</span>
							</>
						)}
						{dateView.nightsLabel && (
							<>
								<span style={{ color: 'var(--ink-4)', margin: '0 6px', fontWeight: 400 }}>·</span>
								<span style={{
									fontFamily: 'var(--font-mono)',
									fontSize: 11,
									letterSpacing: '0.04em',
									textTransform: 'uppercase',
									color: 'var(--ink-3)',
									fontWeight: 500,
								}}>{dateView.nightsLabel}</span>
							</>
						)}
					</div>
					{typeof log.crewSize === 'number' && (
						<div style={{
							marginTop: 4,
							fontSize: 12,
							color: 'var(--ink-3)',
						}}>{log.crewSize} crew</div>
					)}
				</div>
				{canEdit && (
					<div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
						<IconBtn aria-label="Edit log" onClick={() => navigate(`/log/${encodeURIComponent(log.id)}/edit`)}>edit</IconBtn>
					</div>
				)}
			</div>

			<div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
				<BigCFS cfs={flow} size="card" />
				{designStatus && (
					<StatusPill status={designStatus} size="sm" />
				)}
			</div>

			{(log.putIn || log.takeOut) && (
				<div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
					{log.putIn || '—'} <span style={{ color: 'var(--ink-4)' }}>→</span> {log.takeOut || '—'}
				</div>
			)}

			{camping.length > 0 && (
				<div style={{
					fontFamily: 'var(--font-mono)',
					fontSize: 10,
					letterSpacing: '0.08em',
					textTransform: 'uppercase',
					color: 'var(--ink-3)',
					lineHeight: 1.6,
				}}>
					<div style={{ color: 'var(--ink-4)' }}>// CAMPED AT</div>
					{camping.map(n => (
						<div key={n.date} style={{ color: 'var(--ink-2)' }}>
							{n.date} <span style={{ color: 'var(--ink-4)' }}>·</span> {n.location}
						</div>
					))}
				</div>
			)}

			{log.notes && (
				<div
					onClick={() => setExpanded(v => !v)}
					style={{
						fontSize: 13,
						color: 'var(--ink-1)',
						lineHeight: 1.5,
						whiteSpace: 'pre-wrap',
						cursor: 'pointer',
						...notesClamp,
					}}
				>{log.notes}</div>
			)}

			{tags.length > 0 && (
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
					{tags.map(t => <TagChip key={t}>{t}</TagChip>)}
				</div>
			)}

			{(profile || prior > 0) && (
				<div style={{
					marginTop: 4,
					paddingTop: 8,
					borderTop: '1px dashed var(--rule)',
					fontFamily: 'var(--font-mono)',
					fontSize: 10,
					letterSpacing: '0.08em',
					color: 'var(--ink-3)',
					textTransform: 'uppercase',
					display: 'flex',
					flexWrap: 'wrap',
					gap: 8,
				}}>
					{profile?.background && <span>{profile.background}</span>}
					{profile?.skillLevel && <span>· {profile.skillLevel}</span>}
					{typeof profile?.yearsBoating === 'number' && profile.yearsBoating > 0 && <span>· {profile.yearsBoating} yrs</span>}
					{prior > 0 && <span>· +{prior} prior trips</span>}
				</div>
			)}
		</article>
	);
}

function TagChip({ children }: { children: React.ReactNode }) {
	return (
		<span style={{
			display: 'inline-flex',
			alignItems: 'center',
			padding: '3px 9px',
			borderRadius: 'var(--r-pill)',
			background: 'var(--bg-sunken)',
			color: 'var(--ink-2)',
			border: '1px solid var(--rule)',
			fontFamily: 'var(--font-mono)',
			fontSize: 11,
			fontWeight: 500,
			whiteSpace: 'nowrap',
		}}>{children}</span>
	);
}

function IconBtn({ children, onClick, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
	return (
		<button
			type="button"
			onClick={onClick}
			{...rest}
			style={{
				padding: '4px 10px',
				borderRadius: 'var(--r-md)',
				border: '1px solid var(--rule)',
				background: 'var(--bg-card)',
				color: 'var(--ink-3)',
				fontFamily: 'var(--font-mono)',
				fontSize: 10,
				textTransform: 'uppercase',
				letterSpacing: '0.08em',
				cursor: 'pointer',
			}}
		>{children}</button>
	);
}
