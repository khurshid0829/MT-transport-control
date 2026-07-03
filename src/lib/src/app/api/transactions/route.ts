export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { apiHandler } from '@/lib/apiHandler';
import { ok } from '@/lib/response';
import { AppError } from '@/lib/AppError';
import { getAuthUser } from '@/lib/auth';
import { requirePermission } from '@/permissions/permissions';
import { createTransactionSchema } from '@/validators/transactions.validators';
import { transactionsService } from '@/services/transactions.service';

// O'QISH — barcha rollar (FOUNDER, MANAGER, CHIEF_MECHANIC, MECHANIC)
export const GET = apiHandler(async (req: NextRequest) => {
  const user = getAuthUser(req);
  requirePermission(user.rol, 'transactions', 'read');

  const { searchParams } = new URL(req.url);
  const filters = Object.fromEntries(searchParams.entries());
  return ok(await transactionsService.list(filters));
});

// YOZISH — 1-qoida bo'yicha FAQAT CHIEF_MECHANIC.
// requirePermission bu yerda MECHANIC'ni ham, FOUNDER/MANAGER'ni ham
// 403 Forbidden bilan avtomatik bloklaydi (permissions.ts matritsasiga ko'ra).
export const POST = apiHandler(async (req: NextRequest) => {
  const user = getAuthUser(req);
  requirePermission(user.rol, 'transactions', 'create');

  const body = createTransactionSchema.safeParse(await req.json());
  if (!body.success) throw AppError.badRequest("Ma'lumotlar noto'g'ri", body.error.flatten());

  const tx = await transactionsService.create(body.data, user.id);
  return ok(tx, 201);
});
