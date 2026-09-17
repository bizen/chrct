/** ローカルタイムゾーンの YYYY-MM-DD */
export function localDateString(from: number = Date.now()): string {
  const d = new Date(from);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
