import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, type SearchHit, type SearchResults } from '../api';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { Icon } from './Icon';

interface SearchHeroProps {
	variant?: 'hero' | 'compact';
}

const heroWrap: React.CSSProperties = {
	position: 'relative',
	width: '100%',
	flexShrink: 0,
	isolation: 'isolate',
	minHeight: 360,
};

// The image + overlay are clipped by overflow:hidden on their own container so
// they don't bleed past the hero, but the search dropdown (a sibling of the
// glass box, inside heroContent) needs to escape the hero downward.
const heroClip: React.CSSProperties = {
	position: 'absolute',
	inset: 0,
	overflow: 'hidden',
	zIndex: 0,
};

const heroBg: React.CSSProperties = {
	position: 'absolute',
	inset: 0,
	backgroundImage: 'url(/raft-hero.jpg)',
	backgroundSize: 'cover',
	backgroundPosition: 'center 38%',
};

// Dark vignette + slight bottom fade so dashboard transition feels intentional.
const heroOverlay: React.CSSProperties = {
	position: 'absolute',
	inset: 0,
	background:
		'linear-gradient(180deg, rgba(0,30,50,0.10) 0%, rgba(0,30,50,0.05) 35%, rgba(0,30,50,0.30) 100%)',
};

const heroContent: React.CSSProperties = {
	position: 'relative',
	zIndex: 1,
	display: 'flex',
	flexDirection: 'column',
	alignItems: 'center',
	justifyContent: 'center',
	padding: '64px 24px 48px',
	textAlign: 'center',
};

const eyebrow: React.CSSProperties = {
	fontFamily: 'var(--font-mono)',
	fontSize: 11,
	letterSpacing: '0.22em',
	textTransform: 'uppercase',
	color: 'rgba(255,255,255,0.85)',
	fontWeight: 600,
	textShadow: '0 1px 12px rgba(0,0,0,0.4)',
	marginBottom: 12,
};

const headline: React.CSSProperties = {
	fontFamily: 'var(--font-sans)',
	fontSize: 'clamp(28px, 5vw, 48px)',
	fontWeight: 700,
	letterSpacing: '-0.025em',
	color: '#fff',
	margin: 0,
	textShadow: '0 2px 16px rgba(0,0,0,0.35)',
};

const subhead: React.CSSProperties = {
	fontSize: 'clamp(13px, 1.6vw, 16px)',
	color: 'rgba(255,255,255,0.85)',
	margin: '10px 0 0',
	textShadow: '0 1px 12px rgba(0,0,0,0.35)',
	maxWidth: 540,
};

// Glass search container — sits centered below the headline.
const glassBoxWrap: React.CSSProperties = {
	position: 'relative',
	width: '100%',
	maxWidth: 720,
	marginTop: 28,
};

const glassBox: React.CSSProperties = {
	position: 'relative',
	display: 'flex',
	alignItems: 'center',
	gap: 12,
	padding: '6px 6px 6px 22px',
	borderRadius: 999,
	background: 'rgba(255,255,255,0.65)',
	backdropFilter: 'blur(24px) saturate(180%)',
	WebkitBackdropFilter: 'blur(24px) saturate(180%)',
	border: '1px solid rgba(255,255,255,0.6)',
	boxShadow:
		'0 1px 0 rgba(255,255,255,0.6) inset, 0 12px 40px rgba(0,30,50,0.25), 0 4px 14px rgba(0,30,50,0.18)',
};

const glassInput: React.CSSProperties = {
	flex: 1,
	border: 'none',
	background: 'transparent',
	outline: 'none',
	fontSize: 17,
	color: 'var(--ink-0)',
	fontFamily: 'var(--font-sans)',
	padding: '14px 0',
	minWidth: 0,
};

const glassClearBtn: React.CSSProperties = {
	width: 44,
	height: 44,
	borderRadius: '50%',
	background: 'var(--river-700)',
	color: '#fff',
	border: 'none',
	cursor: 'pointer',
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	flexShrink: 0,
	boxShadow: '0 4px 14px rgba(31, 81, 124, 0.35)',
	transition: 'transform 120ms',
};

// Dropdown styling
const dropdownBase: React.CSSProperties = {
	position: 'absolute',
	top: 'calc(100% + 10px)',
	left: 0,
	right: 0,
	background: 'rgba(255,255,255,0.92)',
	backdropFilter: 'blur(24px) saturate(180%)',
	WebkitBackdropFilter: 'blur(24px) saturate(180%)',
	border: '1px solid rgba(255,255,255,0.7)',
	borderRadius: 20,
	boxShadow: '0 16px 60px rgba(0,30,50,0.25)',
	maxHeight: 520,
	overflow: 'auto',
	zIndex: 50,
	padding: 8,
};

const sectionLabelBase: React.CSSProperties = {
	fontFamily: 'var(--font-mono)',
	fontSize: 10,
	letterSpacing: '0.14em',
	textTransform: 'uppercase',
	fontWeight: 600,
	padding: '10px 14px 6px',
	display: 'flex',
	alignItems: 'center',
	gap: 8,
};

const hitRowBase: React.CSSProperties = {
	display: 'grid',
	gridTemplateColumns: '1fr auto',
	alignItems: 'center',
	padding: '10px 14px',
	borderRadius: 12,
	cursor: 'pointer',
	gap: 14,
};

// Compact variant — small inline search box for non-home pages or below-the-fold callouts.
const compactWrap: React.CSSProperties = {
	position: 'relative',
	width: '100%',
};

const compactInputWrap: React.CSSProperties = {
	position: 'relative',
};

const compactInput: React.CSSProperties = {
	width: '100%',
	border: '1px solid var(--rule)',
	borderRadius: 'var(--r-pill)',
	background: 'var(--bg-card)',
	color: 'var(--ink-0)',
	fontSize: 16,
	outline: 'none',
	padding: '12px 18px 12px 48px',
	boxSizing: 'border-box',
};

export function SearchHero({ variant = 'hero' }: SearchHeroProps) {
	const navigate = useNavigate();
	const [q, setQ] = useState('');
	const [open, setOpen] = useState(false);
	const [focusIdx, setFocusIdx] = useState(-1);
	const debounced = useDebouncedValue(q, 200);
	const inputRef = useRef<HTMLInputElement>(null);
	const wrapRef = useRef<HTMLDivElement>(null);

	const trimmed = debounced.trim();
	const query = useQuery<SearchResults>({
		queryKey: ['river-search', trimmed],
		queryFn: () => api.searchRivers(trimmed, 12),
		enabled: trimmed.length >= 1,
		staleTime: 30_000,
		retry: 0,
	});

	const flatHits: SearchHit[] = useMemo(() => {
		const r = query.data;
		if (!r) return [];
		return [...(r.colorado || []), ...(r.america || []), ...(r.worldwide || [])];
	}, [query.data]);

	useEffect(() => {
		if (focusIdx >= flatHits.length) setFocusIdx(flatHits.length - 1);
	}, [flatHits.length, focusIdx]);

	useEffect(() => {
		function onClickOutside(e: MouseEvent) {
			if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
		}
		document.addEventListener('mousedown', onClickOutside);
		return () => document.removeEventListener('mousedown', onClickOutside);
	}, []);

	function go(hit: SearchHit) {
		setOpen(false);
		setQ('');
		setFocusIdx(-1);
		inputRef.current?.blur();
		navigate(hit.href);
	}

	function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			setOpen(true);
			setFocusIdx(i => Math.min(flatHits.length - 1, i + 1));
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			setFocusIdx(i => Math.max(-1, i - 1));
		} else if (e.key === 'Enter') {
			if (focusIdx >= 0 && flatHits[focusIdx]) {
				e.preventDefault();
				go(flatHits[focusIdx]);
			} else if (flatHits[0]) {
				e.preventDefault();
				go(flatHits[0]);
			}
		} else if (e.key === 'Escape') {
			setOpen(false);
			inputRef.current?.blur();
		}
	}

	const showDropdown = open && trimmed.length >= 1 && (query.isLoading || flatHits.length > 0 || query.isError);
	const showEmpty = open && trimmed.length >= 1 && !query.isLoading && flatHits.length === 0 && !query.isError;

	const dropdown = (
		<>
			{(showDropdown || showEmpty) && (
				<div style={dropdownBase} role="listbox">
					{query.isLoading && (
						<div style={{ padding: '14px 14px', fontSize: 13, color: 'var(--ink-3)' }}>Searching…</div>
					)}
					{query.isError && (
						<div style={{ padding: '14px 14px', fontSize: 13, color: 'var(--danger-solid)' }}>
							Search failed. Try again in a moment.
						</div>
					)}
					{!query.isLoading && !query.isError && query.data && (
						<>
							<BucketSection
								label="Colorado"
								color="var(--river-700)"
								dot="#1f517c"
								hits={query.data.colorado || []}
								startIndex={0}
								focusIdx={focusIdx}
								go={go}
								showCountry={false}
							/>
							<BucketSection
								label="United States"
								color="var(--ink-1)"
								dot="#7a3a2a"
								hits={query.data.america || []}
								startIndex={(query.data.colorado || []).length}
								focusIdx={focusIdx}
								go={go}
								showCountry={false}
								showState
							/>
							<BucketSection
								label="Worldwide"
								color="var(--ink-2)"
								dot="#0a7a52"
								hits={query.data.worldwide || []}
								startIndex={(query.data.colorado || []).length + (query.data.america || []).length}
								focusIdx={focusIdx}
								go={go}
								showCountry
							/>
						</>
					)}
					{showEmpty && (
						<div style={{ padding: '14px 14px', fontSize: 13, color: 'var(--ink-3)' }}>
							No matches for "{trimmed}". Try a different name, watershed, or country.
						</div>
					)}
				</div>
			)}
		</>
	);

	if (variant === 'compact') {
		return (
			<div ref={wrapRef} style={compactWrap}>
				<div style={compactInputWrap}>
					<div style={{
						position: 'absolute', left: 16, top: '50%',
						transform: 'translateY(-50%)', pointerEvents: 'none',
					}}>
						<Icon name="search" size={18} color="var(--ink-3)" />
					</div>
					<input
						ref={inputRef}
						value={q}
						onChange={e => { setQ(e.target.value); setOpen(true); setFocusIdx(-1); }}
						onFocus={() => setOpen(true)}
						onKeyDown={onKeyDown}
						placeholder="Search rivers, sections, watersheds, countries…"
						aria-label="Search rivers"
						style={compactInput}
					/>
				</div>
				{dropdown}
			</div>
		);
	}

	// Hero variant
	return (
		<div style={heroWrap}>
			<div style={heroClip} aria-hidden>
				<div style={heroBg} aria-hidden />
				<div style={heroOverlay} aria-hidden />
			</div>
			<div style={heroContent}>
				<div style={eyebrow}>Flow State</div>
				<h1 style={headline}>Find your next river</h1>
				<p style={subhead}>
					Real-time Colorado flows, plus 4,766 paddling rivers worldwide.
				</p>
				<div ref={wrapRef} style={glassBoxWrap}>
					<div style={glassBox}>
						<Icon name="search" size={20} color="var(--ink-2)" />
						<input
							ref={inputRef}
							value={q}
							onChange={e => { setQ(e.target.value); setOpen(true); setFocusIdx(-1); }}
							onFocus={() => setOpen(true)}
							onKeyDown={onKeyDown}
							placeholder="Search rivers, sections, watersheds, countries…"
							aria-label="Search rivers"
							style={glassInput}
						/>
						{q.length > 0 ? (
							<button
								aria-label="Clear"
								onClick={() => { setQ(''); inputRef.current?.focus(); }}
								style={glassClearBtn}
							>
								<Icon name="x-mark" size={18} color="white" />
							</button>
						) : (
							<button
								aria-label="Search"
								onClick={() => inputRef.current?.focus()}
								style={glassClearBtn}
							>
								<Icon name="arrow-right" size={18} color="white" />
							</button>
						)}
					</div>
					{dropdown}
				</div>
			</div>
		</div>
	);
}

interface BucketSectionProps {
	label: string;
	color: string;
	dot: string;
	hits: SearchHit[];
	startIndex: number;
	focusIdx: number;
	go: (hit: SearchHit) => void;
	showCountry?: boolean;
	showState?: boolean;
}

function BucketSection({ label, color, dot, hits, startIndex, focusIdx, go, showCountry, showState }: BucketSectionProps) {
	if (hits.length === 0) return null;
	return (
		<div>
			<div style={{ ...sectionLabelBase, color }}>
				<span style={{
					width: 6, height: 6, borderRadius: '50%', background: dot,
					boxShadow: `0 0 0 3px ${dot}22`,
				}} />
				{label}
				<span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
					{hits.length}
				</span>
			</div>
			{hits.map((h, idx) => {
				const globalIdx = startIndex + idx;
				const focused = globalIdx === focusIdx;
				const right = rightColumn(h, { showCountry, showState });
				return (
					<div
						key={`${h.kind}:${h.id}`}
						role="option"
						aria-selected={focused}
						onMouseDown={(e) => { e.preventDefault(); go(h); }}
						style={{
							...hitRowBase,
							background: focused ? 'rgba(31, 81, 124, 0.08)' : 'transparent',
						}}
					>
						<div style={{ minWidth: 0 }}>
							<div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-0)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
								{h.name}
							</div>
							<div style={{ fontSize: 12, color: 'var(--ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
								{h.subtitle}
							</div>
						</div>
						<div style={{
							fontSize: 12, color: 'var(--ink-2)', fontWeight: 500,
							whiteSpace: 'nowrap', textAlign: 'right',
						}}>
							{right}
						</div>
					</div>
				);
			})}
		</div>
	);
}

function rightColumn(h: SearchHit, opts: { showCountry?: boolean; showState?: boolean }): string {
	if (opts.showCountry) {
		return h.country || '—';
	}
	if (opts.showState) {
		return h.region || 'USA';
	}
	switch (h.kind) {
		case 'section': return 'Section';
		case 'river': return 'River';
		case 'watershed': return 'Watershed';
		case 'corridor': return 'Corridor';
		case 'world-river': return h.country || 'Worldwide';
	}
}
