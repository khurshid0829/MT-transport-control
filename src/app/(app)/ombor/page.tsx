'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { getUser } from '@/lib/auth-client';
import { formatNumber } from '@/lib/format';
import NumberInput from '@/components/NumberInput';
import CollapsibleCard from '@/components/CollapsibleCard';

interface Mahsulot {
  id: number; nomi: string; toifa: string; olchov_birligi: string;
  joriy_qoldiq: string; minimal_qoldiq: string;
}
interface Harakat {
  id: number; mahsulot_nomi: string; olchov_birligi: string; harakat_turi: string;
  miqdor: string; narx: string | null; valyuta: string | null;
  avto_davlat_raqami: string | null; tavsif: string | null; created_at: string;
}
interface Car { id: number; davlat_raqami: string; tur: string; }

const TOIFALAR = ['Ehtiyot qism', "Yoqilg'i", 'Moy', 'Boshqa'];
const BIRLIKLAR = ['dona', 'litr', 'kg'];

function canManageCatalog(rol: string | undefined) {
  return rol === 'FOUNDER' || rol === 'MANAGER';
}
function canMoveStock(rol: string | undefined) {
  return rol === 'CHIEF_MECHANIC';
}

export default function OmborPage() {
  const user = getUser();
  const canCatalog = canManageCatalog(user?.rol);
  const canMove = canMoveStock(user?.rol);

  const [mahsulotlar, setMahsulotlar] = useState<Mahsulot[]>([]);
  const [harakatlar, setHarakatlar] = useState<Harakat[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);

  const [showNewMahsulot, setShowNewMahsulot] = useState(false);
  const [newMahsulot, setNewMahsulot] = useState({ nomi: '', toifa: TOIFALAR[0], olchov_birligi: BIRLIKLAR[0], minimal_qoldiq: 0 });
  const [mahsulotError, setMahsulotError] = useState<string | null>(null);
  const [mahsulotSaving, setMahsulotSaving] = useState(false);

  const [showHarakat, setShowHarakat] = useState(false);
  const [harakatForm, setHarakatForm] = useState({
    mahsulot_id: '', harakat_turi: 'Kirim', miqdor: '', narx: '', valyuta: 'UZS', avto_id: '', tavsif: '',
  });
  const [harakatError, setHarakatError] = useState<string | null>(null);
  const [harakatSaving, setHarakatSaving] = useState(false);

  async function loadAll() {
    setLoading(true);
    const [mRes, hRes, cRes] = await Promise.all([
      apiFetch<Mahsulot[]>('/api/ombor/mahsulotlar'),
      apiFetch<Harakat[]>('/api/ombor/harakatlar'),
      apiFetch<Car[]>('/api/cars'),
    ]);
    if (mRes.success && mRes.data) {
      setMahsulotlar(mRes.data);
      setHarakatForm((f) => (f.mahsulot_id ? f : { ...f, mahsulot_id: String(mRes.data![0]?.id ?? '') }));
    }
    if (hRes.success && hRes.data) setHarakatlar(hRes.data);
    if (cRes.success && cRes.data) setCars(cRes.data);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  async function handleCreateMahsulot(e: React.FormEvent) {
    e.preventDefault();
    setMahsulotError(null);
    setMahsulotSaving(true);
    const res = await apiFetch<Mahsulot>('/api/ombor/mahsulotlar', { method: 'POST', body: JSON.stringify(newMahsulot) });
    setMahsulotSaving(false);
    if (res.success) {
      setShowNewMahsulot(false);
      setNewMahsulot({ nomi: '', toifa: TOIFALAR[0], olchov_birligi: BIRLIKLAR[0], minimal_qoldiq: 0 });
      loadAll();
    } else {
      setMahsulotError(res.error?.message || 'Xatolik yuz berdi');
    }
  }

  async function handleCreateHarakat(e: React.FormEvent) {
    e.preventDefault();
    setHarakatError(null);
    setHarakatSaving(true);
    const body: Record<string, unknown> = {
      mahsulot_id: Number(harakatForm.mahsulot_id),
      harakat_turi: harakatForm.harakat_turi,
      miqdor: Number(harakatForm.miqdor),
    };
    if (harakatForm.narx) { body.narx = Number(harakatForm.narx); body.valyuta = harakatForm.valyuta; }
    if (harakatForm.avto_id) body.avto_id = Number(harakatForm.avto_id);
    if (harakatForm.tavsif) body.tavsif = harakatForm.tavsif;

    const res = await apiFetch('/api/ombor/harakatlar', { method: 'POST', body: JSON.stringify(body) });
    setHarakatSaving(false);
    if (res.success) {
      setShowHarakat(false);
      setHarakatForm({ ...harakatForm, miqdor: '', narx: '', avto_id: '', tavsif: '' });
      loadAll();
    } else {
      setHarakatError(res.error?.message || 'Xatolik yuz berdi');
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <h1>Ombor ({mahsulotlar.length} turdagi mahsulot)</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {canCatalog && (
            <button className="btn" onClick={() => setShowNewMahsulot((v) => !v)}>
              {showNewMahsulot ? 'Yopish' : '+ Yangi mahsulot turi'}
            </button>
          )}
          {canMove && (
            <button className="btn btn-primary" onClick={() => setShowHarakat((v) => !v)}>
              {showHarakat ? 'Yopish' : '+ Kirim/Chiqim'}
            </button>
          )}
        </div>
      </div>

      {canCatalog && (
        <CollapsibleCard open={showNewMahsulot} onToggle={() => setShowNewMahsulot((v) => !v)} title="Yangi mahsulot turi qo'shish">
          {mahsulotError && <div className="alert alert-error">{mahsulotError}</div>}
          <form onSubmit={handleCreateMahsulot}>
            <div className="form-grid">
              <div className="field">
                <label>Nomi</label>
                <input value={newMahsulot.nomi} onChange={(e) => setNewMahsulot({ ...newMahsulot, nomi: e.target.value })} placeholder="masalan: Motor moyi 5W-30" required />
              </div>
              <div className="field">
                <label>Toifa</label>
                <select value={newMahsulot.toifa} onChange={(e) => setNewMahsulot({ ...newMahsulot, toifa: e.target.value })}>
                  {TOIFALAR.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="field">
                <label>O'lchov birligi</label>
                <select value={newMahsulot.olchov_birligi} onChange={(e) => setNewMahsulot({ ...newMahsulot, olchov_birligi: e.target.value })}>
                  {BIRLIKLAR.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Minimal qoldiq (ogohlantirish uchun)</label>
                <NumberInput value={newMahsulot.minimal_qoldiq} onChange={(v) => setNewMahsulot({ ...newMahsulot, minimal_qoldiq: v })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-primary" disabled={mahsulotSaving}>
                {mahsulotSaving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowNewMahsulot(false)}>Bekor qilish</button>
            </div>
          </form>
        </CollapsibleCard>
      )}

      {canMove && (
        <CollapsibleCard open={showHarakat} onToggle={() => setShowHarakat((v) => !v)} title="Kirim / Chiqim qilish">
          {harakatError && <div className="alert alert-error">{harakatError}</div>}
          <form onSubmit={handleCreateHarakat}>
            <div className="form-grid">
              <div className="field">
                <label>Mahsulot</label>
                <select value={harakatForm.mahsulot_id} onChange={(e) => setHarakatForm({ ...harakatForm, mahsulot_id: e.target.value })} required>
                  {mahsulotlar.map((m) => (
                    <option key={m.id} value={m.id}>{m.nomi} (qoldiq: {formatNumber(m.joriy_qoldiq)} {m.olchov_birligi})</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Harakat turi</label>
                <select value={harakatForm.harakat_turi} onChange={(e) => setHarakatForm({ ...harakatForm, harakat_turi: e.target.value })}>
                  <option value="Kirim">Kirim (omborga kelishi)</option>
                  <option value="Chiqim">Chiqim (ishlatilishi)</option>
                </select>
              </div>
              <div className="field">
                <label>Miqdor</label>
                <NumberInput value={harakatForm.miqdor} onChange={(v) => setHarakatForm({ ...harakatForm, miqdor: String(v) })} required />
              </div>
              <div className="field">
                <label>Narxi (ixtiyoriy)</label>
                <NumberInput value={harakatForm.narx} onChange={(v) => setHarakatForm({ ...harakatForm, narx: String(v) })} />
              </div>
              {harakatForm.narx && (
                <div className="field">
                  <label>Valyuta</label>
                  <select value={harakatForm.valyuta} onChange={(e) => setHarakatForm({ ...harakatForm, valyuta: e.target.value })}>
                    <option value="UZS">UZS</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              )}
              {harakatForm.harakat_turi === 'Chiqim' && (
                <div className="field">
                  <label>Qaysi avtoga (ixtiyoriy)</label>
                  <select value={harakatForm.avto_id} onChange={(e) => setHarakatForm({ ...harakatForm, avto_id: e.target.value })}>
                    <option value="">— tanlanmagan —</option>
                    {cars.map((c) => <option key={c.id} value={c.id}>{c.tur} — {c.davlat_raqami}</option>)}
                  </select>
                </div>
              )}
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>Tavsif (ixtiyoriy)</label>
                <input value={harakatForm.tavsif} onChange={(e) => setHarakatForm({ ...harakatForm, tavsif: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-primary" disabled={harakatSaving}>
                {harakatSaving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowHarakat(false)}>Bekor qilish</button>
            </div>
          </form>
        </CollapsibleCard>
      )}

      <h2 style={{ marginBottom: 12 }}>Qoldiqlar</h2>
      <div className="card" style={{ padding: 0, marginBottom: 24 }}>
        {loading ? (
          <div className="empty-state">Yuklanmoqda...</div>
        ) : mahsulotlar.length === 0 ? (
          <div className="empty-state">Hali mahsulot turi qo'shilmagan.</div>
        ) : (
          <table className="responsive-table">
            <thead>
              <tr><th>Nomi</th><th>Toifa</th><th>Joriy qoldiq</th><th>Minimal qoldiq</th><th></th></tr>
            </thead>
            <tbody>
              {mahsulotlar.map((m) => {
                const low = Number(m.joriy_qoldiq) <= Number(m.minimal_qoldiq);
                return (
                  <tr key={m.id}>
                    <td data-label="Nomi">{m.nomi}</td>
                    <td data-label="Toifa">{m.toifa}</td>
                    <td data-label="Joriy qoldiq">{formatNumber(m.joriy_qoldiq)} {m.olchov_birligi}</td>
                    <td data-label="Minimal qoldiq">{formatNumber(m.minimal_qoldiq)} {m.olchov_birligi}</td>
                    <td data-label="">{low && <span className="badge badge-warning">Kam qoldi!</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <h2 style={{ marginBottom: 12 }}>So'nggi harakatlar</h2>
      <div className="card" style={{ padding: 0 }}>
        {harakatlar.length === 0 ? (
          <div className="empty-state">Hali harakat yo'q.</div>
        ) : (
          <table className="responsive-table">
            <thead>
              <tr><th>Sana</th><th>Mahsulot</th><th>Turi</th><th>Miqdor</th><th>Narx</th><th>Avto</th><th>Tavsif</th></tr>
            </thead>
            <tbody>
              {harakatlar.map((h) => (
                <tr key={h.id}>
                  <td data-label="Sana">{new Date(h.created_at).toLocaleDateString()}</td>
                  <td data-label="Mahsulot">{h.mahsulot_nomi}</td>
                  <td data-label="Turi">
                    <span className={'badge ' + (h.harakat_turi === 'Kirim' ? 'badge-success' : 'badge-danger')}>{h.harakat_turi}</span>
                  </td>
                  <td data-label="Miqdor">{formatNumber(h.miqdor)} {h.olchov_birligi}</td>
                  <td data-label="Narx">{h.narx ? formatNumber(h.narx) + ' ' + h.valyuta : '—'}</td>
                  <td data-label="Avto">{h.avto_davlat_raqami || '—'}</td>
                  <td data-label="Tavsif" style={{ color: 'var(--text-secondary)' }}>{h.tavsif || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
