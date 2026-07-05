'use client';

import { useEffect, useRef, useState } from 'react';

interface PlateNumberInputProps {
  value: string;
  onChange: (value: string) => void;
}

type PlateType = 'jismoniy' | 'yuridik';

function UzFlag() {
  return (
    <svg width="16" height="11" viewBox="0 0 24 16" style={{ borderRadius: 2, overflow: 'hidden', border: '0.5px solid #ddd', flexShrink: 0 }}>
      <rect width="24" height="16" fill="#fff" />
      <rect width="24" height="5" fill="#0099B5" />
      <rect y="5" width="24" height="0.9" fill="#CE1126" />
      <rect y="10.1" width="24" height="0.9" fill="#CE1126" />
      <rect y="11" width="24" height="5" fill="#1EB53A" />
    </svg>
  );
}

/**
 * O'zbekiston davlat raqami — ikki format:
 *  - Jismoniy shaxs: 01 A 111 AA
 *  - Yuridik shaxs:  01 111 ABC
 *
 * TUZATISH: turi tanlash endi alohida tugmalar emas — kompakt dropdown,
 * plastinka bilan BITTA QATORDA (forma grid'idagi boshqa maydonlar bilan
 * bir xil balandlikda). Bayroqcha kichraytirildi.
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
      textAlign: 'center', fontWeight: 700, fontSize: 16, letterSpacing: '0.02em',
      fontFamily: "'Inter', monospace", border: 'none', outline: 'none', background: 'transparent',
      padding: 0, color: 'var(--text-primary)', flex: `0 0 ${width}px`, width: `${width}px`, height: '100%',
    };
  }
  const divider = <div style={{ width: 1, alignSelf: 'stretch', margin: '7px 0', background: 'var(--border-strong)', flexShrink: 0 }} />;

  function switchType(t: PlateType) {
    setPlateType(t);
    setLetter1(''); setDigits3(''); setLetters2(''); setLetters3('');
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'stretch', border: '1.5px solid #2A3140',
      borderRadius: 'var(--radius)', overflow: 'hidden', background: '#fff', height: 44, width: '100%',
    }}>
      {/* Turi tanlash — kompakt dropdown, plastinka bilan bitta qatorda */}
      <select
        value={plateType}
        onChange={(e) => switchType(e.target.value as PlateType)}
        style={{
          border: 'none', outline: 'none', background: 'var(--bg)', fontSize: 12, fontWeight: 600,
          color: 'var(--text-secondary)', padding: '0 6px', flex: '0 0 76px', height: '100%',
          borderRight: '1.5px solid #2A3140', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none',
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23667085' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E')",
          backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center', paddingRight: 16,
        }}
      >
        <option value="jismoniy">Jismoniy</option>
        <option value="yuridik">Yuridik</option>
      </select>

      <input
        ref={regionRef} value={region}
        onChange={(e) => {
          const v = onlyDigits(e.target.value).slice(0, 2);
          setRegion(v);
          if (v.length === 2) (plateType === 'jismoniy' ? letter1Ref : digits3Ref).current?.focus();
        }}
        placeholder="01" inputMode="numeric"
        style={{ ...segStyle(34), paddingLeft: 8 }}
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
            style={segStyle(22)}
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
            style={segStyle(46)}
          />
          {divider}
          <input
            ref={letters2Ref} value={letters2}
            onChange={(e) => setLetters2(onlyLetters(e.target.value).slice(0, 2))}
            onKeyDown={(e) => { if (e.key === 'Backspace' && !letters2) digits3Ref.current?.focus(); }}
            placeholder="AA"
            style={{ ...segStyle(36), paddingRight: 4 }}
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
            style={segStyle(48)}
          />
          {divider}
          <input
            ref={letters3Ref} value={letters3}
            onChange={(e) => setLetters3(onlyLetters(e.target.value).slice(0, 3))}
            onKeyDown={(e) => { if (e.key === 'Backspace' && !letters3) digits3Ref.current?.focus(); }}
            placeholder="ABC"
            style={{ ...segStyle(52), paddingRight: 4 }}
          />
        </>
      )}

      {divider}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px', flexShrink: 0 }}>
        <UzFlag />
      </div>
    </div>
  );
}
