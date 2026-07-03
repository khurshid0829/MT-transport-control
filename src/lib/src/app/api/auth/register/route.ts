export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { apiHandler } from '@/lib/apiHandler';
import { ok } from '@/lib/response';
import { AppError } from '@/lib/AppError';
import { getAuthUser } from '@/lib/auth';
import { requirePermission } from '@/permissions/permissions';
import { registerSchema } from '@/validators/auth.validators';
import { authService } from '@/services/auth.service';

// Faqat FOUNDER yangi foydalanuvchi qo'sha oladi (permissions.ts: users.create)
export const POST = apiHandler(async (req: NextRequest) => {
  const user = getAuthUser(req);
  requirePermission(user.rol, 'users', 'create');

  const body = registerSchema.safeParse(await req.json());
  if (!body.success) throw AppError.badRequest("Ma'lumotlar noto'g'ri", body.error.flatten());

  const newUser = await authService.register(body.data);
  return ok(newUser, 201);
});
