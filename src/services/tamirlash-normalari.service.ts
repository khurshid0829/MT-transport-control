import { pool, withTransaction } from '../lib/db';
import { AppError } from '../lib/AppError';

export const tamirlashNormalariService = {
  async list() {
    const result = await pool.query('SELECT * FROM tamirlash_normalari ORDER BY nomi ASC');
    return result.rows;
  },

  async create(input: { nomi: string; interval_km: number }, userId: number) {
    const existing = await pool.query('SELECT id FROM tamirlash_normalari WHERE nomi = $1', [input.nomi]);
    if (existing.rows[0]) throw AppError.conflict(`"${input.nomi}" nomli norma allaqachon mavjud`);

    return withTransaction(userId, async (client) => {
      const result = await client.query(
        'INSERT INTO tamirlash_normalari (nomi, interval_km) VALUES ($1, $2) RETURNING *',
        [input.nomi, input.interval_km]
      );
      return result.rows[0];
    });
  },

  /**
   * Har bir avto x har bir norma uchun joriy holatni hisoblaydi:
   * oxirgi marta qachon (necha km'da) almashtirilgani, keyingi safar
   * qachon (necha km'da) almashtirilishi kerakligi va holati
   * (Normal / Yaqinlashmoqda / Kechikkan).
   */
  async holatlar() {
    const result = await pool.query(`
      SELECT
        c.id AS avto_id, c.davlat_raqami, c.tur, c.joriy_yurgan_masofasi,
        n.id AS norma_id, n.nomi AS qism_nomi, n.interval_km,
        COALESCE(lt.amaldagi_yurgan_masofa, c.boshlangich_yurgan_masofasi) AS oxirgi_almashtirilgan_km
      FROM cars c
      CROSS JOIN tamirlash_normalari n
      LEFT JOIN LATERAL (
        SELECT amaldagi_yurgan_masofa
        FROM transactions t
        WHERE t.avto_id = c.id AND t.almashtirilgan_qism_id = n.id AND t.bekor_qilindi = false
        ORDER BY t.amaldagi_yurgan_masofa DESC NULLS LAST
        LIMIT 1
      ) lt ON true
      ORDER BY c.davlat_raqami, n.nomi
    `);

    return result.rows.map((r) => {
      const oxirgiKm = Number(r.oxirgi_almashtirilgan_km);
      const intervalKm = Number(r.interval_km);
      const joriyKm = Number(r.joriy_yurgan_masofasi);
      const keyingiMuddat = oxirgiKm + intervalKm;
      const qolganMasofa = keyingiMuddat - joriyKm;

      let holat: 'Normal' | 'Yaqinlashmoqda' | 'Kechikkan';
      if (qolganMasofa < 0) holat = 'Kechikkan';
      else if (qolganMasofa <= intervalKm * 0.1) holat = 'Yaqinlashmoqda';
      else holat = 'Normal';

      return {
        avto_id: r.avto_id,
        davlat_raqami: r.davlat_raqami,
        tur: r.tur,
        qism_nomi: r.qism_nomi,
        norma_id: r.norma_id,
        interval_km: intervalKm,
        oxirgi_almashtirilgan_km: oxirgiKm,
        keyingi_muddat_km: keyingiMuddat,
        joriy_km: joriyKm,
        qolgan_masofa: qolganMasofa,
        holat,
      };
    });
  },
};
