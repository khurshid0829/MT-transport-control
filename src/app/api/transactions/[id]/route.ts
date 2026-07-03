export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { apiHandler } from '@/lib/apiHandler';
import { ok } from '@/lib/response';
import { getAuthUser } from '@/lib/auth';
import { requirePermission } from '@/permissions/permissions';
import { transactionsService } from '@/services/transactions.service';

export const GET = apiHandler(async (req: NextRequest, { params }) => {
  const user = getAuthUser(req);
  requirePermission(user.rol, 'transactions', 'read');
  return ok(await transactionsService.getById(Number(params.id)));
});

// FAQAT CHIEF_MECHANIC o'chira oladi
export const DELETE = apiHandler(async (req: NextRequest, { params }) => {
  const user = getAuthUser(req);
  requirePermission(user.rol, 'transactions', 'delete');
  await transactionsService.remove(Number(params.id), user.id);
  return ok({ id: Number(params.id) });
});
