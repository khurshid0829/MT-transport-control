import { z } from 'zod';

export const registerSchema = z.object({
  ism_sharif: z.string().min(3),
  username: z.string().min(3).max(50),
  password: z.string().min(8, "Parol kamida 8 belgidan iborat bo'lishi kerak"),
  rol: z.enum(['FOUNDER', 'MANAGER', 'CHIEF_MECHANIC', 'MECHANIC']),
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const changePasswordSchema = z.object({
  eski_parol: z.string().min(1, 'Joriy parolni kiriting'),
  yangi_parol: z.string().min(8, "Yangi parol kamida 8 belgidan iborat bo'lishi kerak"),
});
