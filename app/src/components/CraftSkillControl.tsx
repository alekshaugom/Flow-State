import { useEffect, useRef, useState } from 'react';
import { CRAFTS, SKILLS, type CraftType, type SkillLevel } from '../lib/craftTypes';
import { useCraftSkill } from '../lib/craftContext';
import { Icon } from './Icon';

interface CraftSkillControlProps {
	variant?: 'desktop' | 'mobile';
	layout?: 'chip' | 'stacked';
	/** 0–1: crossfade between stacked card (0) and a one-line "Oar-Raft / Inter." chip (1). */
	collapseProgress?: number;
}

function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

export function CraftSkillControl({ variant = 'desktop', layout = 'chip', collapseProgress = 0 }: CraftSkillControlProps) {
	const { craft, skill, setCraft, setSkill } = useCraftSkill();
	const [open, setOpen] = useState(false);
	const wrapRef = useRef<HTMLDivElement>(null);
	const isMobile = variant === 'mobile';
	const stacked = layout === 'stacked';

	useEffect(() => {
		if (!open) return;
		function onDocClick(e: MouseEvent) {
			if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
		}
		document.addEventListener('mousedown', onDocClick);
		return () => document.removeEventListener('mousedown', onDocClick);
	}, [open]);

	const craftLabel = CRAFTS.find(c => c.id === craft)?.short || craft;
	const skillLabel = shortSkill(skill);

	const baseFg = isMobile ? '#fff' : 'var(--ink-1)';
	const bgIdle = isMobile ? 'rgba(255,255,255,0.10)' : 'var(--bg-card)';
	const bgHover = isMobile ? 'rgba(255,255,255,0.16)' : 'var(--bg-sunken)';
	const border = isMobile ? '1px solid rgba(255,255,255,0.18)' : '1px solid var(--rule)';

	const triggerInline = (
		<button
			type="button"
			onClick={() => setOpen(o => !o)}
			aria-expanded={open}
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: 8,
				padding: '8px 12px 8px 14px',
				borderRadius: 'var(--r-pill)',
				background: open ? bgHover : bgIdle,
				border,
				color: baseFg,
				fontSize: 12,
				fontWeight: 600,
				fontFamily: 'var(--font-sans)',
				cursor: 'pointer',
				whiteSpace: 'nowrap',
				boxShadow: isMobile ? 'none' : 'var(--shadow-card)',
			}}
		>
			<span style={{
				fontFamily: 'var(--font-mono)',
				fontSize: 9,
				letterSpacing: '0.10em',
				textTransform: 'uppercase',
				color: isMobile ? 'rgba(255,255,255,0.55)' : 'var(--ink-3)',
				fontWeight: 500,
			}}>Boat</span>
			<span>{craftLabel}</span>
			<span style={{
				width: 1, height: 14, background: isMobile ? 'rgba(255,255,255,0.20)' : 'var(--rule)',
			}} />
			<span style={{
				fontFamily: 'var(--font-mono)',
				fontSize: 9,
				letterSpacing: '0.10em',
				textTransform: 'uppercase',
				color: isMobile ? 'rgba(255,255,255,0.55)' : 'var(--ink-3)',
				fontWeight: 500,
			}}>Skill</span>
			<span>{skillLabel}</span>
			<Icon name="chevron-right" size={12} color={isMobile ? 'rgba(255,255,255,0.6)' : 'var(--ink-3)'} />
		</button>
	);

	// Stacked card cross-fades into a single-line chip as the title-bar
	// shrinks above. Both layouts are absolutely positioned in the same
	// container; opacity + height interpolate from progress = 0 → 1.
	const stackedHeight = lerp(82, 32, collapseProgress);
	const stackedOpacity = Math.max(0, 1 - collapseProgress * 1.6);
	const compactOpacity = Math.max(0, (collapseProgress - 0.35) * 1.55);

	const triggerStacked = (
		<div
			style={{
				position: 'relative',
				minWidth: lerp(200, 168, collapseProgress),
				height: stackedHeight,
			}}
		>
			<button
				type="button"
				onClick={() => setOpen(o => !o)}
				aria-expanded={open}
				aria-label="Set boat and skill"
				style={{
					position: 'absolute',
					inset: 0,
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'center',
					gap: 8,
					padding: '12px 16px',
					borderRadius: 'var(--r-lg)',
					background: open ? bgHover : bgIdle,
					border,
					color: baseFg,
					cursor: 'pointer',
					boxShadow: isMobile ? 'none' : 'var(--shadow-card)',
					fontFamily: 'var(--font-sans)',
					textAlign: 'left',
					opacity: stackedOpacity,
					pointerEvents: collapseProgress > 0.5 ? 'none' : 'auto',
				}}
			>
				<StackedRow label="Boat" value={craftLabel} isMobile={isMobile} />
				<div style={{ height: 1, background: isMobile ? 'rgba(255,255,255,0.14)' : 'var(--rule)' }} />
				<StackedRow label="Skill" value={skillLabel} isMobile={isMobile} showChevron />
			</button>

			<button
				type="button"
				onClick={() => setOpen(o => !o)}
				aria-expanded={open}
				aria-label="Set boat and skill"
				style={{
					position: 'absolute',
					inset: 0,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					gap: 8,
					padding: '0 14px',
					borderRadius: 'var(--r-pill)',
					background: open ? bgHover : bgIdle,
					border,
					color: baseFg,
					cursor: 'pointer',
					boxShadow: isMobile ? 'none' : 'var(--shadow-card)',
					fontFamily: 'var(--font-sans)',
					fontSize: 13,
					fontWeight: 600,
					whiteSpace: 'nowrap',
					opacity: compactOpacity,
					pointerEvents: collapseProgress > 0.5 ? 'auto' : 'none',
				}}
			>
				<span>{craftLabel}</span>
				<span style={{ color: isMobile ? 'rgba(255,255,255,0.35)' : 'var(--ink-3)' }}>/</span>
				<span>{skillLabel}</span>
				<Icon name="chevron-right" size={12} color={isMobile ? 'rgba(255,255,255,0.6)' : 'var(--ink-3)'} />
			</button>
		</div>
	);

	return (
		<div ref={wrapRef} style={{ position: 'relative', display: 'inline-block' }}>
			{stacked ? triggerStacked : triggerInline}

			{open && (
				<div style={{
					position: 'absolute',
					top: 'calc(100% + 8px)',
					right: 0,
					minWidth: 280,
					padding: 12,
					borderRadius: 'var(--r-lg)',
					background: 'var(--bg-card)',
					border: '1px solid var(--rule)',
					boxShadow: '0 16px 40px rgba(0,30,50,0.20)',
					zIndex: 60,
					display: 'flex',
					flexDirection: 'column',
					gap: 10,
				}}>
					<PickerRow label="Boat">
						<Segmented
							options={CRAFTS.map(c => ({ id: c.id, label: c.short }))}
							value={craft}
							onChange={(v) => { setCraft(v as CraftType); setOpen(false); }}
						/>
					</PickerRow>
					<PickerRow label="Skill">
						<Segmented
							options={SKILLS.map(s => ({ id: s.id, label: shortSkill(s.id) }))}
							value={skill}
							onChange={(v) => { setSkill(v as SkillLevel); setOpen(false); }}
						/>
					</PickerRow>
				</div>
			)}
		</div>
	);
}

function shortSkill(s: SkillLevel): string {
	return s === 'intermediate' ? 'Inter.' : s.charAt(0).toUpperCase() + s.slice(1);
}

function StackedRow({ label, value, isMobile, showChevron }: { label: string; value: string; isMobile: boolean; showChevron?: boolean }) {
	return (
		<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
			<span style={{
				fontFamily: 'var(--font-mono)',
				fontSize: 10,
				letterSpacing: '0.10em',
				textTransform: 'uppercase',
				color: isMobile ? 'rgba(255,255,255,0.6)' : 'var(--ink-3)',
				fontWeight: 500,
			}}>{label}</span>
			<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
				<span style={{ fontSize: 13, fontWeight: 600 }}>{value}</span>
				{showChevron && (
					<Icon name="chevron-right" size={12} color={isMobile ? 'rgba(255,255,255,0.6)' : 'var(--ink-3)'} />
				)}
			</span>
		</div>
	);
}

function PickerRow({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
			<span style={{
				fontFamily: 'var(--font-mono)',
				fontSize: 10,
				letterSpacing: '0.10em',
				textTransform: 'uppercase',
				color: 'var(--ink-3)',
				fontWeight: 500,
				minWidth: 40,
			}}>{label}</span>
			{children}
		</div>
	);
}

interface SegmentedProps<T extends string> {
	options: { id: T; label: string }[];
	value: T;
	onChange: (v: T) => void;
}

function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
	return (
		<div style={{
			display: 'inline-flex',
			gap: 2,
			padding: 3,
			background: 'var(--bg-sunken)',
			borderRadius: 'var(--r-pill)',
			flex: 1,
		}}>
			{options.map(o => {
				const sel = value === o.id;
				return (
					<button
						key={o.id}
						type="button"
						onClick={() => onChange(o.id)}
						style={{
							flex: 1,
							padding: '6px 10px',
							borderRadius: 'var(--r-pill)',
							background: sel ? 'var(--bg-card)' : 'transparent',
							color: sel ? 'var(--ink-0)' : 'var(--ink-3)',
							border: sel ? '1px solid var(--rule)' : '1px solid transparent',
							fontSize: 11,
							fontWeight: 600,
							fontFamily: 'var(--font-sans)',
							boxShadow: sel ? 'var(--shadow-press)' : 'none',
							cursor: 'pointer',
							whiteSpace: 'nowrap',
							textAlign: 'center',
							transition: 'background 0.12s, color 0.12s',
						}}
					>
						{o.label}
					</button>
				);
			})}
		</div>
	);
}
