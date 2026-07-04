import { UserRole } from './auth';
import { isAllowed } from '../permissions/permissions';
import { transactionsService } from '../services/transactions.service';
import { reportsService } from '../services/reports.service';
import { carsService } from '../services/cars.service';
import { omborService } from '../services/ombor.service';

/**
 * MUHIM (RBAC — 1-qoida AI'ga ham tegishli): har bir tool faqat
 * so'rovchi foydalanuvchining ROLIGA mos ruxsat bo'yicha ko'rinadi va
 * bajariladi. Masalan MECHANIC uchun "hisobot" tool'lari umuman
 * Claude'ga taqdim etilmaydi — shuning uchun AI hech qachon ruxsatsiz
 * ma'lumotni "bilib qolmaydi".
 */
export function buildToolsForRole(role: UserRole) {
  const tools: any[] = [];

  if (isAllowed(role, 'transactions', 'read')) {
    tools.push({
      name: 'tranzaksiyalarni_royxati',
      description: "Tranzaksiyalar (xarajat yoki kirim) ro'yxatini filtrlab qaytaradi. Har bir yozuvda turi, valyuta, summa, xarajat_turi, avto_id, sana bor.",
      input_schema: {
        type: 'object',
        properties: {
          dan: { type: 'string', description: "Sana (YYYY-MM-DD) — shu sanadan boshlab" },
          gacha: { type: 'string', description: "Sana (YYYY-MM-DD) — shu sanagacha" },
          avto_id: { type: 'integer', description: 'Muayyan avto ID (ixtiyoriy)' },
          valyuta: { type: 'string', enum: ['UZS', 'USD'] },
          turi: { type: 'string', enum: ['Kirim', 'Chiqim'] },
          xarajat_turi: { type: 'string', description: "masalan: Yoqilg'i, Ta'mirlash, Ehtiyot qism" },
        },
      },
    });
  }

  if (isAllowed(role, 'reports', 'read')) {
    tools.push({
      name: 'valyuta_solishtirish',
      description: "UZS va USD bo'yicha jami kirim, chiqim va sof balansni ALOHIDA-ALOHIDA qaytaradi (hech qachon qo'shilmaydi). Davr yoki avto bo'yicha filtrlash mumkin.",
      input_schema: {
        type: 'object',
        properties: {
          dan: { type: 'string', description: 'YYYY-MM-DD' },
          gacha: { type: 'string', description: 'YYYY-MM-DD' },
          avto_id: { type: 'integer' },
        },
      },
    });
    tools.push({
      name: 'xarajat_taqsimoti',
      description: "Xarajat turlari (Yoqilg'i, Ta'mirlash va h.k.) bo'yicha jami summalarni qaytaradi — qaysi turi eng ko'p xarajat qilinganini aniqlash uchun foydali.",
      input_schema: {
        type: 'object',
        properties: {
          dan: { type: 'string', description: 'YYYY-MM-DD' },
          gacha: { type: 'string', description: 'YYYY-MM-DD' },
          avto_id: { type: 'integer' },
        },
      },
    });
  }

  if (isAllowed(role, 'cars', 'read')) {
    tools.push({
      name: 'avtolar_royxati',
      description: 'Avtoparkdagi avtomobillar ro\'yxatini (turi, davlat raqami, ishlab chiqarilgan yili, joriy masofa, texnik holati) qaytaradi.',
      input_schema: {
        type: 'object',
        properties: {
          tur: { type: 'string' },
          texnik_holat: { type: 'string', enum: ['Aktiv', "Ta'mirlashda", 'Nosoz'] },
        },
      },
    });
  }

  if (isAllowed(role, 'ombor_mahsulotlari', 'read')) {
    tools.push({
      name: 'ombor_qoldiqlari',
      description: 'Ombordagi mahsulotlar (yoqilg\'i, moy, ehtiyot qismlar) va ularning joriy qoldig\'ini qaytaradi.',
      input_schema: { type: 'object', properties: {} },
    });
  }

  return tools;
}

/** Tool nomini haqiqiy service funksiyasiga bog'laydi. Ruxsat yana bir bor tekshiriladi (ikkinchi qatlam). */
export async function executeAiTool(name: string, input: any, role: UserRole) {
  switch (name) {
    case 'tranzaksiyalarni_royxati':
      if (!isAllowed(role, 'transactions', 'read')) throw new Error('Ruxsat yo\'q');
      return transactionsService.list(input || {});

    case 'valyuta_solishtirish':
      if (!isAllowed(role, 'reports', 'read')) throw new Error('Ruxsat yo\'q');
      return reportsService.compareByCurrency(input || {});

    case 'xarajat_taqsimoti':
      if (!isAllowed(role, 'reports', 'read')) throw new Error('Ruxsat yo\'q');
      return reportsService.expensesByType(input || {});

    case 'avtolar_royxati':
      if (!isAllowed(role, 'cars', 'read')) throw new Error('Ruxsat yo\'q');
      return carsService.list(input || {});

    case 'ombor_qoldiqlari':
      if (!isAllowed(role, 'ombor_mahsulotlari', 'read')) throw new Error('Ruxsat yo\'q');
      return omborService.listMahsulotlar();

    default:
      throw new Error(`Noma'lum tool: ${name}`);
  }
}
