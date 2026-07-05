export const dynamic = 'force-dynamic';

import { apiHandler } from '@/lib/apiHandler';
import { ok } from '@/lib/response';
import { COOKIE_NAME } from '@/lib/auth';

// httpOnly cookie'ni faqat server tozalay oladi (client JS unga tega olmaydi)
export const POST = apiHandler(async () => {
  const res = ok({ message: 'Chiqildi' });
  res.cookies.set(COOKIE_NAME, '', { httpOnly: true, maxAge: 0, path: '/' });
  return res;
});
