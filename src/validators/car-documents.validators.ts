import { z } from 'zod';

export const createCarDocumentSchema = z.object({
  avto_id: z.number().int().positive(),
  hujjat_turi: z.enum(['OSAGO', 'Texnik korik', 'Gaz ballon sinovi', 'Ishonchnoma']),
  amal_qilish_muddati: z.string().min(1, 'Sana kiritilishi shart'), // ISO YYYY-MM-DD
  izoh: z.string().max(500).optional(),
});
