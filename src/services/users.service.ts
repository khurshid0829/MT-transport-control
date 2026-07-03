import { pool, withTransaction } from '../lib/db';
import { AppError } from '../lib/AppError';

export const usersService = {
  async list() {
    const result = await pool.query(
      `SELECT id, ism_sharif, username, rol, status, created_at
       FROM users ORDER BY id ASC`
    );
    return result.rows;
  },

  /**
   * Foydalanuvchi HECH QACHON o'chirilmaydi (audit tarixi buzilmasligi
   * uchun) — faqat 'Bloklangan' holatga o'tkaziladi. Bloklangan
   * foydalanuvchi login qila olmaydi (auth.service.ts'da tekshiriladi).
   */
  async updateStatus(id: number, status: 'Aktiv' | 'Bloklangan', actingUserId: number) {
    if (id === actingUserId && status === 'Bloklangan') {
      throw AppError.badRequest("O'zingizni bloklay olmaysiz");
    }
    return withTransaction(actingUserId, async (client) => {
      const result = await client.query(
        `UPDATE users SET status = $1 WHERE id = $2 RETURNING id, ism_sharif, username, rol, status`,
        [status, id]
      );
      if (!result.rows[0]) throw AppError.notFound(`Foydalanuvchi (id=${id}) topilmadi`);
      return result.rows[0];
    });
  },
};
