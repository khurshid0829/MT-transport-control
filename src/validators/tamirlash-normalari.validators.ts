import { z } from 'zod';

export const createNormaSchema = z.object({
  nomi: z.string().min(2).max(100),
  interval_km: z.number().int().positive("Interval musbat son (km) bo'lishi kerak"),
});
