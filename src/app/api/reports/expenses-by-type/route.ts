export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { apiHandler } from '@/lib/apiHandler';
import { ok } from '@/lib/response';
import { getAuthUser } from '@/lib/auth';
import { requirePermission } from '@/permissions/permissions';
import { reportsService } from '@/services/reports.service';

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getAuthUser(req);
  requirePermission(user.rol, 'reports', 'read');
  const { searchParams } = new URL(req.url);
  const filters = Object.fromEntries(searchParams.entries());
  return ok(await reportsService.expensesByType(filters));
});
