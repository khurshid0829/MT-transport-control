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

const COOKIE_NAME = 'mt_token';

/**
 * Tokenni endi Authorization header'dan EMAS, httpOnly cookie'dan o'qiydi
 * (Session Hijacking himoyasi — token endi brauzer JS'iga umuman
 * ko'rinmaydi, XSS orqali o'g'irlanishi mumkin emas).
 *
 * TEZLIK OPTIMALLASHTIRISHI: avval har bir so'rovda (GET bo'lsa ham)
 * foydalanuvchi holati bazadan tekshirilar edi — bu navigatsiyani
 * sekinlashtirgan edi. Endi faqat YOZUVCHI (POST/PUT/DELETE) so'rovlarda
 * to'liq DB tekshiruvi bajariladi; oddiy ko'rish (GET) so'rovlar faqat
 * token imzosini tekshiradi (tezroq). Bloklash baribir keyingi YOZISHda
 * (yoki eng ko'pi 8 soat ichida) kuchga kiradi — bu maqbul murosa.
 */
export async function getAuthUser(req: NextRequest): Promise<AuthUser> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    throw AppError.unauthorized('Token topilmadi. Iltimos, qayta kiring');
  }

  let payload: AuthUser;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET as string) as AuthUser;
  } catch {
    throw AppError.unauthorized("Token yaroqsiz yoki muddati o'tgan");
  }

  // Tez yo'l: faqat o'qish so'rovlari uchun DB tekshiruvisiz qaytaramiz
  if (req.method === 'GET' || req.method === 'HEAD') {
    return payload;
  }

  const result = await pool.query('SELECT status, rol FROM users WHERE id = $1', [payload.id]);
  const row = result.rows[0];
  if (!row) {
    throw AppError.unauthorized('Foydalanuvchi topilmadi');
  }
  if (row.status === 'Bloklangan') {
    throw AppError.forbidden('Hisobingiz bloklangan. Administratorga murojaat qiling');
  }

  return { id: payload.id, username: payload.username, rol: row.rol };
}

export { COOKIE_NAME };
