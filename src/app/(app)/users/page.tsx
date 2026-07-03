'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api-client';

const ROLES = ['FOUNDER', 'MANAGER', 'CHIEF_MECHANIC', 'MECHANIC'];
const ROLE_LABELS: Record<string, string> = {
  FOUNDER: 'Asoschi', MANAGER: 'Menejer', CHIEF_MECHANIC: 'Bosh mexanik', MECHANIC: 'Mexanik',
};

export default function UsersPage() {
  const [form, setForm] = useState({ ism_sharif: '', username: '', password: '', rol: 'MECHANIC' });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    const res = await apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify(form) });
    setSaving(false);
    if (res.success) {
      setSuccess("Foydalanuvchi '" + form.username + "' muvaffaqiyatli yaratildi (" + ROLE_LABELS[form.rol] + ")");
      setForm({ ism_sharif: '', username: '', password: '', rol: 'MECHANIC' });
    } else {
      setError(res.error?.message || 'Xatolik yuz berdi');
    }
  }

  return (
    <div>
      <h1 style={{ marginBottom: 18 }}>Yangi foydalanuvchi qo'shish</h1>

      <div className="card" style={{ maxWidth: 480 }}>
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        <form onSubmit={handleCreate}>
          <div className="field">
            <label>Ism sharifi</label>
            <input value={form.ism_sharif} onChange={(e) => setForm({ ...form, ism_sharif: e.target.value })} required />
          </div>
          <div className="field">
            <label>Username</label>
            <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required minLength={3} />
          </div>
          <div className="field">
            <label>Parol</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
          </div>
          <div className="field">
            <label>Rol</label>
            <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]} ({r})</option>)}
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
            {saving ? 'Yaratilmoqda...' : "Foydalanuvchi yaratish"}
          </button>
        </form>
      </div>
    </div>
  );
}
