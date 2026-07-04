export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { apiHandler } from '@/lib/apiHandler';
import { ok } from '@/lib/response';
import { AppError } from '@/lib/AppError';
import { getAuthUser } from '@/lib/auth';
import { requirePermission } from '@/permissions/permissions';
import { createHarakatSchema } from '@/validators/ombor.validators';
import { omborService } from '@/services/ombor.service';

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getAuthUser(req);
  requirePermission(user.rol, 'ombor_harakatlari', 'read');

  const { searchParams } = new URL(req.url);
  const mahsulot_id = searchParams.get('mahsulot_id');
  return ok(await omborService.listHarakatlar({
    mahsulot_id: mahsulot_id ? Number(mahsulot_id) : undefined,
  }));
});

// YOZISH — faqat CHIEF_MECHANIC (transactions bilan bir xil qoida)
export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getAuthUser(req);
  requirePermission(user.rol, 'ombor_harakatlari', 'create');

  const body = createHarakatSchema.safeParse(await req.json());
  if (!body.success) throw AppError.badRequest("Ma'lumotlar noto'g'ri", body.error.flatten());

  const harakat = await omborService.createHarakat(body.data, user.id);
  return ok(harakat, 201);
});
