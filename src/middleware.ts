import { NextRequest, NextResponse } from 'next/server';

/**
 * MUHIM (xavfsizlik yangilanishi): endi cookie-asoslangan autentifikatsiya
 * ishlatilgani uchun (httpOnly + sameSite:'strict'), ochiq CORS ('*')
 * endi na kerak, na xavfsiz — brauzerlar credentials bilan wildcard
 * CORS'ni baribir rad etadi. Ilova bir xil domenda ishlagani uchun CORS
 * header'lari butunlay olib tashlandi (bu ozgina tezlikni ham oshiradi).
 *
 * RATE LIMITING: faqat YOZUVCHI so'rovlar (POST/PUT/DELETE) uchun,
 * IP boshiga daqiqasiga 60 tagacha. GET so'rovlarga TEGILMAYDI — aks
 * holda navigatsiya sekinlashadi. Bu — oddiy, xotirada (in-memory)
 * ishlaydigan himoya (har bir serverless nusxa o'zining hisoblagichiga
 * ega, mukammal emas, lekin qo'shimcha kechikishsiz asosiy himoyani
 * beradi). To'liq, barcha nusxalar bo'ylab ishlaydigan himoya uchun
 * Upstash Redis kabi tashqi xizmat kerak bo'ladi.
 */
const RATE_LIMIT = 60; // daqiqasiga
const WINDOW_MS = 60_000;
const buckets = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(ip);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  bucket.count++;
  return bucket.count > RATE_LIMIT;
}

export function middleware(req: NextRequest) {
  const isMutating = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);

  if (isMutating) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { success: false, error: { code: 'RATE_LIMITED', message: "Juda ko'p so'rov yuborildi. Bir necha soniyadan keyin qayta urinib ko'ring." } },
        { status: 429 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
