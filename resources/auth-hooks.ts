import { tables } from 'harper';
import { isoNow } from '../lib/utils.ts';

export async function onLogin(oauthUser: any, _tokenResponse: any, _session: any, _request: any, provider: string) {
	const userId = `${provider}_${oauthUser.sub || oauthUser.id || oauthUser.username}`;
	const now = isoNow();
	const existing = await tables.WaitlistUser.get(userId);

	if (existing) {
		await tables.WaitlistUser.patch(userId, { lastLoginAt: now });
	} else {
		const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
		const isAdmin = adminEmails.includes(oauthUser.email);

		await tables.WaitlistUser.put({
			id: userId,
			email: oauthUser.email,
			name: oauthUser.name,
			avatarUrl: oauthUser.picture || null,
			provider,
			status: isAdmin ? 'approved' : 'waitlist',
			createdAt: now,
			grantedAt: isAdmin ? now : null,
			grantedBy: isAdmin ? 'system' : null,
			lastLoginAt: now,
		});
	}

	return { user: userId };
}
