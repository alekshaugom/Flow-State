import { tables } from 'harper';
import { hashPassword, PASSWORD_ALGO } from './password.ts';
import { isoNow } from '../utils.ts';

/**
 * Hash + persist a UserCredential row. Used by both admin-driven password sets
 * (`AdminAuthResource`) and user-driven activation (`EmailLoginResource`'s
 * `set-my-password`).
 *
 * Preserves the original `setAt` on update so callers can tell when a credential
 * was first established vs last updated.
 */
export async function writeUserCredential(userId: string, password: string, setBy: string): Promise<void> {
	const hashed = await hashPassword(password);
	const now = isoNow();
	const existing = await tables.UserCredential.get(userId);
	await tables.UserCredential.put({
		id: userId,
		userId,
		passwordHash: hashed.hash,
		passwordSalt: hashed.salt,
		algo: PASSWORD_ALGO,
		setBy,
		setAt: existing ? (existing as any).setAt || now : now,
		updatedAt: now,
	});
}

export async function userHasPassword(userId: string): Promise<boolean> {
	return !!(await tables.UserCredential.get(userId));
}
