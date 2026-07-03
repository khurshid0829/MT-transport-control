import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { pool } from '../lib/db';
import { AppError } from '../lib/AppError';

const SALT_ROUNDS = 12;

export const authService = {
  async register(input: { ism_sharif: string; username: string; password: string; rol: string }) {
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const result = await pool.query(
      `INSERT INTO users (ism_sharif, username, password_hash, rol)
       VALUES ($1, $2, $3, $4)
       RETURNING id, ism_sharif, username, rol, status`,
      [input.ism_sharif, input.username, passwordHash, input.rol]
    );
    return result.rows[0];
  },

  async login(input: { username: string; password: string }) {
    const result = await pool.query(
      `SELECT id, ism_sharif, username, password_hash, rol, status FROM users WHERE username = $1`,
      [input.username]
    );
    const row = result.rows[0];
    if (!row) throw AppError.unauthorized("Login yoki parol noto'g'ri");
    if (row.status === 'Bloklangan') {
      throw AppError.forbidden('Hisobingiz bloklangan. Administratorga murojaat qiling');
    }

    const matches = await bcrypt.compare(input.password, row.password_hash);
    if (!matches) throw AppError.unauthorized("Login yoki parol noto'g'ri");

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
};
