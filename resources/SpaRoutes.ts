import { Resource } from 'harper';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// SPA deep-link fallback: each class below maps a top-level client route segment
// to index.html so the React router can take over. There must be one class for
// every top-level path in app/src/App.tsx that is NOT served as a static file —
// otherwise a direct load or refresh of that path 404s under Harper (Vite's dev
// server papers over this with its own SPA fallback, so the gap only shows in
// the real server build). Keep this list in sync with App.tsx <Route> paths.

const INDEX_PATH = join(import.meta.dirname, '..', 'web', 'index.html');

// Read index.html FRESH per request. Caching it at module load means a
// `vite build` (which emits new hashed chunk names and deletes the old ones)
// leaves deep-linked SPA routes serving a stale shell that points at chunks
// that no longer exist → blank page until Harper restarts. The shell is ~1KB
// and SPA-route hits are only initial loads/refreshes, so re-reading is cheap.
function serveApp() {
	const indexHtml = readFileSync(INDEX_PATH, 'utf8');
	return new Response(indexHtml, {
		headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' },
	});
}

export class section extends Resource {
	allowRead() { return true; }
	get() { return serveApp(); }
}

export class watershed extends Resource {
	allowRead() { return true; }
	get() { return serveApp(); }
}

export class corridor extends Resource {
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

export class river extends Resource {
	allowRead() { return true; }
	get() { return serveApp(); }
}

export class profile extends Resource {
	allowRead() { return true; }
	get() { return serveApp(); }
}

export class trips extends Resource {
	allowRead() { return true; }
	get() { return serveApp(); }
}

export class log extends Resource {
	allowRead() { return true; }
	get() { return serveApp(); }
}
