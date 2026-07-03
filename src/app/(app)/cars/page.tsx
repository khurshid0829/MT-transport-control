'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { getUser, canWriteCars } from '@/lib/auth-client';
import { formatNumber } from '@/lib/format';
import NumberInput from '@/components/NumberInput';
import PlateNumberInput from '@/components/PlateNumberInput';

interface Car {
  id: number;
  tur: string;
  davlat_raqami: string;
  ishlab_chiqarilgan_yili: number;
  boshlangich_yurgan_masofasi: number;
  joriy_yurgan_masofasi: number;
  texnik_holat: string;
}

const CAR_TYPES = ['Isuzu 10t', 'Isuzu 5t', 'Changan', 'Labo'];
const STATUSES = ['Aktiv', "Ta'mirlashda", 'Nosoz'];

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'Aktiv' ? 'badge-success' : status === 'Nosoz' ? 'badge-danger' : 'badge-warning';
  return <span className={'badge ' + cls}>{status}</span>;
}

export default function CarsPage() {
  const user = getUser();
  const canWrite = canWriteCars(user?.rol);

  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    tur: CAR_TYPES[0],
    davlat_raqami: '',
    ishlab_chiqarilgan_yili: new Date().getFullYear(),
    boshlangich_yurgan_masofasi: 0,
    joriy_yurgan_masofasi: 0,
  });

  async function loadCars() {
    setLoading(true);
    const res = await apiFetch<Car[]>('/api/cars');
    if (res.success && res.data) setCars(res.data);
    setLoading(false);
  }

  useEffect(() => {
    loadCars();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.davlat_raqami.length !== 8) {
      setError("Davlat raqami to'liq kiritilmagan (masalan: 01 A 111 AA)");
      return;
    }
    setSaving(true);
    const res = await apiFetch<Car>('/api/cars', { method: 'POST', body: JSON.stringify(form) });
    setSaving(false);
    if (res.success) {
      setShowForm(false);
      setForm({ tur: CAR_TYPES[0], davlat_raqami: '', ishlab_chiqarilgan_yili: new Date().getFullYear(), boshlangich_yurgan_masofasi: 0, joriy_yurgan_masofasi: 0 });
      loadCars();
    } else {
      setError(res.error?.message || 'Xatolik yuz berdi');
    }
  }

  async function handleStatusChange(id: number, texnik_holat: string) {
    const res = await apiFetch<Car>('/api/cars/' + id, { method: 'PUT', body: JSON.stringify({ texnik_holat }) });
    if (res.success) loadCars();
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <h1>Avtolar ({cars.length})</h1>
        {canWrite && (
          <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Bekor qilish' : '+ Yangi avto'}
          </button>
        )}
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ marginBottom: 14 }}>Yangi avto qo'shish</h2>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <div className="field">
                <label>Turi</label>
                <select value={form.tur} onChange={(e) => setForm({ ...form, tur: e.target.value })}>
                  {CAR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Davlat raqami</label>
                <PlateNumberInput value={form.davlat_raqami} onChange={(v) => setForm({ ...form, davlat_raqami: v })} />
              </div>
              <div className="field">
                <label>Ishlab chiqarilgan yili</label>
                <input type="number" value={form.ishlab_chiqarilgan_yili} onChange={(e) => setForm({ ...form, ishlab_chiqarilgan_yili: Number(e.target.value) })} required />
              </div>
              <div className="field">
                <label>Boshlang'ich masofa (km)</label>
                <NumberInput value={form.boshlangich_yurgan_masofasi} onChange={(v) => setForm({ ...form, boshlangich_yurgan_masofasi: v })} required />
              </div>
              <div className="field">
                <label>Joriy masofa (km)</label>
                <NumberInput value={form.joriy_yurgan_masofasi} onChange={(v) => setForm({ ...form, joriy_yurgan_masofasi: v })} required />
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
        ) : cars.length === 0 ? (
          <div className="empty-state">Hali avto qo'shilmagan.</div>
        ) : (
          <table className="responsive-table">
            <thead>
              <tr>
                <th>Turi</th><th>Davlat raqami</th><th>Yili</th><th>Boshlang'ich (km)</th>
                <th>Joriy (km)</th><th>Holati</th>
              </tr>
            </thead>
            <tbody>
              {cars.map((c) => (
                <tr key={c.id}>
                  <td data-label="Turi">{c.tur}</td>
                  <td data-label="Davlat raqami">{c.davlat_raqami}</td>
                  <td data-label="Yili">{c.ishlab_chiqarilgan_yili}</td>
                  <td data-label="Boshlang'ich (km)">{formatNumber(c.boshlangich_yurgan_masofasi)}</td>
                  <td data-label="Joriy (km)">{formatNumber(c.joriy_yurgan_masofasi)}</td>
                  <td data-label="Holati">
                    {canWrite ? (
                      <select value={c.texnik_holat} onChange={(e) => handleStatusChange(c.id, e.target.value)} style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6 }}>
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <StatusBadge status={c.texnik_holat} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
