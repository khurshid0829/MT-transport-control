export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { apiHandler } from '@/lib/apiHandler';
import { ok } from '@/lib/response';
import { AppError } from '@/lib/AppError';
import { getAuthUser } from '@/lib/auth';
import { requirePermission } from '@/permissions/permissions';
import { updateCarSchema } from '@/validators/cars.validators';
import { carsService } from '@/services/cars.service';

export const GET = apiHandler(async (req: NextRequest, { params }) => {
  const user = getAuthUser(req);
  requirePermission(user.rol, 'cars', 'read');
  const car = await carsService.getById(Number(params.id));
  return ok(car);
});

export const PUT = apiHandler(async (req: NextRequest, { params }) => {
  const user = getAuthUser(req);
  requirePermission(user.rol, 'cars', 'update');

  const body = updateCarSchema.safeParse(await req.json());
  if (!body.success) throw AppError.badRequest("Ma'lumotlar noto'g'ri", body.error.flatten());

  const car = await carsService.update(Number(params.id), body.data, user.id);
  return ok(car);
});
