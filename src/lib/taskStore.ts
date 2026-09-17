/**
 * ローカル保存（localStorage）を正とするタスクストア。
 * サインインは不要。サインインした場合だけ SyncBridge が Convex と双方向同期する。
 */
import { useSyncExternalStore } from 'react';
import {
  MAX_DEPTH,
  type Item,
  type ItemMap,
  type LabelColor,
  type TaskKind,
  childrenOf,
  depthOf,
  flattenAll,
  isLabelColor,
  isLive,
  needsRebalance,
  newId,
  nextKind,
  nextLabelColor,
  orderBetween,
  subtreeHeight,
  subtreeIds,
} from './taskModel';

const STORAGE_KEY = 'chrct.tasks.v2';
const UNDO_LIMIT = 50;

export interface TaskState {
  items: ItemMap;
  /** 保存済みのリビジョン。参照等価の判定に使う */
  rev: number;
}

export interface RemoteItem {
  itemId: string;
  updatedAt: number;
  deletedAt?: number;
  payload: string;
}

function coerceItem(raw: unknown): Item | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string') return null;
  const type = r.type === 'section' ? 'section' : 'task';
  const now = Date.now();
  return {
    id: r.id,
    type,
    parentId: typeof r.parentId === 'string' ? r.parentId : null,
    order: typeof r.order === 'number' && Number.isFinite(r.order) ? r.order : 0,
    text: typeof r.text === 'string' ? r.text : '',
    note: typeof r.note === 'string' && r.note ? r.note : undefined,
    done: r.done === true,
    filed: r.filed === true ? true : undefined,
    kind: r.kind === 'main' || r.kind === 'tanomi' ? r.kind : undefined,
    color: isLabelColor(r.color) ? r.color : undefined,
    estimate:
      typeof r.estimate === 'number' && Number.isFinite(r.estimate) && r.estimate > 0
        ? Math.round(r.estimate)
        : undefined,
    assignedDate: typeof r.assignedDate === 'string' ? r.assignedDate : undefined,
    createdAt: typeof r.createdAt === 'number' ? r.createdAt : now,
    updatedAt: typeof r.updatedAt === 'number' ? r.updatedAt : now,
    deletedAt: typeof r.deletedAt === 'number' ? r.deletedAt : undefined,
  };
}

function loadItems(): ItemMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return {};
    const items: ItemMap = {};
    for (const entry of parsed) {
      const item = coerceItem(entry);
      if (item) items[item.id] = item;
    }
    return items;
  } catch {
    return {};
  }
}

const PERSIST_DELAY_MS = 180;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let pendingPersist: ItemMap | null = null;

function writeNow(items: ItemMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.values(items)));
  } catch {
    // 容量超過などは無視（メモリ上の状態は生きている）
  }
}

/** 1文字ごとの書き込みでカクつかないよう、保存だけ少し遅らせる */
function persist(items: ItemMap) {
  pendingPersist = items;
  if (persistTimer !== null) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    const snapshot = pendingPersist;
    pendingPersist = null;
    if (snapshot) writeNow(snapshot);
  }, PERSIST_DELAY_MS);
}

export function flushPersist() {
  if (persistTimer !== null) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  const snapshot = pendingPersist;
  pendingPersist = null;
  if (snapshot) writeNow(snapshot);
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushPersist);
  window.addEventListener('beforeunload', flushPersist);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPersist();
  });
}

let state: TaskState = { items: loadItems(), rev: 0 };
const listeners = new Set<() => void>();
const undoStack: ItemMap[] = [];

function emit() {
  for (const listener of listeners) listener();
}

function commit(nextItems: ItemMap, options?: { undoable?: boolean; previous?: ItemMap }) {
  if (options?.undoable !== false) {
    undoStack.push(options?.previous ?? state.items);
    if (undoStack.length > UNDO_LIMIT) undoStack.shift();
  }
  state = { items: nextItems, rev: state.rev + 1 };
  persist(nextItems);
  emit();
}

/** 変更対象に updatedAt を打ちながら新しい items を作る */
function withPatches(patches: Item[], base: ItemMap = state.items): ItemMap {
  const now = Date.now();
  const next: ItemMap = { ...base };
  for (const patch of patches) {
    next[patch.id] = { ...patch, updatedAt: now };
  }
  return next;
}

function siblings(items: ItemMap, parentId: string | null): Item[] {
  return childrenOf(items, parentId);
}

/** 兄弟の order が詰まりすぎたら 0,1,2... に振り直す */
function rebalanceIfNeeded(items: ItemMap, parentId: string | null): Item[] {
  const list = siblings(items, parentId);
  let tight = false;
  for (let i = 1; i < list.length; i++) {
    if (needsRebalance(list[i - 1].order, list[i].order)) {
      tight = true;
      break;
    }
  }
  if (!tight) return [];
  return list.map((item, index) => ({ ...item, order: index }));
}

/** 振り直しが要るなら適用済みのマップを返す。挿入位置の計算はこの結果に対して行う */
function withRebalanced(
  items: ItemMap,
  parentId: string | null
): { items: ItemMap; patches: Item[] } {
  const patches = rebalanceIfNeeded(items, parentId);
  if (patches.length === 0) return { items, patches };
  const next: ItemMap = { ...items };
  for (const patch of patches) next[patch.id] = patch;
  return { items: next, patches };
}

function orderForPosition(items: ItemMap, parentId: string | null, index: number): number {
  const list = siblings(items, parentId);
  const prev = index > 0 ? list[index - 1]?.order : undefined;
  const next = list[index]?.order;
  return orderBetween(prev, next);
}

function blankItem(parentId: string | null, order: number, type: 'task' | 'section'): Item {
  const now = Date.now();
  return {
    id: newId(),
    type,
    parentId,
    order,
    text: '',
    done: false,
    createdAt: now,
    updatedAt: now,
  };
}

export const taskStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getState(): TaskState {
    return state;
  },

  canUndo(): boolean {
    return undoStack.length > 0;
  },

  undo(): void {
    const previous = undoStack.pop();
    if (!previous) return;
    state = { items: previous, rev: state.rev + 1 };
    persist(previous);
    emit();
  },

  /**
   * 指定アイテムの直後に新しい行を作る。
   * 子を持つ行の直後なら最初の子として、そうでなければ同じ階層の次に入る。
   */
  insertAfter(
    anchorId: string | null,
    options?: { type?: 'task' | 'section'; asChild?: boolean; assignedDate?: string }
  ): string {
    const type = options?.type ?? 'task';
    const items = state.items;

    let parentId: string | null = null;
    let index = siblings(items, null).length;

    const anchor = anchorId ? items[anchorId] : undefined;
    if (isLive(anchor)) {
      if (type === 'section') {
        // ラベルは常にルート直下。アンカーの属するルート系列の次に置く
        const rootId = rootAncestorId(items, anchor.id);
        const rootList = siblings(items, null);
        index = rootList.findIndex((i) => i.id === rootId) + 1;
      } else if (options?.asChild || siblings(items, anchor.id).length > 0) {
        parentId = anchor.id;
        index = 0;
      } else {
        parentId = anchor.parentId;
        const list = siblings(items, parentId);
        index = list.findIndex((i) => i.id === anchor.id) + 1;
      }
    }

    if (type === 'task' && parentId && depthOf(items, parentId) + 1 > MAX_DEPTH) {
      parentId = items[parentId]?.parentId ?? null;
      index = siblings(items, parentId).length;
    }

    const balanced = withRebalanced(items, parentId);
    const item = blankItem(parentId, orderForPosition(balanced.items, parentId, index), type);
    if (type === 'task' && options?.assignedDate) item.assignedDate = options.assignedDate;

    commit(withPatches([...balanced.patches, item]));
    return item.id;
  },

  addSection(): string {
    return taskStore.insertAfter(null, { type: 'section' });
  },

  update(id: string, patch: Partial<Omit<Item, 'id' | 'createdAt'>>, undoable = true): void {
    const current = state.items[id];
    if (!isLive(current)) return;
    const merged: Item = { ...current, ...patch };
    commit(withPatches([merged]), { undoable });
  },

  setText(id: string, text: string): void {
    const current = state.items[id];
    if (!isLive(current) || current.text === text) return;
    // 連続タイプでアンドゥ履歴を埋めない
    commit(withPatches([{ ...current, text }]), { undoable: false });
  },

  setNote(id: string, note: string): void {
    const current = state.items[id];
    if (!isLive(current)) return;
    const trimmed = note.trim() ? note : undefined;
    if (current.note === trimmed) return;
    commit(withPatches([{ ...current, note: trimmed }]), { undoable: false });
  },

  toggleDone(id: string): void {
    const current = state.items[id];
    if (!isLive(current) || current.type !== 'task') return;
    const done = !current.done;
    const patches = subtreeIds(state.items, id)
      .map((childId) => state.items[childId])
      .filter(isLive)
      .filter((item) => item.type === 'task' && (item.done !== done || (!done && item.filed)))
      // 完了を取り消したら棚から出す
      .map((item) => ({ ...item, done, filed: done ? item.filed : undefined }));
    if (patches.length === 0) return;
    commit(withPatches(patches));
  },

  /**
   * 完了したタスクを、完了済みの棚へ送る。
   * 送るのは親がタスクでない（ルート直下かラベル直下の）ものだけ。
   * サブタスクは親の内訳なので、親のところに残す。
   */
  fileCompleted(): void {
    const items = state.items;
    const patches = Object.values(items)
      .filter(isLive)
      .filter((item) => item.type === 'task' && item.done && !item.filed)
      .filter((item) => {
        const parent = item.parentId ? items[item.parentId] : undefined;
        return !isLive(parent) || parent.type === 'section';
      })
      .map((item) => ({ ...item, filed: true }));
    if (patches.length === 0) return;
    commit(withPatches(patches));
  },

  toggleToday(id: string, todayDate: string): void {
    const current = state.items[id];
    if (!isLive(current) || current.type !== 'task') return;
    const assignedDate = current.assignedDate === todayDate ? undefined : todayDate;
    commit(withPatches([{ ...current, assignedDate }]));
  },

  setEstimate(id: string, estimate: number | undefined): void {
    const current = state.items[id];
    if (!isLive(current) || current.type !== 'task' || current.estimate === estimate) return;
    commit(withPatches([{ ...current, estimate }]));
  },

  /** タスクならクエスト種別、ラベルなら色を順に切り替える */
  cycleKind(id: string): void {
    const current = state.items[id];
    if (!isLive(current)) return;
    if (current.type === 'section') {
      commit(withPatches([{ ...current, color: nextLabelColor(current.color) }]));
      return;
    }
    commit(withPatches([{ ...current, kind: nextKind(current.kind) }]));
  },

  setLabelColor(id: string, color: LabelColor | undefined): void {
    const current = state.items[id];
    if (!isLive(current) || current.type !== 'section' || current.color === color) return;
    commit(withPatches([{ ...current, color }]));
  },

  setKind(id: string, kind: TaskKind | undefined): void {
    const current = state.items[id];
    if (!isLive(current)) return;
    commit(withPatches([{ ...current, kind }]));
  },

  remove(id: string): void {
    const current = state.items[id];
    if (!isLive(current)) return;
    const now = Date.now();
    const patches = subtreeIds(state.items, id)
      .map((childId) => state.items[childId])
      .filter(isLive)
      .map((item) => ({ ...item, deletedAt: now }));
    commit(withPatches(patches));
  },

  /** 完了したタスクを削除する */
  /**
   * 何も書かれていない行を片づける。
   * 打ち始められる行がなくならないよう、最後の1行だけは残す。
   * 取り消し履歴には積まない（ユーザーの編集を押し流さないため）。
   */
  removeEmpty(id: string): boolean {
    const items = state.items;
    const current = items[id];
    if (!isLive(current)) return false;
    if (current.text.trim() || current.note?.trim()) return false;
    if (childrenOf(items, id).length > 0) return false;
    if (flattenAll(items).length <= 1) return false;

    commit(withPatches([{ ...current, deletedAt: Date.now() }]), { undoable: false });
    return true;
  },

  clearCompleted(): void {
    const now = Date.now();
    const roots = flattenAll(state.items)
      .filter((row) => row.item.type === 'task' && row.item.done)
      .map((row) => row.item.id);

    const ids = new Set<string>();
    for (const rootId of roots) {
      for (const id of subtreeIds(state.items, rootId)) ids.add(id);
    }
    const patches = [...ids]
      .map((id) => state.items[id])
      .filter(isLive)
      .map((item) => ({ ...item, deletedAt: now }));
    if (patches.length === 0) return;
    commit(withPatches(patches));
  },


  /** 1段下げてひとつ上の兄弟の子にする（サブタスク化） */
  indent(id: string): boolean {
    const items = state.items;
    const current = items[id];
    if (!isLive(current) || current.type === 'section') return false;

    const list = siblings(items, current.parentId);
    const index = list.findIndex((i) => i.id === id);
    if (index <= 0) return false;

    const newParent = list[index - 1];
    const newDepth = depthOf(items, newParent.id) + 1;
    if (newDepth + subtreeHeight(items, id) > MAX_DEPTH) return false;

    const balanced = withRebalanced(items, newParent.id);
    const childList = siblings(balanced.items, newParent.id);
    const order = orderBetween(childList[childList.length - 1]?.order, undefined);
    commit(withPatches([...balanced.patches, { ...current, parentId: newParent.id, order }]));
    return true;
  },

  /** 1段上げて親の次の兄弟になる */
  outdent(id: string): boolean {
    const items = state.items;
    const current = items[id];
    if (!isLive(current) || !current.parentId) return false;
    const parent = items[current.parentId];
    if (!isLive(parent)) return false;

    const balanced = withRebalanced(items, parent.parentId);
    const parentSiblings = siblings(balanced.items, parent.parentId);
    const parentIndex = parentSiblings.findIndex((i) => i.id === parent.id);
    const order = orderBetween(
      parentSiblings[parentIndex]?.order,
      parentSiblings[parentIndex + 1]?.order
    );

    commit(withPatches([...balanced.patches, { ...current, parentId: parent.parentId, order }]));
    return true;
  },

  /** 同じ階層の中で上下に動かす（子はついてくる） */
  move(id: string, direction: -1 | 1): boolean {
    const items = state.items;
    const current = items[id];
    if (!isLive(current)) return false;

    const list = siblings(items, current.parentId);
    const index = list.findIndex((i) => i.id === id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= list.length) return false;

    const reordered = [...list];
    reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, current);

    const patches = reordered.map((item, i) => ({ ...item, order: i }));
    commit(withPatches(patches));
    return true;
  },

  /** 同期で受け取った変更をローカルに反映（updatedAt の新しい方が勝つ） */
  mergeRemote(remoteItems: RemoteItem[]): { applied: number } {
    let applied = 0;
    const next: ItemMap = { ...state.items };

    for (const remote of remoteItems) {
      const local = next[remote.itemId];
      if (local && local.updatedAt >= remote.updatedAt) continue;

      if (remote.deletedAt) {
        if (local) {
          next[remote.itemId] = { ...local, deletedAt: remote.deletedAt, updatedAt: remote.updatedAt };
          applied += 1;
        }
        continue;
      }

      try {
        const parsed = coerceItem({ ...(JSON.parse(remote.payload) as object), id: remote.itemId });
        if (!parsed) continue;
        next[remote.itemId] = { ...parsed, updatedAt: remote.updatedAt, deletedAt: undefined };
        applied += 1;
      } catch {
        // 壊れた payload は捨てる
      }
    }

    if (applied === 0) return { applied: 0 };
    commit(next, { undoable: false });
    return { applied };
  },

  /** ローカルの全アイテム（削除済みも含む。同期用） */
  allItems(): Item[] {
    return Object.values(state.items);
  },

  /** 端末をまたいだ初回同期などで、既存データを丸ごと入れ替える */
  replaceAll(items: Item[]): void {
    const next: ItemMap = {};
    for (const item of items) next[item.id] = item;
    commit(next, { undoable: false });
  },
};

function rootAncestorId(items: ItemMap, id: string): string {
  let current = items[id];
  const seen = new Set<string>();
  while (current?.parentId && !seen.has(current.id)) {
    seen.add(current.id);
    const parent = items[current.parentId];
    if (!isLive(parent)) break;
    current = parent;
  }
  return current?.id ?? id;
}

export function useTaskState(): TaskState {
  return useSyncExternalStore(taskStore.subscribe, taskStore.getState, taskStore.getState);
}
