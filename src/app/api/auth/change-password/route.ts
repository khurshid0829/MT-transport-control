export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { apiHandler } from '@/lib/apiHandler';
import { ok } from '@/lib/response';
import { AppError } from '@/lib/AppError';
import { getAuthUser } from '@/lib/auth';
import { changePasswordSchema } from '@/validators/auth.validators';
import { authService } from '@/services/auth.service';

// Har qanday tizimga kirgan foydalanuvchi FAQAT O'ZINING parolini almashtira oladi
export const PUT = apiHandler(async (req: NextRequest) => {
  const user = await getAuthUser(req);

  const body = changePasswordSchema.safeParse(await req.json());
  if (!body.success) throw AppError.badRequest("Ma'lumotlar noto'g'ri", body.error.flatten());

  await authService.changePassword(user.id, body.data.eski_parol, body.data.yangi_parol);
  return ok({ message: "Parol muvaffaqiyatli almashtirildi" });
});
