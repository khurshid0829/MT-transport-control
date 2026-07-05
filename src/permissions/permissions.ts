import { UserRole } from '../lib/auth';
import { AppError } from '../lib/AppError';

export type Resource = 'users' | 'cars' | 'drivers' | 'transactions' | 'audit' | 'reports' | 'exchange_rates' | 'ombor_mahsulotlari' | 'ombor_harakatlari' | 'car_documents' | 'tamirlash_normalari';
export type Action = 'create' | 'read' | 'update' | 'delete';

/**
 * MARKAZIY RUXSATLAR MATRITSASI
 * ------------------------------------------------------------------
 * TARIX: dastlab (1-qoida) transactions faqat CHIEF_MECHANIC uchun
 * yozilardi. Loyiha davomida foydalanuvchi ATAYLAB va OCHIQ tasdiqlash
 * bilan MANAGER'ga ham moliyaviy va ombor yozish huquqini berdi (2026-
 * yil, "rasman o'zgartiraman" tasdig'i bilan). Bu — qoidaning rasmiy
 * yangilanishi, xato emas.
 */
const PERMISSIONS: Record<Resource, Partial<Record<Action, UserRole[]>>> = {
  users: {
    create: ['FOUNDER'],
    read: ['FOUNDER', 'MANAGER'],
    update: ['FOUNDER'],
    delete: ['FOUNDER'],
  },
  cars: {
    create: ['FOUNDER', 'MANAGER'],
    read: ['FOUNDER', 'MANAGER', 'CHIEF_MECHANIC', 'MECHANIC'],
    update: ['FOUNDER', 'MANAGER'],
    delete: ['FOUNDER'],
  },
  drivers: {
    create: ['FOUNDER', 'MANAGER'],
    read: ['FOUNDER', 'MANAGER', 'CHIEF_MECHANIC', 'MECHANIC'],
    update: ['FOUNDER', 'MANAGER'],
    delete: ['FOUNDER', 'MANAGER'],
  },
  transactions: {
    create: ['CHIEF_MECHANIC', 'MANAGER'],
    read: ['FOUNDER', 'MANAGER', 'CHIEF_MECHANIC', 'MECHANIC'],
    update: ['CHIEF_MECHANIC', 'MANAGER'],
    delete: ['CHIEF_MECHANIC', 'MANAGER'],
  },
  audit: {
    read: ['FOUNDER'],
  },
  reports: {
    read: ['FOUNDER', 'MANAGER', 'CHIEF_MECHANIC'],
  },
  exchange_rates: {
    create: ['FOUNDER', 'MANAGER'],
    read: ['FOUNDER', 'MANAGER', 'CHIEF_MECHANIC', 'MECHANIC'],
  },
  // Ombor katalogi — endi CHIEF_MECHANIC ham yangi mahsulot turi qo'sha oladi
  ombor_mahsulotlari: {
    create: ['FOUNDER', 'MANAGER', 'CHIEF_MECHANIC'],
    read: ['FOUNDER', 'MANAGER', 'CHIEF_MECHANIC', 'MECHANIC'],
  },
  // Ombor harakatlari (kirim/chiqim) — endi MANAGER ham kirita oladi
  ombor_harakatlari: {
    create: ['CHIEF_MECHANIC', 'MANAGER'],
    read: ['FOUNDER', 'MANAGER', 'CHIEF_MECHANIC', 'MECHANIC'],
  },
  // Avto hujjatlari — endi CHIEF_MECHANIC ham qo'sha oladi
  car_documents: {
    create: ['FOUNDER', 'MANAGER', 'CHIEF_MECHANIC'],
    read: ['FOUNDER', 'MANAGER', 'CHIEF_MECHANIC', 'MECHANIC'],
  },
  // Texnik xizmat normalari (moy/ehtiyot qism almashtirish oralig'i) katalogi
  tamirlash_normalari: {
    create: ['FOUNDER', 'MANAGER'],
    read: ['FOUNDER', 'MANAGER', 'CHIEF_MECHANIC', 'MECHANIC'],
  },
};

export function isAllowed(role: UserRole, resource: Resource, action: Action): boolean {
  const allowedRoles = PERMISSIONS[resource][action];
  return !!allowedRoles && allowedRoles.includes(role);
}

/** authorize() — topilmasa 403 otadi (Express rbac.ts bilan bir xil mantiq). */
export function requirePermission(role: UserRole, resource: Resource, action: Action): void {
  if (!isAllowed(role, resource, action)) {
    throw AppError.forbidden(`Rol '${role}' uchun '${resource}' resursida '${action}' amali taqiqlangan`);
  }
}
