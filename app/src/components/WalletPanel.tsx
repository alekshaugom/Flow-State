import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { formatKarma } from '../lib/format';

const monoLabel: React.CSSProperties = {
	fontFamily: 'var(--font-mono)',
	fontSize: 10,
	letterSpacing: '0.10em',
	textTransform: 'uppercase' as const,
	color: 'var(--ink-3)',
	fontWeight: 500,
};

const metricCard: React.CSSProperties = {
	padding: '12px 14px',
	borderRadius: 'var(--r-md)',
	background: 'var(--bg-raised)',
	border: '1px solid var(--rule)',
	display: 'flex',
	flexDirection: 'column',
	gap: 4,
};

type LedgerType = 'grant' | 'bounty_fund' | 'bounty_refund' | 'bounty_award' | 'platform_fee';

const TYPE_LABEL: Record<string, string> = {
	grant: 'Grant',
	bounty_fund: 'Bounty fund',
	bounty_refund: 'Bounty refund',
	bounty_award: 'Bounty award',
	platform_fee: 'Platform fee',
};

function EntryList({ entries }: { entries: any[] }) {
	if (entries.length === 0) {
		return <div style={{ fontSize: 12, color: 'var(--ink-4)', fontStyle: 'italic' }}>No entries.</div>;
	}
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
			{entries.map((e: any) => (
				<div key={e.id} style={{
					display: 'flex', justifyContent: 'space-between', alignItems: 'center',
					padding: '5px 8px', borderRadius: 'var(--r-sm)',
					background: 'var(--bg-card)', border: '1px solid var(--rule)',
					gap: 8, flexWrap: 'wrap',
				}}>
					<div style={{ fontSize: 11, color: 'var(--ink-2)', minWidth: 0 }}>
						<span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-3)', fontSize: 10 }}>
							{TYPE_LABEL[e.type as LedgerType] || e.type}
						</span>
						{e.note && <span style={{ color: 'var(--ink-3)', marginLeft: 6 }}>· {e.note}</span>}
						{e.createdAt && (
							<span style={{ color: 'var(--ink-4)', marginLeft: 6, fontSize: 10 }}>
								{new Date(e.createdAt).toLocaleDateString()}
							</span>
						)}
					</div>
					<span style={{
						fontFamily: 'var(--font-mono)',
						fontSize: 12,
						fontWeight: 600,
						color: e.amountCents >= 0 ? 'var(--green-700, #15803d)' : 'var(--red-600, #dc2626)',
						whiteSpace: 'nowrap',
					}}>
						{e.amountCents >= 0 ? '+' : ''}{formatKarma(e.amountCents)}
					</span>
				</div>
			))}
		</div>
	);
}

interface MetricRowProps {
	label: string;
	value: number;
	entries: any[];
	filterTypes: LedgerType[];
}

function MetricRow({ label, value, entries, filterTypes }: MetricRowProps) {
	const [expanded, setExpanded] = useState(false);
	const filtered = entries.filter((e: any) => filterTypes.includes(e.type as LedgerType));

	return (
		<div style={metricCard}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
				<div>
					<div style={monoLabel}>{label}</div>
					<div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600, color: 'var(--ink-0)', letterSpacing: '-0.01em', marginTop: 2 }}>
						{formatKarma(value)}
					</div>
				</div>
				{filtered.length > 0 && (
					<button
						type="button"
						onClick={() => setExpanded(v => !v)}
						style={{
							background: 'none', border: 'none', cursor: 'pointer',
							color: 'var(--river-600)', fontSize: 12, fontWeight: 600,
							padding: '4px 8px',
						}}
					>
						{expanded ? 'Hide' : `${filtered.length} entries`}
					</button>
				)}
			</div>
			{expanded && (
				<div style={{ marginTop: 6 }}>
					<EntryList entries={filtered} />
				</div>
			)}
		</div>
	);
}

interface WalletPanelProps {
	/** Omit to view own wallet. Pass userId for admin view of another user. */
	userId?: string;
}

export function WalletPanel({ userId }: WalletPanelProps) {
	const { data, isLoading, error } = useQuery({
		queryKey: ['wallet', userId ?? 'me'],
		queryFn: () => api.getWallet(userId),
		staleTime: 30_000,
	});

	if (isLoading) {
		return (
			<div style={{ padding: '12px 0', fontSize: 13, color: 'var(--ink-3)' }}>Loading wallet…</div>
		);
	}

	if (error || !data) {
		return (
			<div style={{ padding: '12px 0', fontSize: 13, color: 'var(--red-600, #dc2626)' }}>
				{error ? String((error as Error).message) : 'Could not load wallet'}
			</div>
		);
	}

	const history: any[] = data.history ?? [];

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
			{/* Balance (hero) */}
			<div style={{
				padding: '16px 18px',
				borderRadius: 'var(--r-lg)',
				background: 'var(--river-50, #eff6ff)',
				border: '1px solid var(--river-100, #dbeafe)',
			}}>
				<div style={monoLabel}>Karma balance</div>
				<div style={{
					fontFamily: 'var(--font-mono)',
					fontSize: 32,
					fontWeight: 700,
					color: 'var(--river-700)',
					letterSpacing: '-0.02em',
					marginTop: 4,
				}}>
					{formatKarma(data.balanceCents ?? 0)}
				</div>
				<div style={{ fontSize: 11, color: 'var(--river-600)', marginTop: 4 }}>
					Karma — earned by contributing, spent funding bounties. Not money.
				</div>
			</div>

			{/* Metrics grid */}
			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
				<MetricRow
					label="Received"
					value={data.putInCents ?? 0}
					entries={history}
					filterTypes={['grant']}
				/>
				<MetricRow
					label="Earned"
					value={data.collectedCents ?? 0}
					entries={history}
					filterTypes={['bounty_award']}
				/>
				{/* Cash-out is a slice-23 money concept; shown muted as a placeholder */}
				<div style={{ ...metricCard, opacity: 0.45 }}>
					<div style={monoLabel}>Cash-out · with payments (coming)</div>
					<div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: '-0.01em', marginTop: 2 }}>—</div>
				</div>
				<MetricRow
					label="Spent"
					value={data.fundedCents ?? 0}
					entries={history}
					filterTypes={['bounty_fund']}
				/>
			</div>

			{/* Full history toggle */}
			<FullHistoryToggle entries={history} />
		</div>
	);
}

function FullHistoryToggle({ entries }: { entries: any[] }) {
	const [open, setOpen] = useState(false);
	if (entries.length === 0) return null;
	return (
		<div>
			<button
				type="button"
				onClick={() => setOpen(v => !v)}
				style={{
					background: 'none', border: 'none', cursor: 'pointer',
					color: 'var(--ink-3)', fontSize: 12, fontWeight: 600,
					padding: '4px 0',
				}}
			>
				{open ? 'Hide full history' : `Show full history (${entries.length})`}
			</button>
			{open && (
				<div style={{ marginTop: 8 }}>
					<EntryList entries={[...entries].reverse()} />
				</div>
			)}
		</div>
	);
}
