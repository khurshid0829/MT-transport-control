export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { apiHandler } from '@/lib/apiHandler';
import { ok } from '@/lib/response';
import { AppError } from '@/lib/AppError';
import { getAuthUser } from '@/lib/auth';
import { requirePermission } from '@/permissions/permissions';
import { updateUserStatusSchema } from '@/validators/users.validators';
import { usersService } from '@/services/users.service';

export const PUT = apiHandler(async (req: NextRequest, { params }) => {
  const user = await getAuthUser(req);
  requirePermission(user.rol, 'users', 'update');

  const body = updateUserStatusSchema.safeParse(await req.json());
  if (!body.success) throw AppError.badRequest("Ma'lumotlar noto'g'ri", body.error.flatten());

  const updated = await usersService.updateStatus(Number(params.id), body.data.status, user.id);
  return ok(updated);
});
