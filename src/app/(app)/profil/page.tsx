'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { getUser } from '@/lib/auth-client';

const ROLE_LABELS: Record<string, string> = {
  FOUNDER: 'Asoschi', MANAGER: 'Menejer', CHIEF_MECHANIC: 'Bosh mexanik', MECHANIC: 'Mexanik',
};

export default function ProfilePage() {
  const user = getUser();
  const [eskiParol, setEskiParol] = useState('');
  const [yangiParol, setYangiParol] = useState('');
  const [tasdiqParol, setTasdiqParol] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (yangiParol !== tasdiqParol) {
      setError('Yangi parol va tasdiqlash mos kelmadi');
      return;
    }

    setSaving(true);
    const res = await apiFetch('/api/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ eski_parol: eskiParol, yangi_parol: yangiParol }),
    });
    setSaving(false);

    if (res.success) {
      setSuccess('Parol muvaffaqiyatli almashtirildi');
      setEskiParol(''); setYangiParol(''); setTasdiqParol('');
    } else {
      setError(res.error?.message || 'Xatolik yuz berdi');
    }
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <h1 style={{ marginBottom: 18 }}>Profil</h1>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 10 }}>Hisob ma'lumotlari</h3>
        <p style={{ marginBottom: 4 }}><b>{user?.ism_sharif}</b></p>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          {user?.username} · <span className="badge badge-neutral">{ROLE_LABELS[user?.rol || ''] || user?.rol}</span>
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: 14 }}>Parolni almashtirish</h2>
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Joriy parol</label>
            <input type="password" value={eskiParol} onChange={(e) => setEskiParol(e.target.value)} required />
          </div>
          <div className="field">
            <label>Yangi parol</label>
            <input type="password" value={yangiParol} onChange={(e) => setYangiParol(e.target.value)} required minLength={8} />
          </div>
          <div className="field">
            <label>Yangi parolni tasdiqlang</label>
            <input type="password" value={tasdiqParol} onChange={(e) => setTasdiqParol(e.target.value)} required minLength={8} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saqlanmoqda...' : 'Parolni almashtirish'}
          </button>
        </form>
      </div>
    </div>
  );
}
