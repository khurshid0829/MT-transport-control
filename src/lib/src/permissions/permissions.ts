import { UserRole } from '../lib/auth';
import { AppError } from '../lib/AppError';

export type Resource = 'users' | 'cars' | 'drivers' | 'transactions' | 'audit' | 'reports';
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
