'use client';

import { useEffect, useRef, useState } from 'react';

interface PlateNumberInputProps {
  value: string;
  onChange: (value: string) => void;
}

type PlateType = 'jismoniy' | 'yuridik';

function UzFlag() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 10px', gap: 3, flexShrink: 0 }}>
      <svg width="24" height="16" viewBox="0 0 24 16" style={{ borderRadius: 2, overflow: 'hidden', border: '0.5px solid #ddd' }}>
        <rect width="24" height="16" fill="#fff" />
        <rect width="24" height="5" fill="#0099B5" />
        <rect y="5" width="24" height="0.9" fill="#CE1126" />
        <rect y="10.1" width="24" height="0.9" fill="#CE1126" />
        <rect y="11" width="24" height="5" fill="#1EB53A" />
      </svg>
      <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.02em' }}>UZ</span>
    </div>
  );
}

/**
 * O'zbekiston davlat raqami — ikki format:
 *  - Jismoniy shaxs: 01 A 111 AA   (2 raqam + 1 harf + 3 raqam + 2 harf)
 *  - Yuridik shaxs:  01 111 ABC    (2 raqam + 3 raqam + 3 harf)
 *
 * MUHIM (tuzatish): har bir segment endi FIKS piksel kenglikka ega
 * (flex-grow YO'Q) — shu bilan "50" kabi qiymat sig'may qolishi yoki
 * "111" ortiqcha joy egallab ketishi (nosimmetriklik) bartaraf etildi.
 * Konteyner o'zi ("fit-content") aynan segmentlar yig'indisiga teng
 * bo'ladi, ortiqcha bo'sh joy cho'zilmaydi.
 */
export default function PlateNumberInput({ value, onChange }: PlateNumberInputProps) {
  const [plateType, setPlateType] = useState<PlateType>('jismoniy');

  const clean = (value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const [region, setRegion] = useState(clean.slice(0, 2));
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

  function segStyle(width: number): React.CSSProperties {
    return {
      textAlign: 'center', fontWeight: 700, fontSize: 18, letterSpacing: '0.02em',
      fontFamily: "'Inter', monospace", border: 'none', outline: 'none', background: 'transparent',
      padding: 0, color: 'var(--text-primary)', flex: `0 0 ${width}px`, width: `${width}px`,
    };
  }
  const divider = <div style={{ width: 1, alignSelf: 'stretch', margin: '8px 0', background: 'var(--border-strong)', flexShrink: 0 }} />;

  function switchType(t: PlateType) {
    setPlateType(t);
    setLetter1(''); setDigits3(''); setLetters2(''); setLetters3('');
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button type="button" onClick={() => switchType('jismoniy')}
          className={'btn' + (plateType === 'jismoniy' ? ' btn-primary' : '')} style={{ padding: '6px 12px', fontSize: 13 }}>
          Jismoniy shaxs
        </button>
        <button type="button" onClick={() => switchType('yuridik')}
          className={'btn' + (plateType === 'yuridik' ? ' btn-primary' : '')} style={{ padding: '6px 12px', fontSize: 13 }}>
          Yuridik shaxs
        </button>
      </div>

      <div style={{
        display: 'inline-flex', alignItems: 'stretch', border: '2px solid #2A3140',
        borderRadius: 10, overflow: 'hidden', background: '#fff', height: 50, width: 'fit-content', maxWidth: '100%',
      }}>
        <input
          ref={regionRef} value={region}
          onChange={(e) => {
            const v = onlyDigits(e.target.value).slice(0, 2);
            setRegion(v);
            if (v.length === 2) (plateType === 'jismoniy' ? letter1Ref : digits3Ref).current?.focus();
          }}
          placeholder="01" inputMode="numeric"
          style={{ ...segStyle(38), paddingLeft: 10 }}
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
              style={segStyle(26)}
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
              style={segStyle(54)}
            />
            {divider}
            <input
              ref={letters2Ref} value={letters2}
              onChange={(e) => setLetters2(onlyLetters(e.target.value).slice(0, 2))}
              onKeyDown={(e) => { if (e.key === 'Backspace' && !letters2) digits3Ref.current?.focus(); }}
              placeholder="AA"
              style={{ ...segStyle(42), paddingRight: 6 }}
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
              style={segStyle(56)}
            />
            {divider}
            <input
              ref={letters3Ref} value={letters3}
              onChange={(e) => setLetters3(onlyLetters(e.target.value).slice(0, 3))}
              onKeyDown={(e) => { if (e.key === 'Backspace' && !letters3) digits3Ref.current?.focus(); }}
              placeholder="ABC"
              style={{ ...segStyle(62), paddingRight: 6 }}
            />
          </>
        )}

        {divider}
        <UzFlag />
      </div>
    </div>
  );
}
