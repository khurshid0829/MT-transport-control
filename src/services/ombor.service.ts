import { pool, withTransaction } from '../lib/db';
import { AppError } from '../lib/AppError';

export const omborService = {
  async listMahsulotlar() {
    const result = await pool.query('SELECT * FROM ombor_mahsulotlari ORDER BY nomi ASC');
    return result.rows;
  },

  async createMahsulot(input: { nomi: string; toifa: string; olchov_birligi: string; minimal_qoldiq?: number }) {
    const existing = await pool.query('SELECT id FROM ombor_mahsulotlari WHERE nomi = $1', [input.nomi]);
    if (existing.rows[0]) throw AppError.conflict(`"${input.nomi}" nomli mahsulot allaqachon mavjud`);

    const result = await pool.query(
      `INSERT INTO ombor_mahsulotlari (nomi, toifa, olchov_birligi, minimal_qoldiq)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [input.nomi, input.toifa, input.olchov_birligi, input.minimal_qoldiq ?? 0]
    );
    return result.rows[0];
  },

  async listHarakatlar(filters: { mahsulot_id?: number; limit?: number }) {
    const conditions: string[] = [];
    const values: unknown[] = [];
    if (filters.mahsulot_id) { values.push(filters.mahsulot_id); conditions.push(`h.mahsulot_id = $${values.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = Math.min(filters.limit ?? 100, 500);

    const result = await pool.query(
      `SELECT h.*, m.nomi AS mahsulot_nomi, m.olchov_birligi, c.davlat_raqami AS avto_davlat_raqami
       FROM ombor_harakatlari h
       JOIN ombor_mahsulotlari m ON m.id = h.mahsulot_id
       LEFT JOIN cars c ON c.id = h.avto_id
       ${where}
       ORDER BY h.created_at DESC LIMIT ${limit}`,
      values
    );
    return result.rows;
  },

  /**
   * Ombor yaxlitligi (F-bosqida 2-qoidaga o'xshash tamoyil) DB darajasida
   * `trg_ombor_harakat` trigger'i orqali majburlanadi: Chiqim joriy
   * qoldiqdan ortiq bo'lsa RAISE EXCEPTION beriladi va tranzaksiya
   * bekor qilinadi.
   */
  async createHarakat(input: any, userId: number) {
    return withTransaction(userId, async (client) => {
      const result = await client.query(
        `INSERT INTO ombor_harakatlari (mahsulot_id, harakat_turi, miqdor, narx, valyuta, avto_id, tavsif, kim_kiritdi)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          input.mahsulot_id, input.harakat_turi, input.miqdor,
          input.narx ?? null, input.valyuta ?? null, input.avto_id ?? null,
          input.tavsif ?? null, userId,
        ]
      );
      return result.rows[0];
    });
  },
};
