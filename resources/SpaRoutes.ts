import { Resource } from 'harper';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const indexHtml = readFileSync(join(import.meta.dirname, '..', 'web', 'index.html'), 'utf8');

function serveApp() {
	return new Response(indexHtml, {
		headers: { 'content-type': 'text/html; charset=utf-8' },
	});
}

export class section extends Resource {
	allowRead() { return true; }
	get() { return serveApp(); }
}

export class map extends Resource {
	allowRead() { return true; }
	get() { return serveApp(); }
}

export class login extends Resource {
	allowRead() { return true; }
	get() { return serveApp(); }
}

export class admin extends Resource {
	allowRead() { return true; }
	get() { return serveApp(); }
}
