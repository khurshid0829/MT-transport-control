'use client';

import { useRef } from 'react';
import { formatNumber, parseFormattedNumber } from '@/lib/format';

interface NumberInputProps {
  value: number | string;
  onChange: (value: number) => void;
  placeholder?: string;
  required?: boolean;
}

/**
 * Raqam kiritish uchun maxsus input — "1 000" ko'rinishida formatlaydi,
 * lekin kursor pozitsiyasini SINXRON (bir xil hodisa ichida) to'g'irlaydi.
 *
 * MUHIM (tuzatish): avvalgi versiya kursorni requestAnimationFrame orqali
 * KEYINROQ tuzatishga urinar edi — lekin React controlled input'ni qayta
 * render qilganda brauzer kursorni avtomatik oxiriga surib qo'yadi, va bu
 * bizning tuzatishimizdan OLDIN sodir bo'lardi (poyga holati/race condition).
 * Natijada raqamlar noto'g'ri joyga qo'shilib, masalan "1989" o'rniga
 * "0189" chiqardi. Endi formatlash VA kursorni joylashtirish bitta
 * sinxron funksiyada, DOM'ga to'g'ridan-to'g'ri, React qayta render
 * qilishidan OLDIN amalga oshiriladi — shu bilan poyga holati yo'qoladi.
 */
export default function NumberInput({ value, onChange, placeholder, required }: NumberInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const displayValue = formatNumber(value);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const cursor = input.selectionStart ?? input.value.length;
    const digitsBeforeCursor = input.value.slice(0, cursor).replace(/\D/g, '').length;

    const numeric = parseFormattedNumber(input.value);
    const formatted = formatNumber(numeric);

    // DOM'ni darhol (sinxron) to'g'irlaymiz — React keyinroq qayta render
    // qilganda qiymat allaqachon bir xil bo'lgani uchun kursorga tegmaydi.
    input.value = formatted;
    let pos = 0;
    if (digitsBeforeCursor > 0) {
      pos = formatted.length;
      let count = 0;
      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) count++;
        if (count >= digitsBeforeCursor) { pos = i + 1; break; }
      }
    }
    input.setSelectionRange(pos, pos);

    onChange(numeric);
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
    />
  );
}
