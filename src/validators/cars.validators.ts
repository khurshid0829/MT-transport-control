import { z } from 'zod';

const currentYear = 2026;

export const createCarSchema = z
  .object({
    tur: z.enum(['Isuzu 10t', 'Isuzu 5t', 'Changan', 'Labo']),
    davlat_raqami: z
      .string()
      .regex(/^\d{2}[A-Z]\d{3}[A-Z]{2}$/, "Avto raqami formati noto'g'ri (masalan: 01A111AA)"),
    ishlab_chiqarilgan_yili: z.number().int().min(1980).max(currentYear + 1),
    boshlangich_yurgan_masofasi: z.number().int().min(0),
    joriy_yurgan_masofasi: z.number().int().min(0),
  })
  .refine((data) => data.joriy_yurgan_masofasi >= data.boshlangich_yurgan_masofasi, {
    message: "joriy_yurgan_masofasi boshlangich_yurgan_masofasi'dan kichik bo'lishi mumkin emas",
    path: ['joriy_yurgan_masofasi'],
  });

export const updateCarSchema = z.object({
  tur: z.enum(['Isuzu 10t', 'Isuzu 5t', 'Changan', 'Labo']).optional(),
  davlat_raqami: z.string().min(4).max(20).optional(),
  texnik_holat: z.enum(['Aktiv', "Ta'mirlashda", 'Nosoz']).optional(),
});
