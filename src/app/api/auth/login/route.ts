export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { apiHandler } from '@/lib/apiHandler';
import { ok } from '@/lib/response';
import { AppError } from '@/lib/AppError';
import { loginSchema } from '@/validators/auth.validators';
import { authService } from '@/services/auth.service';
import { COOKIE_NAME } from '@/lib/auth';

const EIGHT_HOURS = 8 * 60 * 60;

export const POST = apiHandler(async (req: NextRequest) => {
  const body = loginSchema.safeParse(await req.json());
  if (!body.success) throw AppError.badRequest("Login yoki parol noto'g'ri kiritildi", body.error.flatten());

  const { token, user } = await authService.login(body.data);

  // MUHIM (Session Hijacking himoyasi): token endi javob tanasida (JSON)
  // qaytarilmaydi — brauzer JS'i (localStorage) unga umuman tega olmaydi.
  // httpOnly cookie orqali o'rnatiladi, har bir keyingi so'rovda brauzer
  // avtomatik yuboradi.
  const res = ok({ user }); // token endi javobda YO'Q — faqat foydalanuvchi ma'lumoti
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: EIGHT_HOURS,
    path: '/',
  });
  return res;
});
