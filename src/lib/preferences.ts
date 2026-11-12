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
// 서버 필드명 ↔ 앱 필드명. 야간 알림은 서버가 immediate | morning 을 쓴다.
type Remote = {
  fall: boolean;
  inactivity: boolean;
  device_offline: boolean;
  night_mode: 'immediate' | 'morning';
  version: number;
};

const fromRemote = (r: Remote): Partial<Preferences> => ({
  fall: r.fall,
  inactive: r.inactivity,
  deviceOff: r.device_offline,
  nightAlert: r.night_mode === 'morning' ? 'morning' : 'as-is',
});

const toRemote = (p: Partial<Preferences>) => ({
  ...(p.fall !== undefined && { fall: p.fall }),
  ...(p.inactive !== undefined && { inactivity: p.inactive }),
  ...(p.deviceOff !== undefined && { device_offline: p.deviceOff }),
  ...(p.nightAlert && { night_mode: p.nightAlert === 'morning' ? 'morning' : 'immediate' }),
});

function save(next: Preferences) {
  current = next;
  try {
    webStorage()?.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // 저장이 막혀 있으면 메모리 값으로만 동작한다
  }
  listeners.forEach((listener) => listener());
}

const prefsPath = async () => {
  const id = await getSubjectId();
  return id && `/guardian/subjects/${id}/notification-preferences`;
};

// 서버는 저장할 때 마지막으로 받은 version 을 같이 보내야 한다. 저장은 한 줄로 이어서 보낸다.
let serverVersion = 0;
let serverLoaded = false;
let queue: Promise<unknown> = Promise.resolve();

/** 서버의 알림 설정을 한 번 받아 와 덮어쓴다. 실패하면 기기에 저장된 값을 그대로 쓴다. */
async function loadFromServer() {
  if (serverLoaded || !apiEnabled) return;
  serverLoaded = true;
  try {
    const path = await prefsPath();
    if (!path) return;
    const remote = await api<Remote>(path);
    serverVersion = remote.version;
    save({ ...(current ?? load()), ...fromRemote(remote) });
  } catch (error) {
    serverLoaded = false;
    console.warn('설정을 불러오지 못했어요', error);
  }
}

export function updatePreferences(patch: Partial<Preferences>) {
  save({ ...(current ?? load()), ...patch });
  const body = toRemote(patch);
  if (!apiEnabled || !Object.keys(body).length) return;
  queue = queue
    .then(async () => {
      const path = await prefsPath();
      if (!path) return;
      const remote = await api<Remote>(path, {
        method: 'PATCH',
        body: { ...body, version: serverVersion },
      });
      serverVersion = remote.version;
    })
    .catch(() => {
      // 다른 곳에서 바뀌었을 수 있으니 다음 열람 때 서버 값을 다시 받는다
      serverLoaded = false;
      console.warn('설정을 저장하지 못했어요');
    });
}
