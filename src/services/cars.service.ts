import { pool, withTransaction } from '../lib/db';
import { AppError } from '../lib/AppError';

export const carsService = {
  async list(filters: { tur?: string; texnik_holat?: string }) {
    const conditions: string[] = [];
    const values: unknown[] = [];
    if (filters.tur) { values.push(filters.tur); conditions.push(`tur = $${values.length}`); }
    if (filters.texnik_holat) { values.push(filters.texnik_holat); conditions.push(`texnik_holat = $${values.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(`SELECT * FROM cars ${where} ORDER BY id ASC`, values);
    return result.rows;
  },

  async getById(id: number) {
    const result = await pool.query('SELECT * FROM cars WHERE id = $1', [id]);
    if (!result.rows[0]) throw AppError.notFound(`Avto (id=${id}) topilmadi`);
    return result.rows[0];
  },

  async create(input: any, userId: number) {
    return withTransaction(userId, async (client) => {
      const result = await client.query(
        `INSERT INTO cars (tur, davlat_raqami, ishlab_chiqarilgan_yili, boshlangich_yurgan_masofasi, joriy_yurgan_masofasi)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [input.tur, input.davlat_raqami, input.ishlab_chiqarilgan_yili, input.boshlangich_yurgan_masofasi, input.joriy_yurgan_masofasi]
      );
      return result.rows[0];
    });
  },

  async update(id: number, input: any, userId: number) {
    return withTransaction(userId, async (client) => {
      const existing = await client.query('SELECT id FROM cars WHERE id = $1', [id]);
      if (!existing.rows[0]) throw AppError.notFound(`Avto (id=${id}) topilmadi`);

      const fields: string[] = [];
      const values: unknown[] = [];
      Object.entries(input).forEach(([key, value]) => {
        if (value !== undefined) { values.push(value); fields.push(`${key} = $${values.length}`); }
      });
      if (fields.length === 0) throw AppError.badRequest('Yangilash uchun maydon berilmagan');

      values.push(id);
      const result = await client.query(
        `UPDATE cars SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
        values
      );
      return result.rows[0];
    });
  },
};
