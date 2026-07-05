import { z } from 'zod';

export const XARAJAT_TURLARI = [
  "Yoqilg'i",
  'Moy',
  "Ta'mirlash",
  'Ehtiyot qism',
  'YTX',
  "Kapital ta'mir",
  'Diagnostika',
  'Boshqa',
  'Kirim_Moliya',
] as const;

// Avto holatiga to'g'ridan-to'g'ri ta'sir qiluvchi turlar uchun
// avto_id va amaldagi_yurgan_masofa (odometr) majburiy — 2-qoida shu turlarga tegishli.
const MILEAGE_RELATED_TYPES = ["Ta'mirlash", 'Ehtiyot qism', "Kapital ta'mir", 'YTX', 'Diagnostika', 'Moy'];

export const createTransactionSchema = z
  .object({
    turi: z.enum(['Kirim', 'Chiqim']),
    valyuta: z.enum(['UZS', 'USD']),
    summa: z.number().positive(),
    avto_id: z.number().int().positive().optional(),
    xarajat_turi: z.enum(XARAJAT_TURLARI),
    amaldagi_yurgan_masofa: z.number().int().min(0).optional(),
    almashtirilgan_qism_id: z.number().int().positive().optional(),
    tavsif: z.string().max(2000).optional(),
  })
  .refine((d) => !(d.turi === 'Kirim' && d.xarajat_turi !== 'Kirim_Moliya'), {
    message: "turi='Kirim' bo'lganda xarajat_turi faqat 'Kirim_Moliya' bo'lishi kerak",
    path: ['xarajat_turi'],
  })
  .refine((d) => !(d.turi === 'Chiqim' && d.xarajat_turi === 'Kirim_Moliya'), {
    message: "turi='Chiqim' bo'lganda xarajat_turi 'Kirim_Moliya' bo'la olmaydi",
    path: ['xarajat_turi'],
  })
  .refine((d) => !MILEAGE_RELATED_TYPES.includes(d.xarajat_turi) || d.avto_id !== undefined, {
    message: 'Bu xarajat turi uchun avto_id majburiy',
    path: ['avto_id'],
  })
  .refine(
    (d) => !MILEAGE_RELATED_TYPES.includes(d.xarajat_turi) || d.amaldagi_yurgan_masofa !== undefined,
    {
      message: "Ta'mirlash/Ehtiyot qism uchun amaldagi_yurgan_masofa majburiy",
      path: ['amaldagi_yurgan_masofa'],
    }
  );
