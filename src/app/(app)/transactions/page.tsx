'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { getUser, canWriteTransactions } from '@/lib/auth-client';
import { formatNumber } from '@/lib/format';
import NumberInput from '@/components/NumberInput';

interface Tx {
  id: number;
  turi: string;
  valyuta: string;
  summa: string;
  avto_id: number | null;
  xarajat_turi: string;
  amaldagi_yurgan_masofa: number | null;
  tavsif: string | null;
  created_at: string;
  bekor_qilindi: boolean;
}
interface Car { id: number; davlat_raqami: string; tur: string; }

const XARAJAT_TURLARI = ["Yoqilg'i", 'Moy', "Ta'mirlash", 'Ehtiyot qism', 'YTX', "Kapital ta'mir", 'Diagnostika', 'Boshqa', 'Kirim_Moliya'];
const MILEAGE_RELATED = ["Ta'mirlash", 'Ehtiyot qism', "Kapital ta'mir", 'YTX', 'Diagnostika', 'Moy'];

export default function TransactionsPage() {
  const user = getUser();
  const canWrite = canWriteTransactions(user?.rol);

  const [txs, setTxs] = useState<Tx[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    turi: 'Chiqim', valyuta: 'UZS', summa: '', avto_id: '', xarajat_turi: XARAJAT_TURLARI[0],
    amaldagi_yurgan_masofa: '', tavsif: '',
  });

  async function loadAll() {
    setLoading(true);
    const [txRes, carsRes] = await Promise.all([
      apiFetch<Tx[]>('/api/transactions'),
      apiFetch<Car[]>('/api/cars'),
    ]);
    if (txRes.success && txRes.data) setTxs(txRes.data);
    if (carsRes.success && carsRes.data) setCars(carsRes.data);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  const needsMileage = MILEAGE_RELATED.includes(form.xarajat_turi);
  const [filterType, setFilterType] = useState('');
  const [sortOrder, setSortOrder] = useState<'yangi' | 'summa_kop' | 'summa_kam'>('yangi');

  const displayedTxs = txs
    .filter((t) => !filterType || t.xarajat_turi === filterType)
    .sort((a, b) => {
      if (sortOrder === 'summa_kop') return Number(b.summa) - Number(a.summa);
      if (sortOrder === 'summa_kam') return Number(a.summa) - Number(b.summa);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const body: Record<string, unknown> = {
      turi: form.turi, valyuta: form.valyuta, summa: Number(form.summa), xarajat_turi: form.xarajat_turi,
    };
    if (form.avto_id) body.avto_id = Number(form.avto_id);
    if (form.tavsif) body.tavsif = form.tavsif;
    if (needsMileage && form.amaldagi_yurgan_masofa) body.amaldagi_yurgan_masofa = Number(form.amaldagi_yurgan_masofa);

    const res = await apiFetch<Tx>('/api/transactions', { method: 'POST', body: JSON.stringify(body) });
    setSaving(false);
    if (res.success) {
      setShowForm(false);
      setForm({ turi: 'Chiqim', valyuta: 'UZS', summa: '', avto_id: '', xarajat_turi: XARAJAT_TURLARI[0], amaldagi_yurgan_masofa: '', tavsif: '' });
      loadAll();
    } else {
      setError(res.error?.message || 'Xatolik yuz berdi');
    }
  }

  async function handleCancel(id: number) {
    if (!confirm("Bu tranzaksiyani bekor qilmoqchimisiz? (Yozuv tarixda saqlanib qoladi, faqat 'bekor qilingan' deb belgilanadi)")) return;
    const res = await apiFetch('/api/transactions/' + id, { method: 'DELETE' });
    if (res.success) loadAll();
    else alert(res.error?.message || 'Xatolik yuz berdi');
  }

  function carLabel(id: number | null) {
    if (!id) return '—';
    const c = cars.find((c) => c.id === id);
    return c ? c.tur + ' — ' + c.davlat_raqami : '#' + id;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <h1>Tranzaksiyalar ({txs.length})</h1>
        {canWrite ? (
          <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Bekor qilish' : '+ Yangi tranzaksiya'}
          </button>
        ) : (
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Faqat Bosh mexanik yangi yozuv kirita oladi (ko'rish uchun ruxsatingiz bor)
          </span>
        )}
      </div>

      {showForm && canWrite && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ marginBottom: 14 }}>Yangi tranzaksiya</h2>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <div className="field">
                <label>Turi</label>
                <select value={form.turi} onChange={(e) => setForm({ ...form, turi: e.target.value, xarajat_turi: e.target.value === 'Kirim' ? 'Kirim_Moliya' : "Ta'mirlash" })}>
                  <option value="Chiqim">Chiqim</option>
                  <option value="Kirim">Kirim</option>
                </select>
              </div>
              <div className="field">
                <label>Valyuta</label>
                <select value={form.valyuta} onChange={(e) => setForm({ ...form, valyuta: e.target.value })}>
                  <option value="UZS">UZS</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div className="field">
                <label>Summa</label>
                <NumberInput value={form.summa} onChange={(v) => setForm({ ...form, summa: String(v) })} required />
              </div>
              <div className="field">
                <label>Xarajat turi</label>
                <select value={form.xarajat_turi} onChange={(e) => setForm({ ...form, xarajat_turi: e.target.value })}>
                  {(form.turi === 'Kirim' ? ['Kirim_Moliya'] : XARAJAT_TURLARI.filter((x) => x !== 'Kirim_Moliya')).map((x) => (
                    <option key={x} value={x}>{x}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Avto {needsMileage && '(majburiy)'}</label>
                <select value={form.avto_id} onChange={(e) => setForm({ ...form, avto_id: e.target.value })} required={needsMileage}>
                  <option value="">— tanlanmagan —</option>
                  {cars.map((c) => <option key={c.id} value={c.id}>{c.tur} — {c.davlat_raqami}</option>)}
                </select>
              </div>
              {needsMileage && (
                <div className="field">
                  <label>Amaldagi masofa (odometr, km)</label>
                  <NumberInput value={form.amaldagi_yurgan_masofa} onChange={(v) => setForm({ ...form, amaldagi_yurgan_masofa: String(v) })} required />
                </div>
              )}
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>Tavsif (ixtiyoriy)</label>
                <input value={form.tavsif} onChange={(e) => setForm({ ...form, tavsif: e.target.value })} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </form>
        </div>
      )}

      <div className="card" style={{ padding: '12px 16px', marginBottom: 14, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Xarajat turi:</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ padding: '6px 10px', border: '1px solid var(--border-strong)', borderRadius: 8 }}>
            <option value="">Barchasi</option>
            {XARAJAT_TURLARI.filter((x) => x !== 'Kirim_Moliya').map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Saralash:</label>
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as any)} style={{ padding: '6px 10px', border: '1px solid var(--border-strong)', borderRadius: 8 }}>
            <option value="yangi">Sana (yangi birinchi)</option>
            <option value="summa_kop">Summa: ko'pdan kamga</option>
            <option value="summa_kam">Summa: kamdan ko'pga</option>
          </select>
        </div>
        <span style={{ fontSize: 12.5, color: 'var(--text-muted)', marginLeft: 'auto' }}>{displayedTxs.length} ta natija</span>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="empty-state">Yuklanmoqda...</div>
        ) : displayedTxs.length === 0 ? (
          <div className="empty-state">Mos tranzaksiya topilmadi.</div>
        ) : (
          <table className="responsive-table">
            <thead>
              <tr>
                <th>Sana</th><th>Turi</th><th>Valyuta</th><th>Summa</th><th>Xarajat turi</th>
                <th>Avto</th><th>Tavsif</th>{canWrite && <th></th>}
              </tr>
            </thead>
            <tbody>
              {displayedTxs.map((t) => (
                <tr key={t.id} style={t.bekor_qilindi ? { opacity: 0.5 } : undefined}>
                  <td data-label="Sana">{new Date(t.created_at).toLocaleDateString()}</td>
                  <td data-label="Turi">
                    <span className={'badge ' + (t.turi === 'Kirim' ? 'badge-success' : 'badge-danger')}>{t.turi}</span>
                    {t.bekor_qilindi && <span className="badge badge-neutral" style={{ marginLeft: 6 }}>Bekor qilingan</span>}
                  </td>
                  <td data-label="Valyuta">{t.valyuta}</td>
                  <td data-label="Summa" style={t.bekor_qilindi ? { textDecoration: 'line-through' } : undefined}>{formatNumber(t.summa)}</td>
                  <td data-label="Xarajat turi">{t.xarajat_turi}</td>
                  <td data-label="Avto">{carLabel(t.avto_id)}</td>
                  <td data-label="Tavsif" style={{ color: 'var(--text-secondary)' }}>{t.tavsif || '—'}</td>
                  {canWrite && (
                    <td data-label="">
                      {!t.bekor_qilindi && (
                        <button className="btn btn-danger" style={{ padding: '5px 10px' }} onClick={() => handleCancel(t.id)}>Bekor qilish</button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
