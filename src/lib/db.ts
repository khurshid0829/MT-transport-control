import { Pool, PoolClient } from 'pg';

// Serverless muhitda (Vercel) global pool qayta ishlatiladi, har chaqiriqda
// yangi pool yaratilmaydi (aks holda Supabase ulanish limitiga tez yetiladi).
declare global {
  // eslint-disable-next-line no-var
  var __mtPgPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL topilmadi. Vercel loyihangizda Environment Variables bo\'limiga qo\'shing.');
  }
  return new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }, // Supabase uchun majburiy
    max: 5, // Supabase pooler bilan ishlaganda kam sonli connection yetarli
    idleTimeoutMillis: 10000,
  });
}

/**
 * MUHIM: pool build vaqtida emas, faqat birinchi haqiqiy so'rov kelganda
 * yaratiladi (lazy). Aks holda Next.js "Collecting page data" bosqichida
 * (build paytida, hali runtime environment variable'lar to'liq bo'lmasligi
 * mumkin bo'lgan holatda) modul yuklanishi bilanoq xato beradi va butun
 * build'ni to'xtatib qo'yadi.
 */
function getPool(): Pool {
  if (!global.__mtPgPool) {
    global.__mtPgPool = createPool();
  }
  return global.__mtPgPool;
}

/** `pool.query(...)` kabi ishlatish uchun proxy — chaqirilganda pool lazy yaratiladi. */
export const pool = {
  query: (...args: Parameters<Pool['query']>) => getPool().query(...args),
  connect: () => getPool().connect(),
} as Pick<Pool, 'query' | 'connect'>;

/**
 * Audit trigger'lar (trg_audit_cars, trg_audit_transactions) to'g'ri
 * user_id yozishi uchun `app.current_user_id` sessiya o'zgaruvchisini
 * o'rnatib, bitta client qaytaradi.
 */
export async function getClientWithUser(userId: number | null): Promise<PoolClient> {
  const client = await pool.connect();
  await client.query('SELECT set_config($1, $2, true)', [
    'app.current_user_id',
    userId !== null ? String(userId) : '',
  ]);
  return client;
}

/** BEGIN -> fn(client) -> COMMIT, xato bo'lsa ROLLBACK. */
export async function withTransaction<T>(
  userId: number | null,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClientWithUser(userId);
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
