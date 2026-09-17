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
  const draftRef = useRef<HTMLInputElement | null>(null);
  const label = formatEstimate(estimate);

  const commit = () => {
    const parsed = parseEstimate(draftRef.current?.value ?? '');
    // 読めない入力は捨てて、いまの値のままにする
    if (parsed !== null) onSave(parsed);
    onEditingChange(false);
  };

  if (isEditing) {
    return (
      <input
        ref={draftRef}
        autoFocus
        className="estimate-input"
        defaultValue={estimateInputValue(estimate)}
        placeholder="30 / 1.5h"
        aria-label="作業想定時間（30 / 45m / 1.5h / 1h30）"
        onFocus={(e) => e.currentTarget.select()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing || e.keyCode === 229) return;
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
            return;
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            onEditingChange(false);
          }
        }}
      />
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
