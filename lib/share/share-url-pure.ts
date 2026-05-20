export function buildShareUrl(token: string, request: any): string {
	const headers = request?.headers;
	const host = headers?.get?.('host') || headers?.host || '';
	const forwardedProto = headers?.get?.('x-forwarded-proto') || headers?.['x-forwarded-proto'];
	// Local dev hosts serve HTTP; everything else defaults to HTTPS unless a proxy
	// has explicitly told us otherwise via x-forwarded-proto. Matches buildLoginUrl
	// in resources/AdminAuth.ts so dev + prod behave identically.
	const isLocal = /^(localhost|127\.0\.0\.1|\[?::1)\b/i.test(host);
	const proto = forwardedProto || (isLocal ? 'http' : 'https');
	const base = host ? `${proto}://${host}` : '';
	return `${base}/share/${encodeURIComponent(token)}`;
}
