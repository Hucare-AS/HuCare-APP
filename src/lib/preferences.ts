import { useEffect, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import { api, apiEnabled, getSubjectId } from '@/lib/api';

export type NightAlert = 'as-is' | 'morning';
export type Brightness = 'auto' | 'bright' | 'dark';

export type Preferences = {
  fall: boolean;
  inactive: boolean;
  deviceOff: boolean;
  nightAlert: NightAlert;
  brightness: Brightness;
};

/** Figma 설정 화면(786:539)의 초기 상태 */
const DEFAULTS: Preferences = {
  fall: true,
  inactive: true,
  deviceOff: false,
  nightAlert: 'as-is',
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
    return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : DEFAULTS;
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

/**
 * 기기에 남겨 두는 설정값.
 * 웹: localStorage. 네이티브: 아직 영속 저장소가 없어 메모리에만 둔다 (앱 재시작 시 초기화).
 */
export function usePreferences() {
  useEffect(() => {
    void loadFromServer();
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => (current ??= load()),
    () => DEFAULTS,
  );
}

// 서버에 저장하는 것은 알림 설정뿐이다. 화면 밝기는 이 기기에만 남긴다 (화면에는 아직 적용하지 않음).
// ponytail: 서버 필드명은 추측 (Swagger 에 스키마가 없음). 앱의 키 이름을 그대로 보낸다. 실제 응답을 보고 여기만 고친다.
const SERVER_KEYS = ['fall', 'inactive', 'deviceOff', 'nightAlert'] as const;

const pickServer = (source: Partial<Preferences>) =>
  Object.fromEntries(SERVER_KEYS.filter((key) => key in source).map((key) => [key, source[key]]));

function save(next: Preferences) {
  current = next;
  try {
    webStorage()?.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // 저장이 막혀 있으면 메모리 값으로만 동작한다
  }
  listeners.forEach((listener) => listener());
}

let serverLoaded = false;

/** 서버의 알림 설정을 한 번 받아 와 덮어쓴다. 실패하면 기기에 저장된 값을 그대로 쓴다. */
async function loadFromServer() {
  if (serverLoaded || !apiEnabled) return;
  serverLoaded = true;
  try {
    const id = await getSubjectId();
    if (!id) return;
    const remote = await api<Partial<Preferences>>(
      `/guardian/subjects/${id}/notification-preferences`,
    );
    save({ ...(current ?? load()), ...pickServer(remote) });
  } catch (error) {
    serverLoaded = false;
    console.warn('설정을 불러오지 못했어요', error);
  }
}

export function updatePreferences(patch: Partial<Preferences>) {
  save({ ...(current ?? load()), ...patch });
  const body = pickServer(patch);
  if (!apiEnabled || !Object.keys(body).length) return;
  getSubjectId()
    .then(
      (id) =>
        id && api(`/guardian/subjects/${id}/notification-preferences`, { method: 'PATCH', body }),
    )
    .catch(() => console.warn('설정을 저장하지 못했어요'));
}
