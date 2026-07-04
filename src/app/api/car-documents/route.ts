export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { apiHandler } from '@/lib/apiHandler';
import { ok } from '@/lib/response';
import { AppError } from '@/lib/AppError';
import { getAuthUser } from '@/lib/auth';
import { requirePermission } from '@/permissions/permissions';
import { createCarDocumentSchema } from '@/validators/car-documents.validators';
import { carDocumentsService } from '@/services/car-documents.service';

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getAuthUser(req);
  requirePermission(user.rol, 'car_documents', 'read');

  const { searchParams } = new URL(req.url);
  const avtoId = searchParams.get('avto_id');
  const expiringDays = searchParams.get('expiring_days');

  if (expiringDays) {
    return ok(await carDocumentsService.expiringSoon(Number(expiringDays)));
  }
  return ok(await carDocumentsService.list(avtoId ? Number(avtoId) : undefined));
});

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getAuthUser(req);
  requirePermission(user.rol, 'car_documents', 'create');

  const body = createCarDocumentSchema.safeParse(await req.json());
  if (!body.success) throw AppError.badRequest("Ma'lumotlar noto'g'ri", body.error.flatten());

  return ok(await carDocumentsService.create(body.data, user.id), 201);
});
