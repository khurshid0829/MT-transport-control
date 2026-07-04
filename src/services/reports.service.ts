import { pool } from '../lib/db';

export const reportsService = {
  /**
   * 4-qoida: valyutalar HECH QACHON birgalikda qo'shilmaydi.
   * Har bir valyuta (UZS, USD) uchun alohida guruhlanadi.
   */
  async compareByCurrency(filters: Record<string, any>) {
    const conditions: string[] = ['bekor_qilindi = false'];
    const values: unknown[] = [];
    if (filters.dan) { values.push(filters.dan); conditions.push(`created_at >= $${values.length}`); }
    if (filters.gacha) { values.push(filters.gacha); conditions.push(`created_at <= $${values.length}`); }
    if (filters.avto_id) { values.push(filters.avto_id); conditions.push(`avto_id = $${values.length}`); }
    const where = `WHERE ${conditions.join(' AND ')}`;

    const result = await pool.query(
      `SELECT valyuta, turi, COALESCE(SUM(summa), 0) AS jami_summa, COUNT(*) AS amallar_soni
       FROM transactions ${where}
       GROUP BY valyuta, turi ORDER BY valyuta, turi`,
      values
    );

    const grouped: Record<string, { kirim: number; chiqim: number; sof_balans: number; amallar_soni: number }> = {};
    for (const row of result.rows) {
      const currency = row.valyuta as string;
      if (!grouped[currency]) grouped[currency] = { kirim: 0, chiqim: 0, sof_balans: 0, amallar_soni: 0 };
      const summa = Number(row.jami_summa);
      if (row.turi === 'Kirim') grouped[currency].kirim += summa; else grouped[currency].chiqim += summa;
      grouped[currency].amallar_soni += Number(row.amallar_soni);
      grouped[currency].sof_balans = grouped[currency].kirim - grouped[currency].chiqim;
    }

    // Joriy kursni olamiz (agar kiritilgan bo'lsa) — UZS/USD HECH QACHON
    // avtomatik qo'shilmaydi (4-qoida); faqat qulaylik uchun qo'shimcha,
    // alohida "ekvivalent" maydoni beriladi.
    const rateResult = await pool.query(
      `SELECT kurs FROM exchange_rates ORDER BY amal_qilish_sanasi DESC, created_at DESC LIMIT 1`
    );
    const joriyKurs = rateResult.rows[0]?.kurs ? Number(rateResult.rows[0].kurs) : null;

    let usdSofBalansUzsda: number | null = null;
    if (joriyKurs && grouped.USD) {
      usdSofBalansUzsda = Math.round(grouped.USD.sof_balans * joriyKurs);
    }

    return {
      valyutalar: grouped,
      joriy_kurs: joriyKurs,
      usd_sof_balans_uzs_ekvivalentida: usdSofBalansUzsda,
      eslatma: "Har bir valyuta alohida hisoblangan. UZS va USD summalari birlashtirilmagan.",
    };
  },

  async expensesByType(filters: Record<string, any>) {
    const conditions: string[] = ["turi = 'Chiqim'", 'bekor_qilindi = false'];
    const values: unknown[] = [];
    if (filters.dan) { values.push(filters.dan); conditions.push(`created_at >= $${values.length}`); }
    if (filters.gacha) { values.push(filters.gacha); conditions.push(`created_at <= $${values.length}`); }
    if (filters.avto_id) { values.push(filters.avto_id); conditions.push(`avto_id = $${values.length}`); }
    const result = await pool.query(
      `SELECT xarajat_turi, valyuta, COALESCE(SUM(summa), 0) AS jami_summa
       FROM transactions WHERE ${conditions.join(' AND ')}
       GROUP BY xarajat_turi, valyuta ORDER BY xarajat_turi, valyuta`,
      values
    );
    return result.rows;
  },

  /**
   * Avto rentabelligi va samaradorlik (cost per km) hisoboti.
   * MUHIM (4-qoida): agar bitta avtoda UZS HAM, USD HAM tranzaksiya bo'lsa,
   * ikkitasi ALOHIDA qatorda chiqadi — hech qachon qo'shilmaydi.
   */
  async avtoRentabelligi(filters: Record<string, any>) {
    const conditions: string[] = ['(t.bekor_qilindi = false OR t.bekor_qilindi IS NULL)'];
    const values: unknown[] = [];
    if (filters.dan) { values.push(filters.dan); conditions.push(`t.created_at >= $${values.length}`); }
    if (filters.gacha) { values.push(filters.gacha); conditions.push(`t.created_at <= $${values.length}`); }

    const result = await pool.query(
      `SELECT c.id AS avto_id, c.davlat_raqami, c.tur,
              c.boshlangich_yurgan_masofasi, c.joriy_yurgan_masofasi,
              t.valyuta,
              COALESCE(SUM(CASE WHEN t.turi = 'Kirim' THEN t.summa ELSE 0 END), 0) AS kirim,
              COALESCE(SUM(CASE WHEN t.turi = 'Chiqim' THEN t.summa ELSE 0 END), 0) AS chiqim
       FROM cars c
       LEFT JOIN transactions t ON t.avto_id = c.id AND ${conditions.join(' AND ')}
       GROUP BY c.id, c.davlat_raqami, c.tur, c.boshlangich_yurgan_masofasi, c.joriy_yurgan_masofasi, t.valyuta
       HAVING t.valyuta IS NOT NULL
       ORDER BY c.davlat_raqami`,
      values
    );

    return result.rows.map((r) => {
      const masofa = Number(r.joriy_yurgan_masofasi) - Number(r.boshlangich_yurgan_masofasi);
      const chiqim = Number(r.chiqim);
      const kirim = Number(r.kirim);
      return {
        avto_id: r.avto_id,
        davlat_raqami: r.davlat_raqami,
        tur: r.tur,
        valyuta: r.valyuta,
        kirim,
        chiqim,
        sof_foyda: kirim - chiqim,
        yurgan_masofa: masofa,
        // 100 km uchun o'rtacha xarajat — masofa 0 bo'lsa hisoblanmaydi (bo'lishga urinmaydi)
        xarajat_100km: masofa > 0 ? Math.round((chiqim / masofa) * 100) : null,
      };
    });
  },
};
