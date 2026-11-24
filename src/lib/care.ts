import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import { isApiMode } from '@/lib/api';
import { onSignOut } from '@/lib/auth';
import { apiSource } from '@/lib/care-api';
import { mockSource } from '@/lib/care-mock';
import {
  average,
  dayKey,
  metricValues,
  type CareEvent,
  type CareSource,
  type DayRecord,
  type NewSubject,
  type NotificationPrefs,
  type ProfilePatch,
} from '@/lib/care-model';
import { clearResources, forget, invalidate, mutate, useResource } from '@/lib/resource';

/**
 * HuCare 데이터. 화면은 이 모듈이 내보내는 훅과 함수만 쓴다.
 * EXPO_PUBLIC_API_URL 이 있으면 백엔드(care-api.ts), 없으면 목업(care-mock.ts)에서 읽는다.
 */
export * from '@/lib/care-model';

const source: CareSource = isApiMode ? apiSource : mockSource;

/** 고른 대상은 웹 localStorage 에 남겨 새로고침해도 유지한다 */
const SUBJECT_KEY = 'hucare.subject.v1';

function webStorage(): Storage | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

let selectedSubject: string | null = null;
let subjectLoaded = false;
const subjectListeners = new Set<() => void>();

function readSelected() {
  if (!subjectLoaded) {
    subjectLoaded = true;
    try {
      selectedSubject = webStorage()?.getItem(SUBJECT_KEY) ?? null;
    } catch {
      selectedSubject = null;
    }
    source.setSubject(selectedSubject);
  }
  return selectedSubject;
}

function writeSelected(id: string | null) {
  selectedSubject = id;
  subjectLoaded = true;
  source.setSubject(id);
  try {
    if (id) webStorage()?.setItem(SUBJECT_KEY, id);
    else webStorage()?.removeItem(SUBJECT_KEY);
  } catch {
    // 저장이 막혀 있으면 이번 실행에서만 기억한다
  }
  subjectListeners.forEach((listener) => listener());
}

onSignOut(() => {
  source.reset();
  writeSelected(null);
  clearResources();
});

/** 화면이 대상별 데이터를 읽기 전에 저장된 선택을 소스에 알려 준다 */
function withSubject<T>(load: () => Promise<T>) {
  return () => {
    readSelected();
    return load();
  };
}

function subscribeSelected(listener: () => void) {
  subjectListeners.add(listener);
  return () => {
    subjectListeners.delete(listener);
  };
}

/** 고른 대상 id. null 이면 첫 번째 대상을 보여주는 중이다 */
export function useSelectedSubjectId() {
  return useSyncExternalStore(subscribeSelected, readSelected, () => null);
}

/** 대상을 바꾸면 이전 대상의 값은 버리고 새로 불러온다 */
export function selectSubject(id: string) {
  if (readSelected() === id) return;
  writeSelected(id);
  forget((key) => key !== 'subjects');
}

const loadSubjects = withSubject(() => source.subjects());

/** 계정의 모든 돌봄 대상 */
export const useSubjects = () => useResource('subjects', loadSubjects);

/** 대상을 등록하고 그 대상을 고른다 */
export async function createSubject(input: NewSubject) {
  const id = await source.createSubject(input);
  invalidate((key) => key === 'subjects');
  selectSubject(id);
  return id;
}

/** 받은 초대가 누구의 어떤 대상인지 확인한다 */
export const previewInvite = (code: string) => source.previewInvite(code);

/** 초대받은 대상에 참여한다 */
export async function acceptInvite(code: string) {
  await source.acceptInvite(code);
  invalidate((key) => key === 'subjects');
}

export const declineInvite = (code: string) => source.declineInvite(code);

/** 함께 볼 가족에게 보낼 초대를 만든다 */
export const createInvite = () => source.createInvite();

/**
 * 고른 대상의 변경을 실시간으로 받아 화면 값을 새로 불러온다 (웹 · 백엔드 모드).
 * 권한이 회수되면 대상 목록부터 다시 읽는다.
 */
export function useLiveUpdates(enabled: boolean) {
  const selected = useSelectedSubjectId();
  useEffect(() => {
    if (!enabled || !source.watch) return;
    readSelected();
    return source.watch((change) => {
      if (change === 'membership_revoked') {
        writeSelected(null);
        forget(() => true);
      } else {
        invalidate((key) => key !== 'prefs');
      }
    });
  }, [enabled, selected]);
}

/** 초대 입력 칸 문구 (목업: 6자리 코드, 백엔드: 초대 링크) */
export const inviteInput = source.inviteInput;

/** 화면의 "지금" */
export const now = () => source.now();

export const todayKey = () => dayKey(now());

const loadHome = withSubject(() => source.home());
const loadEvents = withSubject(() => source.events());
const loadProfile = withSubject(() => source.profile());
const loadPrefs = withSubject(() => source.notificationPrefs());

export const useHome = () => useResource('home', loadHome);

/** 최신순 알림 목록 */
export const useEvents = () => useResource('events', loadEvents);

export function useDayRecord(key: string | null) {
  const load = useCallback(() => {
    readSelected();
    return source.day(key!);
  }, [key]);
  return useResource(key ? `day:${key}` : null, load);
}

export function useMonthRecord(year: number, month: number) {
  const load = useCallback(() => {
    readSelected();
    return source.month(year, month);
  }, [year, month]);
  return useResource(`month:${year}-${month}`, load);
}

/** 날짜별 사진 · 이벤트 영상 */
export function useMedia(key: string) {
  const load = useCallback(() => {
    readSelected();
    return source.media(key);
  }, [key]);
  return useResource(`media:${key}`, load);
}

export type TrendPeriod = 'day' | 'week' | 'month' | 'year';
export type TrendMetric = 'hr' | 'rr' | 'spo2';

/** 그 기간에 볼 날짜들. 연간은 날짜별로 다 불러올 수 없어 아직 지원하지 않는다 */
function trendDays(period: TrendPeriod) {
  const today = now();
  const at = (offset: number) =>
    new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
  if (period === 'day') return [at(0)];
  if (period === 'week') return Array.from({ length: 7 }, (_, index) => at(6 - index));
  if (period === 'month') {
    return Array.from(
      { length: today.getDate() },
      (_, index) => new Date(today.getFullYear(), today.getMonth(), index + 1),
    );
  }
  return null;
}

/** 기간 안의 날짜별 기록. 기록이 없는 날은 빠진다. 연간이면 null */
async function loadTrendDays(period: TrendPeriod) {
  readSelected();
  const days = trendDays(period);
  if (!days) return null;
  const results = await Promise.allSettled(days.map((date) => source.day(dayKey(date))));
  const records = results.flatMap((result) =>
    result.status === 'fulfilled' ? [result.value] : [],
  );
  const failed = results.find((result) => result.status === 'rejected');
  if (!records.length && failed) throw failed.reason;
  return records;
}

export function useTrendDays(period: TrendPeriod) {
  const load = useCallback(() => loadTrendDays(period), [period]);
  return useResource(`trend:${period}`, load);
}

export type TrendPoint = {
  /** 가로 위치 0~1 */
  x: number;
  value: number;
  at: Date;
  /** 이 점에 모인 측정 수 (하루 평균이면 그날 측정 수) */
  count: number;
};

export type Trend = {
  /** 측정이 끊긴 곳에서 나뉜 선 */
  segments: TrendPoint[][];
  /** 측정이 없는 구간 [시작 x, 끝 x] */
  gaps: [number, number][];
  average: number | null;
  count: number;
  labels: { x: number; text: string }[];
};

/** 일간: 이 시간보다 오래 측정이 없으면 선을 끊는다 */
const DAY_GAP_HOURS = 3;

function dayTrend(record: DayRecord | undefined, metric: TrendMetric) {
  const points = (record?.measurements ?? []).flatMap((measurement) => {
    const value = measurement.metrics[metric].value;
    const hours = measurement.at.getHours() + measurement.at.getMinutes() / 60;
    return value === null ? [] : [{ x: hours / 24, value, at: measurement.at, count: 1 }];
  });
  const segments: TrendPoint[][] = [];
  const gaps: [number, number][] = [];
  points.forEach((point, index) => {
    const previous = points[index - 1];
    if (previous && point.x - previous.x <= DAY_GAP_HOURS / 24) {
      segments[segments.length - 1].push(point);
    } else {
      if (previous) gaps.push([previous.x, point.x]);
      segments.push([point]);
    }
  });
  const labels = [0, 6, 12, 18].map((hour) => ({
    x: hour / 24,
    text: `${String(hour).padStart(2, '0')}:00`,
  }));
  return { segments, gaps, labels };
}

/** 주간 · 월간: 하루 평균을 한 점으로 */
function dailyTrend(records: DayRecord[], metric: TrendMetric, period: 'week' | 'month') {
  const days = trendDays(period) ?? [];
  const today = now();
  const slots =
    period === 'week' ? 7 : new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const byKey = new Map(records.map((record) => [dayKey(record.date), record]));
  const segments: TrendPoint[][] = [];
  const gaps: [number, number][] = [];
  let open = false;
  days.forEach((date, index) => {
    const slot = period === 'week' ? index : date.getDate() - 1;
    const values = metricValues(byKey.get(dayKey(date))?.measurements ?? [], metric);
    const value = average(values);
    if (value === null) {
      gaps.push([slot / slots, (slot + 1) / slots]);
      open = false;
      return;
    }
    const point = { x: (slot + 0.5) / slots, value, at: date, count: values.length };
    if (open) segments[segments.length - 1].push(point);
    else segments.push([point]);
    open = true;
  });
  const labels =
    period === 'week'
      ? [0, 2, 4, 6].map((index) => ({
          x: (index + 0.5) / 7,
          text: `${days[index].getMonth() + 1}/${days[index].getDate()}`,
        }))
      : [1, 8, 15, 22, 29]
          .filter((day) => day <= slots)
          .map((day) => ({ x: (day - 0.5) / slots, text: `${day}일` }));
  return { segments, gaps, labels };
}

export function buildTrend(records: DayRecord[], metric: TrendMetric, period: TrendPeriod): Trend {
  const values = records.flatMap((record) => metricValues(record.measurements, metric));
  const shape =
    period === 'day'
      ? dayTrend(records[0], metric)
      : dailyTrend(records, metric, period === 'week' ? 'week' : 'month');
  return { ...shape, average: average(values), count: values.length };
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

/** 연락처 저장·삭제, 설치 장소 저장. 실패해도 서버 값으로 다시 불러온다 */
export async function saveProfile(patch: ProfilePatch) {
  try {
    await source.saveProfile(patch);
  } finally {
    invalidate((key) => key === 'profile' || key === 'home' || key === 'subjects');
  }
}

/** 함께 보는 가족을 내보낸다. 나를 내보내면 이 대상에서 나가고 첫 번째 대상으로 돌아간다 */
export async function removeMember(id: string, me: boolean) {
  await source.removeMember(id);
  if (me) {
    writeSelected(null);
    forget(() => true);
  } else {
    invalidate((key) => key === 'profile');
  }
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
