import { pool, withTransaction } from '../lib/db';

export const exchangeRatesService = {
  async list(limit = 30) {
    const result = await pool.query(
      `SELECT id, kurs, amal_qilish_sanasi, created_at
       FROM exchange_rates ORDER BY amal_qilish_sanasi DESC, created_at DESC LIMIT $1`,
      [limit]
    );
    return result.rows;
  },

  /** Eng so'nggi (joriy) kursni qaytaradi, hali hech narsa kiritilmagan bo'lsa null. */
  async latest() {
    const result = await pool.query(
      `SELECT id, kurs, amal_qilish_sanasi, created_at
       FROM exchange_rates ORDER BY amal_qilish_sanasi DESC, created_at DESC LIMIT 1`
    );
    return result.rows[0] ?? null;
  },

  async create(input: { kurs: number; amal_qilish_sanasi?: string }, userId: number) {
    return withTransaction(userId, async (client) => {
      const result = await client.query(
        `INSERT INTO exchange_rates (kurs, amal_qilish_sanasi, kim_kiritdi)
         VALUES ($1, COALESCE($2, CURRENT_DATE), $3) RETURNING *`,
        [input.kurs, input.amal_qilish_sanasi ?? null, userId]
      );
      return result.rows[0];
    });
  },
};
