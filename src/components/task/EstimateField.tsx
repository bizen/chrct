import { useRef } from 'react';
import { estimateInputValue, formatEstimate, parseEstimate } from '../../lib/taskEstimate';

/**
 * 作業想定時間。ふだんは小さな数字、押すとその場が入力欄になる。
 * 期限のときのようなポップオーバーは要らないので、行の中で完結させる。
 */
export function EstimateField({
  estimate,
  isEditing,
  onSave,
  onEditingChange,
  dataMeta,
  onChipKeyDown,
  onChipFocus,
}: {
  estimate?: number;
  isEditing: boolean;
  onSave: (estimate: number | undefined) => void;
  /** false で閉じたとき、呼び出し側がフォーカスを戻す */
  onEditingChange: (editing: boolean) => void;
  dataMeta?: string;
  onChipKeyDown?: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  onChipFocus?: () => void;
}) {
  const label = formatEstimate(estimate);

  if (isEditing) {
    return (
      <EstimateInput estimate={estimate} onSave={onSave} onClose={() => onEditingChange(false)} />
    );
  }

  return (
    <button
      type="button"
      data-meta={dataMeta}
      className={`estimate-chip${label ? ' has-estimate' : ''}`}
      onClick={() => onEditingChange(true)}
      onKeyDown={onChipKeyDown}
      onFocus={onChipFocus}
      tabIndex={-1}
      aria-label="作業想定時間を編集"
      title={label ? `作業想定時間 ${label}（⌥E）` : '作業想定時間（⌥E）'}
    >
      {label || '–'}
    </button>
  );
}

/**
 * 編集中だけマウントされる。
 *
 * 閉じると呼び出し側が同期的にフォーカスを戻すので、そのとき blur が先に走る。
 * Esc で閉じたのに blur の保存が動いてしまわないよう、一度きりの締めにしている。
 */
function EstimateInput({
  estimate,
  onSave,
  onClose,
}: {
  estimate?: number;
  onSave: (estimate: number | undefined) => void;
  onClose: () => void;
}) {
  const finished = useRef(false);

  const finish = (save: boolean, el: HTMLInputElement | null) => {
    if (finished.current) return;
    finished.current = true;
    if (save && el) {
      const parsed = parseEstimate(el.value);
      // 読めない入力は捨てて、いまの値のままにする
      if (parsed !== null) onSave(parsed);
    }
    onClose();
  };

  return (
    <input
      autoFocus
      className="estimate-input"
      defaultValue={estimateInputValue(estimate)}
      placeholder="30 / 1.5h"
      aria-label="作業想定時間（30 / 45m / 1.5h / 1h30）"
      onFocus={(e) => e.currentTarget.select()}
      onBlur={(e) => finish(true, e.currentTarget)}
      onKeyDown={(e) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return;
        if (e.key === 'Enter') {
          e.preventDefault();
          finish(true, e.currentTarget);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          finish(false, null);
        }
      }}
    />
  );
}
