import { Resource, tables } from 'harper';
import { compositeId, isoNow } from '../lib/utils.ts';
import {
	pickUserCraftWritable,
	validateCraftType,
	validateCraftName,
	applyDefaultPromotion,
	pickReplacementDefault,
} from '../lib/log/user-craft-pure.ts';

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const r of iter) out.push(r);
	return out;
}

function getUserId(ctx: any): string | null {
	return ctx?.session?.user || null;
}

async function listUserCrafts(userId: string): Promise<any[]> {
	return collect(tables.UserCraft.search({
		conditions: [{ attribute: 'userId', value: userId, comparator: 'equals' as const }],
	}));
}

async function clearOtherDefaults(allCrafts: any[], keepId: string): Promise<void> {
	const { toUnset } = applyDefaultPromotion(allCrafts, keepId);
	const now = isoNow();
	for (const id of toUnset) {
		await tables.UserCraft.patch(id, { isDefault: false, updatedAt: now });
	}
}

export class UserCraftResource extends Resource {
	allowRead() { return true; }
	allowCreate() { return true; }
	allowUpdate() { return true; }
	allowDelete() { return true; }

	async get(target?: any) {
		const userId = getUserId(this.getContext());
		if (!userId) return new Response('Auth required', { status: 401 });

		if (target?.id) {
			const row = await tables.UserCraft.get(target.id);
			if (!row) return new Response('Not found', { status: 404 });
			if ((row as any).userId !== userId) return new Response('Forbidden', { status: 403 });
			return row;
		}

		const includeArchived = target?.includeArchived === 'true' || target?.includeArchived === true;
		const all = await listUserCrafts(userId);
		const visible = includeArchived ? all : all.filter((c: any) => !c.archivedAt);
		visible.sort((a: any, b: any) => {
			if (!!b.isDefault !== !!a.isDefault) return (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0);
			return (b.updatedAt || '').localeCompare(a.updatedAt || '');
		});
		return { crafts: visible, total: visible.length };
	}

	async post(data: any) {
		const userId = getUserId(this.getContext());
		if (!userId) return new Response('Auth required', { status: 401 });

		const nameErr = validateCraftName(data?.name);
		if (nameErr) return new Response(nameErr.error, { status: nameErr.status });
		const typeErr = validateCraftType(data?.craftType);
		if (typeErr) return new Response(typeErr.error, { status: typeErr.status });

		const now = isoNow();
		const id = compositeId([userId, String(Date.now())]);
		const fields = pickUserCraftWritable(data);

		const all = await listUserCrafts(userId);
		const activeCount = all.filter((c: any) => !c.archivedAt).length;
		const isDefault = fields.isDefault === true || activeCount === 0;

		const row = {
			id,
			userId,
			name: fields.name,
			craftType: fields.craftType,
			craftSize: fields.craftSize ?? null,
			notes: fields.notes ?? null,
			isDefault,
			archivedAt: null,
			createdAt: now,
			updatedAt: now,
		};
		await tables.UserCraft.put(row);
		if (isDefault) await clearOtherDefaults([...all, row], id);
		return row;
	}

	async patch(data: any, query?: any) {
		const userId = getUserId(this.getContext());
		if (!userId) return new Response('Auth required', { status: 401 });

		const id = query?.id || data?.id;
		if (!id) return new Response('id required', { status: 400 });

		const existing = await tables.UserCraft.get(id);
		if (!existing) return new Response('Not found', { status: 404 });
		if ((existing as any).userId !== userId) return new Response('Forbidden', { status: 403 });

		if (data.name !== undefined) {
			const err = validateCraftName(data.name);
			if (err) return new Response(err.error, { status: err.status });
		}
		if (data.craftType !== undefined) {
			const err = validateCraftType(data.craftType);
			if (err) return new Response(err.error, { status: err.status });
		}

		const fields = pickUserCraftWritable(data);
		(fields as any).updatedAt = isoNow();
		await tables.UserCraft.patch(id, fields);

		if (fields.isDefault === true) {
			const all = await listUserCrafts(userId);
			await clearOtherDefaults(all, id);
		}

		return await tables.UserCraft.get(id);
	}

	async delete(query?: any) {
		const userId = getUserId(this.getContext());
		if (!userId) return new Response('Auth required', { status: 401 });

		const id = query?.id;
		if (!id) return new Response('id required', { status: 400 });

		const existing = await tables.UserCraft.get(id);
		if (!existing) return new Response('Not found', { status: 404 });
		if ((existing as any).userId !== userId) return new Response('Forbidden', { status: 403 });
		if ((existing as any).archivedAt) return { ok: true, id, alreadyArchived: true };

		const now = isoNow();
		await tables.UserCraft.patch(id, { archivedAt: now, isDefault: false, updatedAt: now });

		if ((existing as any).isDefault) {
			const all = await listUserCrafts(userId);
			const replacement = pickReplacementDefault(all, id);
			if (replacement) await tables.UserCraft.patch(replacement, { isDefault: true, updatedAt: now });
		}

		return { ok: true, id, archivedAt: now };
	}
}
