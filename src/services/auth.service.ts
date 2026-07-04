import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { pool } from '../lib/db';
import { AppError } from '../lib/AppError';
import { z } from 'zod';
import { loginSchema, registerSchema } from '../validators/auth.validators';

type RegisterInput = z.infer<typeof registerSchema>;
type LoginInput = z.infer<typeof loginSchema>;

interface AuthUser {
  id: number;
  ism_sharif: string;
  username: string;
  rol: string;
  status: string;
}

const SALT_ROUNDS = 12;
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

/** Login urinishini audit_log'ga yozadi (muvaffaqiyatli yoki muvaffaqiyatsiz). */
async function logLoginAttempt(userId: number | null, username: string, success: boolean) {
  await pool.query(
    `INSERT INTO audit_log (user_id, harakat, yangi_malumot)
     VALUES ($1, $2, $3)`,
    [userId, success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED', JSON.stringify({ username })]
  );
}

export const authService = {
  async register(input: RegisterInput): Promise<AuthUser> {
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const result = await pool.query(
      `INSERT INTO users (ism_sharif, username, password_hash, rol)
       VALUES ($1, $2, $3, $4)
       RETURNING id, ism_sharif, username, rol, status`,
      [input.ism_sharif, input.username, passwordHash, input.rol]
    );
    return result.rows[0];
  },

  async login(input: LoginInput): Promise<{ token: string; user: AuthUser }> {
    const result = await pool.query(
      `SELECT id, ism_sharif, username, password_hash, rol, status,
              muvaffaqiyatsiz_urinishlar, bloklangan_gacha
       FROM users WHERE username = $1`,
      [input.username]
    );

    const row = result.rows[0];
    if (!row) {
      // Foydalanuvchi mavjud bo'lmasa ham urinishni log qilamiz (user_id NULL bilan) —
      // bu orqali kimdir mavjud bo'lmagan username'lar bilan "terib ko'rayotganini" ham kuzatish mumkin.
      await logLoginAttempt(null, input.username, false);
      throw AppError.unauthorized("Login yoki parol noto'g'ri");
    }

    // Brute-force himoyasi: agar hozir bloklash muddati ichida bo'lsa, kirish rad etiladi
    if (row.bloklangan_gacha && new Date(row.bloklangan_gacha) > new Date()) {
      const qoldiq = Math.ceil((new Date(row.bloklangan_gacha).getTime() - Date.now()) / 60000);
      throw AppError.forbidden(
        `Juda ko'p noto'g'ri urinish. ${qoldiq} daqiqadan keyin qayta urinib ko'ring.`
      );
    }

    if (row.status === 'Bloklangan') {
      throw AppError.forbidden('Hisobingiz bloklangan. Administratorga murojaat qiling');
    }

    const passwordMatches = await bcrypt.compare(input.password, row.password_hash);

    if (!passwordMatches) {
      const yangiUrinish = row.muvaffaqiyatsiz_urinishlar + 1;
      if (yangiUrinish >= MAX_ATTEMPTS) {
        await pool.query(
          `UPDATE users SET muvaffaqiyatsiz_urinishlar = 0,
                            bloklangan_gacha = CURRENT_TIMESTAMP + INTERVAL '${LOCK_MINUTES} minutes'
           WHERE id = $1`,
          [row.id]
        );
      } else {
        await pool.query('UPDATE users SET muvaffaqiyatsiz_urinishlar = $1 WHERE id = $2', [yangiUrinish, row.id]);
      }
      await logLoginAttempt(row.id, row.username, false);
      throw AppError.unauthorized("Login yoki parol noto'g'ri");
    }

    // Muvaffaqiyatli login — hisoblagichni tozalaymiz
    await pool.query(
      'UPDATE users SET muvaffaqiyatsiz_urinishlar = 0, bloklangan_gacha = NULL WHERE id = $1',
      [row.id]
    );
    await logLoginAttempt(row.id, row.username, true);

    const payload = { id: row.id, username: row.username, rol: row.rol };
    const options: SignOptions = {
      expiresIn: (process.env.JWT_EXPIRES_IN || '8h') as SignOptions['expiresIn'],
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET as string, options);

    return {
      token,
      user: { id: row.id, ism_sharif: row.ism_sharif, username: row.username, rol: row.rol, status: row.status },
    };
  },

  /** O'z-o'zidan parol almashtirish (har qanday rol o'ziniki uchun). */
  async changePassword(userId: number, eskiParol: string, yangiParol: string): Promise<void> {
    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    const row = result.rows[0];
    if (!row) throw AppError.notFound('Foydalanuvchi topilmadi');

    const matches = await bcrypt.compare(eskiParol, row.password_hash);
    if (!matches) throw AppError.unauthorized("Joriy parol noto'g'ri");

    const newHash = await bcrypt.hash(yangiParol, SALT_ROUNDS);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);
  },
};
