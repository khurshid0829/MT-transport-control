import { z } from 'zod';

export const createRateSchema = z.object({
  kurs: z.number().positive("Kurs musbat son bo'lishi kerak"),
  amal_qilish_sanasi: z.string().optional(), // ISO sana, berilmasa bugungi kun
});
