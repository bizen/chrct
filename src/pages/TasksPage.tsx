import { SignedIn, SignedOut } from '@clerk/clerk-react';
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
import { Check, Clock3, GripVertical, ListOrdered, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../convex/_generated/api';
import type { Doc, Id } from '../../convex/_generated/dataModel';
import { isCloudConfigured } from '../lib/cloudConfig';

type QuestKind = 'main' | 'tanomi';
type Task = Doc<'tasks'>;

type ListRow =
  | { kind: 'task'; entryId: Id<'taskListEntries'>; task: Task }
  | { kind: 'section'; entryId: Id<'taskListEntries'>; sectionTitle: string };

type ScheduleHints = {
  previousEndAt?: number;
};

type StartOption = {
  at: number;
  hint?: string;
};

type TimelineItem = {
  entryId: Id<'taskListEntries'>;
  number: number;
  title: string;
  startAt: number;
  endAt: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

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

function TodayHeader({
  count,
}: {
  count: number;
}) {
  return (
    <div className="task-today-header">
      <div className="task-today-title-row">
        <div className="task-today-title">today</div>
        <div className="task-today-count" title="Today内のタスク数">
          <ListOrdered size={14} />
          <span>{count}</span>
        </div>
      </div>
    </div>
  );
}

function ceilToStep(at: number, stepMs: number): number {
  return Math.ceil(at / stepMs) * stepMs;
}

function timelineStepForSpan(span: number): number {
  const hour = 60 * 60 * 1000;
  if (span <= 6 * hour) return hour;
  if (span <= 14 * hour) return 2 * hour;
  return 4 * hour;
}

function buildTimelineTicks(startAt: number, endAt: number): number[] {
  const step = timelineStepForSpan(endAt - startAt);
  const ticks: number[] = [];
  for (let tick = ceilToStep(startAt, step); tick < endAt; tick += step) {
    ticks.push(tick);
  }
  return ticks;
}

function TodayTimeline({
  items,
  nowAt,
}: {
  items: TimelineItem[];
  nowAt: number;
}) {
  if (items.length === 0) return null;

  const starts = items.map((item) => item.startAt);
  const ends = items.map((item) => item.endAt);
  const firstStart = Math.min(...starts);
  const lastEnd = Math.max(...ends);
  const hour = 60 * 60 * 1000;
  const padding = 30 * 60 * 1000;
  const minSpan = 3 * hour;
  const rawStart = firstStart - padding;
  const rawEnd = lastEnd + padding;
  const rawSpan = rawEnd - rawStart;
  const midpoint = (firstStart + lastEnd) / 2;
  const windowStart = rawSpan < minSpan ? midpoint - minSpan / 2 : rawStart;
  const windowEnd = rawSpan < minSpan ? midpoint + minSpan / 2 : rawEnd;
  const windowSpan = windowEnd - windowStart;
  const ticks = buildTimelineTicks(windowStart, windowEnd);
  const nowTop = ((nowAt - windowStart) / windowSpan) * 100;
  const showNow = nowTop >= 0 && nowTop <= 100;

  return (
    <aside className="today-timeline" aria-label="Today timeline">
      <div className="today-timeline-title">timeline</div>
      <div className="today-timeline-track">
        {ticks.map((tick) => {
          const top = ((tick - windowStart) / windowSpan) * 100;
          return (
            <div key={tick} className="today-timeline-tick" style={{ top: `${top}%` }}>
              <span>{formatClockWithDay(tick, nowAt)}</span>
            </div>
          );
        })}
        {showNow ? (
          <div className="today-timeline-now" style={{ top: `${nowTop}%` }}>
            <span>{formatClock(nowAt)}</span>
          </div>
        ) : null}
        {items.map((item) => {
          const clampedStart = Math.max(item.startAt, windowStart);
          const clampedEnd = Math.min(item.endAt, windowEnd);
          const top = ((clampedStart - windowStart) / windowSpan) * 100;
          const height = Math.max(((clampedEnd - clampedStart) / windowSpan) * 100, 4);

          return (
            <div
              key={item.entryId}
              className="today-timeline-block"
              style={{ top: `${top}%`, height: `${height}%` }}
            >
              <span className="today-timeline-number">{item.number}</span>
              <span className="today-timeline-text">{item.title}</span>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function normalizeSchedulePart(value: string): string | undefined {
  const compact = value.trim().replace(/[：.]/g, ':');
  if (!compact) return undefined;

  const match = compact.match(/^(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) return undefined;

  const hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  if (hour > 23 || minute > 59) return undefined;

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function setLocalTime(baseAt: number, time: string): number | undefined {
  const normalized = normalizeSchedulePart(time);
  if (!normalized) return undefined;
  const [hour, minute] = normalized.split(':').map(Number);
  const date = new Date(baseAt);
  date.setHours(hour, minute, 0, 0);
  return date.getTime();
}

function floorToMinute(at: number): number {
  const date = new Date(at);
  date.setSeconds(0, 0);
  return date.getTime();
}

function resolveNearestLocalTime(time: string, nowAt: number): number | undefined {
  const candidate = setLocalTime(nowAt, time);
  if (candidate === undefined) return undefined;
  const candidates = [candidate - DAY_MS, candidate, candidate + DAY_MS];
  return candidates.reduce((nearest, current) =>
    Math.abs(current - nowAt) < Math.abs(nearest - nowAt) ? current : nearest
  );
}

function isWithinRollingToday(at: number | undefined, nowAt: number): boolean {
  return at !== undefined && at >= nowAt - DAY_MS && at <= nowAt + DAY_MS;
}

function parseScheduleRange(
  value: string,
  nowAt: number
): { startAt?: number; endAt?: number } | undefined {
  const trimmed = value.trim();
  if (!trimmed) return {};

  const parts = trimmed.split(/\s*(?:-|~|〜|から|to)\s*/i).filter(Boolean);
  if (parts.length > 2) return undefined;

  const start = normalizeSchedulePart(parts[0] ?? '');
  const end = normalizeSchedulePart(parts[1] ?? '');
  if (!start && !end) return undefined;

  const startAt = start ? resolveNearestLocalTime(start, nowAt) : undefined;
  let endAt = end ? setLocalTime(startAt ?? nowAt, end) : undefined;
  if (startAt !== undefined && endAt !== undefined && endAt <= startAt) {
    endAt += DAY_MS;
  } else if (startAt === undefined && endAt !== undefined) {
    endAt = end ? resolveNearestLocalTime(end, nowAt) : undefined;
  }

  if (startAt !== undefined && !isWithinRollingToday(startAt, nowAt)) return undefined;
  if (endAt !== undefined && !isWithinRollingToday(endAt, nowAt)) return undefined;
  if (startAt !== undefined && endAt !== undefined && endAt <= startAt) return undefined;

  return { startAt, endAt };
}

function formatClock(at?: number): string | undefined {
  if (at === undefined) return undefined;
  const date = new Date(at);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function localDayOffset(at: number | undefined, nowAt: number): number {
  if (at === undefined) return 0;
  const a = new Date(at);
  const n = new Date(nowAt);
  const aDay = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const nDay = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
  return Math.round((aDay - nDay) / DAY_MS);
}

function formatDayOffset(at: number | undefined, nowAt: number): string {
  const offset = localDayOffset(at, nowAt);
  if (offset > 0) return `+${offset}`;
  if (offset < 0) return String(offset);
  return '';
}

function formatClockWithDay(at: number | undefined, nowAt: number): string | undefined {
  const clock = formatClock(at);
  if (!clock) return undefined;
  return `${clock}${formatDayOffset(at, nowAt)}`;
}

function formatScheduleRange(startAt: number | undefined, endAt: number | undefined, nowAt: number): string {
  const start = formatClockWithDay(startAt, nowAt);
  const end = formatClockWithDay(endAt, nowAt);
  if (start && end) return `${start}-${end}`;
  if (start) return `${start}-`;
  if (end) return `-${end}`;
  return '';
}

function addMinutes(at: number | undefined, minutesToAdd: number, nowAt: number): number | undefined {
  if (at === undefined) return undefined;
  const next = at + minutesToAdd * 60 * 1000;
  return isWithinRollingToday(next, nowAt) ? next : undefined;
}

function uniqueStartOptions(options: Array<{ at?: number; hint?: string }>, nowAt: number): StartOption[] {
  const seen = new Set<number>();
  const result: StartOption[] = [];
  for (const option of options) {
    if (!isWithinRollingToday(option.at, nowAt)) continue;
    const at = option.at as number;
    if (seen.has(at)) continue;
    seen.add(at);
    result.push({ at, hint: option.hint });
  }
  return result;
}

function legacyScheduleAt(time: string | undefined, nowAt: number): number | undefined {
  return time ? resolveNearestLocalTime(time, nowAt) : undefined;
}

function legacyScheduleEndAt(
  time: string | undefined,
  startAt: number | undefined,
  nowAt: number
): number | undefined {
  if (!time) return undefined;
  let endAt = setLocalTime(startAt ?? nowAt, time);
  if (endAt === undefined) return undefined;
  if (startAt !== undefined && endAt <= startAt) {
    endAt += DAY_MS;
  } else if (startAt === undefined) {
    endAt = resolveNearestLocalTime(time, nowAt) ?? endAt;
  }
  return isWithinRollingToday(endAt, nowAt) ? endAt : undefined;
}

function TaskScheduleEditor({
  task,
  hints,
  nowAt,
}: {
  task: Task;
  hints: ScheduleHints;
  nowAt: number;
}) {
  const updateSchedule = useMutation(api.tasks.updateSchedule);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const scheduleStartAt = task.scheduleStartAt ?? legacyScheduleAt(task.scheduleStart, nowAt);
  const scheduleEndAt = task.scheduleEndAt ?? legacyScheduleEndAt(task.scheduleEnd, scheduleStartAt, nowAt);
  const value = formatScheduleRange(scheduleStartAt, scheduleEndAt, nowAt);
  const hasSchedule = !!value;
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [selectedStartAt, setSelectedStartAt] = useState<number | undefined>(
    scheduleStartAt ?? hints.previousEndAt
  );

  const startOptions = uniqueStartOptions([
    { at: nowAt, hint: 'now' },
    { at: scheduleStartAt, hint: 'set' },
    { at: hints.previousEndAt, hint: '+0m' },
    { at: addMinutes(hints.previousEndAt, 5, nowAt), hint: '+5m' },
    { at: addMinutes(hints.previousEndAt, 10, nowAt), hint: '+10m' },
    { at: addMinutes(hints.previousEndAt, 15, nowAt), hint: '+15m' },
    { at: addMinutes(hints.previousEndAt, 30, nowAt), hint: '+30m' },
    { at: resolveNearestLocalTime('09:00', nowAt) },
    { at: resolveNearestLocalTime('10:00', nowAt) },
    { at: resolveNearestLocalTime('11:00', nowAt) },
    { at: resolveNearestLocalTime('13:00', nowAt) },
    { at: resolveNearestLocalTime('14:00', nowAt) },
    { at: resolveNearestLocalTime('15:00', nowAt) },
    { at: resolveNearestLocalTime('16:00', nowAt) },
    { at: resolveNearestLocalTime('17:00', nowAt) },
  ], nowAt);

  const saveSchedule = (nextStartAt?: number, nextEndAt?: number, close = true) => {
    if (nextStartAt !== undefined && !isWithinRollingToday(nextStartAt, nowAt)) return;
    if (nextEndAt !== undefined && !isWithinRollingToday(nextEndAt, nowAt)) return;
    if (nextStartAt !== undefined && nextEndAt !== undefined && nextEndAt <= nextStartAt) return;
    if (nextStartAt === scheduleStartAt && nextEndAt === scheduleEndAt) {
      if (close) setIsOpen(false);
      return;
    }
    void updateSchedule({
      id: task._id as Id<'tasks'>,
      scheduleStartAt: nextStartAt,
      scheduleEndAt: nextEndAt,
    });
    if (close) setIsOpen(false);
  };

  const commit = () => {
    const parsed = parseScheduleRange(draft, nowAt);
    if (!parsed) {
      setDraft(value);
      setIsOpen(false);
      return;
    }
    saveSchedule(parsed.startAt, parsed.endAt);
  };

  const cancel = () => {
    setDraft(value);
    setSelectedStartAt(scheduleStartAt ?? hints.previousEndAt);
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const picker = pickerRef.current;
      if (!picker || picker.contains(event.target as Node)) return;
      cancel();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  });

  return (
    <div ref={pickerRef} className="task-schedule-picker">
      <button
        type="button"
        className={`task-schedule-chip${hasSchedule ? ' has-time' : ''}`}
        onClick={() => {
          setDraft(value);
          setSelectedStartAt(scheduleStartAt ?? hints.previousEndAt);
          setIsOpen((open) => !open);
        }}
        aria-label="タスクの予定時間を編集"
        title="例: 9-10 / 9:30-11"
      >
        {hasSchedule ? (
          <span className="task-schedule-stack">
            <span className="task-schedule-stack-row">
              <span className="task-schedule-stack-time">{formatClock(scheduleStartAt) ?? '--:--'}</span>
              <span className="task-schedule-day">
                {formatDayOffset(scheduleStartAt, nowAt)}
              </span>
            </span>
            <span className="task-schedule-stack-line" aria-hidden />
            <span className="task-schedule-stack-row">
              <span className="task-schedule-stack-time">{formatClock(scheduleEndAt) ?? '--:--'}</span>
              <span className="task-schedule-day">
                {formatDayOffset(scheduleEndAt, nowAt)}
              </span>
            </span>
          </span>
        ) : (
          <>
            <Clock3 size={13} />
            <span>time</span>
          </>
        )}
      </button>
      {isOpen ? (
        <div className="task-schedule-popover">
          <div className="task-schedule-group">
            <span className="task-schedule-group-label">start</span>
            <div className="task-schedule-options">
              {startOptions.map(({ at, hint }) => (
                <button
                  key={at}
                  type="button"
                  className={`task-schedule-option${hint ? ' suggested' : ''}${selectedStartAt === at ? ' active' : ''}`}
                  onClick={() => {
                    setSelectedStartAt(at);
                    setDraft(formatScheduleRange(at, scheduleEndAt, nowAt));
                    saveSchedule(at, scheduleEndAt, false);
                  }}
                >
                  <span>{formatClock(at)}</span>
                  {formatDayOffset(at, nowAt) ? (
                    <span className="task-schedule-option-hint">
                      {formatDayOffset(at, nowAt)}
                    </span>
                  ) : null}
                  {hint ? <span className="task-schedule-option-hint">{hint}</span> : null}
                </button>
              ))}
            </div>
          </div>
          <div className="task-schedule-group">
            <span className="task-schedule-group-label">length</span>
            <div className="task-schedule-options">
              {[
                { label: '15m', minutes: 15 },
                { label: '30m', minutes: 30 },
                { label: '1h', minutes: 60 },
                { label: '2h', minutes: 120 },
              ].map(({ label, minutes }) => {
                const baseStart = selectedStartAt ?? scheduleStartAt ?? hints.previousEndAt;
                const end = addMinutes(baseStart, minutes, nowAt);
                return (
                  <button
                    key={label}
                    type="button"
                    className="task-schedule-option"
                    disabled={!baseStart || !end}
                    onClick={() => {
                      if (!baseStart || !end) return;
                      saveSchedule(baseStart, end);
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="task-schedule-manual">
            <input
              className="task-schedule-input"
              value={draft}
              placeholder="9-10"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commit();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  cancel();
                }
              }}
              aria-label="タスクの予定時間"
            />
            <button type="button" className="task-schedule-apply" onClick={commit}>
              set
            </button>
          </div>
        </div>
      ) : null}
    </div>
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
  const [nowAt] = useState(() => floorToMinute(Date.now()));

  const firstSectionEntryId = useMemo(
    () => rows?.find((r) => r.kind === 'section')?.entryId,
    [rows]
  );

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    await addTask({ text, insertBeforeEntryId: firstSectionEntryId });
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
  const todayTaskNumberByEntryId = useMemo(() => {
    const numbers = new Map<Id<'taskListEntries'>, number>();
    if (!rows) return numbers;
    let nextNumber = 1;
    for (const row of rows) {
      if (row.kind === 'section') break;
      numbers.set(row.entryId, nextNumber++);
    }
    return numbers;
  }, [rows]);
  const scheduleHintsByEntryId = useMemo(() => {
    const hints = new Map<Id<'taskListEntries'>, ScheduleHints>();
    if (!rows) return hints;

    let previousEndAt: number | undefined;
    for (const row of rows) {
      if (row.kind === 'section') break;
      hints.set(row.entryId, { previousEndAt });
      const startAt = row.task.scheduleStartAt ?? legacyScheduleAt(row.task.scheduleStart, nowAt);
      previousEndAt = row.task.scheduleEndAt ?? legacyScheduleEndAt(row.task.scheduleEnd, startAt, nowAt) ?? previousEndAt;
    }
    return hints;
  }, [nowAt, rows]);
  const timelineItems = useMemo(() => {
    if (!rows) return [];

    const items: TimelineItem[] = [];
    let nextNumber = 1;
    for (const row of rows) {
      if (row.kind === 'section') break;

      const startAt = row.task.scheduleStartAt ?? legacyScheduleAt(row.task.scheduleStart, nowAt);
      const endAt = row.task.scheduleEndAt ?? legacyScheduleEndAt(row.task.scheduleEnd, startAt, nowAt);
      if (
        startAt === undefined ||
        endAt === undefined ||
        endAt <= startAt ||
        endAt < nowAt - DAY_MS ||
        startAt > nowAt + DAY_MS
      ) {
        nextNumber++;
        continue;
      }

      items.push({
        entryId: row.entryId,
        number: nextNumber,
        title: row.task.text,
        startAt,
        endAt,
      });
      nextNumber++;
    }

    return items;
  }, [nowAt, rows]);
  const todayTaskCount = todayTaskNumberByEntryId.size;
  const remaining = tasksInList.filter((r) => !r.task.done).length;
  const completed = tasksInList.filter((r) => r.task.done).length;

  const loading = rows === undefined;

  return (
    <div className="tasks-workspace">
      <TodayTimeline items={timelineItems} nowAt={nowAt} />
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
              <li className="task-today-row">
                <TodayHeader count={todayTaskCount} />
              </li>
              {(rows ?? []).map((row) =>
                row.kind === 'section' ? (
                  <SortableSectionRow key={row.entryId} row={row} />
                ) : (
                  <SortableTaskItem
                    key={row.entryId}
                    task={row.task}
                    entryId={row.entryId}
                    todayNumber={todayTaskNumberByEntryId.get(row.entryId)}
                    scheduleHints={scheduleHintsByEntryId.get(row.entryId)}
                    nowAt={nowAt}
                  />
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
    </div>
  );
}

function SortableTaskItem({
  task,
  entryId,
  todayNumber,
  scheduleHints,
  nowAt,
}: {
  task: Task;
  entryId: Id<'taskListEntries'>;
  todayNumber?: number;
  scheduleHints?: ScheduleHints;
  nowAt: number;
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
          className={`check-btn ${task.done ? 'checked' : ''} ${todayNumber ? 'numbered' : ''}`}
          onClick={() => toggle({ id: task._id as Id<'tasks'> })}
          aria-label={
            task.done
              ? '未完了に戻す'
              : todayNumber
                ? `Today task ${todayNumber}を完了`
                : '完了'
          }
        >
          {task.done ? <Check size={14} strokeWidth={3} /> : todayNumber}
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
        {todayNumber ? (
          <TaskScheduleEditor
            task={task}
            hints={scheduleHints ?? {}}
            nowAt={nowAt}
          />
        ) : null}
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
