export interface UserCapabilities {
	isMember: boolean;
	isAdmin: boolean;
	canContribute: boolean; // true for approved members (slice 21); acceptance gating = slice 24
	canFund: boolean;       // stub: false until slice 23
	canReceivePayout: boolean; // stub: false until slice 23
}

export function resolveCapabilities(user: {
	status?: string | null;
	role?: string | null;
}): UserCapabilities {
	const approved = user.status === 'approved';
	const role = user.role ?? 'member';
	const isAdmin = approved && (role === 'admin' || role === 'superadmin');
	return {
		isMember: approved,
		isAdmin,
		canContribute: approved,
		canFund: approved,      // slice 22: any approved member can fund (was false stub)
		canReceivePayout: false,
	};
}
