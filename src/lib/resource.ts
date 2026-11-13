import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useSyncExternalStore } from 'react';

/**
 * 키별로 한 번만 불러오고 화면끼리 공유하는 작은 데이터 캐시.
 * 불러오는 중에도 이전 값을 유지하고, 화면에 다시 들어오면 오래된 값을 새로 불러온다.
 */
export type Resource<T> = {
  data: T | undefined;
  error: Error | null;
  loading: boolean;
  reload: () => void;
};

type Snapshot = { data?: unknown; error: Error | null; loading: boolean; stale: boolean };

type Entry = { snapshot: Snapshot; fetchedAt: number; promise?: Promise<void> };

const LOADING: Snapshot = { error: null, loading: true, stale: false };
/** 이 시간이 지난 값은 화면에 다시 들어올 때 새로 불러온다 */
const REVALIDATE_AFTER_MS = 30_000;

const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();
let generation = 0;

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function setSnapshot(entry: Entry, patch: Partial<Snapshot>) {
  entry.snapshot = { ...entry.snapshot, ...patch };
  notify();
}

function start(key: string, load: () => Promise<unknown>) {
  let entry = entries.get(key);
  if (!entry) {
    entry = { snapshot: LOADING, fetchedAt: 0 };
    entries.set(key, entry);
  }
  if (entry.promise) return;
  const target = entry;
  const startedIn = generation;
  if (!target.snapshot.loading) setSnapshot(target, { loading: true });
  target.promise = load()
    .then(
      (data) => {
        if (startedIn !== generation) return;
        target.fetchedAt = Date.now();
        setSnapshot(target, { data, error: null, loading: false, stale: false });
      },
      (error: unknown) => {
        if (startedIn !== generation) return;
        const reason = error instanceof Error ? error : new Error(String(error));
        setSnapshot(target, { error: reason, loading: false, stale: false });
      },
    )
    .finally(() => {
      target.promise = undefined;
    });
}

/** key 가 null 이면 아직 불러올 수 없다는 뜻 (예: 대상자 id 를 모름) */
export function useResource<T>(key: string | null, load: () => Promise<T>): Resource<T> {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => (key ? (entries.get(key)?.snapshot ?? LOADING) : LOADING),
    () => LOADING,
  );

  // 캐시가 비워지거나 오래된 값이 되면 snapshot 이 바뀌므로 다시 확인한다
  useEffect(() => {
    if (!key) return;
    const entry = entries.get(key);
    if (!entry || entry.snapshot.stale) start(key, load);
  }, [key, load, snapshot]);

  useFocusEffect(
    useCallback(() => {
      if (!key) return;
      const entry = entries.get(key);
      if (entry && !entry.promise && Date.now() - entry.fetchedAt > REVALIDATE_AFTER_MS) {
        start(key, load);
      }
    }, [key, load]),
  );

  const reload = useCallback(() => {
    if (key) start(key, load);
  }, [key, load]);

  return {
    data: snapshot.data as T | undefined,
    error: snapshot.error,
    loading: snapshot.loading,
    reload,
  };
}

/** 조건에 맞는 키를 오래된 값으로 표시한다. 화면에 떠 있는 값은 바로 다시 불러온다. */
export function invalidate(match: (key: string) => boolean = () => true) {
  let changed = false;
  for (const [key, entry] of entries) {
    if (match(key) && !entry.snapshot.stale) {
      entry.snapshot = { ...entry.snapshot, stale: true };
      changed = true;
    }
  }
  if (changed) notify();
}

/** 서버 응답을 기다리지 않고 캐시 값을 바꾼다 (낙관적 업데이트) */
export function mutate<T>(key: string, update: (current: T | undefined) => T) {
  const entry = entries.get(key);
  if (!entry) return;
  setSnapshot(entry, { data: update(entry.snapshot.data as T | undefined) });
}

/** 로그아웃 등으로 모든 값을 버린다. 진행 중인 요청의 결과도 무시한다. */
export function clearResources() {
  generation += 1;
  entries.clear();
  notify();
}
