import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useProfile, useUpdateProfile } from '../hooks/useProfile';
import { useDashboard } from '../hooks/useDashboard';

const SKILL_OPTIONS = ['novice', 'intermediate', 'advanced', 'expert', 'guide'] as const;

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

export function ProfileSetupPage() {
	const { isAuthenticated, isLoading } = useAuth();
	const navigate = useNavigate();
	const profile = useProfile();
	const updateProfile = useUpdateProfile();
	const dashboard = useDashboard();

	useEffect(() => {
		if (!isLoading && !isAuthenticated) navigate('/login', { replace: true });
	}, [isLoading, isAuthenticated, navigate]);

	const [skillLevel, setSkillLevel] = useState<string>('intermediate');
	const [yearsBoating, setYearsBoating] = useState<number | ''>('');
	const [background, setBackground] = useState('');
	const [homeWatershedId, setHomeWatershedId] = useState<string>('');
	const [hydrated, setHydrated] = useState(false);
	const [savedJustNow, setSavedJustNow] = useState(false);

	useEffect(() => {
		if (hydrated || !profile.data) return;
		const p = profile.data;
		setSkillLevel(p.skillLevel || 'intermediate');
		setYearsBoating(typeof p.yearsBoating === 'number' ? p.yearsBoating : '');
		setBackground(p.background || '');
		setHomeWatershedId(p.homeWatershedId || '');
		setHydrated(true);
	}, [hydrated, profile.data]);

	useEffect(() => {
		if (!profile.isLoading && !profile.data && !hydrated) setHydrated(true);
	}, [profile.isLoading, profile.data, hydrated]);

	const watersheds = (dashboard.data as any)?.watersheds || [];

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSavedJustNow(false);
		await updateProfile.mutateAsync({
			skillLevel,
			yearsBoating: yearsBoating === '' ? null : Number(yearsBoating),
			background: background || null,
			homeWatershedId: homeWatershedId || null,
		});
		setSavedJustNow(true);
	};

	if (!isAuthenticated) return null;

	return (
		<div style={{ maxWidth: 560, margin: '0 auto', padding: 'max(env(safe-area-inset-top), 16px) 16px 80px' }}>
			<div style={{
				fontFamily: 'var(--font-mono)',
				fontSize: 11,
				letterSpacing: '0.12em',
				textTransform: 'uppercase',
				color: 'var(--ink-3)',
			}}>// YOUR PROFILE</div>
			<h1 style={{ margin: '4px 0 14px', fontSize: 22, fontWeight: 700, color: 'var(--ink-0)' }}>
				Tell your logs who you are
			</h1>
			<p style={{ color: 'var(--ink-3)', fontSize: 13, marginBottom: 18 }}>
				This shows up at the bottom of your log cards. Skip anything you don't want to share.
			</p>

			<form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
				<div>
					<label style={labelStyle} htmlFor="skill">Skill</label>
					<div role="radiogroup" style={{
						display: 'inline-flex', gap: 2, padding: 3,
						background: 'var(--bg-sunken)', borderRadius: 'var(--r-pill)', width: '100%',
					}}>
						{SKILL_OPTIONS.map(opt => {
							const sel = skillLevel === opt;
							return (
								<button
									key={opt}
									type="button"
									role="radio"
									aria-checked={sel}
									onClick={() => setSkillLevel(opt)}
									style={{
										flex: 1,
										padding: '7px 8px',
										borderRadius: 'var(--r-pill)',
										background: sel ? 'var(--bg-card)' : 'transparent',
										color: sel ? 'var(--ink-0)' : 'var(--ink-3)',
										border: sel ? '1px solid var(--rule)' : '1px solid transparent',
										fontSize: 12,
										fontWeight: sel ? 600 : 500,
										textTransform: 'capitalize',
										cursor: 'pointer',
									}}
								>{opt}</button>
							);
						})}
					</div>
				</div>

				<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
					<div>
						<label style={labelStyle} htmlFor="years">Years boating</label>
						<input
							id="years"
							type="number"
							min={0}
							max={80}
							style={inputStyle}
							value={yearsBoating}
							onChange={e => setYearsBoating(e.target.value === '' ? '' : Number(e.target.value))}
						/>
					</div>
					<div>
						<label style={labelStyle} htmlFor="home">Home watershed</label>
						<select
							id="home"
							style={{ ...inputStyle, padding: '9px 10px' }}
							value={homeWatershedId}
							onChange={e => setHomeWatershedId(e.target.value)}
						>
							<option value="">— pick one —</option>
							{watersheds.map((w: any) => (
								<option key={w.id} value={w.id}>{w.name}</option>
							))}
						</select>
					</div>
				</div>

				<div>
					<label style={labelStyle} htmlFor="background">Background</label>
					<input
						id="background"
						style={inputStyle}
						placeholder='e.g. "Former raft guide, AW Class V"'
						value={background}
						maxLength={140}
						onChange={e => setBackground(e.target.value)}
					/>
					<div style={{ marginTop: 4, color: 'var(--ink-4)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
						{background.length}/140
					</div>
				</div>

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
					}}>// SAVED</div>
				)}

				<div style={{ display: 'flex', gap: 10 }}>
					<button
						type="submit"
						disabled={updateProfile.isPending}
						style={{
							padding: '11px 20px',
							borderRadius: 'var(--r-md)',
							border: '1px solid var(--river-700)',
							background: 'var(--river-700)',
							color: '#fff',
							fontWeight: 600,
							fontSize: 14,
							cursor: updateProfile.isPending ? 'wait' : 'pointer',
							opacity: updateProfile.isPending ? 0.6 : 1,
						}}
					>Save profile</button>
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

			<div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px dashed var(--rule)' }}>
				<div style={{
					fontFamily: 'var(--font-mono)',
					fontSize: 10,
					letterSpacing: '0.10em',
					textTransform: 'uppercase',
					color: 'var(--ink-3)',
					marginBottom: 6,
				}}>// CRAFTS</div>
				<p style={{ fontSize: 13, color: 'var(--ink-2)', margin: '0 0 10px' }}>
					Save the boats you boat with so you can pick from a list on every log instead of re-typing the details.
				</p>
				<Link to="/logs/crafts" style={{ color: 'var(--river-700)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
					Manage your crafts →
				</Link>
			</div>
		</div>
	);
}
