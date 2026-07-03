export const dynamic = 'force-dynamic';

import { apiHandler } from '@/lib/apiHandler';
import { ok } from '@/lib/response';

export const GET = apiHandler(async () => {
  return ok({ status: 'ok', service: 'mt-transport-webapp' });
});
