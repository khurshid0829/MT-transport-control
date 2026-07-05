'use client';

export type UserRole = 'FOUNDER' | 'MANAGER' | 'CHIEF_MECHANIC' | 'MECHANIC';

export interface AuthUser {
  id: number;
  ism_sharif: string;
  username: string;
  rol: UserRole;
  status: string;
}

const USER_KEY = 'mt_user';

/**
 * MUHIM (Session Hijacking himoyasi): token endi bu yerda SAQLANMAYDI.
 * Haqiqiy autentifikatsiya httpOnly cookie orqali (brauzer JS'iga
 * ko'rinmaydigan holda) amalga oshiriladi — server buni avtomatik
 * tekshiradi. Bu yerda faqat UI'ni tezroq chizish uchun (masalan ism va
 * rolni darhol ko'rsatish) foydalanuvchi profili (maxfiy bo'lmagan)
 * saqlanadi.
 */
export function saveSession(user: AuthUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearSession() {
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
  return role === 'CHIEF_MECHANIC' || role === 'MANAGER';
}
export function canWriteCars(role: UserRole | undefined): boolean {
  return role === 'FOUNDER' || role === 'MANAGER';
}
export function canManageOmborCatalog(role: UserRole | undefined): boolean {
  return role === 'FOUNDER' || role === 'MANAGER' || role === 'CHIEF_MECHANIC';
}
export function canMoveOmborStock(role: UserRole | undefined): boolean {
  return role === 'CHIEF_MECHANIC' || role === 'MANAGER';
}
export function canManageCarDocuments(role: UserRole | undefined): boolean {
  return role === 'FOUNDER' || role === 'MANAGER' || role === 'CHIEF_MECHANIC';
}
export function canSetExchangeRate(role: UserRole | undefined): boolean {
  return role === 'FOUNDER' || role === 'MANAGER';
}
export function canManageUsers(role: UserRole | undefined): boolean {
  return role === 'FOUNDER';
}
export function canViewAudit(role: UserRole | undefined): boolean {
  return role === 'FOUNDER';
}
export function canViewReports(role: UserRole | undefined): boolean {
  return role === 'FOUNDER' || role === 'MANAGER' || role === 'CHIEF_MECHANIC';
}
