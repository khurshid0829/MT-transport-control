/** Sonni probel bilan ajratilgan holda formatlaydi: 1000 -> "1 000" */
export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(num)) return '';
  return num.toLocaleString('ru-RU').replace(/,/g, ' ');
}

/** Formatlangan matnni (probellar bilan) sonli qiymatga qaytaradi. */
export function parseFormattedNumber(text: string): number {
  const cleaned = text.replace(/\s/g, '').replace(/[^\d.-]/g, '');
  const num = Number(cleaned);
  return Number.isNaN(num) ? 0 : num;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'short', day: 'numeric' });
}
