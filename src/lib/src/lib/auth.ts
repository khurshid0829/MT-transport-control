import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { AppError } from './AppError';
import { pool } from './db';

export type UserRole = 'FOUNDER' | 'MANAGER' | 'CHIEF_MECHANIC' | 'MECHANIC';

export interface AuthUser {
  id: number;
  username: string;
  rol: UserRole;
}

/**
 * Authorization: Bearer <token> headeridan foydalanuvchini oladi.
 *
 * MUHIM (audit topilmasi): JWT o'zi statik bo'lgani uchun (8 soatgacha
 * amal qiladi), faqat token imzosini tekshirish YETARLI EMAS — agar
 * foydalanuvchi shu oraliqda FOUNDER tomonidan bloklansa, eski token
 * hamon "yaroqli" bo'lib qolar edi. Shu sababli har bir so'rovda
 * foydalanuvchining joriy holati ('Aktiv'/'Bloklangan') bazadan qayta
 * tekshiriladi — bloklash amaliyoti keyingi so'rovdanoq kuchga kiradi.
 */
export async function getAuthUser(req: NextRequest): Promise<AuthUser> {
  const header = req.headers.get('authorization');
  if (!header || !header.startsWith('Bearer ')) {
    throw AppError.unauthorized("Token topilmadi. 'Authorization: Bearer <token>' header kerak");
  }

  const token = header.slice('Bearer '.length).trim();
  let payload: AuthUser;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET as string) as AuthUser;
  } catch {
    throw AppError.unauthorized("Token yaroqsiz yoki muddati o'tgan");
  }

  const result = await pool.query('SELECT status, rol FROM users WHERE id = $1', [payload.id]);
  const row = result.rows[0];
  if (!row) {
    throw AppError.unauthorized("Foydalanuvchi topilmadi");
  }
  if (row.status === 'Bloklangan') {
    throw AppError.forbidden("Hisobingiz bloklangan. Administratorga murojaat qiling");
  }

  // Rol bazada o'zgargan bo'lishi mumkin (masalan admin uni yangilagan) —
  // shuning uchun tokendagi emas, bazadagi joriy rolni ishlatamiz.
  return { id: payload.id, username: payload.username, rol: row.rol };
}
