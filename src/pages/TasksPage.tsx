import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQuery } from 'convex/react';
import { Check, GripVertical, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../convex/_generated/api';
import type { Doc, Id } from '../../convex/_generated/dataModel';
import { isCloudConfigured } from '../lib/cloudConfig';

type QuestKind = 'main' | 'tanomi';
type Task = Doc<'tasks'>;

type ListRow =
  | { kind: 'task'; entryId: Id<'taskListEntries'>; task: Task }
  | { kind: 'section'; entryId: Id<'taskListEntries'>; sectionTitle: string };

const QUEST_IMG: Record<QuestKind, string> = {
  main: '/quests/mainquest.png',
  tanomi: '/quests/tanomigoto.png',
};

const QUEST_LABEL: Record<QuestKind, string> = {
  main: 'メインクエスト',
  tanomi: '頼みごと',
};

function nextKind(kind: QuestKind | undefined): QuestKind | undefined {
  if (kind === undefined) return 'main';
  if (kind === 'main') return 'tanomi';
  return undefined;
}

interface QuestIconProps {
  kind: QuestKind | undefined;
  onCycle: () => void;
}

function QuestIcon({ kind, onCycle }: QuestIconProps) {
  const label = kind ? QUEST_LABEL[kind] : 'クエスト種別を選択';
  return (
    <button
      type="button"
      className={`quest-icon quest-icon-md${kind ? ' has-kind' : ''}`}
      onClick={onCycle}
      aria-label={label}
      title={label}
    >
      {kind ? (
        <img src={QUEST_IMG[kind]} alt="" />
      ) : (
        <span className="quest-icon-empty">+</span>
      )}
    </button>
  );
}

function SectionLabelField({
  entryId,
  sectionTitle,
}: {
  entryId: Id<'taskListEntries'>;
  sectionTitle: string;
}) {
  const updateTitle = useMutation(api.taskList.updateSectionTitle);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(sectionTitle);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== sectionTitle) {
      void updateTitle({ entryId, title: trimmed });
    }
    setDraft(sectionTitle);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        className="task-section-label-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing || e.keyCode === 229) return;
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setDraft(sectionTitle);
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <span
      className="task-section-label-text"
      onClick={() => {
        setDraft(sectionTitle);
        setEditing(true);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setDraft(sectionTitle);
          setEditing(true);
        }
      }}
    >
      {sectionTitle}
    </span>
  );
}

function SortableSectionRow({ row }: { row: Extract<ListRow, { kind: 'section' }> }) {
  const removeEntry = useMutation(api.taskList.removeEntry);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.entryId });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 5 : undefined,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`task-section-row ${isDragging ? 'dragging' : ''}`}
    >
      <div className="task-section-row-inner">
        <span className="task-section-row-lead" aria-hidden />
        <SectionLabelField entryId={row.entryId} sectionTitle={row.sectionTitle} />
        <button
          type="button"
          className="icon-btn drag-handle"
          aria-label="見出しの位置を変える"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label="見出しを削除"
          onClick={() => removeEntry({ entryId: row.entryId })}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </li>
  );
}

export function TasksPage() {
  if (!isCloudConfigured) {
    return (
      <section className="page">
        <div className="page-header">
          <h1 className="page-title">tasks</h1>
        </div>
        <div className="notice">
          <p>クラウド同期が未設定です。</p>
          <p>
            <code>VITE_CONVEX_URL</code> と <code>VITE_CLERK_PUBLISHABLE_KEY</code> を
            <code>.env.local</code> に追加してください。
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="page-header">
        <h1 className="page-title">tasks</h1>
        <div className="page-header-actions">
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button type="button" className="primary-btn">
                sign in
              </button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>

      <SignedOut>
        <div className="notice">サインインするとタスクを保存できます。</div>
      </SignedOut>

      <SignedIn>
        <TaskList />
      </SignedIn>
    </section>
  );
}

function TaskList() {
  const rows = useQuery(api.taskList.list);
  const bootstrap = useMutation(api.taskList.bootstrapIfNeeded);
  const addTask = useMutation(api.taskList.addTask);
  const addSection = useMutation(api.taskList.addSection);
  const clearCompleted = useMutation(api.taskList.clearCompleted);

  const reorderEntries = useMutation(api.taskList.reorderEntries).withOptimisticUpdate(
    (localStore, { orderedEntryIds }) => {
      const cur = localStore.getQuery(api.taskList.list, {});
      if (!cur) return;
      const byId = new Map(cur.map((r) => [r.entryId, r]));
      const next: ListRow[] = [];
      for (const id of orderedEntryIds) {
        const r = byId.get(id);
        if (r) next.push(r);
      }
      localStore.setQuery(api.taskList.list, {}, next);
    }
  );

  useEffect(() => {
    if (rows !== undefined) {
      void bootstrap({});
    }
  }, [rows, bootstrap]);

  const [draft, setDraft] = useState('');

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    await addTask({ text });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const entryIds = useMemo(() => rows?.map((r) => r.entryId) ?? [], [rows]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !rows) return;
    const a = String(active.id);
    const o = String(over.id);
    if (a === o) return;
    const oldIndex = entryIds.indexOf(a as Id<'taskListEntries'>);
    const newIndex = entryIds.indexOf(o as Id<'taskListEntries'>);
    if (oldIndex < 0 || newIndex < 0) return;
    void reorderEntries({
      orderedEntryIds: arrayMove(entryIds, oldIndex, newIndex),
    });
  };

  const tasksInList = useMemo(
    () => (rows ?? []).filter((r): r is Extract<ListRow, { kind: 'task' }> => r.kind === 'task'),
    [rows]
  );
  const remaining = tasksInList.filter((r) => !r.task.done).length;
  const completed = tasksInList.filter((r) => r.task.done).length;

  const loading = rows === undefined;

  return (
    <>
      <form className="task-input-row" onSubmit={submit}>
        <input
          className="task-input"
          placeholder="新しいタスク..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing || e.keyCode === 229) return;
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button type="submit" className="primary-btn" disabled={!draft.trim()}>
          add
        </button>
      </form>

      {loading ? (
        <div className="notice muted">loading...</div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={entryIds} strategy={verticalListSortingStrategy}>
            <ul className="task-list task-list-unified">
              {(rows ?? []).map((row) =>
                row.kind === 'section' ? (
                  <SortableSectionRow key={row.entryId} row={row} />
                ) : (
                  <SortableTaskItem key={row.entryId} task={row.task} entryId={row.entryId} />
                )
              )}
              {rows.length === 0 && (
                <li className="task-list-empty muted">タスクはまだありません。</li>
              )}
            </ul>
          </SortableContext>

          <div className="task-add-block-wrap">
            <button
              type="button"
              className="ghost-btn task-add-block-btn"
              onClick={() => void addSection({})}
            >
              + 見出しを追加
            </button>
          </div>
        </DndContext>
      )}

      {tasksInList.length > 0 && (
        <div className="task-footer">
          <span className="muted">
            {remaining} 件残り / {completed} 件完了
          </span>
          {completed > 0 && (
            <button type="button" className="ghost-btn" onClick={() => clearCompleted({})}>
              完了を削除
            </button>
          )}
        </div>
      )}
    </>
  );
}

function SortableTaskItem({
  task,
  entryId,
}: {
  task: Task;
  entryId: Id<'taskListEntries'>;
}) {
  const toggle = useMutation(api.tasks.toggle);
  const removeEntry = useMutation(api.taskList.removeEntry);
  const setKind = useMutation(api.tasks.setKind);
  const updateText = useMutation(api.tasks.updateText);
  const updateSummary = useMutation(api.tasks.updateSummary);

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(task.text);
  const [summaryDraft, setSummaryDraft] = useState(task.summary ?? '');
  const [summaryFieldVisible, setSummaryFieldVisible] = useState(false);
  const summaryTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editStackRef = useRef<HTMLDivElement | null>(null);
  const editModeRef = useRef(false);

  const startEdit = () => {
    editModeRef.current = true;
    setDraft(task.text);
    setSummaryDraft(task.summary ?? '');
    setSummaryFieldVisible(!!task.summary?.trim());
    setIsEditing(true);
  };

  const cancelEdit = useCallback(() => {
    editModeRef.current = false;
    setDraft(task.text);
    setSummaryDraft(task.summary ?? '');
    setSummaryFieldVisible(false);
    setIsEditing(false);
  }, [task.summary, task.text]);

  const commitAll = useCallback(() => {
    if (!editModeRef.current) return;
    editModeRef.current = false;
    setSummaryFieldVisible(false);

    const titleTrim = draft.trim();
    if (titleTrim && titleTrim !== task.text) {
      updateText({ id: task._id as Id<'tasks'>, text: titleTrim });
    }
    const prevSum = (task.summary ?? '').trim();
    const nextSum = summaryDraft.trim();
    if (nextSum !== prevSum) {
      void updateSummary({ id: task._id as Id<'tasks'>, summary: summaryDraft });
    }
    setIsEditing(false);
  }, [draft, summaryDraft, task._id, task.summary, task.text, updateText, updateSummary]);

  const handleEditStackBlur = useCallback(() => {
    requestAnimationFrame(() => {
      if (!editModeRef.current) return;
      const stack = editStackRef.current;
      if (stack?.contains(document.activeElement)) return;
      commitAll();
    });
  }, [commitAll]);

  useEffect(() => {
    if (!isEditing || !summaryFieldVisible) return;
    summaryTextareaRef.current?.focus();
  }, [isEditing, summaryFieldVisible]);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: entryId, disabled: isEditing });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  const openTextOrSummary = () => {
    startEdit();
  };

  const isTitleOnlyRow =
    (!isEditing && !task.summary?.trim()) || (isEditing && !summaryFieldVisible);

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`task-item ${task.done ? 'done' : ''} ${isDragging ? 'dragging' : ''}`}
    >
        <div className={`task-item-top${isTitleOnlyRow ? ' task-item-top--vcenter' : ''}`}>
        <button
          type="button"
          className={`check-btn ${task.done ? 'checked' : ''}`}
          onClick={() => toggle({ id: task._id as Id<'tasks'> })}
          aria-label={task.done ? '未完了に戻す' : '完了'}
        >
          {task.done && <Check size={14} strokeWidth={3} />}
        </button>
        <QuestIcon
          kind={task.kind}
          onCycle={() =>
            setKind({ id: task._id as Id<'tasks'>, kind: nextKind(task.kind) })
          }
        />
        <div className="task-item-text-stack">
          {isEditing ? (
            <div ref={editStackRef} className="task-edit-stack">
              <input
                autoFocus
                className="task-text-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onFocus={(e) => e.currentTarget.select()}
                onBlur={handleEditStackBlur}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelEdit();
                    return;
                  }
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    commitAll();
                    return;
                  }
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setSummaryFieldVisible(true);
                  }
                }}
              />
              {summaryFieldVisible ? (
              <textarea
                ref={summaryTextareaRef}
                className="task-summary-input task-summary-input-edit"
                placeholder="概要・メモ（改行可／⌘+Enter または Ctrl+Enter で保存）"
                value={summaryDraft}
                onChange={(e) => setSummaryDraft(e.target.value)}
                onBlur={handleEditStackBlur}
                rows={3}
                aria-label="タスクの概要"
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelEdit();
                    return;
                  }
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    commitAll();
                  }
                }}
              />
              ) : null}
            </div>
          ) : (
            <div
              className="task-readonly-stack"
              onClick={openTextOrSummary}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  startEdit();
                }
              }}
              role="button"
              tabIndex={0}
            >
              <span className="task-text task-text-readonly">{task.text}</span>
              {task.summary?.trim() ? (
                <p className="task-summary-display">{task.summary}</p>
              ) : null}
            </div>
          )}
        </div>
        <button
          type="button"
          className="icon-btn drag-handle"
          aria-label="並び替え"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={() => removeEntry({ entryId })}
          aria-label="削除"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </li>
  );
}
