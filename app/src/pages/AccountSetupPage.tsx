import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api';

const labelStyle: React.CSSProperties = {
	fontFamily: 'var(--font-mono)',
	fontSize: 10,
	letterSpacing: '0.10em',
	textTransform: 'uppercase',
	color: 'var(--ink-3)',
	fontWeight: 500,
	marginBottom: 6,
	display: 'block',
	textAlign: 'left',
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

export function AccountSetupPage() {
	const { isAuthenticated, isLoading, user, logout } = useAuth();
	const navigate = useNavigate();
	const qc = useQueryClient();
	const [password, setPassword] = useState('');
	const [confirm, setConfirm] = useState('');
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!isLoading && !isAuthenticated) navigate('/login', { replace: true });
	}, [isLoading, isAuthenticated, navigate]);

	const setMyPassword = useMutation({
		mutationFn: () => api.setMyPassword(password),
		onSuccess: () => {
			setError(null);
			qc.invalidateQueries({ queryKey: ['me'] });
			navigate('/', { replace: true });
		},
		onError: (err: any) => {
			setError(err?.message || 'Failed to set password');
		},
	});

	const onSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
		if (password !== confirm) { setError('Passwords do not match'); return; }
		setMyPassword.mutate();
	};

	if (!isAuthenticated) return null;

	return (
		<div style={{
			width: '100%', minHeight: '100vh',
			background: 'var(--bg-app)',
			fontFamily: 'var(--font-sans)',
			display: 'flex', flexDirection: 'column', alignItems: 'center',
			justifyContent: 'center', padding: 20,
		}}>
			<div style={{
				maxWidth: 440, width: '100%',
				background: 'var(--bg-card)', border: '1px solid var(--rule)',
				borderRadius: 'var(--r-xl)', padding: '32px 32px 28px',
				boxShadow: 'var(--shadow-card)',
			}}>
				<div style={{
					fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em',
					textTransform: 'uppercase', color: 'var(--river-700)', fontWeight: 600,
					marginBottom: 6,
				}}>ONE LAST STEP</div>
				<h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: 'var(--ink-0)' }}>
					Set your password
				</h1>
				<p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, margin: '0 0 20px' }}>
					Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}. You're signed in with a one-time link.
					Set a password now so you can sign back in with email + password next time.
				</p>

				{user && (
					<div style={{
						padding: '10px 12px',
						borderRadius: 'var(--r-md)',
						background: 'var(--bg-sunken)',
						border: '1px solid var(--rule)',
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						gap: 10,
						marginBottom: 16,
					}}>
						<div style={{ minWidth: 0 }}>
							<div style={{ fontSize: 13, color: 'var(--ink-0)', fontWeight: 600 }}>{user.name}</div>
							<div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>{user.email}</div>
						</div>
					</div>
				)}

				<form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
					<div>
						<label style={labelStyle} htmlFor="setup-password">New password</label>
						<input
							id="setup-password"
							type="password"
							autoComplete="new-password"
							style={inputStyle}
							value={password}
							onChange={e => setPassword(e.target.value)}
							required
							minLength={8}
							autoFocus
						/>
					</div>
					<div>
						<label style={labelStyle} htmlFor="setup-confirm">Confirm password</label>
						<input
							id="setup-confirm"
							type="password"
							autoComplete="new-password"
							style={inputStyle}
							value={confirm}
							onChange={e => setConfirm(e.target.value)}
							required
							minLength={8}
						/>
					</div>

					{error && (
						<div style={{
							padding: '8px 12px',
							borderRadius: 'var(--r-md)',
							background: 'var(--status-high-bg)',
							color: 'var(--status-high)',
							fontSize: 12,
						}}>{error}</div>
					)}

					<button
						type="submit"
						disabled={setMyPassword.isPending || password.length < 8 || password !== confirm}
						style={{
							padding: '11px 18px',
							borderRadius: 'var(--r-md)',
							border: '1px solid var(--river-700)',
							background: 'var(--river-700)',
							color: 'var(--fg-on-brand)',
							fontSize: 14,
							fontWeight: 600,
							cursor: setMyPassword.isPending ? 'wait' : 'pointer',
							opacity: (setMyPassword.isPending || password.length < 8 || password !== confirm) ? 0.6 : 1,
						}}
					>{setMyPassword.isPending ? 'Saving…' : 'Save password and continue'}</button>

					<div style={{
						fontSize: 11, color: 'var(--ink-3)', textAlign: 'center',
					}}>
						Without a password set, you'll need a new login link from an admin to come back.
					</div>

					<button
						type="button"
						onClick={() => { logout(); navigate('/login', { replace: true }); }}
						style={{
							background: 'none', border: 'none', cursor: 'pointer',
							fontSize: 12, color: 'var(--ink-3)', textDecoration: 'underline',
							marginTop: 4,
						}}
					>Sign out instead</button>
				</form>
			</div>
		</div>
	);
}
