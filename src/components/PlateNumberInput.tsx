'use client';

import { useEffect, useRef, useState } from 'react';

interface PlateNumberInputProps {
  value: string;
  onChange: (value: string) => void;
}

type PlateType = 'jismoniy' | 'yuridik';

function UzFlag() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4px 6px', gap: 2 }}>
      <svg width="22" height="15" viewBox="0 0 22 15" style={{ borderRadius: 2, overflow: 'hidden', border: '0.5px solid #ddd' }}>
        <rect width="22" height="15" fill="#fff" />
        <rect width="22" height="4.6" fill="#0099B5" />
        <rect y="4.6" width="22" height="0.8" fill="#CE1126" />
        <rect y="10" width="22" height="0.8" fill="#CE1126" />
        <rect y="10.8" width="22" height="4.2" fill="#1EB53A" />
      </svg>
      <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.02em' }}>UZ</span>
    </div>
  );
}

/**
 * O'zbekiston davlat raqami — ikki format:
 *  - Jismoniy shaxs: 01 A 111 AA   (2 raqam + 1 harf + 3 raqam + 2 harf)
 *  - Yuridik shaxs:  01 111 ABC    (2 raqam + 3 raqam + 3 harf)
 * Ikkalasi ham 8 belgidan iborat, faqat guruhlanishi farq qiladi.
 * Harflar avtomatik katta harfga o'tkaziladi.
 */
export default function PlateNumberInput({ value, onChange }: PlateNumberInputProps) {
  const [plateType, setPlateType] = useState<PlateType>('jismoniy');

  const clean = (value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const [region, setRegion] = useState(clean.slice(0, 2));
  // Jismoniy: letter1(1) + digits(3) + letters2(2)
  // Yuridik:  digits(3) + letters3(3)
  const [letter1, setLetter1] = useState('');
  const [digits3, setDigits3] = useState('');
  const [letters2, setLetters2] = useState('');
  const [letters3, setLetters3] = useState('');

  const regionRef = useRef<HTMLInputElement>(null);
  const letter1Ref = useRef<HTMLInputElement>(null);
  const digits3Ref = useRef<HTMLInputElement>(null);
  const letters2Ref = useRef<HTMLInputElement>(null);
  const letters3Ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const combined = plateType === 'jismoniy'
      ? region + letter1 + digits3 + letters2
      : region + digits3 + letters3;
    onChange(combined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plateType, region, letter1, digits3, letters2, letters3]);

  function onlyDigits(s: string) { return s.replace(/\D/g, ''); }
  function onlyLetters(s: string) { return s.toUpperCase().replace(/[^A-Z]/g, ''); }

  const segStyle: React.CSSProperties = {
    textAlign: 'center', fontWeight: 700, fontSize: 17, letterSpacing: '0.04em',
    fontFamily: "'Inter', monospace", border: 'none', outline: 'none', background: 'transparent',
    padding: '0 2px', color: 'var(--text-primary)', minWidth: 0,
  };
  const divider = <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--border-strong)', margin: '6px 0' }} />;

  function switchType(t: PlateType) {
    setPlateType(t);
    setLetter1(''); setDigits3(''); setLetters2(''); setLetters3('');
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <button type="button" onClick={() => switchType('jismoniy')}
          className="btn" style={{ padding: '5px 10px', fontSize: 12.5, ...(plateType === 'jismoniy' ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' } : {}) }}>
          Jismoniy shaxs
        </button>
        <button type="button" onClick={() => switchType('yuridik')}
          className="btn" style={{ padding: '5px 10px', fontSize: 12.5, ...(plateType === 'yuridik' ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' } : {}) }}>
          Yuridik shaxs
        </button>
      </div>

      <div style={{
        display: 'inline-flex', alignItems: 'stretch', border: '2px solid var(--text-primary)',
        borderRadius: 8, overflow: 'hidden', background: '#fff', height: 46, width: '100%', maxWidth: 260,
      }}>
        <input
          ref={regionRef} value={region}
          onChange={(e) => {
            const v = onlyDigits(e.target.value).slice(0, 2);
            setRegion(v);
            if (v.length === 2) (plateType === 'jismoniy' ? letter1Ref : digits3Ref).current?.focus();
          }}
          placeholder="01" inputMode="numeric"
          style={{ ...segStyle, flex: '0 0 30px', paddingLeft: 8 }}
        />
        {divider}

        {plateType === 'jismoniy' ? (
          <>
            <input
              ref={letter1Ref} value={letter1}
              onChange={(e) => {
                const v = onlyLetters(e.target.value).slice(0, 1);
                setLetter1(v);
                if (v.length === 1) digits3Ref.current?.focus();
              }}
              onKeyDown={(e) => { if (e.key === 'Backspace' && !letter1) regionRef.current?.focus(); }}
              placeholder="A"
              style={{ ...segStyle, flex: '0 0 20px' }}
            />
            {divider}
            <input
              ref={digits3Ref} value={digits3}
              onChange={(e) => {
                const v = onlyDigits(e.target.value).slice(0, 3);
                setDigits3(v);
                if (v.length === 3) letters2Ref.current?.focus();
              }}
              onKeyDown={(e) => { if (e.key === 'Backspace' && !digits3) letter1Ref.current?.focus(); }}
              placeholder="111" inputMode="numeric"
              style={{ ...segStyle, flex: '1 1 40px' }}
            />
            {divider}
            <input
              ref={letters2Ref} value={letters2}
              onChange={(e) => setLetters2(onlyLetters(e.target.value).slice(0, 2))}
              onKeyDown={(e) => { if (e.key === 'Backspace' && !letters2) digits3Ref.current?.focus(); }}
              placeholder="AA"
              style={{ ...segStyle, flex: '0 0 34px' }}
            />
          </>
        ) : (
          <>
            <input
              ref={digits3Ref} value={digits3}
              onChange={(e) => {
                const v = onlyDigits(e.target.value).slice(0, 3);
                setDigits3(v);
                if (v.length === 3) letters3Ref.current?.focus();
              }}
              onKeyDown={(e) => { if (e.key === 'Backspace' && !digits3) regionRef.current?.focus(); }}
              placeholder="111" inputMode="numeric"
              style={{ ...segStyle, flex: '1 1 44px' }}
            />
            {divider}
            <input
              ref={letters3Ref} value={letters3}
              onChange={(e) => setLetters3(onlyLetters(e.target.value).slice(0, 3))}
              onKeyDown={(e) => { if (e.key === 'Backspace' && !letters3) digits3Ref.current?.focus(); }}
              placeholder="ABC"
              style={{ ...segStyle, flex: '0 0 46px' }}
            />
          </>
        )}

        {divider}
        <UzFlag />
      </div>
    </div>
  );
}
