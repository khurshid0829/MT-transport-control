'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { harakatLabel, summarizeDiff } from '@/lib/audit-labels';

interface AuditRow {
  id: number;
  harakat: string;
  eski_malumot: Record<string, unknown> | null;
  yangi_malumot: Record<string, unknown> | null;
  vaqt: string;
  foydalanuvchi: string | null;
  rol: string | null;
}

function harakatBadgeClass(harakat: string): string {
  if (harakat === 'LOGIN_FAILED') return 'badge-danger';
  if (harakat === 'LOGIN_SUCCESS') return 'badge-success';
  if (harakat.startsWith('DELETE')) return 'badge-warning';
  if (harakat.startsWith('INSERT')) return 'badge-success';
  return 'badge-neutral';
}

export default function AuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showRaw, setShowRaw] = useState<Record<number, boolean>>({});

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
          <table className="responsive-table">
            <thead>
              <tr><th>Vaqt</th><th>Kim</th><th>Harakat</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const diffLines = summarizeDiff(r.eski_malumot, r.yangi_malumot);
                const isExpanded = expanded === r.id;
                return (
                  <>
                    <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setExpanded(isExpanded ? null : r.id)}>
                      <td data-label="Vaqt">{new Date(r.vaqt).toLocaleString('uz-UZ')}</td>
                      <td data-label="Kim">{r.foydalanuvchi || <span style={{ color: 'var(--text-muted)' }}>tizim</span>} {r.rol && <span className="badge badge-neutral">{r.rol}</span>}</td>
                      <td data-label="Harakat"><span className={'badge ' + harakatBadgeClass(r.harakat)}>{harakatLabel(r.harakat)}</span></td>
                      <td data-label="">{isExpanded ? '▲' : '▼'}</td>
                    </tr>
                    {isExpanded && (
                      <tr key={r.id + '-detail'}>
                        <td colSpan={4} style={{ background: 'var(--bg)' }}>
                          <div style={{ padding: 12 }}>
                            {diffLines.length === 0 ? (
                              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>O'zgarish tafsiloti yo'q.</p>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                                {diffLines.map((line, i) => (
                                  <div key={i} style={{ fontSize: 13.5, padding: '6px 10px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                                    {line}
                                  </div>
                                ))}
                              </div>
                            )}
                            <button
                              className="btn-secondary btn"
                              style={{ padding: '4px 10px', fontSize: 12 }}
                              onClick={(e) => { e.stopPropagation(); setShowRaw((s) => ({ ...s, [r.id]: !s[r.id] })); }}
                            >
                              {showRaw[r.id] ? 'Texnik JSON\'ni yashirish' : "Texnik JSON'ni ko'rsatish"}
                            </button>
                            {showRaw[r.id] && (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 10 }}>
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
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
