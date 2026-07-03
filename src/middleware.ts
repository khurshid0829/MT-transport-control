import { NextRequest, NextResponse } from 'next/server';

/**
 * Barcha /api/* so'rovlariga CORS header qo'shadi. Bu kelgusida frontend
 * (boshqa domenda joylashgan bo'lsa ham) va test vositalari API'ga
 * to'g'ridan-to'g'ri murojaat qila olishi uchun kerak.
 */
export function middleware(req: NextRequest) {
  const res = req.method === 'OPTIONS' ? new NextResponse(null, { status: 204 }) : NextResponse.next();

  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return res;
}

export const config = {
  matcher: '/api/:path*',
};
