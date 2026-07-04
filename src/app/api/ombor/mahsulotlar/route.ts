export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { apiHandler } from '@/lib/apiHandler';
import { ok } from '@/lib/response';
import { AppError } from '@/lib/AppError';
import { getAuthUser } from '@/lib/auth';
import { requirePermission } from '@/permissions/permissions';
import { createMahsulotSchema } from '@/validators/ombor.validators';
import { omborService } from '@/services/ombor.service';

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getAuthUser(req);
  requirePermission(user.rol, 'ombor_mahsulotlari', 'read');
  return ok(await omborService.listMahsulotlar());
});

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getAuthUser(req);
  requirePermission(user.rol, 'ombor_mahsulotlari', 'create');

  const body = createMahsulotSchema.safeParse(await req.json());
  if (!body.success) throw AppError.badRequest("Ma'lumotlar noto'g'ri", body.error.flatten());

  return ok(await omborService.createMahsulot(body.data), 201);
});
