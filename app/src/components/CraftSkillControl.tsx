import { CRAFTS, SKILLS, type SkillLevel } from '../lib/craftTypes';
import { useCraftSkill } from '../lib/craftContext';

interface CraftSkillControlProps {
	variant?: 'desktop' | 'mobile';
}

export function CraftSkillControl({ variant = 'desktop' }: CraftSkillControlProps) {
	const { craft, skill, setCraft, setSkill } = useCraftSkill();
	const isMobile = variant === 'mobile';

	const labelStyle: React.CSSProperties = {
		fontFamily: 'var(--font-mono)',
		fontSize: 10,
		letterSpacing: '0.10em',
		textTransform: 'uppercase',
		color: isMobile ? 'rgba(255,255,255,0.65)' : 'var(--ink-3)',
		fontWeight: 500,
		whiteSpace: 'nowrap',
		minWidth: 40,
	};

	return (
		<div style={{
			padding: '10px 14px',
			borderRadius: 'var(--r-lg)',
			background: isMobile ? 'rgba(255,255,255,0.08)' : 'var(--bg-card)',
			border: isMobile ? '1px solid rgba(255,255,255,0.12)' : '1px solid var(--rule)',
			boxShadow: isMobile ? 'none' : 'var(--shadow-card)',
			display: 'flex', flexDirection: 'column', gap: 8,
			minWidth: isMobile ? 0 : 320,
		}}>
			<Row label="Craft" labelStyle={labelStyle}>
				<Segmented
					options={CRAFTS.map(c => ({ id: c.id, label: c.short }))}
					value={craft}
					onChange={setCraft}
					isMobile={isMobile}
				/>
			</Row>
			<Row label="Skill" labelStyle={labelStyle}>
				<Segmented
					options={SKILLS.map(s => ({ id: s.id, label: shortSkill(s.id) }))}
					value={skill}
					onChange={setSkill}
					isMobile={isMobile}
				/>
			</Row>
		</div>
	);
}

function shortSkill(s: SkillLevel): string {
	return s === 'intermediate' ? 'Inter.' : s.charAt(0).toUpperCase() + s.slice(1);
}

function Row({ label, labelStyle, children }: { label: string; labelStyle: React.CSSProperties; children: React.ReactNode }) {
	return (
		<div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
			<span style={labelStyle}>{label}</span>
			{children}
		</div>
	);
}

interface SegmentedProps<T extends string> {
	options: { id: T; label: string }[];
	value: T;
	onChange: (v: T) => void;
	isMobile: boolean;
}

function Segmented<T extends string>({ options, value, onChange, isMobile }: SegmentedProps<T>) {
	const trackBg = isMobile ? 'rgba(0,0,0,0.18)' : 'var(--bg-sunken)';
	const selBg = isMobile ? 'rgba(255,255,255,0.92)' : 'var(--bg-card)';
	const selFg = isMobile ? 'var(--river-800)' : 'var(--ink-0)';
	const selBorder = isMobile ? '1px solid rgba(255,255,255,0.6)' : '1px solid var(--rule)';
	const idleFg = isMobile ? 'rgba(255,255,255,0.78)' : 'var(--ink-3)';

	return (
		<div style={{
			display: 'inline-flex',
			gap: 2,
			padding: 3,
			background: trackBg,
			borderRadius: 'var(--r-pill)',
			flex: 1,
		}}>
			{options.map(o => {
				const sel = value === o.id;
				return (
					<button
						key={o.id}
						onClick={() => onChange(o.id)}
						style={{
							flex: 1,
							padding: '6px 10px',
							borderRadius: 'var(--r-pill)',
							background: sel ? selBg : 'transparent',
							color: sel ? selFg : idleFg,
							border: sel ? selBorder : '1px solid transparent',
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
