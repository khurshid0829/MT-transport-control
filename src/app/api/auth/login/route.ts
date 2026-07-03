export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { apiHandler } from '@/lib/apiHandler';
import { ok } from '@/lib/response';
import { AppError } from '@/lib/AppError';
import { loginSchema } from '@/validators/auth.validators';
import { authService } from '@/services/auth.service';

export const POST = apiHandler(async (req: NextRequest) => {
  const body = loginSchema.safeParse(await req.json());
  if (!body.success) throw AppError.badRequest("Login yoki parol noto'g'ri kiritildi", body.error.flatten());

  const { token, user } = await authService.login(body.data);
  return ok({ token, user });
});
