export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { apiHandler } from '@/lib/apiHandler';
import { ok } from '@/lib/response';
import { AppError } from '@/lib/AppError';
import { getAuthUser } from '@/lib/auth';
import { requirePermission } from '@/permissions/permissions';
import { updateDriverSchema } from '@/validators/drivers.validators';
import { driversService } from '@/services/drivers.service';

export const GET = apiHandler(async (req: NextRequest, { params }) => {
  const user = getAuthUser(req);
  requirePermission(user.rol, 'drivers', 'read');
  return ok(await driversService.getById(Number(params.id)));
});

export const PUT = apiHandler(async (req: NextRequest, { params }) => {
  const user = getAuthUser(req);
  requirePermission(user.rol, 'drivers', 'update');
  const body = updateDriverSchema.safeParse(await req.json());
  if (!body.success) throw AppError.badRequest("Ma'lumotlar noto'g'ri", body.error.flatten());
  return ok(await driversService.update(Number(params.id), body.data));
});

export const DELETE = apiHandler(async (req: NextRequest, { params }) => {
  const user = getAuthUser(req);
  requirePermission(user.rol, 'drivers', 'delete');
  await driversService.remove(Number(params.id));
  return ok({ id: Number(params.id) });
});
