'use client';

import { useRef, useState } from 'react';
import { Sparkles, Send } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

interface ChatMsg { role: 'user' | 'assistant'; text: string; }

const NAMUNA_SAVOLLAR = [
  "Bu oy jami qancha xarajat bo'ldi?",
  "Eng ko'p xarajat qilingan turi qaysi?",
  "Nechta avto 'Ta'mirlashda' holatida?",
  "Ombordagi qoldiqlarni ko'rsat",
];

export default function AiPage() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const savol = text.trim();
    if (!savol || loading) return;
    setError(null);
    setMessages((m) => [...m, { role: 'user', text: savol }]);
    setInput('');
    setLoading(true);

    const res = await apiFetch<{ javob: string }>('/api/ai/query', {
      method: 'POST',
      body: JSON.stringify({ savol }),
    });

    setLoading(false);
    if (res.success && res.data) {
      setMessages((m) => [...m, { role: 'assistant', text: res.data!.javob }]);
    } else {
      setError(res.error?.message || 'Xatolik yuz berdi');
    }
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Sparkles size={20} color="var(--accent)" />
        <h1>AI Yordamchi</h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 12 }}>
        {messages.length === 0 && (
          <div className="card">
            <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
              Tizimdagi ma'lumotlar haqida tabiiy tilda so'rang. Namuna savollar:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {NAMUNA_SAVOLLAR.map((s) => (
                <button key={s} className="btn" style={{ justifyContent: 'flex-start' }} onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '80%', padding: '10px 14px', borderRadius: 14,
            background: m.role === 'user' ? 'var(--accent)' : 'var(--surface)',
            color: m.role === 'user' ? '#fff' : 'var(--text-primary)',
            border: m.role === 'assistant' ? '1px solid var(--border)' : 'none',
            whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.5,
          }}>
            {m.text}
          </div>
        ))}

        {loading && (
          <div className="card" style={{ alignSelf: 'flex-start', padding: '10px 14px', color: 'var(--text-secondary)', fontSize: 13 }}>
            O'ylanmoqda...
          </div>
        )}
        {error && <div className="alert alert-error">{error}</div>}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 12 }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Savolingizni yozing..."
          style={{ flex: 1, padding: '12px 16px', border: '1px solid var(--border-strong)', borderRadius: 24 }}
        />
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ borderRadius: '50%', width: 46, height: 46, padding: 0 }}>
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
