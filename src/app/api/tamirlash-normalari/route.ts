export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { apiHandler } from '@/lib/apiHandler';
import { ok } from '@/lib/response';
import { AppError } from '@/lib/AppError';
import { getAuthUser } from '@/lib/auth';
import { requirePermission } from '@/permissions/permissions';
import { createNormaSchema } from '@/validators/tamirlash-normalari.validators';
import { tamirlashNormalariService } from '@/services/tamirlash-normalari.service';

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getAuthUser(req);
  requirePermission(user.rol, 'tamirlash_normalari', 'read');
  return ok(await tamirlashNormalariService.list());
});

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getAuthUser(req);
  requirePermission(user.rol, 'tamirlash_normalari', 'create');

  const body = createNormaSchema.safeParse(await req.json());
  if (!body.success) throw AppError.badRequest("Ma'lumotlar noto'g'ri", body.error.flatten());

  return ok(await tamirlashNormalariService.create(body.data, user.id), 201);
});
