'use client';

import { getToken, clearSession } from './auth-client';

export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
}

/**
 * Barcha himoyalangan API chaqiruvlari shu funksiya orqali bajariladi.
 * Token avtomatik qo'shiladi; 401 kelsa sessiya tozalanib login sahifasiga
 * qaytariladi.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResult<T>> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = 'Bearer ' + token;

  try {
    const res = await fetch(path, { ...options, headers });
    const data = await res.json();

    if (res.status === 401) {
      clearSession();
      if (typeof window !== 'undefined') window.location.href = '/login';
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Sessiya tugagan' } };
    }

    return data;
  } catch (e) {
    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: e instanceof Error ? e.message : "Ulanib bo'lmadi" },
    };
  }
}
