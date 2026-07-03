export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { apiHandler } from '@/lib/apiHandler';
import { ok } from '@/lib/response';
import { AppError } from '@/lib/AppError';
import { getAuthUser } from '@/lib/auth';
import { requirePermission } from '@/permissions/permissions';
import { createCarSchema } from '@/validators/cars.validators';
import { carsService } from '@/services/cars.service';

export const GET = apiHandler(async (req: NextRequest) => {
  const user = getAuthUser(req);
  requirePermission(user.rol, 'cars', 'read');

  const { searchParams } = new URL(req.url);
  const cars = await carsService.list({
    tur: searchParams.get('tur') ?? undefined,
    texnik_holat: searchParams.get('texnik_holat') ?? undefined,
  });
  return ok(cars);
});

export const POST = apiHandler(async (req: NextRequest) => {
  const user = getAuthUser(req);
  requirePermission(user.rol, 'cars', 'create');

  const body = createCarSchema.safeParse(await req.json());
  if (!body.success) throw AppError.badRequest("Ma'lumotlar noto'g'ri", body.error.flatten());

  const car = await carsService.create(body.data, user.id);
  return ok(car, 201);
});
