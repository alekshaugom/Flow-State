import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildShareUrl } from '../lib/share/share-url-pure.ts';

function mockRequest(host: string, forwardedProto?: string): any {
	const headers: Record<string, string> = { host };
	if (forwardedProto) headers['x-forwarded-proto'] = forwardedProto;
	return {
		headers: {
			get(name: string) {
				return headers[name.toLowerCase()] || null;
			},
			...headers,
		},
	};
}

test('buildShareUrl uses http for localhost', () => {
	const url = buildShareUrl('abc123', mockRequest('localhost:5173'));
	assert.equal(url, 'http://localhost:5173/share/abc123');
});

test('buildShareUrl uses http for 127.0.0.1', () => {
	const url = buildShareUrl('abc123', mockRequest('127.0.0.1:9926'));
	assert.equal(url, 'http://127.0.0.1:9926/share/abc123');
});

test('buildShareUrl uses https for non-local hosts', () => {
	const url = buildShareUrl('abc123', mockRequest('flow.example.com'));
	assert.equal(url, 'https://flow.example.com/share/abc123');
});

test('buildShareUrl honors x-forwarded-proto on localhost', () => {
	const url = buildShareUrl('abc', mockRequest('localhost:5173', 'https'));
	assert.equal(url, 'https://localhost:5173/share/abc');
});

test('buildShareUrl honors x-forwarded-proto on prod host', () => {
	const url = buildShareUrl('abc', mockRequest('flow.example.com', 'http'));
	assert.equal(url, 'http://flow.example.com/share/abc');
});

test('buildShareUrl url-encodes token characters', () => {
	const url = buildShareUrl('a/b+c=', mockRequest('localhost'));
	assert.equal(url, 'http://localhost/share/a%2Fb%2Bc%3D');
});

test('buildShareUrl handles missing host gracefully', () => {
	const url = buildShareUrl('abc', { headers: {} });
	assert.equal(url, '/share/abc');
});
