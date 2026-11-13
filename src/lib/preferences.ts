import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

/**
 * 이 기기에만 남겨 두는 화면 설정. (알림 설정은 계정에 저장되므로 care.ts 를 쓴다)
 * 웹: localStorage. 네이티브: 아직 영속 저장소가 없어 메모리에만 둔다 (앱 재시작 시 초기화).
 */
export type Brightness = 'auto' | 'bright' | 'dark';

export type Preferences = {
  brightness: Brightness;
};

/** Figma 설정 화면(786:539)의 초기 상태 */
const DEFAULTS: Preferences = {
  brightness: 'auto',
};

const STORAGE_KEY = 'hucare.preferences.v1';

function webStorage(): Storage | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function load(): Preferences {
  try {
    const saved = webStorage()?.getItem(STORAGE_KEY);
    return saved ? { ...DEFAULTS, brightness: JSON.parse(saved).brightness ?? 'auto' } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

let current: Preferences | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePreferences() {
  return useSyncExternalStore(
    subscribe,
    () => (current ??= load()),
    () => DEFAULTS,
  );
}

export function updatePreferences(patch: Partial<Preferences>) {
  current = { ...(current ?? load()), ...patch };
  try {
    webStorage()?.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // 저장이 막혀 있으면 메모리 값으로만 동작한다
  }
  listeners.forEach((listener) => listener());
}
