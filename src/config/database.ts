import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const normalizeError = (error: any): Error => {
  if (!(error instanceof Error)) {
    return new Error(typeof error === 'string' ? error : JSON.stringify(error));
  }

  // Node lanza AggregateError (message vacio) cuando connect() falla en todas
  // las direcciones resueltas (IPv4 + IPv6). Sin esto los controllers devuelven
  // "details": "" y no hay forma de saber que pasa.
  const aggregate = (error as any).errors;
  if (Array.isArray(aggregate) && aggregate.length > 0) {
    const causes = aggregate.map((e: any) => e?.message || String(e)).join(' | ');
    const normalized = new Error(`${error.message || 'Fallo de conexion'} (${causes})`);
    (normalized as any).code = (error as any).code;
    (normalized as any).cause = error;
    return normalized;
  }

  if (!error.message) {
    const code = (error as any).code;
    const normalized = new Error(`Error de base de datos${code ? ` (${code})` : ''}`);
    (normalized as any).code = code;
    (normalized as any).cause = error;
    return normalized;
  }

  return error;
};

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

const useSsl =
  process.env.DB_SSL === 'true' ||
  process.env.PGSSLMODE === 'require' ||
  Boolean(process.env.DATABASE_PUBLIC_URL);

const poolConfig: PoolConfig = connectionString
  ? {
      connectionString,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || process.env.PGDATABASE || 'gastro',
      user: process.env.DB_USER || process.env.PGUSER || 'operador',
      password: process.env.DB_PASSWORD || process.env.PGPASSWORD || 'operador',
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    };

console.log(
  `[db] conectando via ${
    connectionString
      ? `DATABASE_URL (${connectionString.replace(/\/\/([^:]+):[^@]+@/, '//$1:***@')})`
      : `DB_HOST=${poolConfig.host} DB_NAME=${poolConfig.database} DB_USER=${poolConfig.user}`
  } ssl=${useSsl}`
);

const pool = new Pool({
  ...poolConfig,
  max: parseInt(process.env.DB_POOL_MAX || '10', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('[db] error en el pool:', normalizeError(err).message);
});

// Envoltorio con la misma interfaz de Pool para que los controllers no cambien,
// pero normalizando el error para que 'details' nunca llegue vacio.
const wrapQuery =
  <R extends QueryResultRow = QueryResultRow>(fn: (text: string, values?: any[]) => Promise<QueryResult<R>>) =>
  (text: string, values?: any[]): Promise<QueryResult<R>> =>
    fn(text, values).catch((err) => {
      throw normalizeError(err);
    });

const db = {
  query: wrapQuery((text, values) => pool.query(text, values)),

  connect: async () => {
    const client = await pool.connect().catch((err) => {
      throw normalizeError(err);
    });
    const originalQuery = client.query.bind(client);
    client.query = wrapQuery(originalQuery) as typeof client.query;
    return client;
  },

  raw: pool,
};

export const checkDatabaseConnection = async (): Promise<{ ok: boolean; detalle: string }> => {
  try {
    const result = await pool.query('SELECT NOW() AS now');
    return { ok: true, detalle: `conectado (${result.rows[0].now})` };
  } catch (error: any) {
    return { ok: false, detalle: normalizeError(error).message };
  }
};

export default db;
