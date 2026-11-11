import type pg from 'pg';

function pooled(host: string, port?: string | number) {
 return /(?:pooler|pgbouncer)/i.test(host) || String(port ?? '') === '6543';
}

/** Session locks require a direct backend. Do not infer credentials or rewrite a URL. */
export function assertDirectProbePool(pool: Pick<pg.Pool, 'options'>) {
 const options = pool.options;
 const url = options.connectionString ? new URL(options.connectionString) : null;
 if (pooled(url?.hostname ?? options.host ?? '', url?.port || options.port)) throw Error('PROBE_DIRECT_DATABASE_REQUIRED');
}

export function probeDatabaseConnections(env: Record<string,string|undefined>) {
 if (!env.DATABASE_URL) throw Error('DATABASE_URL_REQUIRED');
 const query = new URL(env.DATABASE_URL);
 if (!pooled(query.hostname,query.port)) return { query: env.DATABASE_URL, lock: env.DATABASE_URL };
 const direct = env.DATABASE_URL_UNPOOLED ?? env.POSTGRES_URL_NON_POOLING ?? env.DIRECT_URL;
 if (!direct) throw Error('PROBE_DIRECT_DATABASE_REQUIRED');
 const lock = new URL(direct);
 // Only the identical Neon endpoint is qualified here. Unknown mappings fail closed.
 const neon = query.hostname.endsWith('.neon.tech') && query.hostname.includes('-pooler.');
 if (!neon || lock.hostname !== query.hostname.replace('-pooler.','.') || pooled(lock.hostname,lock.port)
   || lock.pathname !== query.pathname || lock.username !== query.username || lock.protocol !== query.protocol)
  throw Error('PROBE_DIRECT_DATABASE_IDENTITY_MISMATCH');
 return { query: env.DATABASE_URL, lock: direct };
}
