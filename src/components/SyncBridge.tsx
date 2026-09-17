import { useAuth } from '@clerk/clerk-react';
import { useMutation, useQuery } from 'convex/react';
import { useEffect, useRef, useState } from 'react';
import { api } from '../../convex/_generated/api';
import { isCloudConfigured } from '../lib/cloudConfig';
import type { Item } from '../lib/taskModel';
import { taskStore, useTaskState } from '../lib/taskStore';

const PUSH_DELAY_MS = 700;

type SyncMap = Record<string, number>;

function syncMapKey(userId: string): string {
  return `chrct.tasks.synced.${userId}`;
}

function loadSyncMap(userId: string): SyncMap {
  try {
    const raw = localStorage.getItem(syncMapKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return {};
    return parsed as SyncMap;
  } catch {
    return {};
  }
}

function saveSyncMap(userId: string, map: SyncMap) {
  try {
    localStorage.setItem(syncMapKey(userId), JSON.stringify(map));
  } catch {
    // ignore
  }
}

function toRemote(item: Item) {
  return {
    itemId: item.id,
    updatedAt: item.updatedAt,
    deletedAt: item.deletedAt,
    payload: JSON.stringify(item),
  };
}

/**
 * サインインしている間だけ Convex と同期する。
 * ローカル（localStorage）が正で、ここは差分を送受信するだけ。
 * サインアウト中・未設定時は何もしないので、タスク機能は認証なしで完結する。
 */
export function SyncBridge() {
  if (!isCloudConfigured) return null;
  return <SyncBridgeInner />;
}

function SyncBridgeInner() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const enabled = isLoaded && isSignedIn === true && !!userId;

  const remote = useQuery(api.sync.pull, enabled ? {} : 'skip');
  const push = useMutation(api.sync.push);
  const importLegacy = useMutation(api.sync.importLegacy);

  const { items } = useTaskState();
  const syncMapRef = useRef<SyncMap>({});
  const loadedForUser = useRef<string | null>(null);
  const importedForUser = useRef<string | null>(null);
  const [tick, setTick] = useState(0);

  // どこまで送受信済みかの台帳をユーザーごとに読み込む
  useEffect(() => {
    if (!enabled || !userId || loadedForUser.current === userId) return;
    loadedForUser.current = userId;
    syncMapRef.current = loadSyncMap(userId);
  }, [enabled, userId]);

  // 旧スキーマのタスクを一度だけ引き取る
  useEffect(() => {
    if (!enabled || !userId || importedForUser.current === userId) return;
    importedForUser.current = userId;
    void importLegacy({}).catch(() => {
      importedForUser.current = null;
    });
  }, [enabled, userId, importLegacy]);

  // リモート → ローカル
  useEffect(() => {
    if (!enabled || !userId || !remote) return;
    taskStore.mergeRemote(remote);

    const map = syncMapRef.current;
    const current = taskStore.getState().items;
    for (const row of remote) {
      const local = current[row.itemId];
      if (local && local.updatedAt <= row.updatedAt) map[row.itemId] = local.updatedAt;
    }
    saveSyncMap(userId, map);
  }, [enabled, userId, remote]);

  // ローカル → リモート（打鍵ごとに送らないよう少し待つ）
  useEffect(() => {
    if (!enabled || !userId || remote === undefined) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      const map = syncMapRef.current;
      const dirty = taskStore.allItems().filter((item) => map[item.id] !== item.updatedAt);
      if (dirty.length === 0) return;

      push({ items: dirty.map(toRemote) })
        .then(() => {
          if (cancelled) return;
          for (const item of dirty) map[item.id] = item.updatedAt;
          saveSyncMap(userId, map);
          setTick((value) => value + 1);
        })
        .catch(() => {
          // 次の変更かリロードで再試行する
        });
    }, PUSH_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, userId, items, remote, push, tick]);

  return null;
}
