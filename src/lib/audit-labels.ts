/**
 * Audit log'dagi texnik kodlarni (masalan "UPDATE_CARS") oddiy
 * foydalanuvchiga tushunarli o'zbekcha jumlalarga aylantiradi.
 */
export const HARAKAT_LABELS: Record<string, string> = {
  INSERT_CARS: "Yangi avto qo'shildi",
  UPDATE_CARS: 'Avto ma\'lumotlari yangilandi',
  DELETE_CARS: "Avto o'chirildi",
  INSERT_TRANSACTIONS: 'Yangi tranzaksiya kiritildi',
  UPDATE_TRANSACTIONS: 'Tranzaksiya yangilandi',
  DELETE_TRANSACTIONS: "Tranzaksiya o'chirildi",
  INSERT_USERS: 'Yangi foydalanuvchi yaratildi',
  UPDATE_USERS: "Foydalanuvchi ma'lumoti yangilandi",
  INSERT_EXCHANGE_RATES: 'Valyuta kursi kiritildi',
  INSERT_OMBOR_MAHSULOTLARI: "Yangi ombor mahsuloti qo'shildi",
  UPDATE_OMBOR_MAHSULOTLARI: "Ombor qoldig'i yangilandi",
  DELETE_OMBOR_MAHSULOTLARI: 'Ombor mahsuloti o\'chirildi',
  INSERT_OMBOR_HARAKATLARI: 'Ombor harakati (kirim/chiqim) qayd etildi',
  LOGIN_SUCCESS: 'Tizimga muvaffaqiyatli kirdi',
  LOGIN_FAILED: "Kirish urinishi muvaffaqiyatsiz (noto'g'ri parol)",
};

export function harakatLabel(harakat: string): string {
  return HARAKAT_LABELS[harakat] || harakat;
}

/** Baza ustun nomlarini o'zbekcha, o'qish oson nomlarga aylantiradi. */
const FIELD_LABELS: Record<string, string> = {
  tur: 'Turi', davlat_raqami: 'Davlat raqami', ishlab_chiqarilgan_yili: 'Ishlab chiqarilgan yili',
  boshlangich_yurgan_masofasi: "Boshlang'ich masofa", joriy_yurgan_masofasi: 'Joriy masofa',
  texnik_holat: 'Texnik holat', turi: 'Turi', valyuta: 'Valyuta', summa: 'Summa',
  avto_id: 'Avto', xarajat_turi: 'Xarajat turi', amaldagi_yurgan_masofa: 'Amaldagi masofa',
  tavsif: 'Tavsif', bekor_qilindi: 'Bekor qilingan', ism_sharif: 'Ism sharifi',
  username: 'Username', rol: 'Rol', status: 'Holati', kurs: 'Kurs',
  amal_qilish_sanasi: 'Sana', nomi: 'Nomi', toifa: 'Toifa', olchov_birligi: "O'lchov birligi",
  joriy_qoldiq: 'Joriy qoldiq', minimal_qoldiq: 'Minimal qoldiq', harakat_turi: 'Harakat turi',
  miqdor: 'Miqdor', narx: 'Narx',
};

// Bular audit ko'rinishida ko'rsatilmaydi (ichki/texnik yoki maxfiy maydonlar)
const HIDDEN_FIELDS = new Set(['id', 'created_at', 'password_hash', 'kim_kiritdi', 'muvaffaqiyatsiz_urinishlar', 'bloklangan_gacha']);

function fieldLabel(key: string): string {
  return FIELD_LABELS[key] || key;
}

function displayValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'ha' : "yo'q";
  return String(v);
}

/**
 * Eski va yangi JSON obyektlarini solishtirib, faqat O'ZGARGAN
 * maydonlarni "Nomi: eski → yangi" ko'rinishida qaytaradi.
 * INSERT bo'lsa (eski=null) — yaratilgan qiymatlarni ko'rsatadi.
 * DELETE bo'lsa (yangi=null) — o'chirilgan qiymatlarni ko'rsatadi.
 */
export function summarizeDiff(eski: Record<string, unknown> | null, yangi: Record<string, unknown> | null): string[] {
  const lines: string[] = [];

  if (eski && !yangi) {
    for (const [key, val] of Object.entries(eski)) {
      if (HIDDEN_FIELDS.has(key)) continue;
      lines.push(`${fieldLabel(key)}: ${displayValue(val)}`);
    }
    return lines;
  }

  if (!eski && yangi) {
    for (const [key, val] of Object.entries(yangi)) {
      if (HIDDEN_FIELDS.has(key) || val === null || val === undefined || val === '') continue;
      lines.push(`${fieldLabel(key)}: ${displayValue(val)}`);
    }
    return lines;
  }

  if (eski && yangi) {
    const keys = new Set([...Object.keys(eski), ...Object.keys(yangi)]);
    for (const key of keys) {
      if (HIDDEN_FIELDS.has(key)) continue;
      const oldVal = eski[key];
      const newVal = yangi[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        lines.push(`${fieldLabel(key)}: ${displayValue(oldVal)} → ${displayValue(newVal)}`);
      }
    }
  }

  return lines;
}
