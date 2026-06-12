import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../hooks/useDashboard';
import { useFollows } from '../hooks/useFollows';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { usePreferences } from '../hooks/usePreferences';
import { flowValue, flowUnitLabel } from '../lib/units';
import { isTributary, mainStemOf, shortRiverName, basinFor } from '../lib/riverSystems';
import { RiverMap } from '../components/RiverMap';
import { Shell } from '../shell/Shell';
import { MapRail } from '../shell/MapRail';
import { Icon, Sparkline, CorridorSpark, statusColor, statusLabel } from '../ds';
import { STATUS_ORDER } from '../constants';
import type { DashboardSection } from '../types';
import type { DesignStatus } from '../constants';

// ── corridor grouping ────────────────────────────────────────────────────────

interface CorridorGroup {
  slug: string;
  name: string;
  region: string;
  sections: DashboardSection[];
  // aggregate
  minCfs: number;
  maxCfs: number;
  worstStatus: DesignStatus;
  /** representative sparkline (longest among sections) */
  spark: number[];
  // basin / river-system metadata
  watershedSlug: string;
  watershedName: string;
  /** display basin (forks of one river roll up — e.g. N+S Platte → Platte Basin) */
  basinKey: string;
  basinName: string;
  riverName: string;
  isTributary: boolean;
  mainStemName: string | null;
}

function worstStatus(statuses: DesignStatus[]): DesignStatus {
  // STATUS_ORDER = ['ideal','runnable','high','low','dangerous']
  // "worst" = highest danger — invert: dangerous first
  const priority: DesignStatus[] = ['dangerous', 'high', 'low', 'runnable', 'ideal'];
  for (const s of priority) {
    if (statuses.includes(s)) return s;
  }
  return statuses[0] ?? 'low';
}

function groupSections(sections: DashboardSection[]): CorridorGroup[] {
  const map = new Map<string, DashboardSection[]>();

  for (const s of sections) {
    const key = s.corridorSlug ?? `river:${s.river}`;
    const arr = map.get(key) ?? [];
    arr.push(s);
    map.set(key, arr);
  }

  const groups: CorridorGroup[] = [];
  for (const [slug, secs] of map.entries()) {
    const cfsValues = secs.map(s => s.now ?? 0).filter(v => v > 0);
    const minCfs = cfsValues.length ? Math.min(...cfsValues) : 0;
    const maxCfs = cfsValues.length ? Math.max(...cfsValues) : 0;
    const statuses = secs.map(s => s.status);

    // Best sparkline = longest non-empty one
    const spark = secs.reduce<number[]>((best, s) => {
      return s.sparkline.length > best.length ? s.sparkline : best;
    }, []);

    // Name and region from first section in group
    const first = secs[0];
    const corridorName = first.corridorName ?? first.river;
    const basin = basinFor(first.watershedSlug, first.watershedName);
    const region = basin.name;

    // Sort sections by sortIndex
    const sorted = [...secs].sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0));

    groups.push({
      slug,
      name: corridorName,
      region,
      sections: sorted,
      minCfs,
      maxCfs,
      worstStatus: worstStatus(statuses),
      spark,
      watershedSlug: first.watershedSlug ?? first.watershedName ?? `river:${first.river}`,
      watershedName: first.watershedName ?? '',
      basinKey: basin.key,
      basinName: basin.name,
      riverName: first.river,
      isTributary: isTributary(first.river),
      mainStemName: mainStemOf(first.river),
    });
  }

  // Sort groups by corridorSortIndex of their first section, then name
  return groups.sort((a, b) => {
    const ai = a.sections[0]?.corridorSortIndex ?? 999;
    const bi = b.sections[0]?.corridorSortIndex ?? 999;
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name);
  });
}

// ── basin grouping ────────────────────────────────────────────────────────────

interface BasinGroup {
  slug: string;          // basinKey
  name: string;          // basin display name (the system label)
  groups: CorridorGroup[]; // corridor groups in this basin, ordered main-stem-first
  sectionCount: number;  // total sections across all groups
}

// Splits a list of corridor groups into { boxed, loose }.
// A basin is "boxed" ONLY if this list contains corridor groups from >=2 DISTINCT rivers
// of that basin. Otherwise its groups are "loose" (rendered exactly as today).
// Basins are the display grouping (see basinFor) — forks of one river roll up together
// (e.g. North + South Platte → Platte Basin).
function splitIntoBasins(groups: CorridorGroup[]): { boxed: BasinGroup[]; loose: CorridorGroup[] } {
  // Bucket groups by basinKey
  const buckets = new Map<string, CorridorGroup[]>();
  for (const g of groups) {
    const arr = buckets.get(g.basinKey) ?? [];
    arr.push(g);
    buckets.set(g.basinKey, arr);
  }

  const boxed: BasinGroup[] = [];
  const loose: CorridorGroup[] = [];

  for (const [basinKey, bucket] of buckets.entries()) {
    // Count distinct river names within this bucket
    const distinctRivers = new Set(bucket.map(g => g.riverName));
    if (distinctRivers.size >= 2) {
      // Boxed basin: sort main-stem first, then by corridorSortIndex, then name
      const sorted = [...bucket].sort((a, b) => {
        const aTrib = a.isTributary ? 1 : 0;
        const bTrib = b.isTributary ? 1 : 0;
        if (aTrib !== bTrib) return aTrib - bTrib;
        const ai = a.sections[0]?.corridorSortIndex ?? 999;
        const bi = b.sections[0]?.corridorSortIndex ?? 999;
        if (ai !== bi) return ai - bi;
        // tiebreak (e.g. merged forks like N+S Platte): larger fork leads
        if (a.sections.length !== b.sections.length) return b.sections.length - a.sections.length;
        return a.name.localeCompare(b.name);
      });
      const sectionCount = sorted.reduce((sum, g) => sum + g.sections.length, 0);
      boxed.push({
        slug: basinKey,
        name: bucket[0].basinName,
        groups: sorted,
        sectionCount,
      });
    } else {
      // Loose: keep original incoming order (bucket preserves insertion order from groups)
      for (const g of bucket) {
        loose.push(g);
      }
    }
  }

  // Loose keeps the original incoming order; re-sort by original index in groups array
  const groupOrder = new Map(groups.map((g, i) => [g.slug, i]));
  loose.sort((a, b) => (groupOrder.get(a.slug) ?? 0) - (groupOrder.get(b.slug) ?? 0));

  // Order boxed basins by sectionCount desc, then name
  boxed.sort((a, b) => {
    if (b.sectionCount !== a.sectionCount) return b.sectionCount - a.sectionCount;
    return a.name.localeCompare(b.name);
  });

  return { boxed, loose };
}

// ── sub-components ───────────────────────────────────────────────────────────

interface SectionRowProps {
  section: DashboardSection;
  onClick: () => void;
}

function SectionRow({ section: s, onClick }: SectionRowProps) {
  const sc = statusColor(s.status);
  const sl = statusLabel(s.status);
  const { units } = usePreferences();
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        textAlign: 'left',
        border: 'none',
        cursor: 'pointer',
        background: 'var(--module-fill-dark)',
        borderRadius: 15,
        padding: '12px 14px',
        color: 'var(--fg-on-sky-1)',
      }}
    >
      <span style={{ width: 9, height: 9, borderRadius: 99, background: sc, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {s.section}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--fg-on-sky-2)', marginTop: 2 }}>
          {s.classification ? `${s.classification} · ` : ''}{sl}
        </div>
      </div>
      {s.sparkline.length > 1 && (
        <Sparkline data={s.sparkline} width={62} height={28} color={sc} fill={false} dot />
      )}
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 64 }}>
        <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 17, fontWeight: 700 }}>
          {s.now !== null ? flowValue(s.now, units.flow) : '—'}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg-on-sky-3)' }}> {flowUnitLabel(units.flow)}</span>
      </div>
      <Icon name="chevron-right" size={17} color="var(--fg-on-sky-3)" style={{ flexShrink: 0 }} />
    </button>
  );
}

// Basin context passed to cards/rows when rendering inside a BasinBox
interface BasinContext {
  isTributary: boolean;
  mainStemShort: string | null;
}

interface CorridorCardLgProps {
  group: CorridorGroup;
  bookmarkedSectionIds: Set<string>;
  onOpenCorridor: () => void;
  onOpenSection: (sectionId: string) => void;
  onHoverChange?: (ids: Set<string> | null) => void;
  basinContext?: BasinContext;
  /** Glow this tile because its section is hovered on the map. */
  mapHovered?: boolean;
}

function CorridorCardLg({ group, bookmarkedSectionIds, onOpenCorridor, onOpenSection, onHoverChange, basinContext, mapHovered }: CorridorCardLgProps) {
  const sc = statusColor(group.worstStatus);
  const sl = statusLabel(group.worstStatus);
  const { units } = usePreferences();

  const rangeLabel =
    group.minCfs === group.maxCfs
      ? flowValue(group.maxCfs, units.flow)
      : `${flowValue(group.minCfs, units.flow)}–${flowValue(group.maxCfs, units.flow)}`;

  // Show bookmarked sections first, then the rest — but always show all in "Your rivers"
  const prioritized = [
    ...group.sections.filter(s => bookmarkedSectionIds.has(s.id)),
    ...group.sections.filter(s => !bookmarkedSectionIds.has(s.id)),
  ];

  // Subtitle when inside a basin box
  const basinSubtitle = basinContext
    ? (basinContext.isTributary ? `${basinContext.mainStemShort} ↳ tributary` : null)
    : null;

  return (
    <div
      className={`fs-river-tile${mapHovered ? ' fs-river-tile--active' : ''}`}
      onClick={onOpenCorridor}
      onMouseEnter={() => onHoverChange?.(new Set(group.sections.map(s => s.id)))}
      onMouseLeave={() => onHoverChange?.(null)}
      style={{
        cursor: 'pointer',
        borderRadius: 26,
        padding: 22,
        color: 'var(--fg-on-sky-1)',
        position: 'relative',
        overflow: 'hidden',
        background:
          'linear-gradient(158deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 55%, rgba(255,255,255,0.05) 100%)',
        backdropFilter: 'blur(22px) saturate(150%)',
        WebkitBackdropFilter: 'blur(22px) saturate(150%)',
        boxShadow: '0 16px 38px rgba(6,19,33,0.30), inset 0 1px 0 rgba(255,255,255,0.30)',
        border: '1px solid var(--module-stroke)',
        transition: 'transform 0.2s cubic-bezier(.32,.72,0,1), box-shadow 0.2s',
      }}
    >
      {/* Status accent stripe */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, background: sc, opacity: 0.92 }} />

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-0.02em' }}>
            {group.name}
          </div>
          {basinContext
            ? (basinSubtitle
              ? <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--fg-on-sky-2)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{basinSubtitle}</div>
              : null)
            : <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--fg-on-sky-2)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{group.region}</div>
          }
        </div>
        <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: 'var(--fg-on-sky-1)', background: 'var(--module-fill)', borderRadius: 'var(--r-pill, 99px)', padding: '6px 12px', whiteSpace: 'nowrap' }}>
          {group.sections.length} {group.sections.length === 1 ? 'section' : 'sections'}
        </span>
      </div>

      {/* cfs + sparkline row */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginTop: 16, paddingBottom: 16, borderBottom: '1px solid var(--module-stroke)' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
            <span style={{ fontWeight: 300, fontSize: 40, lineHeight: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              {rangeLabel}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--fg-on-sky-2)' }}>{flowUnitLabel(units.flow)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-on-sky-1)' }}>{sl}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--fg-on-sky-3)' }}>· last 30 days</span>
          </div>
        </div>
        {group.spark.length > 1 && (
          <div style={{ flexShrink: 0, width: 148 }}>
            <CorridorSpark
              down={group.spark}
              colorDown={sc}
              width={148}
              height={50}
            />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--fg-on-sky-3)', textAlign: 'right', marginTop: 3 }}>
              30 days
            </div>
          </div>
        )}
      </div>

      {/* Section rows header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 15, marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--fg-on-sky-2)' }}>
          {bookmarkedSectionIds.size > 0 ? 'Your sections' : 'Sections'}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: 'var(--fg-on-sky-2)' }}>
          Open corridor <Icon name="chevron-right" size={15} />
        </span>
      </div>

      {/* Section rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {prioritized.map(s => (
          <SectionRow
            key={s.id}
            section={s}
            onClick={() => onOpenSection(s.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface OtherRiverRowProps {
  group: CorridorGroup;
  onClick: () => void;
  onHoverChange?: (ids: Set<string> | null) => void;
  basinContext?: BasinContext;
  /** Glow this row because its section is hovered on the map (OtherRiverRowLg only). */
  mapHovered?: boolean;
}

function OtherRiverRowLg({ group, onClick, onHoverChange, basinContext, mapHovered }: OtherRiverRowProps) {
  const sc = statusColor(group.worstStatus);
  const sl = statusLabel(group.worstStatus);
  const cfs = group.maxCfs > 0 ? group.maxCfs : group.minCfs;
  const { units } = usePreferences();

  // Subtitle when inside a basin box
  const subtitle = basinContext
    ? (basinContext.isTributary
      ? `${basinContext.mainStemShort} ↳ tributary · ${group.sections.length} ${group.sections.length === 1 ? 'section' : 'sections'}`
      : `${group.sections.length} ${group.sections.length === 1 ? 'section' : 'sections'}`)
    : `${group.region} · ${group.sections.length} ${group.sections.length === 1 ? 'section' : 'sections'}`;

  return (
    <button
      className={`fs-river-tile${mapHovered ? ' fs-river-tile--active' : ''}`}
      onClick={onClick}
      onMouseEnter={() => onHoverChange?.(new Set(group.sections.map(s => s.id)))}
      onMouseLeave={() => onHoverChange?.(null)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        textAlign: 'left',
        border: 'none',
        cursor: 'pointer',
        background: 'var(--module-fill)',
        borderRadius: 16,
        padding: '14px 16px',
        color: 'var(--fg-on-sky-1)',
        transition: 'background 0.15s',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {group.name}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--fg-on-sky-2)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {subtitle}
        </div>
      </div>
      {group.spark.length > 1 && (
        <Sparkline data={group.spark} width={58} height={28} color={sc} fill={false} dot />
      )}
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 70 }}>
        <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 16, fontWeight: 700 }}>
          {cfs > 0 ? flowValue(cfs, units.flow) : '—'}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg-on-sky-3)' }}> {flowUnitLabel(units.flow)}</span>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: sc, marginTop: 1 }}>{sl}</div>
      </div>
      <Icon name="chevron-right" size={17} color="var(--fg-on-sky-3)" style={{ flexShrink: 0 }} />
    </button>
  );
}

// Mobile: compact other-river row
function OtherRiverRowSm({ group, onClick, basinContext }: OtherRiverRowProps) {
  const sc = statusColor(group.worstStatus);
  const cfs = group.maxCfs > 0 ? group.maxCfs : group.minCfs;
  const { units } = usePreferences();

  // Subtitle when inside a basin box
  const subtitle = basinContext
    ? (basinContext.isTributary
      ? `${basinContext.mainStemShort} ↳ tributary · ${group.sections.length} ${group.sections.length === 1 ? 'section' : 'sections'}`
      : `${group.sections.length} ${group.sections.length === 1 ? 'section' : 'sections'}`)
    : `${group.region} · ${group.sections.length} ${group.sections.length === 1 ? 'section' : 'sections'}`;

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        textAlign: 'left',
        border: 'none',
        cursor: 'pointer',
        background: 'var(--module-fill)',
        borderRadius: 16,
        padding: '13px 14px',
        color: 'var(--fg-on-sky-1)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {group.name}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-on-sky-2)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {subtitle}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 15, fontWeight: 700 }}>
          {cfs > 0 ? flowValue(cfs, units.flow) : '—'}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-on-sky-3)' }}> {flowUnitLabel(units.flow)}</span>
      </div>
      {group.spark.length > 1 && (
        <Sparkline data={group.spark} width={50} height={26} color={sc} fill={false} dot />
      )}
      <Icon name="chevron-right" size={16} color="var(--fg-on-sky-3)" style={{ flexShrink: 0 }} />
    </button>
  );
}

// Mobile Your-river card
interface YourRiverCardProps {
  group: CorridorGroup;
  bookmarkedSectionIds: Set<string>;
  onOpenCorridor: () => void;
  onOpenSection: (sectionId: string) => void;
  basinContext?: BasinContext;
}

function YourRiverCard({ group, bookmarkedSectionIds, onOpenCorridor, onOpenSection, basinContext }: YourRiverCardProps) {
  const sc = statusColor(group.worstStatus);
  // Show bookmarked sections first
  const prioritized = [
    ...group.sections.filter(s => bookmarkedSectionIds.has(s.id)),
    ...group.sections.filter(s => !bookmarkedSectionIds.has(s.id)),
  ];

  // Subtitle when inside a basin box
  const basinSubtitle = basinContext
    ? (basinContext.isTributary ? `${basinContext.mainStemShort} ↳ tributary` : null)
    : null;

  return (
    <div
      onClick={onOpenCorridor}
      style={{
        cursor: 'pointer',
        borderRadius: 24,
        padding: 17,
        color: 'var(--fg-on-sky-1)',
        position: 'relative',
        overflow: 'hidden',
        background:
          'linear-gradient(158deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 55%, rgba(255,255,255,0.05) 100%)',
        backdropFilter: 'blur(22px) saturate(150%)',
        WebkitBackdropFilter: 'blur(22px) saturate(150%)',
        boxShadow: '0 12px 30px rgba(6,19,33,0.30), inset 0 1px 0 rgba(255,255,255,0.30)',
        border: '1px solid var(--module-stroke)',
      }}
    >
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: sc, opacity: 0.9 }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-0.015em' }}>
            {group.name}
          </div>
          {basinContext
            ? (basinSubtitle
              ? <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-on-sky-2)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{basinSubtitle}</div>
              : null)
            : <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-on-sky-2)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{group.region}</div>
          }
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 600, color: 'var(--fg-on-sky-2)', flexShrink: 0 }}>
          Corridor <Icon name="chevron-right" size={14} />
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
        {prioritized.map(s => (
          <SectionRow key={s.id} section={s} onClick={() => onOpenSection(s.id)} />
        ))}
      </div>
    </div>
  );
}

// Basin box wrapper — groups corridors from the same watershed
interface BasinBoxProps {
  name: string;
  sectionCount: number;
  mobile?: boolean;
  /** All section ids in this basin — highlighted on the map while the box is hovered (desktop). */
  sectionIds?: Set<string>;
  onHoverChange?: (ids: Set<string> | null) => void;
  children: React.ReactNode;
}

function BasinBox({ name, sectionCount, mobile, sectionIds, onHoverChange, children }: BasinBoxProps) {
  return (
    <div
      onMouseEnter={onHoverChange ? () => onHoverChange(sectionIds ?? null) : undefined}
      onMouseLeave={onHoverChange ? () => onHoverChange(null) : undefined}
      style={{
        background: 'var(--module-fill-dark)',
        border: '1px solid var(--module-stroke)',
        borderRadius: mobile ? 22 : 28,
        padding: mobile ? 14 : 16,
      }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12, padding: '0 2px' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-on-sky-2)' }}>{name}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-on-sky-3)' }}>
          · {sectionCount} {sectionCount === 1 ? 'section' : 'sections'}
        </span>
      </div>
      {children}
    </div>
  );
}

// Full-screen map overlay (mobile)
interface MapOverlayProps {
  onClose: () => void;
  corridorCount: number;
}

function RiverMapOverlay({ onClose, corridorCount }: MapOverlayProps) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, overflow: 'hidden' }}>
      <RiverMap style={{ width: '100%', height: '100%' }} />
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 600,
        padding: '52px 16px 22px',
        display: 'flex', alignItems: 'center', gap: 12, color: 'var(--fg-on-sky-1)',
        background: 'linear-gradient(180deg, rgba(6,19,33,0.74) 0%, rgba(6,19,33,0.4) 54%, rgba(6,19,33,0) 100%)',
        pointerEvents: 'none',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, textShadow: '0 1px 6px rgba(6,19,33,0.55)' }}>All rivers</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--fg-on-sky-2)', marginTop: 2 }}>
            {corridorCount} {corridorCount === 1 ? 'corridor' : 'corridors'} · tap a section for details
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'var(--module-fill)', border: 'none', borderRadius: 99,
            width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--fg-on-sky-1)', cursor: 'pointer', backdropFilter: 'blur(8px)', flexShrink: 0,
            pointerEvents: 'auto',
          }}
        >
          <Icon name="x" size={20} />
        </button>
      </div>
    </div>
  );
}

// Skeleton loader
function SkeletonCard() {
  return (
    <div style={{
      borderRadius: 24,
      padding: 22,
      background: 'var(--module-fill)',
      border: '1px solid var(--module-stroke)',
      height: 180,
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  );
}

// ── Main RiversHome ──────────────────────────────────────────────────────────

export function RiversHome() {
  const navigate = useNavigate();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const { data, isLoading, isError } = useDashboard();
  const follows = useFollows();
  const [q, setQ] = useState('');
  const [mapOpen, setMapOpen] = useState(false);
  const [hoveredSectionIds, setHoveredSectionIds] = useState<Set<string> | null>(null);
  // Reverse direction: a section line hovered on the map glows its list tile.
  const [mapHoveredSectionId, setMapHoveredSectionId] = useState<string | null>(null);
  const debouncedQ = useDebouncedValue(q, 180);

  const { yourGroups, otherGroups } = useMemo(() => {
    if (!data) return { yourGroups: [], otherGroups: [] };

    const groups = groupSections(data.sections);

    const yours = groups.filter(g =>
      follows.isFollowingCorridor(g.slug) ||
      g.sections.some(s => follows.isFollowingSection(s.id))
    );
    const yourSlugs = new Set(yours.map(g => g.slug));
    const others = groups.filter(g => !yourSlugs.has(g.slug));

    return { yourGroups: yours, otherGroups: others };
  }, [data, follows]);

  const ql = debouncedQ.trim().toLowerCase();
  const filteredOthers = useMemo(() => {
    if (!ql) return otherGroups;
    return otherGroups.filter(g =>
      g.name.toLowerCase().includes(ql) ||
      g.region.toLowerCase().includes(ql) ||
      g.sections.some(s => s.section.toLowerCase().includes(ql) || s.river.toLowerCase().includes(ql))
    );
  }, [otherGroups, ql]);

  const totalCorridorCount = yourGroups.length + otherGroups.length;

  // True when the section currently hovered on the map belongs to this corridor tile.
  const isMapHovered = (g: CorridorGroup) =>
    mapHoveredSectionId != null && g.sections.some(s => s.id === mapHoveredSectionId);

  const handleOpenCorridor = (slug: string) => {
    navigate(`/corridor/${slug}`);
  };

  const handleOpenSection = (sectionId: string) => {
    navigate(`/section/${sectionId}`);
  };

  // ── DESKTOP layout ──────────────────────────────────────────────────────────
  if (isDesktop) {
    const yourBasins = splitIntoBasins(yourGroups);
    const otherBasins = splitIntoBasins(filteredOthers);

    return (
      <Shell active="rivers" light={false}>
        {/* pulse keyframes + river-tile hover glow */}
        <style>{`
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
          .fs-river-tile { transition: box-shadow .18s ease; }
          .fs-river-tile:hover, .fs-river-tile--active {
            box-shadow:
              0 0 0 1.5px rgba(130,200,255,0.95),
              0 0 22px 1px rgba(120,190,255,0.55),
              0 16px 40px rgba(6,19,33,0.34) !important;
          }
        `}</style>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 438px' }}>
          {/* Left: content column */}
          <div style={{ padding: '38px 32px 56px' }}>
            <div style={{ maxWidth: 1080, margin: '0 auto' }}>

              {/* Your rivers */}
              <div style={{ marginBottom: 4 }}>
                <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.025em' }}>Your rivers</div>
                <div style={{ fontSize: 15, color: 'var(--fg-on-sky-2)', marginTop: 3 }}>
                  {yourGroups.length} {yourGroups.length === 1 ? 'corridor' : 'corridors'} followed
                </div>
              </div>

              {isLoading && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px,1fr))', gap: 20, marginTop: 22 }}>
                  <SkeletonCard /><SkeletonCard />
                </div>
              )}

              {isError && (
                <div style={{ marginTop: 22, color: 'var(--fg-on-sky-2)', fontSize: 15 }}>
                  Unable to load river data. Please try again.
                </div>
              )}

              {!isLoading && !isError && yourGroups.length === 0 && (
                <div style={{ marginTop: 22, padding: '32px 24px', borderRadius: 20, background: 'var(--module-fill)', border: '1px solid var(--module-stroke)', textAlign: 'center', color: 'var(--fg-on-sky-2)' }}>
                  <Icon name="waves" size={36} color="var(--fg-on-sky-3)" style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--fg-on-sky-1)' }}>Follow a river to see it here</div>
                  <div style={{ fontSize: 14, marginTop: 6 }}>Browse other rivers below and tap to explore.</div>
                </div>
              )}

              {!isLoading && !isError && yourGroups.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 22 }}>
                  {/* Boxed basins first */}
                  {yourBasins.boxed.map(basin => {
                    const basinSet = new Set(basin.groups.flatMap(g => g.sections.map(s => s.id)));
                    return (
                    <BasinBox key={basin.slug} name={basin.name} sectionCount={basin.sectionCount} sectionIds={basinSet} onHoverChange={setHoveredSectionIds}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px,1fr))', gap: 20, alignItems: 'start' }}>
                        {basin.groups.map(g => (
                          <CorridorCardLg
                            key={g.slug}
                            group={g}
                            bookmarkedSectionIds={follows.sectionIds}
                            onOpenCorridor={() => handleOpenCorridor(g.slug)}
                            onOpenSection={handleOpenSection}
                            onHoverChange={(ids) => setHoveredSectionIds(ids ?? basinSet)}
                            basinContext={{ isTributary: g.isTributary, mainStemShort: shortRiverName(g.mainStemName) }}
                            mapHovered={isMapHovered(g)}
                          />
                        ))}
                      </div>
                    </BasinBox>
                    );
                  })}
                  {/* Loose groups */}
                  {yourBasins.loose.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px,1fr))', gap: 20, alignItems: 'start' }}>
                      {yourBasins.loose.map(g => (
                        <CorridorCardLg
                          key={g.slug}
                          group={g}
                          bookmarkedSectionIds={follows.sectionIds}
                          onOpenCorridor={() => handleOpenCorridor(g.slug)}
                          onOpenSection={handleOpenSection}
                          onHoverChange={setHoveredSectionIds}
                          mapHovered={isMapHovered(g)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Other rivers */}
              <div style={{ marginTop: 40 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-on-sky-2)' }}>
                    {ql ? `Search · ${filteredOthers.length} result${filteredOthers.length === 1 ? '' : 's'}` : 'Other rivers'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--module-fill)', border: '1px solid var(--module-stroke)', borderRadius: 'var(--r-pill,99px)', padding: '0 16px', height: 44, color: 'var(--fg-on-sky-1)', minWidth: 260 }}>
                    <Icon name="search" size={18} color="var(--fg-on-sky-2)" />
                    <input
                      value={q}
                      onChange={e => setQ(e.target.value)}
                      placeholder="Search rivers"
                      style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: 'var(--fg-on-sky-1)', fontFamily: 'var(--font-sans)', fontSize: 15 }}
                    />
                    {q && (
                      <button onClick={() => setQ('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-on-sky-2)', display: 'flex', padding: 0 }}>
                        <Icon name="x" size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {!isLoading && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
                    {/* Boxed basins first */}
                    {otherBasins.boxed.map(basin => {
                      const basinSet = new Set(basin.groups.flatMap(g => g.sections.map(s => s.id)));
                      return (
                      <BasinBox key={basin.slug} name={basin.name} sectionCount={basin.sectionCount} sectionIds={basinSet} onHoverChange={setHoveredSectionIds}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px,1fr))', gap: 12 }}>
                          {basin.groups.map(g => (
                            <OtherRiverRowLg
                              key={g.slug}
                              group={g}
                              onClick={() => handleOpenCorridor(g.slug)}
                              onHoverChange={(ids) => setHoveredSectionIds(ids ?? basinSet)}
                              basinContext={{ isTributary: g.isTributary, mainStemShort: shortRiverName(g.mainStemName) }}
                              mapHovered={isMapHovered(g)}
                            />
                          ))}
                        </div>
                      </BasinBox>
                      );
                    })}
                    {/* Loose groups */}
                    {otherBasins.loose.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px,1fr))', gap: 12 }}>
                        {otherBasins.loose.map(g => (
                          <OtherRiverRowLg
                            key={g.slug}
                            group={g}
                            onClick={() => handleOpenCorridor(g.slug)}
                            onHoverChange={setHoveredSectionIds}
                            mapHovered={isMapHovered(g)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {isLoading && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px,1fr))', gap: 12, marginTop: 16 }}>
                    <SkeletonCard /><SkeletonCard /><SkeletonCard />
                  </div>
                )}

                {!isLoading && !isError && filteredOthers.length === 0 && ql && (
                  <div style={{ textAlign: 'center', color: 'var(--fg-on-sky-2)', fontSize: 15, padding: '28px 0' }}>
                    No rivers match "{q}".
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--fg-on-sky-3)', marginTop: 30 }}>
                Data via USGS, NRCS &amp; NOAA
              </div>
            </div>
          </div>

          {/* Right: persistent map rail */}
          <MapRail corridorCount={totalCorridorCount} highlightedSectionIds={hoveredSectionIds} onSectionHover={setMapHoveredSectionId} />
        </div>
      </Shell>
    );
  }

  // ── MOBILE layout ───────────────────────────────────────────────────────────
  const yourBasins = splitIntoBasins(yourGroups);
  const otherBasins = splitIntoBasins(filteredOthers);

  return (
    <Shell active="rivers" light={false}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
      <div style={{ position: 'relative', minHeight: '100vh' }}>
        <div style={{ padding: '0 16px 120px', overflowY: 'auto' }}>

          {/* Your rivers panel — frosted header section */}
          <div style={{
            margin: '0 -16px',
            padding: '64px 16px 18px',
            color: 'var(--fg-on-sky-1)',
            borderBottomLeftRadius: 30,
            borderBottomRightRadius: 30,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.06) 100%)',
            borderBottom: '1px solid var(--module-stroke)',
            boxShadow: '0 18px 38px rgba(6,19,33,0.34)',
          }}>
            <div style={{ padding: '0 4px' }}>
              <div style={{ fontSize: 33, fontWeight: 800, letterSpacing: '-0.025em' }}>Your rivers</div>
              <div style={{ fontSize: 14, color: 'var(--fg-on-sky-2)', marginTop: 2 }}>
                {yourGroups.length} {yourGroups.length === 1 ? 'corridor' : 'corridors'} followed
              </div>
            </div>

            {isLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
                <SkeletonCard />
              </div>
            )}

            {!isLoading && !isError && yourGroups.length === 0 && (
              <div style={{ marginTop: 14, padding: '20px 4px', textAlign: 'center', color: 'var(--fg-on-sky-2)' }}>
                <Icon name="waves" size={28} color="var(--fg-on-sky-3)" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-on-sky-1)' }}>Follow a river to see it here</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Browse below and tap a river to explore.</div>
              </div>
            )}

            {!isLoading && !isError && yourGroups.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
                {/* Boxed basins first */}
                {yourBasins.boxed.map(basin => (
                  <BasinBox key={basin.slug} name={basin.name} sectionCount={basin.sectionCount} mobile>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {basin.groups.map(g => (
                        <YourRiverCard
                          key={g.slug}
                          group={g}
                          bookmarkedSectionIds={follows.sectionIds}
                          onOpenCorridor={() => handleOpenCorridor(g.slug)}
                          onOpenSection={handleOpenSection}
                          basinContext={{ isTributary: g.isTributary, mainStemShort: shortRiverName(g.mainStemName) }}
                        />
                      ))}
                    </div>
                  </BasinBox>
                ))}
                {/* Loose groups */}
                {yourBasins.loose.map(g => (
                  <YourRiverCard
                    key={g.slug}
                    group={g}
                    bookmarkedSectionIds={follows.sectionIds}
                    onOpenCorridor={() => handleOpenCorridor(g.slug)}
                    onOpenSection={handleOpenSection}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Other rivers */}
          <div style={{ marginTop: 26 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--fg-on-sky-2)', padding: '0 4px' }}>
              Other rivers
            </div>

            {/* Search + Map button */}
            <div style={{ display: 'flex', gap: 10, marginTop: 11 }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 9, background: 'var(--module-fill)', borderRadius: 'var(--r-pill,99px)', padding: '0 14px', border: '1px solid var(--module-stroke)' }}>
                <Icon name="search" size={17} color="var(--fg-on-sky-2)" />
                <input
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Search rivers"
                  style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: 'var(--fg-on-sky-1)', fontFamily: 'var(--font-sans)', fontSize: 15, padding: '12px 0' }}
                />
                {q && (
                  <button onClick={() => setQ('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-on-sky-2)', display: 'flex', padding: 0 }}>
                    <Icon name="x" size={16} />
                  </button>
                )}
              </div>
              <button
                onClick={() => setMapOpen(true)}
                style={{
                  flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7, border: 'none', cursor: 'pointer',
                  background: 'rgba(255,255,255,0.92)', color: 'var(--flow-700, #1a5ea6)',
                  fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 14.5,
                  borderRadius: 'var(--r-pill,99px)', padding: '0 16px', height: 48,
                }}
              >
                <Icon name="map" size={17} />
                Map
              </button>
            </div>

            {/* Browse list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 13 }}>
              {isLoading && (
                <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
              )}
              {!isLoading && (
                <>
                  {/* Boxed basins first */}
                  {otherBasins.boxed.map(basin => (
                    <BasinBox key={basin.slug} name={basin.name} sectionCount={basin.sectionCount} mobile>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {basin.groups.map(g => (
                          <OtherRiverRowSm
                            key={g.slug}
                            group={g}
                            onClick={() => handleOpenCorridor(g.slug)}
                            basinContext={{ isTributary: g.isTributary, mainStemShort: shortRiverName(g.mainStemName) }}
                          />
                        ))}
                      </div>
                    </BasinBox>
                  ))}
                  {/* Loose groups */}
                  {otherBasins.loose.map(g => (
                    <OtherRiverRowSm
                      key={g.slug}
                      group={g}
                      onClick={() => handleOpenCorridor(g.slug)}
                    />
                  ))}
                </>
              )}
              {!isLoading && !isError && filteredOthers.length === 0 && ql && (
                <div style={{ textAlign: 'center', color: 'var(--fg-on-sky-2)', fontSize: 14, padding: '24px 0' }}>
                  No rivers match "{q}".
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-on-sky-3)', marginTop: 20 }}>
            Data via USGS, NRCS &amp; NOAA
          </div>
        </div>

        {/* Map overlay (mobile only) */}
        {mapOpen && (
          <RiverMapOverlay
            onClose={() => setMapOpen(false)}
            corridorCount={totalCorridorCount}
          />
        )}
      </div>
    </Shell>
  );
}
