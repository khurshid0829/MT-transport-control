export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { apiHandler } from '@/lib/apiHandler';
import { ok } from '@/lib/response';
import { AppError } from '@/lib/AppError';
import { getAuthUser } from '@/lib/auth';
import { requirePermission } from '@/permissions/permissions';
import { createCarTypeSchema } from '@/validators/car-types.validators';
import { carTypesService } from '@/services/car-types.service';

// O'qish — barcha rollar (avto qo'shish/ko'rish formalarida kerak)
export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getAuthUser(req);
  requirePermission(user.rol, 'cars', 'read');
  return ok(await carTypesService.list());
});

// Yaratish — faqat FOUNDER/MANAGER (cars.create bilan bir xil huquq)
export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getAuthUser(req);
  requirePermission(user.rol, 'cars', 'create');

  const body = createCarTypeSchema.safeParse(await req.json());
  if (!body.success) throw AppError.badRequest("Ma'lumotlar noto'g'ri", body.error.flatten());

  const result = await carTypesService.create(body.data.nomi);
  return ok(result, 201);
});
