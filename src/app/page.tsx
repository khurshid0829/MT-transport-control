'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUser } from '@/lib/auth-client';

export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace(getUser() ? '/dashboard' : '/login');
  }, [router]);
  return null;
}
