import { z } from 'zod';

export const registerSchema = z.object({
  ism_sharif: z.string().min(3),
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  rol: z.enum(['FOUNDER', 'MANAGER', 'CHIEF_MECHANIC', 'MECHANIC']),
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});
