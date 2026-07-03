export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { apiHandler } from '@/lib/apiHandler';
import { ok } from '@/lib/response';
import { getAuthUser } from '@/lib/auth';

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getAuthUser(req);
  return ok(user);
});
