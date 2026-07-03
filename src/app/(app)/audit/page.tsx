'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';

interface AuditRow {
  id: number;
  harakat: string;
  eski_malumot: unknown;
  yangi_malumot: unknown;
  vaqt: string;
  foydalanuvchi: string | null;
  rol: string | null;
}

export default function AuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    apiFetch<AuditRow[]>('/api/audit').then((res) => {
      if (res.success && res.data) setRows(res.data);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <h1 style={{ marginBottom: 18 }}>Audit log ({rows.length})</h1>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="empty-state">Yuklanmoqda...</div>
        ) : rows.length === 0 ? (
          <div className="empty-state">Hali yozuv yo'q.</div>
        ) : (
          <table>
            <thead>
              <tr><th>Vaqt</th><th>Kim</th><th>Harakat</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <>
                  <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                    <td>{new Date(r.vaqt).toLocaleString()}</td>
                    <td>{r.foydalanuvchi || '—'} {r.rol && <span className="badge badge-neutral">{r.rol}</span>}</td>
                    <td><b style={{ color: 'var(--accent)' }}>{r.harakat}</b></td>
                    <td>{expanded === r.id ? '▲' : '▼'}</td>
                  </tr>
                  {expanded === r.id && (
                    <tr key={r.id + '-detail'}>
                      <td colSpan={4} style={{ background: 'var(--bg)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 8 }}>
                          <div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Eski ma'lumot</div>
                            <pre style={{ fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                              {r.eski_malumot ? JSON.stringify(r.eski_malumot, null, 2) : '—'}
                            </pre>
                          </div>
                          <div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Yangi ma'lumot</div>
                            <pre style={{ fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                              {r.yangi_malumot ? JSON.stringify(r.yangi_malumot, null, 2) : '—'}
                            </pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
