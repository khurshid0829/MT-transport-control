'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { getUser, canWriteTransactions } from '@/lib/auth-client';

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

const XARAJAT_TURLARI = ["Ta'mirlash", "Yoqilg'i", 'Ehtiyot qism', 'Boshqa', 'Kirim_Moliya'];
const MILEAGE_RELATED = ["Ta'mirlash", 'Ehtiyot qism'];

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
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
                <input type="number" value={form.summa} onChange={(e) => setForm({ ...form, summa: e.target.value })} required min="0" step="0.01" />
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
                  <input type="number" value={form.amaldagi_yurgan_masofa} onChange={(e) => setForm({ ...form, amaldagi_yurgan_masofa: e.target.value })} required min="0" />
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

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="empty-state">Yuklanmoqda...</div>
        ) : txs.length === 0 ? (
          <div className="empty-state">Hali tranzaksiya kiritilmagan.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Sana</th><th>Turi</th><th>Valyuta</th><th>Summa</th><th>Xarajat turi</th>
                <th>Avto</th><th>Tavsif</th>{canWrite && <th></th>}
              </tr>
            </thead>
            <tbody>
              {txs.map((t) => (
                <tr key={t.id} style={t.bekor_qilindi ? { opacity: 0.5 } : undefined}>
                  <td>{new Date(t.created_at).toLocaleDateString()}</td>
                  <td>
                    <span className={'badge ' + (t.turi === 'Kirim' ? 'badge-success' : 'badge-danger')}>{t.turi}</span>
                    {t.bekor_qilindi && <span className="badge badge-neutral" style={{ marginLeft: 6 }}>Bekor qilingan</span>}
                  </td>
                  <td>{t.valyuta}</td>
                  <td style={t.bekor_qilindi ? { textDecoration: 'line-through' } : undefined}>{Number(t.summa).toLocaleString()}</td>
                  <td>{t.xarajat_turi}</td>
                  <td>{carLabel(t.avto_id)}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{t.tavsif || '—'}</td>
                  {canWrite && (
                    <td>
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
