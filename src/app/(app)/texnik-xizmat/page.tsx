'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { canManageOmborCatalog } from '@/lib/auth-client';
import { getUser } from '@/lib/auth-client';
import { formatNumber } from '@/lib/format';
import CollapsibleCard from '@/components/CollapsibleCard';
import NumberInput from '@/components/NumberInput';

interface Holat {
  avto_id: number; davlat_raqami: string; tur: string; qism_nomi: string;
  norma_id: number; interval_km: number; oxirgi_almashtirilgan_km: number;
  keyingi_muddat_km: number; joriy_km: number; qolgan_masofa: number;
  holat: 'Normal' | 'Yaqinlashmoqda' | 'Kechikkan';
}

const HOLAT_BADGE: Record<string, string> = {
  Normal: 'badge-success', Yaqinlashmoqda: 'badge-warning', Kechikkan: 'badge-danger',
};

export default function TexnikXizmatPage() {
  const user = getUser();
  const canManage = canManageOmborCatalog(user?.rol);

  const [holatlar, setHolatlar] = useState<Holat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nomi: '', interval_km: 10000 });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterHolat, setFilterHolat] = useState('');

  async function load() {
    setLoading(true);
    const res = await apiFetch<Holat[]>('/api/tamirlash-normalari/holatlar');
    if (res.success && res.data) setHolatlar(res.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await apiFetch('/api/tamirlash-normalari', { method: 'POST', body: JSON.stringify(form) });
    setSaving(false);
    if (res.success) {
      setShowForm(false);
      setForm({ nomi: '', interval_km: 10000 });
      load();
    } else {
      setError(res.error?.message || 'Xatolik yuz berdi');
    }
  }

  const filtered = filterHolat ? holatlar.filter((h) => h.holat === filterHolat) : holatlar;
  const kechikkanSoni = holatlar.filter((h) => h.holat === 'Kechikkan').length;
  const yaqinSoni = holatlar.filter((h) => h.holat === 'Yaqinlashmoqda').length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <h1>Texnik xizmat nazorati</h1>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Yopish' : '+ Yangi norma'}
          </button>
        )}
      </div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 18, fontSize: 13.5 }}>
        Moy, ehtiyot qism va boshqa almashtiriladigan qismlarning necha km'da bir marta
        yangilanishi kerakligini (norma) belgilang. Tizim har bir avto uchun oxirgi
        almashtirilgan masofani kuzatib, muddati yaqinlashgan yoki kechikkan holatlarni
        avtomatik ko'rsatadi.
      </p>

      {canManage && (
        <CollapsibleCard open={showForm} onToggle={() => setShowForm((v) => !v)} title="Yangi norma qo'shish">
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleCreate}>
            <div className="form-grid">
              <div className="field">
                <label>Qism nomi</label>
                <input value={form.nomi} onChange={(e) => setForm({ ...form, nomi: e.target.value })} placeholder="masalan: Motor moyi" required />
              </div>
              <div className="field">
                <label>Norma (necha km'da bir marta)</label>
                <NumberInput value={form.interval_km} onChange={(v) => setForm({ ...form, interval_km: v })} required />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Bekor qilish</button>
            </div>
          </form>
        </CollapsibleCard>
      )}

      {(kechikkanSoni > 0 || yaqinSoni > 0) && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          {kechikkanSoni > 0 && (
            <div className="alert alert-error" style={{ marginBottom: 0 }}>
              ⚠️ {kechikkanSoni} ta holat muddati o'tgan — tezkor e'tibor talab qiladi
            </div>
          )}
          {yaqinSoni > 0 && (
            <div className="alert" style={{ background: 'var(--warning-bg)', color: 'var(--warning)', marginBottom: 0 }}>
              {yaqinSoni} ta holat muddati yaqinlashmoqda
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ marginBottom: 16, padding: 12, display: 'flex', gap: 8 }}>
        {['', 'Kechikkan', 'Yaqinlashmoqda', 'Normal'].map((h) => (
          <button key={h} className={'btn' + (filterHolat === h ? ' btn-primary' : '')} style={{ padding: '5px 12px', fontSize: 12.5 }} onClick={() => setFilterHolat(h)}>
            {h || 'Barchasi'}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="empty-state">Yuklanmoqda...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            {holatlar.length === 0 ? "Hali norma belgilanmagan. Yuqoridan qo'shing." : 'Mos natija topilmadi.'}
          </div>
        ) : (
          <table className="responsive-table">
            <thead>
              <tr>
                <th>Avto</th><th>Qism</th><th>Oxirgi almashtirilgan</th>
                <th>Keyingi muddat</th><th>Joriy km</th><th>Holati</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((h, i) => (
                <tr key={i}>
                  <td data-label="Avto">{h.tur} — {h.davlat_raqami}</td>
                  <td data-label="Qism">{h.qism_nomi}</td>
                  <td data-label="Oxirgi almashtirilgan">{formatNumber(h.oxirgi_almashtirilgan_km)} km</td>
                  <td data-label="Keyingi muddat">{formatNumber(h.keyingi_muddat_km)} km</td>
                  <td data-label="Joriy km">{formatNumber(h.joriy_km)} km</td>
                  <td data-label="Holati">
                    <span className={'badge ' + HOLAT_BADGE[h.holat]}>
                      {h.holat === 'Kechikkan'
                        ? `Kechikkan (${formatNumber(Math.abs(h.qolgan_masofa))} km)`
                        : h.holat === 'Yaqinlashmoqda'
                        ? `Yaqinlashmoqda (${formatNumber(h.qolgan_masofa)} km qoldi)`
                        : 'Normal'}
                    </span>
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
