'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { getUser, canWriteCars } from '@/lib/auth-client';

interface Driver {
  id: number;
  ism_sharif: string;
  telefon_raqam: string;
  biriktirilgan_avto_id: number | null;
  avto_davlat_raqami: string | null;
}
interface Car { id: number; davlat_raqami: string; tur: string; }

export default function DriversPage() {
  const user = getUser();
  const canWrite = canWriteCars(user?.rol); // drivers uchun ham FOUNDER/MANAGER

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ ism_sharif: '', telefon_raqam: '', biriktirilgan_avto_id: '' });

  async function loadAll() {
    setLoading(true);
    const [driversRes, carsRes] = await Promise.all([
      apiFetch<Driver[]>('/api/drivers'),
      apiFetch<Car[]>('/api/cars'),
    ]);
    if (driversRes.success && driversRes.data) setDrivers(driversRes.data);
    if (carsRes.success && carsRes.data) setCars(carsRes.data);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const body: Record<string, unknown> = { ism_sharif: form.ism_sharif, telefon_raqam: form.telefon_raqam };
    if (form.biriktirilgan_avto_id) body.biriktirilgan_avto_id = Number(form.biriktirilgan_avto_id);
    const res = await apiFetch<Driver>('/api/drivers', { method: 'POST', body: JSON.stringify(body) });
    setSaving(false);
    if (res.success) {
      setShowForm(false);
      setForm({ ism_sharif: '', telefon_raqam: '', biriktirilgan_avto_id: '' });
      loadAll();
    } else {
      setError(res.error?.message || 'Xatolik yuz berdi');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Haqiqatan ham o'chirmoqchimisiz?")) return;
    const res = await apiFetch('/api/drivers/' + id, { method: 'DELETE' });
    if (res.success) loadAll();
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <h1>Haydovchilar ({drivers.length})</h1>
        {canWrite && (
          <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Bekor qilish' : '+ Yangi haydovchi'}
          </button>
        )}
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ marginBottom: 14 }}>Yangi haydovchi qo'shish</h2>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <div className="field">
                <label>Ism sharifi</label>
                <input value={form.ism_sharif} onChange={(e) => setForm({ ...form, ism_sharif: e.target.value })} required />
              </div>
              <div className="field">
                <label>Telefon raqami</label>
                <input value={form.telefon_raqam} onChange={(e) => setForm({ ...form, telefon_raqam: e.target.value })} placeholder="+998 90 123 45 67" required />
              </div>
              <div className="field">
                <label>Biriktirilgan avto (ixtiyoriy)</label>
                <select value={form.biriktirilgan_avto_id} onChange={(e) => setForm({ ...form, biriktirilgan_avto_id: e.target.value })}>
                  <option value="">— tanlanmagan —</option>
                  {cars.map((c) => <option key={c.id} value={c.id}>{c.tur} — {c.davlat_raqami}</option>)}
                </select>
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
        ) : drivers.length === 0 ? (
          <div className="empty-state">Hali haydovchi qo'shilmagan.</div>
        ) : (
          <table className="responsive-table">
            <thead>
              <tr><th>Ism sharifi</th><th>Telefon</th><th>Biriktirilgan avto</th>{canWrite && <th></th>}</tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={d.id}>
                  <td data-label="Ism sharifi">{d.ism_sharif}</td>
                  <td data-label="Telefon">{d.telefon_raqam}</td>
                  <td data-label="Avto">{d.avto_davlat_raqami || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  {canWrite && (
                    <td data-label="">
                      <button className="btn btn-danger" style={{ padding: '5px 10px' }} onClick={() => handleDelete(d.id)}>O'chirish</button>
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
