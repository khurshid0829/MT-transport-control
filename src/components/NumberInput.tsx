'use client';

import { useRef } from 'react';
import { formatNumber, parseFormattedNumber } from '@/lib/format';

interface NumberInputProps {
  value: number | string;
  onChange: (value: number) => void;
  placeholder?: string;
  required?: boolean;
  min?: number;
}

/**
 * Raqam kiritish uchun maxsus input: foydalanuvchi yozayotganda son
 * avtomatik "1 000" ko'rinishida formatlanadi, LEKIN kursor pozitsiyasi
 * saqlanadi — ya'ni foydalanuvchi raqam o'rtasida turib yozsa, kursor
 * boshiga "sakrab" ketmaydi (talab qilingan tuzatish).
 */
export default function NumberInput({ value, onChange, placeholder, required, min }: NumberInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const displayValue = formatNumber(value);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const prevCursor = input.selectionStart ?? input.value.length;
    const prevValue = input.value;

    // Kursordan oldingi qismdagi raqamlar sonini hisoblaymiz (probel hisobga kirmaydi)
    const digitsBeforeCursor = prevValue.slice(0, prevCursor).replace(/\D/g, '').length;

    const numeric = parseFormattedNumber(prevValue);
    onChange(numeric);

    // Formatlangandan keyin, xuddi shuncha raqamdan keyingi pozitsiyaga kursorni qaytaramiz
    requestAnimationFrame(() => {
      if (!inputRef.current) return;
      const newValue = inputRef.current.value;
      let count = 0;
      let pos = 0;
      for (; pos < newValue.length; pos++) {
        if (/\d/.test(newValue[pos])) count++;
        if (count >= digitsBeforeCursor) { pos++; break; }
      }
      inputRef.current.setSelectionRange(pos, pos);
    });
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      required={required}
      data-min={min}
    />
  );
}
