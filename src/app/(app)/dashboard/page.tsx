'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, PackageX } from 'lucide-react';
import { getUser, canViewReports } from '@/lib/auth-client';
import { apiFetch } from '@/lib/api-client';
import { formatNumber } from '@/lib/format';

const ROLE_LABELS: Record<string, string> = {
  FOUNDER: 'Asoschi', MANAGER: 'Menejer', CHIEF_MECHANIC: 'Bosh mexanik', MECHANIC: 'Mexanik',
};
const STATUS_LABELS: Record<string, string> = {
  Aktiv: 'Liniyada', "Ta'mirlashda": "Ta'mirlashda", Zaxirada: 'Zaxirada', Nosoz: 'Nosoz',
};

interface Car { id: number; texnik_holat: string; }
interface CarDoc { id: number; hujjat_turi: string; davlat_raqami: string; tur: string; qolgan_kun: number; }
interface Mahsulot { id: number; nomi: string; joriy_qoldiq: string; minimal_qoldiq: string; olchov_birligi: string; }
interface Tx { turi: string; valyuta: string; summa: string; created_at: string }

function toDateInputValue(d: Date) { return d.toISOString().slice(0, 10); }

export default function DashboardPage() {
  const user = getUser();
  const canReports = canViewReports(user?.rol);

  const [cars, setCars] = useState<Car[]>([]);
  const [expiringDocs, setExpiringDocs] = useState<CarDoc[]>([]);
  const [lowStock, setLowStock] = useState<Mahsulot[]>([]);
  const [weekly, setWeekly] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const dan = toDateInputValue(new Date(Date.now() - 6 * 24 * 3600 * 1000));
      const [carsRes, docsRes, omborRes, txRes] = await Promise.all([
        apiFetch<Car[]>('/api/cars'),
        apiFetch<CarDoc[]>('/api/car-documents?expiring_days=10'),
        apiFetch<Mahsulot[]>('/api/ombor/mahsulotlar'),
        apiFetch<Tx[]>('/api/transactions?dan=' + dan),
      ]);
      if (carsRes.success && carsRes.data) setCars(carsRes.data);
      if (docsRes.success && docsRes.data) setExpiringDocs(docsRes.data);
      if (omborRes.success && omborRes.data) {
        setLowStock(omborRes.data.filter((m) => Number(m.joriy_qoldiq) <= Number(m.minimal_qoldiq)));
      }
      if (txRes.success && txRes.data) setWeekly(txRes.data);
      setLoading(false);
    }
    load();
  }, []);

  const statusCounts: Record<string, number> = { Aktiv: 0, "Ta'mirlashda": 0, Zaxirada: 0, Nosoz: 0 };
  cars.forEach((c) => { statusCounts[c.texnik_holat] = (statusCounts[c.texnik_holat] || 0) + 1; });

  // Haftalik dinamika — kunlar bo'yicha UZS sof balans (4-qoida: valyutalar alohida)
  const days: { sana: string; kirim: number; chiqim: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 3600 * 1000);
    days.push({ sana: toDateInputValue(d), kirim: 0, chiqim: 0 });
  }
  weekly.filter((t) => t.valyuta === 'UZS').forEach((t) => {
    const sana = t.created_at.slice(0, 10);
    const day = days.find((d) => d.sana === sana);
    if (day) {
      if (t.turi === 'Kirim') day.kirim += Number(t.summa); else day.chiqim += Number(t.summa);
    }
  });
  const usdKirim = weekly.filter((t) => t.valyuta === 'USD' && t.turi === 'Kirim').reduce((s, t) => s + Number(t.summa), 0);
  const usdChiqim = weekly.filter((t) => t.valyuta === 'USD' && t.turi === 'Chiqim').reduce((s, t) => s + Number(t.summa), 0);
  const maxDay = Math.max(...days.map((d) => Math.max(d.kirim, d.chiqim)), 1);

  return (
    <div>
      <h1>Xush kelibsiz, {user?.ism_sharif}</h1>
      <p style={{ color: 'var(--text-secondary)', marginTop: 6 }}>
        Rolingiz: <span className="badge badge-neutral">{ROLE_LABELS[user?.rol || ''] || user?.rol}</span>
      </p>

      {/* 1) Operatsion statuslar */}
      <h2 style={{ marginTop: 24, marginBottom: 12 }}>Avtopark holati</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
        {Object.entries(statusCounts).map(([status, count]) => (
          <div className="card" key={status}>
            <h3>{STATUS_LABELS[status] || status}</h3>
            <p style={{ fontSize: 26, fontWeight: 700, marginTop: 8 }}>{loading ? '—' : count}</p>
          </div>
        ))}
      </div>

      {/* 2) Kritik ogohlantirishlar */}
      {(expiringDocs.length > 0 || lowStock.length > 0) && (
        <>
          <h2 style={{ marginTop: 24, marginBottom: 12 }}>Kritik ogohlantirishlar</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {expiringDocs.map((d) => (
              <div key={'doc-' + d.id} className="alert" style={{ background: d.qolgan_kun < 0 ? 'var(--danger-bg)' : 'var(--warning-bg)', color: d.qolgan_kun < 0 ? 'var(--danger)' : 'var(--warning)', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 0 }}>
                <AlertTriangle size={16} />
                <span>
                  <b>{d.tur} — {d.davlat_raqami}</b>: {d.hujjat_turi} muddati {d.qolgan_kun < 0 ? `${Math.abs(d.qolgan_kun)} kun oldin tugagan!` : `${d.qolgan_kun} kundan keyin tugaydi`}
                </span>
              </div>
            ))}
            {lowStock.map((m) => (
              <div key={'stock-' + m.id} className="alert" style={{ background: 'var(--warning-bg)', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 0 }}>
                <PackageX size={16} />
                <span><b>{m.nomi}</b>: omborda kam qoldi ({formatNumber(m.joriy_qoldiq)} {m.olchov_birligi})</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 3) Haftalik dinamika */}
      {canReports && (
        <>
          <h2 style={{ marginTop: 24, marginBottom: 12 }}>Haftalik dinamika (UZS)</h2>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
              {days.map((d) => (
                <div key={d.sana} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 90 }}>
                    <div title={'Kirim: ' + formatNumber(d.kirim)} style={{ width: 8, background: 'var(--success)', borderRadius: 2, height: (d.kirim / maxDay * 90) + 'px' }} />
                    <div title={'Chiqim: ' + formatNumber(d.chiqim)} style={{ width: 8, background: 'var(--danger)', borderRadius: 2, height: (d.chiqim / maxDay * 90) + 'px' }} />
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{d.sana.slice(5)}</span>
                </div>
              ))}
            </div>
            {(usdKirim > 0 || usdChiqim > 0) && (
              <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                Shu hafta USD: kirim {formatNumber(usdKirim)}, chiqim {formatNumber(usdChiqim)} (alohida hisoblangan)
              </p>
            )}
          </div>
        </>
      )}

      <div className="card" style={{ marginTop: 24 }}>
        <h2>Tezkor havolalar</h2>
        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <a className="btn" href="/cars">Avtolar ro'yxati</a>
          <a className="btn" href="/drivers">Haydovchilar</a>
          <a className="btn" href="/transactions">Tranzaksiyalar</a>
          <a className="btn" href="/ombor">Ombor</a>
          {canReports && <a className="btn" href="/reports">Hisobotlar</a>}
        </div>
      </div>
    </div>
  );
}
