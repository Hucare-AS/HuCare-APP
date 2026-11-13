import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import { ApiError, isApiMode, request, type RequestOptions } from '@/lib/api';

/**
 * 보호자 로그인 세션.
 * 웹: localStorage 에 저장한다. 네이티브: 아직 영속 저장소가 없어 메모리에만 둔다 (앱 재시작 시 다시 로그인).
 * 목업 모드에서는 항상 로그인된 시연 계정이다.
 */
export type AuthUser = { id: string; displayName: string };

type Session = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  /** 액세스 토큰 만료 시각 (epoch ms) */
  expiresAt: number;
};

/** unknown: 저장된 세션을 아직 읽지 않음 (정적 렌더링·하이드레이션 중) */
export type AuthState =
  { status: 'unknown' } | { status: 'signedOut' } | { status: 'signedIn'; user: AuthUser };

type SessionView = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

const STORAGE_KEY = 'hucare.session.v1';
const DEMO_USER: AuthUser = { id: 'demo', displayName: '김영희' };
const UNKNOWN: AuthState = { status: 'unknown' };
const SIGNED_OUT: AuthState = { status: 'signedOut' };
/** 만료 직전 토큰으로 요청하지 않도록 30초 일찍 갱신한다 */
const EXPIRY_MARGIN_MS = 30_000;

function webStorage(): Storage | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

let session: Session | null = null;
let state: AuthState | null = isApiMode ? null : { status: 'signedIn', user: DEMO_USER };
const listeners = new Set<() => void>();
const signOutListeners = new Set<() => void>();

function load(): AuthState {
  try {
    const saved = webStorage()?.getItem(STORAGE_KEY);
    session = saved ? (JSON.parse(saved) as Session) : null;
  } catch {
    session = null;
  }
  return session ? { status: 'signedIn', user: session.user } : SIGNED_OUT;
}

function setSession(next: Session | null) {
  const wasSignedIn = !!session;
  session = next;
  state = next ? { status: 'signedIn', user: next.user } : SIGNED_OUT;
  try {
    if (next) webStorage()?.setItem(STORAGE_KEY, JSON.stringify(next));
    else webStorage()?.removeItem(STORAGE_KEY);
  } catch {
    // 저장이 막혀 있으면 메모리 세션으로만 동작한다
  }
  if (wasSignedIn && !next) signOutListeners.forEach((listener) => listener());
  listeners.forEach((listener) => listener());
}

function fromView(view: SessionView): Session {
  return {
    user: view.user,
    accessToken: view.accessToken,
    refreshToken: view.refreshToken,
    expiresAt: Date.now() + view.expiresIn * 1000,
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getState() {
  return (state ??= load());
}

export function useAuth() {
  return useSyncExternalStore(subscribe, getState, () => (isApiMode ? UNKNOWN : getState()));
}

export function currentUser() {
  const current = getState();
  return current.status === 'signedIn' ? current.user : null;
}

/** 로그아웃되면(직접 또는 토큰 만료) 호출된다. 캐시 비우기용 */
export function onSignOut(listener: () => void) {
  signOutListeners.add(listener);
  return () => {
    signOutListeners.delete(listener);
  };
}

export async function login(email: string, password: string) {
  const view = await request<SessionView>('/auth/login', {
    method: 'POST',
    body: { email: email.trim(), password },
  });
  setSession(fromView(view));
}

/** 가입 후 이메일 인증이 필요하면 'CONFIRM_EMAIL', 바로 로그인했으면 'LOGGED_IN' */
export async function signup(email: string, password: string, displayName: string) {
  const result = await request<{ nextAction: string }>('/auth/signup', {
    method: 'POST',
    body: { email: email.trim(), password, displayName: displayName.trim() },
  });
  if (result.nextAction === 'CONFIRM_EMAIL') return 'CONFIRM_EMAIL' as const;
  await login(email, password);
  return 'LOGGED_IN' as const;
}

export async function logout() {
  const token = session?.accessToken;
  setSession(null);
  if (token) {
    await request('/auth/logout', { method: 'POST', token, body: {} }).catch(() => {});
  }
}

let refreshing: Promise<Session | null> | null = null;

/** 동시에 여러 요청이 401 을 받아도 갱신은 한 번만 한다 */
function refreshSession(stale: Session): Promise<Session | null> {
  // 다른 요청이 이미 갱신을 끝냈으면 그 세션을 쓴다
  if (session !== stale) return Promise.resolve(session);
  refreshing ??= request<SessionView>('/auth/refresh', {
    method: 'POST',
    body: { refreshToken: stale.refreshToken },
  })
    .then((view) => {
      // 갱신 중에 로그아웃했다면 세션을 되살리지 않는다
      if (session !== stale) return session;
      const next = fromView(view);
      setSession(next);
      return next;
    })
    .catch((error: unknown) => {
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        if (session !== stale) return session;
        setSession(null);
        return null;
      }
      throw error;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

const signedOutError = () => new ApiError(401, 'UNAUTHENTICATED', '다시 로그인해 주세요.');

/** 액세스 토큰을 붙여 보내고, 만료됐으면 한 번 갱신한 뒤 다시 보낸다 */
export async function authedRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  getState();
  let current = session;
  if (!current) throw signedOutError();
  if (current.expiresAt - EXPIRY_MARGIN_MS < Date.now()) {
    current = await refreshSession(current);
    if (!current) throw signedOutError();
  }
  try {
    return await request<T>(path, { ...options, token: current.accessToken });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    const renewed = await refreshSession(current);
    if (!renewed) throw signedOutError();
    return request<T>(path, { ...options, token: renewed.accessToken });
  }
}
