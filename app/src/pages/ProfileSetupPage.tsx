import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api';
import type { MyCraftsResponse, MyLogsAggregateResponse } from '../types';

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

const sectionStyle: React.CSSProperties = {
	marginTop: 24,
	paddingTop: 18,
	borderTop: '1px dashed var(--rule)',
};

const sectionLabelStyle: React.CSSProperties = {
	fontFamily: 'var(--font-mono)',
	fontSize: 10,
	letterSpacing: '0.10em',
	textTransform: 'uppercase',
	color: 'var(--ink-3)',
	marginBottom: 8,
};

export function ProfileSetupPage() {
	const { isAuthenticated, isLoading, user } = useAuth();
	const navigate = useNavigate();
	const qc = useQueryClient();

	useEffect(() => {
		if (!isLoading && !isAuthenticated) navigate('/login', { replace: true });
	}, [isLoading, isAuthenticated, navigate]);

	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [hydrated, setHydrated] = useState(false);
	const [savedJustNow, setSavedJustNow] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (hydrated || !user) return;
		setFirstName((user as any).firstName || '');
		setLastName((user as any).lastName || '');
		setHydrated(true);
	}, [hydrated, user]);

	const crafts = useQuery<MyCraftsResponse>({
		queryKey: ['my-crafts'],
		queryFn: () => api.myCrafts(),
		enabled: isAuthenticated,
	});

	const logs = useQuery<MyLogsAggregateResponse>({
		queryKey: ['my-logs-aggregate'],
		queryFn: () => api.myLogsAggregate(),
		enabled: isAuthenticated,
	});

	const saveName = useMutation({
		mutationFn: () => api.setMyName(firstName.trim(), lastName.trim()),
		onSuccess: () => {
			setSavedJustNow(true);
			setError(null);
			qc.invalidateQueries({ queryKey: ['me'] });
		},
		onError: (err: any) => setError(err?.message || 'Could not save name'),
	});

	const onSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setSavedJustNow(false);
		if (!firstName.trim()) {
			setError('First name is required');
			return;
		}
		saveName.mutate();
	};

	if (!isAuthenticated || !user) return null;

	const totalCrafts = (crafts.data?.crafts || []).filter(c => !c.archivedAt).length;
	const totalTrips = logs.data?.logs?.length ?? 0;
	const lastTrip = logs.data?.watersheds?.[0]?.lastTripAt ?? null;

	return (
		<div style={{ maxWidth: 560, margin: '0 auto', padding: 'max(env(safe-area-inset-top), 16px) 16px 80px' }}>
			<div style={{
				fontFamily: 'var(--font-mono)',
				fontSize: 11,
				letterSpacing: '0.12em',
				textTransform: 'uppercase',
				color: 'var(--ink-3)',
			}}>YOUR ACCOUNT</div>
			<h1 style={{ margin: '4px 0 18px', fontSize: 22, fontWeight: 700, color: 'var(--ink-0)' }}>
				Profile
			</h1>

			<form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
				<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
					<div>
						<label style={labelStyle} htmlFor="first-name">First name</label>
						<input
							id="first-name"
							style={inputStyle}
							value={firstName}
							onChange={e => { setFirstName(e.target.value); setSavedJustNow(false); }}
							maxLength={80}
							autoComplete="given-name"
						/>
					</div>
					<div>
						<label style={labelStyle} htmlFor="last-name">Last name</label>
						<input
							id="last-name"
							style={inputStyle}
							value={lastName}
							onChange={e => { setLastName(e.target.value); setSavedJustNow(false); }}
							maxLength={80}
							autoComplete="family-name"
						/>
					</div>
				</div>

				<div>
					<label style={labelStyle} htmlFor="email">Email</label>
					<input
						id="email"
						style={{ ...inputStyle, background: 'var(--bg-sunken)', color: 'var(--ink-2)', cursor: 'not-allowed' }}
						value={user.email}
						readOnly
					/>
					<div style={{ marginTop: 4, color: 'var(--ink-4)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
						Contact an admin to change your email.
					</div>
				</div>

				{error && (
					<div style={{
						padding: '8px 12px',
						borderRadius: 'var(--r-md)',
						background: '#fdecea',
						color: '#a02323',
						fontSize: 13,
					}}>{error}</div>
				)}

				{savedJustNow && (
					<div style={{
						padding: '8px 12px',
						borderRadius: 'var(--r-md)',
						background: 'var(--river-50)',
						color: 'var(--river-800)',
						fontSize: 12,
						fontFamily: 'var(--font-mono)',
						letterSpacing: '0.08em',
						textTransform: 'uppercase',
					}}>SAVED</div>
				)}

				<div style={{ display: 'flex', gap: 10 }}>
					<button
						type="submit"
						disabled={saveName.isPending}
						style={{
							padding: '11px 20px',
							borderRadius: 'var(--r-md)',
							border: '1px solid var(--river-700)',
							background: 'var(--river-700)',
							color: '#fff',
							fontWeight: 600,
							fontSize: 14,
							cursor: saveName.isPending ? 'wait' : 'pointer',
							opacity: saveName.isPending ? 0.6 : 1,
						}}
					>Save</button>
					<button
						type="button"
						onClick={() => navigate('/')}
						style={{
							padding: '11px 18px',
							borderRadius: 'var(--r-md)',
							border: '1px solid var(--rule)',
							background: 'var(--bg-card)',
							color: 'var(--ink-1)',
							fontSize: 14,
							cursor: 'pointer',
						}}
					>Back home</button>
				</div>
			</form>

			<div style={sectionStyle}>
				<div style={sectionLabelStyle}>SAVED BOATS</div>
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
					<div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
						{crafts.isLoading
							? 'Loading…'
							: totalCrafts === 0
								? 'No boats saved yet.'
								: `${totalCrafts} ${totalCrafts === 1 ? 'boat' : 'boats'} saved.`}
					</div>
					<Link to="/logs/crafts" style={{ color: 'var(--river-700)', fontSize: 13, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
						Manage →
					</Link>
				</div>
			</div>

			<div style={sectionStyle}>
				<div style={sectionLabelStyle}>TRIP HISTORY</div>
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
					<div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
						{logs.isLoading
							? 'Loading…'
							: totalTrips === 0
								? 'No trips logged yet.'
								: `${totalTrips} ${totalTrips === 1 ? 'trip' : 'trips'}${lastTrip ? ` · last ${lastTrip}` : ''}`}
					</div>
					<Link to="/logs" style={{ color: 'var(--river-700)', fontSize: 13, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
						View →
					</Link>
				</div>
			</div>
		</div>
	);
}
