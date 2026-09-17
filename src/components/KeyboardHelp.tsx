import { SHORTCUTS } from '../lib/shortcuts';

export function KeyboardHelp({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="help-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="キーボードショートカット"
      onClick={onClose}
    >
      <div className="help-panel" onClick={(e) => e.stopPropagation()}>
        <div className="help-head">
          <h2 className="help-title">キーボード</h2>
          <button type="button" className="ghost-btn" onClick={onClose} autoFocus>
            閉じる
          </button>
        </div>
        <dl className="help-list">
          {SHORTCUTS.map((shortcut) => (
            <div key={shortcut.keys} className="help-row">
              <dt className="help-keys">{shortcut.keys}</dt>
              <dd className="help-label">{shortcut.label}</dd>
            </div>
          ))}
        </dl>
        <p className="muted help-foot">
          Windows / Linux では ⌘ を Ctrl、⌥ を Alt に読み替えてください。
        </p>
      </div>
    </div>
  );
}
