export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { apiHandler } from '@/lib/apiHandler';
import { ok } from '@/lib/response';
import { getAuthUser } from '@/lib/auth';
import { requirePermission } from '@/permissions/permissions';
import { auditService } from '@/services/audit.service';

// Faqat FOUNDER (permissions.ts: audit.read)
export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getAuthUser(req);
  requirePermission(user.rol, 'audit', 'read');

  const { searchParams } = new URL(req.url);
  const data = await auditService.list({
    harakat: searchParams.get('harakat') ?? undefined,
    user_id: searchParams.get('user_id') ? Number(searchParams.get('user_id')) : undefined,
    limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
  });
  return ok(data);
});
