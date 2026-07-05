'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, PackageX, Wrench } from 'lucide-react';
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
interface Holat { davlat_raqami: string; tur: string; qism_nomi: string; holat: string; qolgan_masofa: number; }
interface CurrencyStat { kirim: number; chiqim: number; sof_balans: number; }
interface CompareData { valyutalar: Record<string, CurrencyStat>; }

function toDateInputValue(d: Date) { return d.toISOString().slice(0, 10); }

export default function DashboardPage() {
  const user = getUser();
  const canReports = canViewReports(user?.rol);

  const [cars, setCars] = useState<Car[]>([]);
  const [expiringDocs, setExpiringDocs] = useState<CarDoc[]>([]);
  const [lowStock, setLowStock] = useState<Mahsulot[]>([]);
  const [weekly, setWeekly] = useState<Tx[]>([]);
  const [xizmatHolatlari, setXizmatHolatlari] = useState<Holat[]>([]);
  const [oylikHolat, setOylikHolat] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const dan = toDateInputValue(new Date(Date.now() - 6 * 24 * 3600 * 1000));
      const oyBoshi = toDateInputValue(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
      const [carsRes, docsRes, omborRes, txRes, xizmatRes, oylikRes] = await Promise.all([
        apiFetch<Car[]>('/api/cars'),
        apiFetch<CarDoc[]>('/api/car-documents?expiring_days=10'),
        apiFetch<Mahsulot[]>('/api/ombor/mahsulotlar'),
        apiFetch<Tx[]>('/api/transactions?dan=' + dan),
        apiFetch<Holat[]>('/api/tamirlash-normalari/holatlar'),
        apiFetch<CompareData>('/api/reports/compare?dan=' + oyBoshi),
      ]);
      if (carsRes.success && carsRes.data) setCars(carsRes.data);
      if (docsRes.success && docsRes.data) setExpiringDocs(docsRes.data);
      if (omborRes.success && omborRes.data) {
        setLowStock(omborRes.data.filter((m) => Number(m.joriy_qoldiq) <= Number(m.minimal_qoldiq)));
      }
      if (txRes.success && txRes.data) setWeekly(txRes.data);
      if (xizmatRes.success && xizmatRes.data) {
        setXizmatHolatlari(xizmatRes.data.filter((h) => h.holat === 'Kechikkan'));
      }
      if (oylikRes.success && oylikRes.data) setOylikHolat(oylikRes.data);
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

      {/* 0) Oylik moliyaviy holat — "byudjetda pul bor-yo'qligi" savoliga tezkor javob */}
      {canReports && oylikHolat && (
        <>
          <h2 style={{ marginTop: 24, marginBottom: 12 }}>Bu oy — moliyaviy holat</h2>
          {Object.keys(oylikHolat.valyutalar).length === 0 ? (
            <div className="card"><p style={{ color: 'var(--text-muted)', margin: 0 }}>Bu oyda hali tranzaksiya yo'q.</p></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              {Object.entries(oylikHolat.valyutalar).map(([cur, v]) => (
                <div className="card" key={cur}>
                  <h3>{cur}</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 13.5 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Kirim</span>
                    <span className="tabular-nums" style={{ color: 'var(--success)', fontWeight: 600 }}>{formatNumber(v.kirim)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 13.5 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Chiqim</span>
                    <span className="tabular-nums" style={{ color: 'var(--danger)', fontWeight: 600 }}>{formatNumber(v.chiqim)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Qoldiq (balans)</span>
                    <span className="tabular-nums" style={{ fontWeight: 800, fontSize: 18, color: v.sof_balans >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {formatNumber(v.sof_balans)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
            UZS va USD alohida hisoblangan — hech qachon qo'shib yuborilmaydi. To'liq tarix uchun{' '}
            <a href="/reports">Hisobotlar</a> sahifasiga o'ting.
          </p>
        </>
      )}

      {/* 1) Operatsion statuslar */}
      <h2 style={{ marginTop: 24, marginBottom: 12 }}>Avtopark holati</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
        {[
          { key: 'Aktiv', label: 'Liniyada', cls: 'st-liniyada', pulse: true },
          { key: "Ta'mirlashda", label: "Ta'mirlashda", cls: 'st-tamirlashda', pulse: false },
          { key: 'Zaxirada', label: 'Zaxirada', cls: 'st-zaxirada', pulse: false },
          { key: 'Nosoz', label: 'Nosoz', cls: 'st-nosoz', pulse: false },
        ].map(({ key, label, cls, pulse }) => (
          <div className={'status-card ' + cls} key={key}>
            <h3>{pulse && !loading && statusCounts[key] > 0 && <span className="pulsing-dot" />}{label}</h3>
            <p className="status-number tabular-nums">{loading ? '—' : statusCounts[key]}</p>
          </div>
        ))}
      </div>

      {/* 2) Kritik ogohlantirishlar */}
      {(expiringDocs.length > 0 || lowStock.length > 0 || xizmatHolatlari.length > 0) && (
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
            {xizmatHolatlari.map((h, i) => (
              <div key={'xizmat-' + i} className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 0 }}>
                <Wrench size={16} />
                <span><b>{h.tur} — {h.davlat_raqami}</b>: {h.qism_nomi} muddati {formatNumber(Math.abs(h.qolgan_masofa))} km oldin o'tgan</span>
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
