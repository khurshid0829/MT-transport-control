import { pool, withTransaction } from '../lib/db';

export const carDocumentsService = {
  async list(avtoId?: number) {
    const where = avtoId ? 'WHERE cd.avto_id = $1' : '';
    const values = avtoId ? [avtoId] : [];
    const result = await pool.query(
      `SELECT cd.*, c.davlat_raqami, c.tur,
              (cd.amal_qilish_muddati - CURRENT_DATE) AS qolgan_kun
       FROM car_documents cd
       JOIN cars c ON c.id = cd.avto_id
       ${where}
       ORDER BY cd.amal_qilish_muddati ASC`,
      values
    );
    return result.rows;
  },

  /** 10 kundan kam qolgan (yoki allaqachon o'tgan) hujjatlar — Dashboard ogohlantirishi uchun */
  async expiringSoon(kunSoni = 10) {
    const result = await pool.query(
      `SELECT cd.*, c.davlat_raqami, c.tur,
              (cd.amal_qilish_muddati - CURRENT_DATE) AS qolgan_kun
       FROM car_documents cd
       JOIN cars c ON c.id = cd.avto_id
       WHERE cd.amal_qilish_muddati <= CURRENT_DATE + $1::int
       ORDER BY cd.amal_qilish_muddati ASC`,
      [kunSoni]
    );
    return result.rows;
  },

  async create(input: { avto_id: number; hujjat_turi: string; amal_qilish_muddati: string; izoh?: string }, userId: number) {
    return withTransaction(userId, async (client) => {
      const result = await client.query(
        `INSERT INTO car_documents (avto_id, hujjat_turi, amal_qilish_muddati, izoh, kim_kiritdi)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [input.avto_id, input.hujjat_turi, input.amal_qilish_muddati, input.izoh ?? null, userId]
      );
      return result.rows[0];
    });
  },
};
