import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api';
import { Icon } from '../components/Icon';
import { EmailLoginForm } from '../components/EmailLoginForm';

// Mirrors lib/auth/activation-pure.ts — kept inline to avoid a cross-root import
// from Vite's perspective. If this logic grows, hoist it into app/src/lib/.
function decideActivationRoute(state: { hasPassword?: boolean | null }): '/login/setup' | '/' {
	return state?.hasPassword ? '/' : '/login/setup';
}

export function LoginPage() {
	const navigate = useNavigate();
	const qc = useQueryClient();
	const [search, setSearch] = useSearchParams();
	const { isAuthenticated, isApproved, isWaitlisted, user, login, isDev, devBypass } = useAuth();
	const [tokenError, setTokenError] = useState<string | null>(null);
	const [tokenConsuming, setTokenConsuming] = useState(false);

	const tokenFromUrl = search.get('token');
	const consume = useMutation({
		mutationFn: (t: string) => api.consumeLoginLink(t),
		onSuccess: (result) => {
			qc.invalidateQueries({ queryKey: ['me'] });
			const next = new URLSearchParams(search);
			next.delete('token');
			setSearch(next, { replace: true });
			const target = decideActivationRoute({ hasPassword: result?.hasPassword });
			navigate(target, { replace: true });
		},
		onError: (err: any) => {
			setTokenError(err?.message || 'This login link is invalid or has expired');
		},
		onSettled: () => setTokenConsuming(false),
	});

	useEffect(() => {
		// If a token is present, consume it unconditionally. The backend writes a
		// fresh session via `session.update({user})` which overwrites whatever was
		// there before, so this works both for stale/missing-user sessions and for
		// "I'm already logged in but clicked a new link" cases. The cost of burning
		// a token on a redundant click is negligible compared to the UX of nothing
		// happening when a link is clicked.
		if (tokenFromUrl && !tokenConsuming) {
			setTokenConsuming(true);
			consume.mutate(tokenFromUrl);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tokenFromUrl]);

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
				borderRadius: 'var(--r-xl)', padding: '40px 36px',
				boxShadow: 'var(--shadow-card)', textAlign: 'center',
			}}>
				{/* Logo */}
				<svg width="48" height="48" viewBox="0 0 28 28" fill="none" style={{ marginBottom: 16 }}>
					<rect width="28" height="28" rx="8" fill="var(--river-700)"/>
					<path d="M5 18 C 8 14, 11 22, 14 18 S 20 14, 23 18" stroke="var(--ideal-line)" strokeWidth="2" strokeLinecap="round" fill="none"/>
					<path d="M5 13 C 8 9, 11 17, 14 13 S 20 9, 23 13" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7"/>
				</svg>

				<h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink-0)', margin: '0 0 8px' }}>
					Flow State
				</h1>

				{!isAuthenticated ? (
					<>
						<div style={{
							display: 'inline-flex', alignItems: 'center', gap: 6,
							padding: '4px 12px', borderRadius: 'var(--r-pill)',
							background: 'var(--river-50)', border: '1px solid var(--river-100)',
							fontSize: 11, fontWeight: 600, color: 'var(--river-600)',
							textTransform: 'uppercase', letterSpacing: '0.08em',
							marginBottom: 20,
						}}>
							<Icon name="shield" size={12} color="var(--river-600)" />
							Closed Beta
						</div>

						<p style={{ fontSize: 15, color: 'var(--ink-1)', lineHeight: 1.6, margin: '0 0 12px' }}>
							Flow State is a private community for Colorado river runners, currently in closed beta.
						</p>
						<p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6, margin: '0 0 28px' }}>
							Sign in to join the waitlist. When approved, you'll get access to saving
							favorite sections, trip planning tools, and personalized flow estimates.
						</p>

						{tokenConsuming && (
							<div style={{ marginBottom: 16, fontSize: 13, color: 'var(--ink-3)' }}>
								Signing you in with the link…
							</div>
						)}
						{tokenError && (
							<div style={{
								marginBottom: 16,
								padding: '8px 12px',
								borderRadius: 'var(--r-md)',
								background: 'var(--status-high-bg)',
								color: 'var(--status-high)',
								fontSize: 13,
							}}>{tokenError}</div>
						)}

						<button onClick={login} style={{
							display: 'inline-flex', alignItems: 'center', gap: 10,
							padding: '12px 28px', borderRadius: 'var(--r-md)',
							background: 'var(--river-700)', color: 'var(--fg-on-brand)',
							fontSize: 15, fontWeight: 600,
							border: 'none', cursor: 'pointer',
						}}>
							<svg width="18" height="18" viewBox="0 0 24 24">
								<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
								<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
								<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
								<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
							</svg>
							Sign in with Google
						</button>

						<div style={{
							display: 'flex', alignItems: 'center', gap: 10,
							margin: '24px 0 18px',
							color: 'var(--ink-4)',
							fontFamily: 'var(--font-mono)',
							fontSize: 10,
							letterSpacing: '0.10em',
							textTransform: 'uppercase',
						}}>
							<span style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
							or
							<span style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
						</div>

						<EmailLoginForm />

						{isDev && (
							<div style={{ marginTop: 20 }}>
								<button onClick={() => { devBypass(); navigate('/'); }} style={{
									display: 'inline-flex', alignItems: 'center', gap: 8,
									padding: '10px 24px', borderRadius: 'var(--r-md)',
									background: 'var(--bg-sunken)', color: 'var(--ink-1)',
									fontSize: 13, fontWeight: 600,
									border: '1px dashed var(--rule)', cursor: 'pointer',
								}}>
									Dev Bypass
								</button>
							</div>
						)}

						<div style={{ marginTop: 16 }}>
							<button onClick={() => navigate('/')} style={{
								background: 'none', border: 'none', cursor: 'pointer',
								fontSize: 13, color: 'var(--ink-3)', textDecoration: 'underline',
							}}>
								Browse rivers without signing in
							</button>
						</div>
					</>
				) : isWaitlisted ? (
					<>
						<div style={{
							width: 56, height: 56, borderRadius: '50%',
							background: 'var(--ideal-bg)',
							display: 'flex', alignItems: 'center', justifyContent: 'center',
							margin: '8px auto 16px',
						}}>
							<Icon name="check" size={28} color="var(--ideal-solid)" />
						</div>
						<h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink-0)', margin: '0 0 8px' }}>
							You're on the list
						</h2>
						<p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6, margin: '0 0 8px' }}>
							Thanks, {user?.name?.split(' ')[0] || 'friend'}! We've logged your interest.
						</p>
						<p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6, margin: '0 0 24px' }}>
							We'll notify you at <strong style={{ color: 'var(--ink-2)' }}>{user?.email}</strong> when
							you can access private features like saving favorites, planning trips, and
							personalized flow estimates.
						</p>
						<button onClick={() => navigate('/')} style={{
							padding: '10px 24px', borderRadius: 'var(--r-md)',
							background: 'var(--bg-sunken)', color: 'var(--ink-1)',
							fontSize: 14, fontWeight: 600,
							border: '1px solid var(--rule)', cursor: 'pointer',
						}}>
							Browse rivers
						</button>
					</>
				) : isApproved ? (
					<>
						<div style={{
							width: 56, height: 56, borderRadius: '50%',
							background: 'var(--ideal-bg)',
							display: 'flex', alignItems: 'center', justifyContent: 'center',
							margin: '8px auto 16px',
						}}>
							<Icon name="check" size={28} color="var(--ideal-solid)" />
						</div>
						<h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink-0)', margin: '0 0 8px' }}>
							Welcome to Flow State
						</h2>
						<p style={{ fontSize: 14, color: 'var(--ideal-solid)', fontWeight: 600, margin: '0 0 24px' }}>
							You have full access.
						</p>
						<button onClick={() => navigate('/')} style={{
							padding: '10px 24px', borderRadius: 'var(--r-md)',
							background: 'var(--river-700)', color: 'var(--fg-on-brand)',
							fontSize: 14, fontWeight: 600,
							border: 'none', cursor: 'pointer',
						}}>
							Go to dashboard
						</button>
					</>
				) : null}
			</div>
		</div>
	);
}
