import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

const KEY_LEN = 64;
const SALT_BYTES = 32;

export const PASSWORD_ALGO = 'scrypt-v1';

export interface HashedPassword {
	hash: string;
	salt: string;
	algo: typeof PASSWORD_ALGO;
}

export async function hashPassword(plain: string): Promise<HashedPassword> {
	const salt = randomBytes(SALT_BYTES);
	const hash = await scryptAsync(plain, salt, KEY_LEN);
	return {
		hash: hash.toString('hex'),
		salt: salt.toString('hex'),
		algo: PASSWORD_ALGO,
	};
}

export async function verifyPassword(plain: string, storedHashHex: string, storedSaltHex: string): Promise<boolean> {
	if (!storedHashHex || !storedSaltHex) return false;
	let saltBuf: Buffer;
	let hashBuf: Buffer;
	try {
		saltBuf = Buffer.from(storedSaltHex, 'hex');
		hashBuf = Buffer.from(storedHashHex, 'hex');
	} catch {
		return false;
	}
	if (hashBuf.length !== KEY_LEN) return false;
	const candidate = await scryptAsync(plain, saltBuf, KEY_LEN);
	if (candidate.length !== hashBuf.length) return false;
	return timingSafeEqual(candidate, hashBuf);
}

/** Run a constant-time-ish dummy hash so a missing UserCredential row doesn't leak via timing. */
export async function constantTimeDummyHash(): Promise<void> {
	const dummySalt = Buffer.alloc(SALT_BYTES, 0);
	await scryptAsync('dummy-password-not-used', dummySalt, KEY_LEN);
}
