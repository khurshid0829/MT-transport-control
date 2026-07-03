import { z } from 'zod';

export const createDriverSchema = z.object({
  ism_sharif: z.string().min(3),
  telefon_raqam: z.string().min(7).max(20),
  biriktirilgan_avto_id: z.number().int().positive().optional(),
});

export const updateDriverSchema = z.object({
  ism_sharif: z.string().min(3).optional(),
  telefon_raqam: z.string().min(7).max(20).optional(),
  biriktirilgan_avto_id: z.number().int().positive().nullable().optional(),
});
