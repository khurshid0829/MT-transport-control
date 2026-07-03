'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';

interface CurrencyStat { kirim: number; chiqim: number; sof_balans: number; amallar_soni: number; }
interface CompareData { valyutalar: Record<string, CurrencyStat>; eslatma: string; }

export default function ReportsPage() {
  const [data, setData] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<CompareData>('/api/reports/compare').then((res) => {
      if (res.success && res.data) setData(res.data);
      setLoading(false);
    });
  }, []);

  const currencies = data ? Object.keys(data.valyutalar) : [];

  return (
    <div>
      <h1 style={{ marginBottom: 18 }}>Hisobotlar — valyuta bo'yicha taqqoslash</h1>

      {loading ? (
        <div className="empty-state">Yuklanmoqda...</div>
      ) : currencies.length === 0 ? (
        <div className="empty-state">Hali tranzaksiya yo'q.</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
            {currencies.map((cur) => {
              const v = data!.valyutalar[cur];
              return (
                <div className="card" key={cur}>
                  <h3>{cur}</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Kirim</span>
                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>{v.kirim.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Chiqim</span>
                    <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{v.chiqim.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Sof balans</span>
                    <span style={{ fontWeight: 700, color: v.sof_balans >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {v.sof_balans.toLocaleString()}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>{v.amallar_soni} ta amal</p>
                </div>
              );
            })}
          </div>
          <div className="alert" style={{ background: 'var(--bg)', color: 'var(--text-secondary)' }}>
            {data!.eslatma}
          </div>
        </>
      )}
    </div>
  );
}
