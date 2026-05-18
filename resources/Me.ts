import { Resource, tables } from 'harper';

export class Me extends Resource {
	allowRead() {
		return true;
	}

	async get() {
		const context = this.getContext();
		const session = context?.session;
		if (!session?.user) {
			return { authenticated: false, user: null, profile: null };
		}

		const userId = session.user;
		const record = await tables.WaitlistUser.get(userId);

		if (!record) {
			return { authenticated: true, user: null, status: 'unknown', profile: null };
		}

		const profile = await tables.UserProfile.get(userId);

		return {
			authenticated: true,
			user: {
				id: record.id,
				email: record.email,
				name: record.name,
				avatarUrl: record.avatarUrl,
				status: record.status,
				createdAt: record.createdAt,
			},
			profile: profile || null,
		};
	}
}
