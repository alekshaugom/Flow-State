/**
 * Decide where to route a user immediately after they consume a one-time login link.
 *
 * - If they have no `UserCredential`, send them to /login/setup so they can pick a
 *   password (otherwise they have no way to log in again without another link).
 * - Otherwise route home.
 */
export function decideActivationRoute(state: { hasPassword?: boolean | null }): '/login/setup' | '/' {
	return state?.hasPassword ? '/' : '/login/setup';
}
