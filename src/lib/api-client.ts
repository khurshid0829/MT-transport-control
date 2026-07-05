'use client';

import { clearSession } from './auth-client';

export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
}

/**
 * Barcha himoyalangan API chaqiruvlari shu funksiya orqali bajariladi.
 * MUHIM: token endi bu yerda qo'lda qo'shilmaydi — httpOnly cookie
 * brauzer tomonidan har bir so'rovga AVTOMATIK qo'shiladi (bir xil domen
 * ichida standart fetch xatti-harakati). 401 kelsa sessiya tozalanib
 * login sahifasiga qaytariladi.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

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
