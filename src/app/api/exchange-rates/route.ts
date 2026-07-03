export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { apiHandler } from '@/lib/apiHandler';
import { ok } from '@/lib/response';
import { AppError } from '@/lib/AppError';
import { getAuthUser } from '@/lib/auth';
import { requirePermission } from '@/permissions/permissions';
import { createRateSchema } from '@/validators/exchange-rates.validators';
import { exchangeRatesService } from '@/services/exchange-rates.service';

export const GET = apiHandler(async (req: NextRequest) => {
  const user = getAuthUser(req);
  requirePermission(user.rol, 'exchange_rates', 'read');
  const { searchParams } = new URL(req.url);
  const latestOnly = searchParams.get('latest') === 'true';

  if (latestOnly) {
    const latest = await exchangeRatesService.latest();
    return ok(latest);
  }
  return ok(await exchangeRatesService.list());
});

export const POST = apiHandler(async (req: NextRequest) => {
  const user = getAuthUser(req);
  requirePermission(user.rol, 'exchange_rates', 'create');

  const body = createRateSchema.safeParse(await req.json());
  if (!body.success) throw AppError.badRequest("Ma'lumotlar noto'g'ri", body.error.flatten());

  const rate = await exchangeRatesService.create(body.data, user.id);
  return ok(rate, 201);
});
