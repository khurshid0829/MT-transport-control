import { z } from 'zod';

export const createMahsulotSchema = z.object({
  nomi: z.string().min(2).max(100),
  toifa: z.enum(['Ehtiyot qism', "Yoqilg'i", 'Moy', 'Boshqa']),
  olchov_birligi: z.enum(['dona', 'litr', 'kg']),
  minimal_qoldiq: z.number().min(0).optional(),
});

export const createHarakatSchema = z.object({
  mahsulot_id: z.number().int().positive(),
  harakat_turi: z.enum(['Kirim', 'Chiqim']),
  miqdor: z.number().positive("Miqdor musbat son bo'lishi kerak"),
  narx: z.number().positive().optional(),
  valyuta: z.enum(['UZS', 'USD']).optional(),
  avto_id: z.number().int().positive().optional(),
  tavsif: z.string().max(2000).optional(),
});
