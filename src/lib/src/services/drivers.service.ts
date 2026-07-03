import { pool } from '../lib/db';
import { AppError } from '../lib/AppError';

export const driversService = {
  async list() {
    const result = await pool.query(
      `SELECT d.*, c.davlat_raqami AS avto_davlat_raqami
       FROM drivers d LEFT JOIN cars c ON c.id = d.biriktirilgan_avto_id
       ORDER BY d.id ASC`
    );
    return result.rows;
  },
  async getById(id: number) {
    const result = await pool.query('SELECT * FROM drivers WHERE id = $1', [id]);
    if (!result.rows[0]) throw AppError.notFound(`Haydovchi (id=${id}) topilmadi`);
    return result.rows[0];
  },
  async create(input: any) {
    const result = await pool.query(
      `INSERT INTO drivers (ism_sharif, telefon_raqam, biriktirilgan_avto_id) VALUES ($1, $2, $3) RETURNING *`,
      [input.ism_sharif, input.telefon_raqam, input.biriktirilgan_avto_id ?? null]
    );
    return result.rows[0];
  },
  async update(id: number, input: any) {
    const fields: string[] = [];
    const values: unknown[] = [];
    Object.entries(input).forEach(([key, value]) => {
      if (value !== undefined) { values.push(value); fields.push(`${key} = $${values.length}`); }
    });
    if (fields.length === 0) throw AppError.badRequest('Yangilash uchun maydon berilmagan');
    values.push(id);
    const result = await pool.query(
      `UPDATE drivers SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (!result.rows[0]) throw AppError.notFound(`Haydovchi (id=${id}) topilmadi`);
    return result.rows[0];
  },
  async remove(id: number) {
    const result = await pool.query('DELETE FROM drivers WHERE id = $1 RETURNING id', [id]);
    if (!result.rows[0]) throw AppError.notFound(`Haydovchi (id=${id}) topilmadi`);
  },
};
