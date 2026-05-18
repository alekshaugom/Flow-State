import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

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

interface EmailLoginFormProps {
	onSuccess?: () => void;
}

export function EmailLoginForm({ onSuccess }: EmailLoginFormProps) {
	const qc = useQueryClient();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);

	const loginMutation = useMutation({
		mutationFn: () => api.emailLogin(email, password),
		onSuccess: () => {
			setError(null);
			qc.invalidateQueries({ queryKey: ['me'] });
			onSuccess?.();
		},
		onError: (err: any) => {
			setError(err?.message || 'Invalid email or password');
		},
	});

	const onSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		loginMutation.mutate();
	};

	return (
		<form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
			<div>
				<label style={labelStyle} htmlFor="login-email">Email</label>
				<input
					id="login-email"
					type="email"
					autoComplete="email"
					style={inputStyle}
					value={email}
					onChange={e => setEmail(e.target.value)}
					required
				/>
			</div>
			<div>
				<label style={labelStyle} htmlFor="login-password">Password</label>
				<input
					id="login-password"
					type="password"
					autoComplete="current-password"
					style={inputStyle}
					value={password}
					onChange={e => setPassword(e.target.value)}
					required
				/>
			</div>

			{error && (
				<div style={{
					padding: '8px 12px',
					borderRadius: 'var(--r-md)',
					background: '#fdecea',
					color: '#a02323',
					fontSize: 12,
				}}>{error}</div>
			)}

			<button
				type="submit"
				disabled={loginMutation.isPending || !email || !password}
				style={{
					padding: '11px 18px',
					borderRadius: 'var(--r-md)',
					border: '1px solid var(--river-700)',
					background: 'var(--river-700)',
					color: '#fff',
					fontSize: 14,
					fontWeight: 600,
					cursor: loginMutation.isPending ? 'wait' : 'pointer',
					opacity: (loginMutation.isPending || !email || !password) ? 0.6 : 1,
				}}
			>{loginMutation.isPending ? 'Signing in…' : 'Sign in with email'}</button>

			<div style={{
				fontSize: 11,
				color: 'var(--ink-3)',
				textAlign: 'center',
				marginTop: 4,
			}}>
				Passwords are managed by the admin. If you don't have one yet, ask for an invite link.
			</div>
		</form>
	);
}
