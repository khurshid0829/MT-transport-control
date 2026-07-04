'use client';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
}

function formatUzDigits(digits: string): string {
  const parts = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)].filter(Boolean);
  return parts.join(' ');
}

/**
 * O'zbekiston telefon raqami formati: doimiy "+998" prefiksi + "XX XXX XX XX"
 * ko'rinishida avtomatik formatlanadi (Yandex/mahalliy ilovalar uslubida).
 */
export default function PhoneInput({ value, onChange }: PhoneInputProps) {
  const rawDigits = (value || '').replace(/\D/g, '').replace(/^998/, '').slice(0, 9);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
    onChange('+998 ' + formatUzDigits(digits));
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', border: '1px solid var(--border-strong)',
      borderRadius: 'var(--radius)', overflow: 'hidden', background: 'var(--surface)',
    }}>
      <span style={{
        padding: '12px 12px', background: 'var(--bg)', color: 'var(--text-secondary)',
        fontWeight: 600, fontSize: 16, borderRight: '1px solid var(--border-strong)', flexShrink: 0,
      }}>
        +998
      </span>
      <input
        type="tel"
        inputMode="numeric"
        value={formatUzDigits(rawDigits)}
        onChange={handleChange}
        placeholder="90 123 45 67"
        style={{ border: 'none', outline: 'none', padding: '12px', flex: 1, background: 'transparent', minWidth: 0 }}
      />
    </div>
  );
}
