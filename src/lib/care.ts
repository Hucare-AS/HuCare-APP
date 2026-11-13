import { useCallback } from 'react';

import { isApiMode } from '@/lib/api';
import { onSignOut } from '@/lib/auth';
import { apiSource } from '@/lib/care-api';
import { mockSource } from '@/lib/care-mock';
import { dayKey, type CareEvent, type CareSource, type NotificationPrefs } from '@/lib/care-model';
import { clearResources, invalidate, mutate, useResource } from '@/lib/resource';

/**
 * HuCare 데이터. 화면은 이 모듈이 내보내는 훅과 함수만 쓴다.
 * EXPO_PUBLIC_API_URL 이 있으면 백엔드(care-api.ts), 없으면 목업(care-mock.ts)에서 읽는다.
 */
export * from '@/lib/care-model';

const source: CareSource = isApiMode ? apiSource : mockSource;

onSignOut(() => {
  source.reset();
  clearResources();
});

/** 화면의 "지금" */
export const now = () => source.now();

export const todayKey = () => dayKey(now());

const loadHome = () => source.home();
const loadEvents = () => source.events();
const loadProfile = () => source.profile();
const loadPrefs = () => source.notificationPrefs();

export const useHome = () => useResource('home', loadHome);

/** 최신순 알림 목록 */
export const useEvents = () => useResource('events', loadEvents);

export function useDayRecord(key: string | null) {
  const load = useCallback(() => source.day(key!), [key]);
  return useResource(key ? `day:${key}` : null, load);
}

export function useMonthRecord(year: number, month: number) {
  const load = useCallback(() => source.month(year, month), [year, month]);
  return useResource(`month:${year}-${month}`, load);
}

export const useProfile = () => useResource('profile', loadProfile);

export const useNotificationPrefs = () => useResource('prefs', loadPrefs);

/** 바로 화면에 반영하고, 저장에 실패하면 서버 값으로 되돌린다 */
export async function updateNotificationPrefs(patch: Partial<NotificationPrefs>) {
  mutate<NotificationPrefs>('prefs', (current) => ({ ...current!, ...patch }));
  try {
    const saved = await source.updateNotificationPrefs(patch);
    mutate<NotificationPrefs>('prefs', () => saved);
  } catch {
    invalidate((key) => key === 'prefs');
  }
}

/** 보호자가 알림을 확인했다고 기록한다. 이미 확인한 알림은 처음 기록을 유지한다. */
export async function acknowledgeEvent(id: string) {
  const event = await source.acknowledge(id);
  mutate<CareEvent[]>('events', (events) =>
    (events ?? []).map((item) => (item.id === id ? event : item)),
  );
  invalidate((key) => key !== 'events' && key !== 'prefs' && key !== 'profile');
  return event;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export const formatDate = (date: Date) => `${date.getMonth() + 1}월 ${date.getDate()}일`;

export const formatDateWithWeekday = (date: Date) =>
  `${formatDate(date)} ${WEEKDAYS[date.getDay()]}요일`;

export const formatFullDate = (date: Date) => `${date.getFullYear()}년 ${formatDate(date)}`;

/** 오전 11:30 */
export function formatTime(date: Date) {
  const hour = date.getHours();
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${hour < 12 ? '오전' : '오후'} ${String(hour12).padStart(2, '0')}:${minute}`;
}

/** 3시간 전 */
export function formatElapsed(date: Date) {
  const minutes = Math.floor((now().getTime() - date.getTime()) / 60_000);
  if (minutes < 60) return `${Math.max(minutes, 1)}분 전`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}시간 전` : `${Math.floor(hours / 24)}일 전`;
}

/** 받침에 따라 은/는 을 붙인다: 어머니는, 김영숙은 */
export function withTopic(word: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return `${word}는`;
  return `${word}${code % 28 === 0 ? '는' : '은'}`;
}

/** 인사말용 이름: 세 글자 한글 이름은 성을 뗀다 (김영희 → 영희) */
export function givenName(fullName: string) {
  return /^[가-힣]{3}$/.test(fullName) ? fullName.slice(1) : fullName;
}

/** 오류를 사람이 읽을 문장으로 */
export function errorMessage(error: Error | null) {
  return error?.message || '정보를 불러오지 못했어요.';
}
