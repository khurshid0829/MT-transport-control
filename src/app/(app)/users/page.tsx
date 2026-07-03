'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { getUser } from '@/lib/auth-client';

const ROLES = ['FOUNDER', 'MANAGER', 'CHIEF_MECHANIC', 'MECHANIC'];
const ROLE_LABELS: Record<string, string> = {
  FOUNDER: 'Asoschi', MANAGER: 'Menejer', CHIEF_MECHANIC: 'Bosh mexanik', MECHANIC: 'Mexanik',
};

interface UserRow {
  id: number; ism_sharif: string; username: string; rol: string; status: string;
}

export default function UsersPage() {
  const currentUser = getUser();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({ ism_sharif: '', username: '', password: '', rol: 'MECHANIC' });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function loadUsers() {
    setLoading(true);
    const res = await apiFetch<UserRow[]>('/api/users');
    if (res.success && res.data) setUsers(res.data);
    setLoading(false);
  }

  useEffect(() => { loadUsers(); }, []);

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
      setShowForm(false);
      loadUsers();
    } else {
      setError(res.error?.message || 'Xatolik yuz berdi');
    }
  }

  async function toggleStatus(u: UserRow) {
    const newStatus = u.status === 'Aktiv' ? 'Bloklangan' : 'Aktiv';
    if (newStatus === 'Bloklangan' && !confirm(u.ism_sharif + " ni bloklashni tasdiqlaysizmi? U tizimga kira olmaydi.")) return;
    const res = await apiFetch('/api/users/' + u.id, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
    if (res.success) loadUsers();
    else alert(res.error?.message || 'Xatolik yuz berdi');
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <h1>Foydalanuvchilar ({users.length})</h1>
        <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Bekor qilish' : '+ Yangi foydalanuvchi'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20, maxWidth: 480 }}>
          <h2 style={{ marginBottom: 14 }}>Yangi foydalanuvchi qo'shish</h2>
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
              {saving ? 'Yaratilmoqda...' : 'Foydalanuvchi yaratish'}
            </button>
          </form>
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="empty-state">Yuklanmoqda...</div>
        ) : (
          <table className="responsive-table">
            <thead>
              <tr><th>Ism sharifi</th><th>Username</th><th>Rol</th><th>Holati</th><th></th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td data-label="Ism sharifi">{u.ism_sharif}</td>
                  <td data-label="Username">{u.username}</td>
                  <td data-label="Rol"><span className="badge badge-neutral">{ROLE_LABELS[u.rol] || u.rol}</span></td>
                  <td data-label="Holati">
                    <span className={'badge ' + (u.status === 'Aktiv' ? 'badge-success' : 'badge-danger')}>{u.status}</span>
                  </td>
                  <td data-label="">
                    {u.id !== currentUser?.id && (
                      <button
                        className={'btn ' + (u.status === 'Aktiv' ? 'btn-danger' : '')}
                        style={{ padding: '5px 10px' }}
                        onClick={() => toggleStatus(u)}
                      >
                        {u.status === 'Aktiv' ? 'Bloklash' : 'Faollashtirish'}
                      </button>
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
