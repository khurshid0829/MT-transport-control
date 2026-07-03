'use client';

export type UserRole = 'FOUNDER' | 'MANAGER' | 'CHIEF_MECHANIC' | 'MECHANIC';

export interface AuthUser {
  id: number;
  ism_sharif: string;
  username: string;
  rol: UserRole;
  status: string;
}

const TOKEN_KEY = 'mt_token';
const USER_KEY = 'mt_user';

export function saveSession(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * RBAC — 1-qoidaning FRONTEND qismi: qaysi rol qaysi amalni ko'ra/bajara oladi.
 * Bu backend permissions.ts bilan bir xil mantiq — faqat UI elementlarini
 * ko'rsatish/yashirish uchun. Haqiqiy xavfsizlik har doim backendda (RBAC
 * middleware) ta'minlanadi; bu yerdagi tekshiruv faqat foydalanuvchi
 * tajribasi uchun (masalan "Tranzaksiya qo'shish" tugmasini ko'rsatmaslik).
 */
export function canWriteTransactions(role: UserRole | undefined): boolean {
  return role === 'CHIEF_MECHANIC';
}
export function canWriteCars(role: UserRole | undefined): boolean {
  return role === 'FOUNDER' || role === 'MANAGER';
}
export function canManageUsers(role: UserRole | undefined): boolean {
  return role === 'FOUNDER';
}
export function canViewAudit(role: UserRole | undefined): boolean {
  return role === 'FOUNDER';
}
