import { pool } from '../lib/db';

export const auditService = {
  async list(filters: { harakat?: string; user_id?: number; limit?: number }) {
    const conditions: string[] = [];
    const values: unknown[] = [];
    if (filters.harakat) { values.push(filters.harakat); conditions.push(`a.harakat = $${values.length}`); }
    if (filters.user_id) { values.push(filters.user_id); conditions.push(`a.user_id = $${values.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = Math.min(filters.limit ?? 100, 500);
    const result = await pool.query(
      `SELECT a.id, a.harakat, a.eski_malumot, a.yangi_malumot, a.vaqt, u.username AS foydalanuvchi, u.rol
       FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
       ${where} ORDER BY a.vaqt DESC LIMIT ${limit}`,
      values
    );
    return result.rows;
  },
};
