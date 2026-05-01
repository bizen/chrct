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
import { useState } from 'react';
import { api } from '../../convex/_generated/api';
import type { Doc, Id } from '../../convex/_generated/dataModel';
import { isCloudConfigured } from '../lib/cloudConfig';

type QuestKind = 'main' | 'tanomi';
type Task = Doc<'tasks'>;

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
              <button className="primary-btn">sign in</button>
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
  const tasks = useQuery(api.tasks.list);
  const create = useMutation(api.tasks.create);
  const clearCompleted = useMutation(api.tasks.clearCompleted);
  const reorder = useMutation(api.tasks.reorder).withOptimisticUpdate(
    (localStore, { orderedIds }) => {
      const current = localStore.getQuery(api.tasks.list, {});
      if (!current) return;
      const byId = new Map(current.map((t) => [t._id, t]));
      const next: Task[] = [];
      orderedIds.forEach((id, i) => {
        const t = byId.get(id);
        if (t) next.push({ ...t, order: i });
      });
      localStore.setQuery(api.tasks.list, {}, next);
    }
  );

  const [draft, setDraft] = useState('');

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    await create({ text });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !tasks) return;
    const oldIndex = tasks.findIndex((t) => t._id === active.id);
    const newIndex = tasks.findIndex((t) => t._id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const orderedIds = arrayMove(tasks, oldIndex, newIndex).map((t) => t._id);
    reorder({ orderedIds });
  };

  const remaining = tasks?.filter((t) => !t.done).length ?? 0;
  const completed = tasks?.filter((t) => t.done).length ?? 0;

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
        <button className="primary-btn" type="submit" disabled={!draft.trim()}>
          add
        </button>
      </form>

      {tasks === undefined ? (
        <div className="notice muted">loading...</div>
      ) : tasks.length === 0 ? (
        <div className="notice muted">タスクはまだありません。</div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={tasks.map((t) => t._id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="task-list">
              {tasks.map((t) => (
                <SortableTaskItem key={t._id} task={t} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {tasks && tasks.length > 0 && (
        <div className="task-footer">
          <span className="muted">
            {remaining} 件残り / {completed} 件完了
          </span>
          {completed > 0 && (
            <button className="ghost-btn" onClick={() => clearCompleted({})}>
              完了を削除
            </button>
          )}
        </div>
      )}
    </>
  );
}

function SortableTaskItem({ task }: { task: Task }) {
  const toggle = useMutation(api.tasks.toggle);
  const remove = useMutation(api.tasks.remove);
  const setKind = useMutation(api.tasks.setKind);
  const updateText = useMutation(api.tasks.updateText);

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(task.text);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task._id, disabled: isEditing });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  const startEdit = () => {
    setDraft(task.text);
    setIsEditing(true);
  };

  const commitEdit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== task.text) {
      updateText({ id: task._id as Id<'tasks'>, text: trimmed });
    }
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setDraft(task.text);
    setIsEditing(false);
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`task-item ${task.done ? 'done' : ''} ${isDragging ? 'dragging' : ''}`}
    >
      <button
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
      {isEditing ? (
        <input
          autoFocus
          className="task-text-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing || e.keyCode === 229) return;
            if (e.key === 'Enter') {
              e.preventDefault();
              commitEdit();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              cancelEdit();
            }
          }}
        />
      ) : (
        <span
          className="task-text"
          onClick={startEdit}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              startEdit();
            }
          }}
        >
          {task.text}
        </span>
      )}
      <button
        className="icon-btn drag-handle"
        aria-label="並び替え"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>
      <button
        className="icon-btn"
        onClick={() => remove({ id: task._id as Id<'tasks'> })}
        aria-label="削除"
      >
        <Trash2 size={16} />
      </button>
    </li>
  );
}
