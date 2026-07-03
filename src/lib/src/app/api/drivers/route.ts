export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { apiHandler } from '@/lib/apiHandler';
import { ok } from '@/lib/response';
import { AppError } from '@/lib/AppError';
import { getAuthUser } from '@/lib/auth';
import { requirePermission } from '@/permissions/permissions';
import { createDriverSchema } from '@/validators/drivers.validators';
import { driversService } from '@/services/drivers.service';

export const GET = apiHandler(async (req: NextRequest) => {
  const user = getAuthUser(req);
  requirePermission(user.rol, 'drivers', 'read');
  return ok(await driversService.list());
});

export const POST = apiHandler(async (req: NextRequest) => {
  const user = getAuthUser(req);
  requirePermission(user.rol, 'drivers', 'create');
  const body = createDriverSchema.safeParse(await req.json());
  if (!body.success) throw AppError.badRequest("Ma'lumotlar noto'g'ri", body.error.flatten());
  return ok(await driversService.create(body.data), 201);
});
