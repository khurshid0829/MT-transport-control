import { pool } from '../lib/db';
import { AppError } from '../lib/AppError';

export const carTypesService = {
  async list() {
    const result = await pool.query('SELECT nomi FROM car_types ORDER BY nomi ASC');
    return result.rows.map((r) => r.nomi as string);
  },

  async create(nomi: string) {
    const existing = await pool.query('SELECT nomi FROM car_types WHERE nomi = $1', [nomi]);
    if (existing.rows[0]) {
      throw AppError.conflict(`"${nomi}" turi allaqachon mavjud`);
    }
    await pool.query('INSERT INTO car_types (nomi) VALUES ($1)', [nomi]);
    return { nomi };
  },
};
