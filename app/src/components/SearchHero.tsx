import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, type SearchHit, type SearchResults } from '../api';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { Icon } from './Icon';

interface SearchHeroProps {
	variant?: 'desktop' | 'mobile';
}

const wrap: React.CSSProperties = {
	position: 'relative',
	width: '100%',
};

const inputBase: React.CSSProperties = {
	width: '100%',
	border: '1px solid var(--rule)',
	borderRadius: 'var(--r-pill)',
	background: 'var(--bg-card)',
	color: 'var(--ink-0)',
	fontSize: 16,
	outline: 'none',
	transition: 'box-shadow 120ms, border-color 120ms',
};

const dropdownBase: React.CSSProperties = {
	position: 'absolute',
	top: 'calc(100% + 6px)',
	left: 0,
	right: 0,
	background: 'var(--bg-card)',
	border: '1px solid var(--rule)',
	borderRadius: 'var(--r-lg)',
	boxShadow: 'var(--shadow-card)',
	maxHeight: 480,
	overflow: 'auto',
	zIndex: 50,
	padding: 6,
};

const sectionLabel: React.CSSProperties = {
	fontFamily: 'var(--font-mono)',
	fontSize: 10,
	letterSpacing: '0.14em',
	textTransform: 'uppercase',
	color: 'var(--river-600)',
	fontWeight: 500,
	padding: '8px 12px 4px',
};

const hitRowBase: React.CSSProperties = {
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'space-between',
	padding: '10px 12px',
	borderRadius: 'var(--r-md)',
	cursor: 'pointer',
	gap: 12,
};

export function SearchHero({ variant = 'desktop' }: SearchHeroProps) {
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
		return [...r.colorado, ...r.world];
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

	const inputStyle: React.CSSProperties = {
		...inputBase,
		padding: variant === 'mobile' ? '12px 16px 12px 44px' : '14px 18px 14px 52px',
		fontSize: variant === 'mobile' ? 15 : 16,
	};

	const showDropdown = open && trimmed.length >= 1 && (query.isLoading || flatHits.length > 0 || query.isError);
	const showEmpty = open && trimmed.length >= 1 && !query.isLoading && flatHits.length === 0 && !query.isError;

	return (
		<div ref={wrapRef} style={wrap}>
			<div style={{ position: 'relative' }}>
				<div style={{
					position: 'absolute', left: variant === 'mobile' ? 14 : 18, top: '50%',
					transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--ink-3)',
					display: 'flex', alignItems: 'center', justifyContent: 'center',
				}}>
					<Icon name="search" size={variant === 'mobile' ? 16 : 18} color="var(--ink-3)" />
				</div>
				<input
					ref={inputRef}
					value={q}
					onChange={e => { setQ(e.target.value); setOpen(true); setFocusIdx(-1); }}
					onFocus={() => setOpen(true)}
					onKeyDown={onKeyDown}
					placeholder="Search rivers, sections, watersheds, countries…"
					aria-label="Search rivers"
					style={inputStyle}
				/>
			</div>

			{(showDropdown || showEmpty) && (
				<div style={dropdownBase}>
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
							{query.data.colorado.length > 0 && (
								<>
									<div style={sectionLabel}>Colorado</div>
									{query.data.colorado.map((h, idx) => (
										<HitRow key={h.kind + ':' + h.id} hit={h} focused={idx === focusIdx} onSelect={() => go(h)} />
									))}
								</>
							)}
							{query.data.world.length > 0 && (
								<>
									<div style={{ ...sectionLabel, color: 'var(--ink-3)' }}>Worldwide</div>
									{query.data.world.map((h, idx) => {
										const flatIdx = (query.data?.colorado.length || 0) + idx;
										return (
											<HitRow key={h.kind + ':' + h.id} hit={h} focused={flatIdx === focusIdx} onSelect={() => go(h)} />
										);
									})}
								</>
							)}
						</>
					)}
					{showEmpty && (
						<div style={{ padding: '14px 14px', fontSize: 13, color: 'var(--ink-3)' }}>
							No matches for "{trimmed}". Try a different name.
						</div>
					)}
				</div>
			)}
		</div>
	);
}

function HitRow({ hit, focused, onSelect }: { hit: SearchHit; focused: boolean; onSelect: () => void }) {
	const isColorado = hit.kind !== 'world-river';
	return (
		<div
			onMouseDown={(e) => { e.preventDefault(); onSelect(); }}
			style={{
				...hitRowBase,
				background: focused ? 'var(--bg-sunken)' : 'transparent',
			}}
		>
			<div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
				<div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-0)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
					{hit.name}
				</div>
				<div style={{ fontSize: 12, color: 'var(--ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
					{hit.subtitle}
				</div>
			</div>
			<div style={{
				fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.10em',
				textTransform: 'uppercase', color: isColorado ? 'var(--river-600)' : 'var(--ink-3)',
				flexShrink: 0,
			}}>
				{labelForKind(hit.kind)}
			</div>
		</div>
	);
}

function labelForKind(kind: SearchHit['kind']): string {
	switch (kind) {
		case 'section': return 'Section';
		case 'river': return 'River';
		case 'watershed': return 'Watershed';
		case 'corridor': return 'Corridor';
		case 'world-river': return 'Worldwide';
	}
}
