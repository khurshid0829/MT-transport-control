import { NextRequest, NextResponse } from 'next/server';
import { AppError } from './AppError';
import { fail } from './response';

type Handler = (req: NextRequest, ctx: { params: any }) => Promise<NextResponse>;

/**
 * Har bir route handler shu wrapper bilan o'raladi. AppError, zod xatolari
 * va PostgreSQL xatolari (unique/FK/CHECK/trigger RAISE EXCEPTION) shu yerda
 * bir xil JSON formatga aylantiriladi — Express'dagi errorHandler.ts bilan bir xil mantiq.
 */
export function apiHandler(handler: Handler): Handler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof AppError) {
        return fail(err.statusCode, err.code, err.message, err.details);
      }

      const pgError = err as { code?: string; message?: string };

      if (pgError?.code === '23505') {
        return fail(409, 'DUPLICATE_ENTRY', "Bu qiymat allaqachon mavjud (unique constraint)");
      }
      if (pgError?.code === '23503') {
        return fail(400, 'INVALID_REFERENCE', "Ko'rsatilgan bog'liq ID mavjud emas");
      }
      if (pgError?.code === '23514') {
        return fail(400, 'CHECK_VIOLATION', "Ma'lumot bazaviy qoidalarga mos kelmadi", pgError.message);
      }
      if (pgError?.code === 'P0001') {
        // trigger RAISE EXCEPTION — masofa yaxlitligi yoki ombor qoldig'i qoidasi buzilganda
        return fail(409, 'INTEGRITY_VIOLATION', pgError.message || "Ma'lumotlar yaxlitligi qoidasi buzildi");
      }

      // eslint-disable-next-line no-console
      console.error('Kutilmagan xatolik:', err);
      return fail(500, 'INTERNAL_ERROR', pgError?.message || 'Kutilmagan server xatosi');
    }
  };
}
