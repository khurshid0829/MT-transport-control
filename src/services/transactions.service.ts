import { pool, withTransaction } from '../lib/db';
import { AppError } from '../lib/AppError';

export const transactionsService = {
  async list(filters: Record<string, any>) {
    const conditions: string[] = [];
    const values: unknown[] = [];
    if (filters.avto_id) { values.push(filters.avto_id); conditions.push(`avto_id = $${values.length}`); }
    if (filters.valyuta) { values.push(filters.valyuta); conditions.push(`valyuta = $${values.length}`); }
    if (filters.turi) { values.push(filters.turi); conditions.push(`turi = $${values.length}`); }
    if (filters.xarajat_turi) { values.push(filters.xarajat_turi); conditions.push(`xarajat_turi = $${values.length}`); }
    if (filters.dan) { values.push(filters.dan); conditions.push(`created_at >= $${values.length}`); }
    if (filters.gacha) { values.push(filters.gacha); conditions.push(`created_at <= $${values.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(`SELECT * FROM transactions ${where} ORDER BY created_at DESC`, values);
    return result.rows;
  },

  async getById(id: number) {
    const result = await pool.query('SELECT * FROM transactions WHERE id = $1', [id]);
    if (!result.rows[0]) throw AppError.notFound(`Tranzaksiya (id=${id}) topilmadi`);
    return result.rows[0];
  },

  /**
   * Masofa yaxlitligi (2-qoida) DB darajasida `trg_transactions_mileage_check`
   * trigger'i orqali majburlanadi — bu himoyaning ikkinchi (asosiy) qatlami.
   * zod validatsiyasi esa foydalanuvchiga tezroq, aniqroq xato beradi.
   */
  async create(input: any, userId: number) {
    return withTransaction(userId, async (client) => {
      const result = await client.query(
        `INSERT INTO transactions (turi, valyuta, summa, avto_id, xarajat_turi, amaldagi_yurgan_masofa, tavsif, kim_kiritdi)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [input.turi, input.valyuta, input.summa, input.avto_id ?? null, input.xarajat_turi, input.amaldagi_yurgan_masofa ?? null, input.tavsif ?? null, userId]
      );
      return result.rows[0];
    });
  },

  /**
   * MUHIM (audit topilmasi): tranzaksiyalar HECH QACHON bazadan haqiqiy
   * o'chirilmaydi — moliyaviy audit talabiga ko'ra har bir yozuv (hatto
   * xato bo'lsa ham) tarixda saqlanishi kerak. Buning o'rniga
   * "bekor_qilindi = true" deb belgilanadi; bu UPDATE trigger orqali
   * audit_log'ga eski/yangi holat bilan avtomatik yoziladi.
   */
  async remove(id: number, userId: number) {
    return withTransaction(userId, async (client) => {
      const existing = await client.query('SELECT id, bekor_qilindi FROM transactions WHERE id = $1', [id]);
      if (!existing.rows[0]) throw AppError.notFound(`Tranzaksiya (id=${id}) topilmadi`);
      if (existing.rows[0].bekor_qilindi) {
        throw AppError.conflict('Bu tranzaksiya allaqachon bekor qilingan');
      }
      const result = await client.query(
        `UPDATE transactions
         SET bekor_qilindi = true, bekor_qilingan_vaqt = CURRENT_TIMESTAMP, bekor_qilgan_user_id = $2
         WHERE id = $1 RETURNING *`,
        [id, userId]
      );
      return result.rows[0];
    });
  },
};
