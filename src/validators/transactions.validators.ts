import { z } from 'zod';

const MILEAGE_RELATED_TYPES = ["Ta'mirlash", 'Ehtiyot qism'];

export const createTransactionSchema = z
  .object({
    turi: z.enum(['Kirim', 'Chiqim']),
    valyuta: z.enum(['UZS', 'USD']),
    summa: z.number().positive(),
    avto_id: z.number().int().positive().optional(),
    xarajat_turi: z.enum(["Ta'mirlash", "Yoqilg'i", 'Ehtiyot qism', 'Boshqa', 'Kirim_Moliya']),
    amaldagi_yurgan_masofa: z.number().int().min(0).optional(),
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
