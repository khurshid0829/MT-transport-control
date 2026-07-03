'use client';

import { useEffect, useRef, useState } from 'react';

interface PlateNumberInputProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * O'zbekiston davlat raqami formatiga mos input: 01 A 111 AA
 * (2 raqam — viloyat kodi, 1 harf, 3 raqam, 2 harf).
 * Harflar avtomatik katta harfga o'tkaziladi (O'zbekistonda shunday).
 * Har bir segment to'lganda kursor avtomatik keyingisiga o'tadi.
 */
export default function PlateNumberInput({ value, onChange }: PlateNumberInputProps) {
  const clean = (value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  const [region, setRegion] = useState(clean.slice(0, 2));
  const [letter1, setLetter1] = useState(clean.slice(2, 3));
  const [digits, setDigits] = useState(clean.slice(3, 6));
  const [letters2, setLetters2] = useState(clean.slice(6, 8));

  const regionRef = useRef<HTMLInputElement>(null);
  const letter1Ref = useRef<HTMLInputElement>(null);
  const digitsRef = useRef<HTMLInputElement>(null);
  const letters2Ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onChange(region + letter1 + digits + letters2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, letter1, digits, letters2]);

  function onlyDigits(s: string) { return s.replace(/\D/g, ''); }
  function onlyLetters(s: string) { return s.toUpperCase().replace(/[^A-Z]/g, ''); }

  const segmentStyle: React.CSSProperties = {
    textAlign: 'center', fontWeight: 700, fontSize: 17, letterSpacing: '0.05em',
    fontFamily: "'Inter', monospace", border: 'none', outline: 'none', background: 'transparent',
    width: '100%', padding: 0, color: 'var(--text-primary)',
  };

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'stretch', border: '2px solid var(--text-primary)',
      borderRadius: 8, overflow: 'hidden', background: '#fff', height: 44,
    }}>
      <input
        ref={regionRef}
        value={region}
        onChange={(e) => {
          const v = onlyDigits(e.target.value).slice(0, 2);
          setRegion(v);
          if (v.length === 2) letter1Ref.current?.focus();
        }}
        placeholder="01"
        inputMode="numeric"
        style={{ ...segmentStyle, width: 34, paddingLeft: 8 }}
      />
      <div style={{ width: 1, background: 'var(--border-strong)' }} />
      <input
        ref={letter1Ref}
        value={letter1}
        onChange={(e) => {
          const v = onlyLetters(e.target.value).slice(0, 1);
          setLetter1(v);
          if (v.length === 1) digitsRef.current?.focus();
        }}
        onKeyDown={(e) => { if (e.key === 'Backspace' && !letter1) regionRef.current?.focus(); }}
        placeholder="A"
        style={{ ...segmentStyle, width: 24 }}
      />
      <div style={{ width: 1, background: 'var(--border-strong)' }} />
      <input
        ref={digitsRef}
        value={digits}
        onChange={(e) => {
          const v = onlyDigits(e.target.value).slice(0, 3);
          setDigits(v);
          if (v.length === 3) letters2Ref.current?.focus();
        }}
        onKeyDown={(e) => { if (e.key === 'Backspace' && !digits) letter1Ref.current?.focus(); }}
        placeholder="111"
        inputMode="numeric"
        style={{ ...segmentStyle, width: 44 }}
      />
      <div style={{ width: 1, background: 'var(--border-strong)' }} />
      <input
        ref={letters2Ref}
        value={letters2}
        onChange={(e) => setLetters2(onlyLetters(e.target.value).slice(0, 2))}
        onKeyDown={(e) => { if (e.key === 'Backspace' && !letters2) digitsRef.current?.focus(); }}
        placeholder="AA"
        style={{ ...segmentStyle, width: 40, paddingRight: 8 }}
      />
      {/* O'zbekiston bayrog'i uslubidagi kichik chiziq — plastinka hissi uchun */}
      <div style={{ display: 'flex', flexDirection: 'column', width: 6 }}>
        <div style={{ flex: 1, background: '#1EB53A' }} />
        <div style={{ flex: 1, background: '#fff' }} />
        <div style={{ flex: 1, background: '#0099B5' }} />
      </div>
    </div>
  );
}
