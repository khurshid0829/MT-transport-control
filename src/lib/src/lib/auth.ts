import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { AppError } from './AppError';

export type UserRole = 'FOUNDER' | 'MANAGER' | 'CHIEF_MECHANIC' | 'MECHANIC';

export interface AuthUser {
  id: number;
  username: string;
  rol: UserRole;
}

/** Authorization: Bearer <token> headeridan foydalanuvchini oladi. Token yo'q/yaroqsiz bo'lsa 401. */
export function getAuthUser(req: NextRequest): AuthUser {
  const header = req.headers.get('authorization');
  if (!header || !header.startsWith('Bearer ')) {
    throw AppError.unauthorized("Token topilmadi. 'Authorization: Bearer <token>' header kerak");
  }

  const token = header.slice('Bearer '.length).trim();
  try {
    return jwt.verify(token, process.env.JWT_SECRET as string) as AuthUser;
  } catch {
    throw AppError.unauthorized("Token yaroqsiz yoki muddati o'tgan");
  }
}
