'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { canSetExchangeRate, getUser } from '@/lib/auth-client';
import { formatNumber } from '@/lib/format';
import NumberInput from '@/components/NumberInput';
import { exportToExcel } from '@/lib/export';
import { Download } from 'lucide-react';

interface CurrencyStat { kirim: number; chiqim: number; sof_balans: number; amallar_soni: number; }
interface CompareData {
  valyutalar: Record<string, CurrencyStat>;
  joriy_kurs: number | null;
  usd_sof_balans_uzs_ekvivalentida: number | null;
  eslatma: string;
}
interface Rate { id: number; kurs: string; amal_qilish_sanasi: string; }
interface ExpenseRow { xarajat_turi: string; valyuta: string; jami_summa: string; }
interface Car { id: number; davlat_raqami: string; tur: string; }
interface RentabellikRow {
  avto_id: number; davlat_raqami: string; tur: string; valyuta: string;
  kirim: number; chiqim: number; sof_foyda: number; yurgan_masofa: number; xarajat_100km: number | null;
}

function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Tez tanlov davrlari — foydalanuvchi qo'lda sana kiritmasdan tez filtrlashi uchun. */
function getPresetRange(preset: string): { dan: string; gacha: string } {
  const now = new Date();
  const today = toDateInputValue(now);
  if (preset === 'bu_oy') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { dan: toDateInputValue(start), gacha: today };
  }
  if (preset === 'otgan_oy') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { dan: toDateInputValue(start), gacha: toDateInputValue(end) };
  }
  if (preset === 'bu_yil') {
    const start = new Date(now.getFullYear(), 0, 1);
    return { dan: toDateInputValue(start), gacha: today };
  }
  return { dan: '', gacha: '' }; // "Barcha vaqt"
}

export default function ReportsPage() {
  const user = getUser();
  const canSetRate = canSetExchangeRate(user?.rol);

  const [data, setData] = useState<CompareData | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [rentabellik, setRentabellik] = useState<RentabellikRow[]>([]);
  const [rentabellikSort, setRentabellikSort] = useState<'foyda' | 'xarajat_km'>('foyda');
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);

  const [dan, setDan] = useState('');
  const [gacha, setGacha] = useState('');
  const [avtoId, setAvtoId] = useState('');
  const [activePreset, setActivePreset] = useState('barcha');

  const [rateForm, setRateForm] = useState('');
  const [rateSaving, setRateSaving] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);

  async function loadCars() {
    const res = await apiFetch<Car[]>('/api/cars');
    if (res.success && res.data) setCars(res.data);
  }

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (dan) params.set('dan', dan);
    if (gacha) params.set('gacha', gacha + 'T23:59:59');
    if (avtoId) params.set('avto_id', avtoId);
    const qs = params.toString() ? '?' + params.toString() : '';

    const [compareRes, expensesRes, rentRes] = await Promise.all([
      apiFetch<CompareData>('/api/reports/compare' + qs),
      apiFetch<ExpenseRow[]>('/api/reports/expenses-by-type' + qs),
      apiFetch<RentabellikRow[]>('/api/reports/avto-rentabelligi' + qs),
    ]);
    if (compareRes.success && compareRes.data) setData(compareRes.data);
    if (expensesRes.success && expensesRes.data) {
      setExpenses([...expensesRes.data].sort((a, b) => Number(b.jami_summa) - Number(a.jami_summa)));
    }
    if (rentRes.success && rentRes.data) setRentabellik(rentRes.data);
    setLoading(false);
  }

  useEffect(() => { loadCars(); }, []);
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [dan, gacha, avtoId]);

  function applyPreset(preset: string) {
    setActivePreset(preset);
    const range = getPresetRange(preset);
    setDan(range.dan);
    setGacha(range.gacha);
  }

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
  const maxExpense = expenses.length ? Math.max(...expenses.map((e) => Number(e.jami_summa))) : 0;

  const PRESETS = [
    { key: 'barcha', label: 'Barcha vaqt' },
    { key: 'bu_oy', label: 'Bu oy' },
    { key: 'otgan_oy', label: "O'tgan oy" },
    { key: 'bu_yil', label: 'Bu yil' },
  ];

  return (
    <div>
      <h1 style={{ marginBottom: 18 }}>Hisobotlar</h1>

      {/* Davr va avto bo'yicha filtr paneli */}
      <div className="card" style={{ marginBottom: 20, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              className={'btn' + (activePreset === p.key ? ' btn-primary' : '')}
              style={{ padding: '6px 12px', fontSize: 13 }}
              onClick={() => applyPreset(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="field" style={{ marginBottom: 0, minWidth: 150 }}>
          <label>Dan</label>
          <input type="date" value={dan} onChange={(e) => { setDan(e.target.value); setActivePreset('custom'); }} />
        </div>
        <div className="field" style={{ marginBottom: 0, minWidth: 150 }}>
          <label>Gacha</label>
          <input type="date" value={gacha} onChange={(e) => { setGacha(e.target.value); setActivePreset('custom'); }} />
        </div>
        <div className="field" style={{ marginBottom: 0, minWidth: 200 }}>
          <label>Avto (tahlil uchun)</label>
          <select value={avtoId} onChange={(e) => setAvtoId(e.target.value)}>
            <option value="">Barcha avtolar</option>
            {cars.map((c) => <option key={c.id} value={c.id}>{c.tur} — {c.davlat_raqami}</option>)}
          </select>
        </div>
      </div>

      {canSetRate && (
        <div className="card" style={{ marginBottom: 20, maxWidth: 420 }}>
          <h3 style={{ marginBottom: 10 }}>Joriy kurs (1 USD = ? UZS)</h3>
          {rateError && <div className="alert alert-error">{rateError}</div>}
          <p style={{ marginBottom: 10 }}>
            Hozirgi: <b>{data?.joriy_kurs ? formatNumber(data.joriy_kurs) + ' UZS' : 'kiritilmagan'}</b>
          </p>
          <form onSubmit={handleSetRate} style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <NumberInput value={rateForm} onChange={(v) => setRateForm(String(v))} placeholder="masalan: 12 700" />
            </div>
            <button type="submit" className="btn btn-primary" disabled={rateSaving}>
              {rateSaving ? 'Saqlanmoqda...' : 'Yangilash'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="empty-state">Yuklanmoqda...</div>
      ) : currencies.length === 0 ? (
        <div className="empty-state">Ushbu davr/avto uchun tranzaksiya topilmadi.</div>
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
                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>{formatNumber(v.kirim)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Chiqim</span>
                    <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{formatNumber(v.chiqim)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Sof balans</span>
                    <span style={{ fontWeight: 700, color: v.sof_balans >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {formatNumber(v.sof_balans)}
                    </span>
                  </div>
                  {cur === 'USD' && data!.usd_sof_balans_uzs_ekvivalentida !== null && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                      ≈ {formatNumber(data!.usd_sof_balans_uzs_ekvivalentida!)} UZS (joriy kurs bo'yicha, taxminiy)
                    </p>
                  )}
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{v.amallar_soni} ta amal</p>
                </div>
              );
            })}
          </div>

          {expenses.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
                <h2>Xarajatlar taqsimoti (ko'pdan kamga)</h2>
                <button className="btn" style={{ padding: '5px 10px', fontSize: 12.5 }} onClick={() => exportToExcel(expenses, 'xarajatlar_taqsimoti')}>
                  <Download size={14} /> Excel
                </button>
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16 }}>
                Qaysi xarajat turi budjetning eng katta qismini tashkil qilishini ko'rsatadi.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {expenses.map((e, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span>{e.xarajat_turi} <span style={{ color: 'var(--text-muted)' }}>({e.valyuta})</span></span>
                      <b>{formatNumber(e.jami_summa)}</b>
                    </div>
                    <div style={{ height: 8, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: (Number(e.jami_summa) / maxExpense * 100) + '%',
                        background: 'var(--accent)', borderRadius: 4,
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {rentabellik.length > 0 && (
            <div className="card" style={{ marginBottom: 20, padding: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 20px 0', flexWrap: 'wrap', gap: 8 }}>
                <h2>Avto rentabelligi va samaradorlik</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    value={rentabellikSort}
                    onChange={(e) => setRentabellikSort(e.target.value as any)}
                    style={{ padding: '5px 10px', fontSize: 12.5, border: '1px solid var(--border-strong)', borderRadius: 8 }}
                  >
                    <option value="foyda">Sof foyda bo'yicha</option>
                    <option value="xarajat_km">100km xarajat bo'yicha</option>
                  </select>
                  <button className="btn" style={{ padding: '5px 10px', fontSize: 12.5 }} onClick={() => exportToExcel(rentabellik, 'avto_rentabelligi')}>
                    <Download size={14} /> Excel
                  </button>
                </div>
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', padding: '8px 20px 0' }}>
                Sof foyda = Kirim − Chiqim (valyuta bo'yicha alohida). 100 km xarajat — shu avto
                bosgan har 100 km uchun o'rtacha necha pul sarflangani.
              </p>
              <table className="responsive-table" style={{ marginTop: 12 }}>
                <thead>
                  <tr><th>Avto</th><th>Valyuta</th><th>Kirim</th><th>Chiqim</th><th>Sof foyda</th><th>100km xarajat</th></tr>
                </thead>
                <tbody>
                  {[...rentabellik]
                    .sort((a, b) => rentabellikSort === 'foyda' ? b.sof_foyda - a.sof_foyda : (b.xarajat_100km ?? 0) - (a.xarajat_100km ?? 0))
                    .map((r, i) => (
                      <tr key={i}>
                        <td data-label="Avto">{r.tur} — {r.davlat_raqami}</td>
                        <td data-label="Valyuta">{r.valyuta}</td>
                        <td data-label="Kirim" style={{ color: 'var(--success)' }}>{formatNumber(r.kirim)}</td>
                        <td data-label="Chiqim" style={{ color: 'var(--danger)' }}>{formatNumber(r.chiqim)}</td>
                        <td data-label="Sof foyda" style={{ fontWeight: 600, color: r.sof_foyda >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                          {formatNumber(r.sof_foyda)}
                        </td>
                        <td data-label="100km xarajat">{r.xarajat_100km !== null ? formatNumber(r.xarajat_100km) : '—'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="alert" style={{ background: 'var(--bg)', color: 'var(--text-secondary)' }}>
            {data!.eslatma}
          </div>
        </>
      )}
    </div>
  );
}
