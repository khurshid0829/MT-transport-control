'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { canSetExchangeRate, getUser } from '@/lib/auth-client';

interface CurrencyStat { kirim: number; chiqim: number; sof_balans: number; amallar_soni: number; }
interface CompareData {
  valyutalar: Record<string, CurrencyStat>;
  joriy_kurs: number | null;
  usd_sof_balans_uzs_ekvivalentida: number | null;
  eslatma: string;
}
interface Rate { id: number; kurs: string; amal_qilish_sanasi: string; }

export default function ReportsPage() {
  const user = getUser();
  const canSetRate = canSetExchangeRate(user?.rol);

  const [data, setData] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rateForm, setRateForm] = useState('');
  const [rateSaving, setRateSaving] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await apiFetch<CompareData>('/api/reports/compare');
    if (res.success && res.data) setData(res.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSetRate(e: React.FormEvent) {
    e.preventDefault();
    setRateError(null);
    if (!rateForm) return;
    setRateSaving(true);
    const res = await apiFetch<Rate>('/api/exchange-rates', {
      method: 'POST',
      body: JSON.stringify({ kurs: Number(rateForm) }),
    });
    setRateSaving(false);
    if (res.success) {
      setRateForm('');
      load();
    } else {
      setRateError(res.error?.message || 'Xatolik yuz berdi');
    }
  }

  const currencies = data ? Object.keys(data.valyutalar) : [];

  return (
    <div>
      <h1 style={{ marginBottom: 18 }}>Hisobotlar — valyuta bo'yicha taqqoslash</h1>

      {canSetRate && (
        <div className="card" style={{ marginBottom: 20, maxWidth: 420 }}>
          <h3 style={{ marginBottom: 10 }}>Joriy kurs (1 USD = ? UZS)</h3>
          {rateError && <div className="alert alert-error">{rateError}</div>}
          <p style={{ marginBottom: 10 }}>
            Hozirgi: <b>{data?.joriy_kurs ? data.joriy_kurs.toLocaleString() + ' UZS' : 'kiritilmagan'}</b>
          </p>
          <form onSubmit={handleSetRate} style={{ display: 'flex', gap: 8 }}>
            <input
              type="number" step="0.01" placeholder="masalan: 12700"
              value={rateForm} onChange={(e) => setRateForm(e.target.value)}
              style={{ padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, flex: 1 }}
            />
            <button type="submit" className="btn btn-primary" disabled={rateSaving}>
              {rateSaving ? 'Saqlanmoqda...' : 'Yangilash'}
            </button>
          </form>
        </div>
      )}

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
                  {cur === 'USD' && data!.usd_sof_balans_uzs_ekvivalentida !== null && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                      ≈ {data!.usd_sof_balans_uzs_ekvivalentida!.toLocaleString()} UZS (joriy kurs bo'yicha, taxminiy)
                    </p>
                  )}
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{v.amallar_soni} ta amal</p>
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
