import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import { isApiMode } from '@/lib/api';
import { onSignOut } from '@/lib/auth';
import { apiSource } from '@/lib/care-api';
import { mockSource } from '@/lib/care-mock';
import {
  dayKey,
  type CareEvent,
  type CareSource,
  type ConsentPurpose,
  type DeletionKind,
  type DeviceInfo,
  type Invite,
  type NewSubject,
  type NotificationPrefs,
  parseDayKey,
  type ProfilePatch,
  type TrendBaseline,
  type TrendBucket,
  type TrendConfidence,
  type TrendMetric,
  type TrendMissing,
  type TrendPeriod,
  type TrendSeries,
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

/** 초대 입력 칸 문구 */
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

/** anchor 가 든 기간의 추세 (기본은 오늘) */
export function useTrend(metric: TrendMetric, period: TrendPeriod, anchor?: string) {
  const load = useCallback(() => {
    readSelected();
    return source.trend(metric, period, (anchor && parseDayKey(anchor)) || now());
  }, [metric, period, anchor]);
  return useResource(`trend:${metric}:${period}:${anchor ?? 'today'}`, load);
}

export type TrendPoint = {
  /** 가로 위치 0~1 */
  x: number;
  value: number;
  at: Date;
  /** 이 점에 모인 측정 수 (하루 평균이면 그날 측정 수) */
  count: number;
  confidence: TrendConfidence | null;
};

export type Trend = {
  /** 측정이 끊긴 곳에서 나뉜 선 */
  segments: TrendPoint[][];
  /** 측정이 없는 구간 [시작 x, 끝 x] */
  gaps: [number, number][];
  average: number | null;
  count: number;
  labels: { x: number; text: string }[];
  baseline: TrendBaseline;
  /** 값이 하나도 없을 때 가장 마지막 칸의 이유 */
  missing: TrendMissing | null;
};

const HOUR = 3_600_000;
/** 이 시간보다 오래 값이 없으면 선을 끊는다. 일간은 측정 간격, 그 밖은 하루 칸 기준 */
const BREAK_AFTER: Record<TrendPeriod, number> = {
  day: 3 * HOUR,
  week: 36 * HOUR,
  month: 36 * HOUR,
  year: 36 * HOUR,
};

function trendLabels(period: TrendPeriod, from: Date, x: (at: Date) => number) {
  const y = from.getFullYear();
  const m = from.getMonth();
  if (period === 'day') {
    return [0, 6, 12, 18].map((hour) => ({
      x: hour / 24,
      text: `${String(hour).padStart(2, '0')}:00`,
    }));
  }
  if (period === 'week') {
    return [0, 2, 4, 6].map((offset) => {
      const date = new Date(y, m, from.getDate() + offset);
      return {
        x: x(new Date(y, m, from.getDate() + offset, 12)),
        text: `${date.getMonth() + 1}/${date.getDate()}`,
      };
    });
  }
  if (period === 'month') {
    const days = new Date(y, m + 1, 0).getDate();
    return [1, 8, 15, 22, 29]
      .filter((day) => day <= days)
      .map((day) => ({ x: x(new Date(y, m, day, 12)), text: `${day}일` }));
  }
  return [0, 3, 6, 9].map((month) => ({ x: x(new Date(y, month, 15)), text: `${month + 1}월` }));
}

/** 서버(또는 목업) 추세 칸을 그래프 모양으로 바꾼다. 값이 없는 칸은 0 이 아니라 빈 구간으로 남긴다 */
export function buildTrend(series: TrendSeries, period: TrendPeriod): Trend {
  const from = series.from.getTime();
  const span = series.until.getTime() - from;
  const x = (at: Date) => Math.min(Math.max((at.getTime() - from) / span, 0), 1);
  const segments: TrendPoint[][] = [];
  const gaps: [number, number][] = [];
  const addGap = (start: number, end: number) => {
    const last = gaps[gaps.length - 1];
    if (last && start - last[1] < 1e-6) last[1] = Math.max(last[1], end);
    else if (end > start) gaps.push([start, end]);
  };
  let previous: TrendBucket | null = null;
  let sum = 0;
  let count = 0;
  for (const bucket of series.buckets) {
    if (bucket.value === null) {
      addGap(x(bucket.start), x(bucket.end));
      previous = null;
      continue;
    }
    const point: TrendPoint = {
      x: x(new Date((bucket.start.getTime() + bucket.end.getTime()) / 2)),
      value: Math.round(bucket.value),
      at: bucket.start,
      count: bucket.count,
      confidence: bucket.confidence,
    };
    sum += bucket.value * Math.max(bucket.count, 1);
    count += Math.max(bucket.count, 1);
    if (previous && bucket.start.getTime() - previous.end.getTime() <= BREAK_AFTER[period]) {
      segments[segments.length - 1].push(point);
    } else {
      if (previous) addGap(x(previous.end), x(bucket.start));
      segments.push([point]);
    }
    previous = bucket;
  }
  const lastMissing = [...series.buckets].reverse().find((bucket) => bucket.missing)?.missing;
  return {
    segments,
    gaps,
    average: count ? Math.round(sum / count) : null,
    count: series.buckets.reduce(
      (total, bucket) => total + (bucket.value === null ? 0 : bucket.count),
      0,
    ),
    labels: trendLabels(period, series.from, x),
    baseline: series.baseline,
    missing: count ? null : (lastMissing ?? 'not_measured'),
  };
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

// ── 설정 플로우: 기기 · 동의 · 고객지원 ─────────────────────────────

const loadDevices = withSubject(() => source.devices());
const loadConsents = withSubject(() => source.consents());
const loadDocuments = () => source.documents();

/** 고른 대상에 연결된 기기 */
export const useDevices = () => useResource('devices', loadDevices);

export const useConsents = () => useResource('consents', loadConsents);

/** 공지 · 안내 문서 */
export const useDocuments = () => useResource('documents', loadDocuments);

export function useDocument(id: string | undefined) {
  const load = useCallback(() => {
    if (!id) return Promise.reject(new Error('문서를 찾을 수 없어요.'));
    return source.document(id);
  }, [id]);
  return useResource(`document:${id ?? ''}`, load);
}

export const checkFirmware = (deviceId: string) => source.checkFirmware(deviceId);

export async function changeWifi(deviceId: string, network: string, password: string) {
  await source.changeWifi(deviceId, network, password);
  invalidate((key) => key === 'devices');
}

export const restartDevice = (deviceId: string) => source.restartDevice(deviceId);

/** 기기 연결을 해지하면 홈 · 대상 목록의 기기 정보도 바뀐다 */
export async function unlinkDevice(device: DeviceInfo) {
  try {
    await source.unlinkDevice(device);
  } finally {
    invalidate((key) => key === 'devices' || key === 'home' || key === 'subjects');
  }
}

export async function setConsent(purpose: ConsentPurpose, granted: boolean) {
  try {
    await source.setConsent(purpose, granted);
  } finally {
    invalidate((key) => key === 'consents' || key === 'home' || key.startsWith('media:'));
  }
}

export const requestDeletion = (kind: DeletionKind) => source.requestDeletion(kind);

/** 마지막으로 접수한 문의와 CS 모드 상태. CS 모드는 접수한 문의에만 켤 수 있다 */
type SupportState = { ticket: string | null; csMode: boolean };
const SUPPORT_KEY = 'hucare.support.v1';
let supportState: SupportState | null = null;
const supportListeners = new Set<() => void>();

function readSupport(): SupportState {
  if (supportState) return supportState;
  try {
    const saved = Platform.OS === 'web' ? window.localStorage.getItem(SUPPORT_KEY) : null;
    supportState = saved ? (JSON.parse(saved) as SupportState) : { ticket: null, csMode: false };
  } catch {
    supportState = { ticket: null, csMode: false };
  }
  return supportState;
}

function writeSupport(next: SupportState) {
  supportState = next;
  try {
    if (Platform.OS === 'web') window.localStorage.setItem(SUPPORT_KEY, JSON.stringify(next));
  } catch {
    // 저장하지 못해도 이번 세션에서는 유지된다
  }
  supportListeners.forEach((listener) => listener());
}

export function useSupportState() {
  return useSyncExternalStore(
    (listener) => {
      supportListeners.add(listener);
      return () => supportListeners.delete(listener);
    },
    readSupport,
    () => ({ ticket: null, csMode: false }) as SupportState,
  );
}

export async function sendSupport(message: string) {
  const ticket = await source.sendSupport(message);
  writeSupport({ ticket, csMode: false });
  return ticket;
}

export async function setCsMode(on: boolean) {
  const { ticket } = readSupport();
  if (!ticket) throw new Error('먼저 문의를 접수하면 CS 모드를 켤 수 있어요.');
  await source.setCsMode(ticket, on);
  writeSupport({ ticket, csMode: on });
}

/** 보호자 초대 화면(06-A)이 다시 열려도 같은 코드를 보여주도록 대상별로 기억한다 */
const invites = new Map<string, Invite>();

export function cachedInvite() {
  const invite = invites.get(readSelected() ?? '');
  return invite && invite.expiresAt.getTime() > now().getTime() ? invite : null;
}

export async function issueInvite() {
  const invite = await source.createInvite();
  invites.set(readSelected() ?? '', invite);
  return invite;
}
