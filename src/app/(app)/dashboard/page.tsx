'use client';

import { useEffect, useState } from 'react';
import { getUser, canViewAudit, canWriteTransactions } from '@/lib/auth-client';
import { apiFetch } from '@/lib/api-client';

const ROLE_LABELS: Record<string, string> = {
  FOUNDER: 'Asoschi', MANAGER: 'Menejer', CHIEF_MECHANIC: 'Bosh mexanik', MECHANIC: 'Mexanik',
};

interface Car { id: number; texnik_holat: string; }

export default function DashboardPage() {
  const user = getUser();
  const [carCount, setCarCount] = useState<number | null>(null);
  const [activeCount, setActiveCount] = useState<number | null>(null);

  useEffect(() => {
    apiFetch<Car[]>('/api/cars').then((res) => {
      if (res.success && res.data) {
        setCarCount(res.data.length);
        setActiveCount(res.data.filter((c) => c.texnik_holat === 'Aktiv').length);
      }
    });
  }, []);

  return (
    <div>
      <h1>Xush kelibsiz, {user?.ism_sharif}</h1>
      <p style={{ color: 'var(--text-secondary)', marginTop: 6 }}>
        Rolingiz: <span className="badge badge-neutral">{ROLE_LABELS[user?.rol || ''] || user?.rol}</span>
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginTop: 24 }}>
        <div className="card">
          <h3>Jami avtolar</h3>
          <p style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>{carCount ?? '—'}</p>
        </div>
        <div className="card">
          <h3>Aktiv avtolar</h3>
          <p style={{ fontSize: 28, fontWeight: 700, marginTop: 8, color: 'var(--success)' }}>{activeCount ?? '—'}</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h2>Tezkor havolalar</h2>
        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <a className="btn" href="/cars">Avtolar ro'yxati</a>
          <a className="btn" href="/drivers">Haydovchilar</a>
          <a className="btn" href="/transactions">Tranzaksiyalar</a>
          <a className="btn" href="/reports">Hisobotlar</a>
          {canViewAudit(user?.rol) && <a className="btn" href="/audit">Audit log</a>}
        </div>
        {canWriteTransactions(user?.rol) && (
          <p style={{ marginTop: 14, fontSize: 13, color: 'var(--text-secondary)' }}>
            Sizning rolingiz (Bosh mexanik) tranzaksiya kiritish huquqiga ega yagona rol hisoblanadi.
          </p>
        )}
      </div>
    </div>
  );
}
