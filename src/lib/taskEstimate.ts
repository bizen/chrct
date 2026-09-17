/**
 * 作業想定時間。内部では「分」の整数だけを持つ。
 *
 * 入力は打ちやすさを優先して、単位なしの整数は分として読む。
 * 時間で入れたいときだけ h を付ける（30 / 45m / 1.5h / 1h30 / 1:30）。
 */

const MAX_MINUTES = 99 * 60;

/** 有効なら分、空なら undefined、読めなければ null */
export function parseEstimate(value: string): number | undefined | null {
  const trimmed = value.trim().toLowerCase().replace(/\s+/g, '');
  if (!trimmed) return undefined;

  const clamp = (minutes: number): number | null => {
    const rounded = Math.round(minutes);
    if (!Number.isFinite(rounded) || rounded < 1) return null;
    return Math.min(rounded, MAX_MINUTES);
  };

  // 1h30 / 1時間30分 / 1:30
  const combined = trimmed.match(/^(\d+)(?:h|時間|時|:)(\d{1,2})(?:m|分)?$/);
  if (combined) {
    const minutes = Number(combined[2]);
    if (minutes > 59) return null;
    return clamp(Number(combined[1]) * 60 + minutes);
  }

  // 1.5h / 2時間
  const hours = trimmed.match(/^(\d+(?:\.\d+)?)(?:h|時間|時)$/);
  if (hours) return clamp(Number(hours[1]) * 60);

  // 45m / 45分
  const minutes = trimmed.match(/^(\d+)(?:m|分)$/);
  if (minutes) return clamp(Number(minutes[1]));

  // 単位なしは分
  const bare = trimmed.match(/^(\d+)$/);
  if (bare) return clamp(Number(bare[1]));

  return null;
}

/** 30m / 2h / 1h30 */
export function formatEstimate(minutes: number | undefined): string {
  if (minutes === undefined || minutes <= 0) return '';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

/** 編集欄に出す文字列。丸め直しで値が変わらないように format と同じ形にする */
export function estimateInputValue(minutes: number | undefined): string {
  return formatEstimate(minutes);
}
