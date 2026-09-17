import { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LABEL_COLORS, LABEL_COLOR_KEYS, type LabelColor } from '../../lib/taskModel';

const POPOVER_WIDTH = 176;
const VIEWPORT_MARGIN = 8;
const ANCHOR_GAP = 6;

/**
 * ラベルの色。ふだんは丸ひとつだけ置いて、押したときに選ぶ場所を出す。
 * 行の右端をいつも6個の丸で埋めると、ラベルの行だけ騒がしくなるため。
 */
export function LabelColorPicker({
  color,
  isOpen,
  onOpenChange,
  onSelect,
  dataMeta,
  onChipKeyDown,
  onChipFocus,
}: {
  color?: LabelColor;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (color: LabelColor | undefined) => void;
  dataMeta?: string;
  onChipKeyDown?: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  onChipFocus?: () => void;
}) {
  const anchorRef = useRef<HTMLDivElement | null>(null);

  return (
    <div ref={anchorRef} className="label-color">
      <button
        type="button"
        data-meta={dataMeta}
        className={`color-dot${color ? ' is-set' : ''}`}
        style={color ? ({ '--swatch': LABEL_COLORS[color] } as React.CSSProperties) : undefined}
        onClick={() => onOpenChange(!isOpen)}
        onKeyDown={onChipKeyDown}
        onFocus={onChipFocus}
        tabIndex={-1}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="ラベルの色を選ぶ"
        title="ラベルの色（⌥M でも切り替えられます）"
      />
      {isOpen ? (
        <ColorPopover
          anchorRef={anchorRef}
          color={color}
          onSelect={(next) => {
            onSelect(next);
            onOpenChange(false);
          }}
          onClose={() => onOpenChange(false)}
        />
      ) : null}
    </div>
  );
}

function ColorPopover({
  anchorRef,
  color,
  onSelect,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLDivElement | null>;
  color?: LabelColor;
  onSelect: (color: LabelColor | undefined) => void;
  onClose: () => void;
}) {
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // 位置が決まって見える状態になってから、いまの色にフォーカスを置く
  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const popover = popoverRef.current;
    if (!anchor || !popover) return;

    const rect = anchor.getBoundingClientRect();
    const left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(
        rect.right - POPOVER_WIDTH,
        window.innerWidth - POPOVER_WIDTH - VIEWPORT_MARGIN
      )
    );
    let top = rect.bottom + ANCHOR_GAP;
    if (top + popover.offsetHeight > window.innerHeight - VIEWPORT_MARGIN) {
      top = rect.top - popover.offsetHeight - ANCHOR_GAP;
    }
    popover.style.position = 'fixed';
    popover.style.top = `${Math.max(VIEWPORT_MARGIN, top)}px`;
    popover.style.left = `${left}px`;
    popover.style.visibility = 'visible';

    const current =
      popover.querySelector<HTMLElement>('.swatch.is-on') ??
      popover.querySelector<HTMLElement>('.swatch');
    current?.focus();
  }, [anchorRef]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [anchorRef, onClose]);

  const step = (from: HTMLElement, direction: -1 | 1) => {
    const all = Array.from(
      popoverRef.current?.querySelectorAll<HTMLElement>('.swatch') ?? []
    );
    const next = all[all.indexOf(from) + direction];
    next?.focus();
  };

  return createPortal(
    <div
      ref={popoverRef}
      className="color-popover"
      role="group"
      aria-label="ラベルの色"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onClose();
          return;
        }
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          e.stopPropagation();
          step(e.target as HTMLElement, e.key === 'ArrowRight' ? 1 : -1);
        }
      }}
    >
      <button
        type="button"
        className={`swatch swatch--none${color ? '' : ' is-on'}`}
        onClick={() => onSelect(undefined)}
        aria-pressed={!color}
        aria-label="色なし"
        title="色なし"
      />
      {LABEL_COLOR_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          className={`swatch${color === key ? ' is-on' : ''}`}
          style={{ '--swatch': LABEL_COLORS[key] } as React.CSSProperties}
          onClick={() => onSelect(key)}
          aria-pressed={color === key}
          aria-label={key}
          title={key}
        />
      ))}
    </div>,
    document.body
  );
}
