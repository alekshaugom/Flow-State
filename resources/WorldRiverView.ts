import { Resource, tables } from 'harper';

export class WorldRiverView extends Resource {
	allowRead() { return true; }

	async get(target?: any) {
		const id = (target?.id || '').toString();
		if (!id) {
			return new Response(JSON.stringify({ error: 'slug required' }), {
				status: 400, headers: { 'Content-Type': 'application/json' },
			});
		}
		const row = await tables.WorldRiver.get(id);
		if (!row) {
			return new Response(JSON.stringify({ error: 'not found' }), {
				status: 404, headers: { 'Content-Type': 'application/json' },
			});
		}
		return row;
	}
}
