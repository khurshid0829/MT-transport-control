'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { getUser, canWriteCars } from '@/lib/auth-client';
import { formatNumber } from '@/lib/format';
import NumberInput from '@/components/NumberInput';
import PlateNumberInput from '@/components/PlateNumberInput';
import CollapsibleCard from '@/components/CollapsibleCard';
import PlateBadge from '@/components/PlateBadge';

interface CarDocument {
  id: number; avto_id: number; hujjat_turi: string; amal_qilish_muddati: string;
  izoh: string | null; davlat_raqami: string; tur: string; qolgan_kun: number;
}

interface Car {
  id: number;
  tur: string;
  davlat_raqami: string;
  ishlab_chiqarilgan_yili: number;
  boshlangich_yurgan_masofasi: number;
  joriy_yurgan_masofasi: number;
  texnik_holat: string;
}

const STATUSES = ['Aktiv', "Ta'mirlashda", 'Zaxirada', 'Nosoz'];
const STATUS_LABELS: Record<string, string> = {
  Aktiv: 'Liniyada', "Ta'mirlashda": "Ta'mirlashda", Zaxirada: 'Zaxirada', Nosoz: 'Nosoz',
};

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'Aktiv' ? 'badge-success' : status === 'Nosoz' ? 'badge-danger' : 'badge-warning';
  return <span className={'badge ' + cls}>{STATUS_LABELS[status] || status}</span>;
}

export default function CarsPage() {
  const user = getUser();
  const canWrite = canWriteCars(user?.rol);

  const [cars, setCars] = useState<Car[]>([]);
  const [carTypes, setCarTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [documents, setDocuments] = useState<CarDocument[]>([]);
  const [showDocForm, setShowDocForm] = useState(false);
  const [docForm, setDocForm] = useState({ avto_id: '', hujjat_turi: 'OSAGO', amal_qilish_muddati: '', izoh: '' });
  const [docError, setDocError] = useState<string | null>(null);
  const [docSaving, setDocSaving] = useState(false);

  const [editingStatusFor, setEditingStatusFor] = useState<Car | null>(null);

  const [showNewType, setShowNewType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeError, setNewTypeError] = useState<string | null>(null);

  const [form, setForm] = useState({
    tur: '',
    davlat_raqami: '',
    ishlab_chiqarilgan_yili: new Date().getFullYear(),
    boshlangich_yurgan_masofasi: 0,
    joriy_yurgan_masofasi: 0,
  });

  async function loadCars() {
    setLoading(true);
    const [carsRes, typesRes, docsRes] = await Promise.all([
      apiFetch<Car[]>('/api/cars'),
      apiFetch<string[]>('/api/car-types'),
      apiFetch<CarDocument[]>('/api/car-documents'),
    ]);
    if (carsRes.success && carsRes.data) {
      setCars(carsRes.data);
      setDocForm((f) => (f.avto_id ? f : { ...f, avto_id: String(carsRes.data![0]?.id ?? '') }));
    }
    if (typesRes.success && typesRes.data) {
      setCarTypes(typesRes.data);
      setForm((f) => (f.tur ? f : { ...f, tur: typesRes.data![0] || '' }));
    }
    if (docsRes.success && docsRes.data) setDocuments(docsRes.data);
    setLoading(false);
  }

  async function handleCreateDoc(e: React.FormEvent) {
    e.preventDefault();
    setDocError(null);
    setDocSaving(true);
    const res = await apiFetch<CarDocument>('/api/car-documents', {
      method: 'POST',
      body: JSON.stringify({ ...docForm, avto_id: Number(docForm.avto_id) }),
    });
    setDocSaving(false);
    if (res.success) {
      setShowDocForm(false);
      setDocForm({ ...docForm, amal_qilish_muddati: '', izoh: '' });
      loadCars();
    } else {
      setDocError(res.error?.message || 'Xatolik yuz berdi');
    }
  }

  useEffect(() => {
    loadCars();
  }, []);

  async function handleAddType(e: React.FormEvent) {
    e.preventDefault();
    setNewTypeError(null);
    if (!newTypeName.trim()) return;
    const res = await apiFetch<{ nomi: string }>('/api/car-types', {
      method: 'POST',
      body: JSON.stringify({ nomi: newTypeName.trim() }),
    });
    if (res.success && res.data) {
      const updated = [...carTypes, res.data.nomi].sort();
      setCarTypes(updated);
      setForm((f) => ({ ...f, tur: res.data!.nomi }));
      setNewTypeName('');
      setShowNewType(false);
    } else {
      setNewTypeError(res.error?.message || 'Xatolik yuz berdi');
    }
  }

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
      setForm({ tur: carTypes[0] || '', davlat_raqami: '', ishlab_chiqarilgan_yili: new Date().getFullYear(), boshlangich_yurgan_masofasi: 0, joriy_yurgan_masofasi: 0 });
      loadCars();
    } else {
      setError(res.error?.message || 'Xatolik yuz berdi');
    }
  }

  async function handleStatusChange(id: number, texnik_holat: string) {
    const res = await apiFetch<Car>('/api/cars/' + id, { method: 'PUT', body: JSON.stringify({ texnik_holat }) });
    if (res.success) { setEditingStatusFor(null); loadCars(); }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <h1>Avtolar ({cars.length})</h1>
        {canWrite && (
          <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Yopish' : "+ Yangi avto"}
          </button>
        )}
      </div>

      {canWrite && (
        <CollapsibleCard open={showForm} onToggle={() => setShowForm((v) => !v)} title="Yangi avto qo'shish">
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleCreate}>
            <div className="form-grid">
              <div className="field">
                <label>Turi</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select value={form.tur} onChange={(e) => setForm({ ...form, tur: e.target.value })} style={{ flex: 1 }}>
                    {carTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button type="button" className="btn" onClick={() => setShowNewType((v) => !v)} title="Yangi turi qo'shish">
                    + Turi
                  </button>
                </div>
                {showNewType && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <input
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                      placeholder="masalan: KamAZ 65115"
                      style={{ flex: 1 }}
                    />
                    <button type="button" className="btn btn-primary" onClick={handleAddType}>Qo'shish</button>
                  </div>
                )}
                {newTypeError && <p style={{ color: 'var(--danger)', fontSize: 12.5, marginTop: 4 }}>{newTypeError}</p>}
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
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                Bekor qilish
              </button>
            </div>
          </form>
        </CollapsibleCard>
      )}

      {canWrite && (
        <CollapsibleCard open={showDocForm} onToggle={() => setShowDocForm((v) => !v)} title="Avto hujjati qo'shish (Sug'urta, Texnik ko'rik va h.k.)">
          {docError && <div className="alert alert-error">{docError}</div>}
          <form onSubmit={handleCreateDoc}>
            <div className="form-grid">
              <div className="field">
                <label>Avto</label>
                <select value={docForm.avto_id} onChange={(e) => setDocForm({ ...docForm, avto_id: e.target.value })} required>
                  {cars.map((c) => <option key={c.id} value={c.id}>{c.tur} — {c.davlat_raqami}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Hujjat turi</label>
                <select value={docForm.hujjat_turi} onChange={(e) => setDocForm({ ...docForm, hujjat_turi: e.target.value })}>
                  <option value="OSAGO">Sug'urta (OSAGO)</option>
                  <option value="Texnik korik">Texnik ko'rik</option>
                  <option value="Gaz ballon sinovi">Gaz ballon sinovi</option>
                  <option value="Ishonchnoma">Ishonchnoma</option>
                </select>
              </div>
              <div className="field">
                <label>Amal qilish muddati</label>
                <input type="date" value={docForm.amal_qilish_muddati} onChange={(e) => setDocForm({ ...docForm, amal_qilish_muddati: e.target.value })} required />
              </div>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>Izoh (ixtiyoriy)</label>
                <input value={docForm.izoh} onChange={(e) => setDocForm({ ...docForm, izoh: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-primary" disabled={docSaving}>
                {docSaving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowDocForm(false)}>Bekor qilish</button>
            </div>
          </form>
        </CollapsibleCard>
      )}

      {documents.length > 0 && (
        <div className="card" style={{ padding: 0, marginBottom: 20 }}>
          <div style={{ padding: '14px 20px 0' }}><h2>Hujjatlar muddati</h2></div>
          <table className="responsive-table">
            <thead><tr><th>Avto</th><th>Hujjat</th><th>Muddati</th><th>Holati</th></tr></thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id}>
                  <td data-label="Avto">{d.tur} — {d.davlat_raqami}</td>
                  <td data-label="Hujjat">{d.hujjat_turi}</td>
                  <td data-label="Muddati">{new Date(d.amal_qilish_muddati).toLocaleDateString('uz-UZ')}</td>
                  <td data-label="Holati">
                    {d.qolgan_kun < 0 ? (
                      <span className="badge badge-danger">Muddati o'tgan</span>
                    ) : d.qolgan_kun <= 10 ? (
                      <span className="badge badge-warning">{d.qolgan_kun} kun qoldi</span>
                    ) : (
                      <span className="badge badge-success">Amal qiladi</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                  <td data-label="Davlat raqami"><PlateBadge value={c.davlat_raqami} /></td>
                  <td data-label="Yili">{c.ishlab_chiqarilgan_yili}</td>
                  <td data-label="Boshlang'ich (km)">{formatNumber(c.boshlangich_yurgan_masofasi)}</td>
                  <td data-label="Joriy (km)">{formatNumber(c.joriy_yurgan_masofasi)}</td>
                  <td data-label="Holati">
                    {canWrite ? (
                      <button
                        type="button"
                        onClick={() => setEditingStatusFor(c)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        title="Holatni o'zgartirish"
                      >
                        <StatusBadge status={c.texnik_holat} />
                      </button>
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

      {editingStatusFor && (
        <>
          <div className="bottom-sheet-backdrop open" onClick={() => setEditingStatusFor(null)} />
          <div className="card bottom-sheet-card status-modal-desktop open" style={{ padding: 0 }}>
            <div className="bottom-sheet-handle" />
            <div style={{ padding: 20 }}>
              <h2 style={{ marginBottom: 4 }}>Holatni o'zgartirish</h2>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
                {editingStatusFor.tur} — {editingStatusFor.davlat_raqami}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="btn"
                    style={{
                      justifyContent: 'flex-start', padding: '12px 16px',
                      ...(s === editingStatusFor.texnik_holat ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' } : {}),
                    }}
                    onClick={() => handleStatusChange(editingStatusFor.id, s)}
                  >
                    <StatusBadge status={s} /> {s === editingStatusFor.texnik_holat && <span style={{ marginLeft: 'auto', color: 'var(--accent)' }}>✓</span>}
                  </button>
                ))}
              </div>
              <button type="button" className="btn btn-secondary btn-block" style={{ marginTop: 12 }} onClick={() => setEditingStatusFor(null)}>
                Bekor qilish
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
