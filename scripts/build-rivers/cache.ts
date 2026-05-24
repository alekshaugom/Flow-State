import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CACHE_DIR = join(process.cwd(), 'data', 'cache');
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

function ensureDir() {
	if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
}

function keyFor(url: string, body?: string): string {
	const h = createHash('sha256');
	h.update(url);
	if (body) h.update(body);
	return h.digest('hex').slice(0, 32);
}

export async function fetchCached(url: string, options: RequestInit = {}, label = ''): Promise<string> {
	ensureDir();
	const body = typeof options.body === 'string' ? options.body : undefined;
	const key = keyFor(url, body);
	const file = join(CACHE_DIR, `${label || 'cache'}_${key}.txt`);
	if (existsSync(file)) {
		const age = Date.now() - statSync(file).mtimeMs;
		if (age < TTL_MS) return readFileSync(file, 'utf-8');
	}
	const res = await fetch(url, {
		...options,
		headers: {
			'User-Agent': 'Flow-State-Pipeline/1.0 (paddling search dataset; aleks)',
			...(options.headers as Record<string, string> | undefined),
		},
	});
	if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}: ${url}`);
	const text = await res.text();
	writeFileSync(file, text);
	return text;
}

export async function fetchCachedJson<T = any>(url: string, options?: RequestInit, label = ''): Promise<T> {
	const text = await fetchCached(url, options, label);
	return JSON.parse(text);
}
