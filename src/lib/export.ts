import * as XLSX from 'xlsx';

/**
 * Har qanday obyektlar massivini Excel (.xlsx) fayl sifatida yuklab beradi.
 * Mijoz tomonida (client-side) ishlaydi — serverga hech narsa yuborilmaydi.
 */
export function exportToExcel(rows: any[], fileName: string, sheetName = 'Hisobot') {
  if (rows.length === 0) return;
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName.endsWith('.xlsx') ? fileName : fileName + '.xlsx');
}
