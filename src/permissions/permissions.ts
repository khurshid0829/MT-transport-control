import { UserRole } from '../lib/auth';
import { AppError } from '../lib/AppError';

export type Resource = 'users' | 'cars' | 'drivers' | 'transactions' | 'audit' | 'reports' | 'exchange_rates' | 'ombor_mahsulotlari' | 'ombor_harakatlari' | 'car_documents';
export type Action = 'create' | 'read' | 'update' | 'delete';

/**
 * MARKAZIY RUXSATLAR MATRITSASI
 * ------------------------------------------------------------------
 * ANIQ TALAB (1-qoida):
 *  - transactions.create/update/delete -> FAQAT CHIEF_MECHANIC
 *    (MECHANIC ham, FOUNDER ham, MANAGER ham YOZISH huquqiga ega emas —
 *     FOUNDER/MANAGER faqat GET/o'qish huquqiga ega)
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
    create: ['CHIEF_MECHANIC'],
    read: ['FOUNDER', 'MANAGER', 'CHIEF_MECHANIC', 'MECHANIC'],
    update: ['CHIEF_MECHANIC'],
    delete: ['CHIEF_MECHANIC'],
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
  // Ombor katalogi (mahsulot turlarini belgilash) — avto turlari kabi,
  // FOUNDER/MANAGER boshqaradi.
  ombor_mahsulotlari: {
    create: ['FOUNDER', 'MANAGER'],
    read: ['FOUNDER', 'MANAGER', 'CHIEF_MECHANIC', 'MECHANIC'],
  },
  // Ombor harakatlari (kirim/chiqim) — transactions bilan bir xil mantiq:
  // faqat CHIEF_MECHANIC moddiy qiymatlarni kirita oladi.
  ombor_harakatlari: {
    create: ['CHIEF_MECHANIC'],
    read: ['FOUNDER', 'MANAGER', 'CHIEF_MECHANIC', 'MECHANIC'],
  },
  // Avto hujjatlari (sug'urta, texnik ko'rik va h.k.) — cars bilan bir xil mantiq
  car_documents: {
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
