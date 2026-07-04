import { z } from 'zod';

export const createCarTypeSchema = z.object({
  nomi: z.string().min(2, "Turi nomi kamida 2 belgidan iborat bo'lishi kerak").max(50),
});
