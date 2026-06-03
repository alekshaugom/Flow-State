import { useAuth, type UserCapabilities } from '../hooks/useAuth';

interface Props {
	capability: keyof UserCapabilities;
	fallback?: React.ReactNode;
	children: React.ReactNode;
}

export function RequireCapability({ capability, fallback = null, children }: Props) {
	const { capabilities } = useAuth();
	if (!capabilities?.[capability]) return <>{fallback}</>;
	return <>{children}</>;
}
