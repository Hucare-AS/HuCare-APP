import { useEffect, useSyncExternalStore } from 'react';

import { api, apiEnabled, getSubjectId } from '@/lib/api';

/**
 * HuCare 데이터. 화면은 여기서 내보내는 함수와 훅만 쓴다.
 * 서버 연결됨: 알림 목록·확인, 대상자 정보(이름·연락처·가족).
 * 아직 목업(손대지 않음): 홈 화면(guardian·subject·건강 수치)과 기록 화면.
 * 토큰이 없으면 서버를 부르지 않고 빈 상태로 둔다.
 */

/** 시연 기준 시각 (Figma 시안의 "오늘" = 2026-10-26). 홈·기록 목업용 */
export const NOW = new Date(2026, 9, 26, 22, 30);

/** 홈 목업용 보호자 (홈 화면 전용. 알림 확인 표시는 서버 이름을 쓴다) */
export const guardian = { fullName: '김영희', givenName: '영희' };

/** 홈·기록 목업용 대상자. 설정·알림 화면은 useSubjectInfo 를 쓴다. */
export const subject = {
  relation: '어머니',
  phone: '010-0000-0000',
  place: '거실',
  family: '나, 동생',
  careCenterPhone: '011-0000-0000',
};

export type EventKind = 'fall' | 'inactive' | 'deviceOff';

export type CareEvent = {
  id: string;
  kind: EventKind;
  at: Date;
  heartRate?: number;
  ack?: { by: string; at: Date };
};

const EVENT_COPY: Record<EventKind, { title: string; body: (event: CareEvent) => string[] }> = {
  fall: {
    title: '넘어지셨을 수 있어요',
    body: (event) => [
      '카메라가 갑자기 쓰러지는 움직임을 감지했어요.',
      `전화로 안부를 확인해 주세요. 그 때 심박수는 ${event.heartRate}이었어요.`,
    ],
  },
  inactive: {
    title: '오래 움직임이 없었어요',
    body: (event) => [
      '평소보다 오랫동안 움직임이 보이지 않았어요.',
      `외출 중일 수도 있습니다. 그때 심박수는 ${event.heartRate}이었어요.`,
    ],
  },
  // Figma 에 상세 문구가 없어 임시로 쓴 문안
  deviceOff: {
    title: '기기가 꺼져 있었어요',
    body: () => ['기기가 꺼져 있는 동안에는 건강을 확인할 수 없어요.'],
  },
};

export const eventTitle = (event: CareEvent) => EVENT_COPY[event.kind].title;
export const eventBody = (event: CareEvent) => EVENT_COPY[event.kind].body(event);

// 불러오기 전·실패·대상 없음은 빈 목록이다.
let events: CareEvent[] = [];
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const emit = () => listeners.forEach((listener) => listener());

// 서버 이벤트 type → 앱 종류. 서버가 이 세 값 외의 type 을 줄 수도 있어, 모르는 값은 목록에서 뺀다.
const KIND_BY_API: Record<string, EventKind> = {
  fall: 'fall',
  inactivity: 'inactive',
  device_offline: 'deviceOff',
};

type RemoteEvent = {
  id: string;
  type: string;
  occurred_at: string;
  metrics?: Record<string, unknown> | null;
  acknowledgement: { user_name: string; acknowledged_at: string } | null;
};

function toCareEvent(raw: RemoteEvent): CareEvent | null {
  const kind = KIND_BY_API[raw.type];
  if (!kind) return null;
  // ponytail: metrics 는 기기가 보낸 JSON 그대로라 심박 키 이름이 고정이 아니다. 흔한 이름만 시도하고, 실제 센서 메시지를 보고 확정한다.
  const bpm = Number(raw.metrics?.heart_rate ?? raw.metrics?.heartRate ?? raw.metrics?.hr);
  return {
    id: raw.id,
    kind,
    at: new Date(raw.occurred_at),
    heartRate: Number.isFinite(bpm) ? bpm : undefined,
    ack: raw.acknowledgement
      ? { by: raw.acknowledgement.user_name, at: new Date(raw.acknowledgement.acknowledged_at) }
      : undefined,
  };
}

let loadStarted = false;

/** 서버에서 알림 목록을 한 번 받아 온다. 실패하면 목록은 비어 있고 다음 화면 진입 때 다시 시도한다. */
async function loadEvents() {
  if (loadStarted || !apiEnabled) return;
  loadStarted = true;
  void loadGuardian(); // 확인 표시에 쓸 내 이름
  try {
    const subjectId = await getSubjectId();
    if (!subjectId) return;
    const res = await api<{ items?: RemoteEvent[] }>(`/guardian/events?subject_id=${subjectId}`);
    events = (res.items ?? [])
      .map(toCareEvent)
      .filter((event): event is CareEvent => !!event)
      .sort((a, b) => b.at.getTime() - a.at.getTime());
    emit();
  } catch (error) {
    loadStarted = false;
    console.warn('알림을 불러오지 못했어요', error);
  }
}

/** 최신순 이벤트 목록 */
export function useEvents() {
  useEffect(() => {
    void loadEvents();
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => events,
    () => events,
  );
}

// ---- 보호자 (로그인한 사용자) ----
let guardianName = '';
let guardianStarted = false;

async function loadGuardian() {
  if (guardianStarted || !apiEnabled) return;
  guardianStarted = true;
  try {
    guardianName = (await api<{ name: string }>('/guardian/me')).name;
    emit();
  } catch (error) {
    guardianStarted = false;
    console.warn('보호자 정보를 불러오지 못했어요', error);
  }
}

/** 보호자가 알림을 확인했다고 기록한다. 화면을 먼저 바꾸고, 서버가 실패하면 되돌린다. */
export async function acknowledgeEvent(id: string) {
  if (!apiEnabled) return;
  const before = events;
  events = events.map((event) =>
    event.id === id && !event.ack ? { ...event, ack: { by: guardianName, at: new Date() } } : event,
  );
  emit();
  try {
    // 서버가 처음 확인한 사람·시각을 돌려준다. 이미 확인된 알림이면 그 기록을 그대로 쓴다.
    const confirmed = toCareEvent(await api<RemoteEvent>(`/events/${id}/ack`, { method: 'POST' }));
    if (confirmed) events = events.map((event) => (event.id === id ? confirmed : event));
  } catch {
    console.warn('확인 처리 실패', id);
    events = before;
  }
  emit();
}

// ---- 대상자 정보 (설정 화면): 연락처 · 가족 ----
type Contact = { id: string; kind: string; phone: string; version: number };
type RemoteInfo = { name: string; contacts: Contact[]; family: string[] };

let remoteInfo: RemoteInfo | null = null;
let infoLoad: Promise<void> | null = null;

function loadSubjectInfo() {
  if (!apiEnabled) return Promise.resolve();
  infoLoad ??= fetchSubjectInfo();
  return infoLoad;
}

async function fetchSubjectInfo() {
  try {
    const id = await getSubjectId();
    if (!id) return;
    const base = `/guardian/subjects/${id}`;
    const [info, contacts, members] = await Promise.all([
      api<{ name: string }>(base),
      api<{ items: Contact[] }>(`${base}/contacts`),
      api<{ items: { name: string }[] }>(`${base}/members`),
    ]);
    remoteInfo = {
      name: info.name,
      contacts: contacts.items,
      family: members.items.map((member) => member.name),
    };
    emit();
  } catch (error) {
    infoLoad = null;
    console.warn('대상자 정보를 불러오지 못했어요', error);
  }
}

const phoneOf = (info: RemoteInfo | null, kind: string) =>
  info?.contacts.find((c) => c.kind === kind)?.phone ?? '';

/** 대상자 대표 전화번호. 연락처가 없으면 빈 문자열. */
export async function subjectPhone() {
  await loadSubjectInfo();
  return phoneOf(remoteInfo, 'subject');
}

/**
 * 설정·알림 화면의 대상자 정보.
 * 전화번호·돌봄센터 연락처는 연락처 API 로 저장한다. 가족은 읽기만 한다 (추가는 초대 API 라 아직 미연결).
 */
export function useSubjectInfo() {
  useEffect(() => {
    void loadSubjectInfo();
  }, []);
  const remote = useSyncExternalStore(
    subscribe,
    () => remoteInfo,
    () => null,
  );
  return {
    name: remote?.name ?? '',
    phone: phoneOf(remote, 'subject'),
    family: remote?.family ?? [],
    careCenterPhone: phoneOf(remote, 'care_center'),
  };
}

/** 전화번호·돌봄센터 연락처 저장 */
export async function saveSubjectInfo(patch: { phone?: string; careCenterPhone?: string }) {
  if (patch.phone) await saveContact('subject', patch.phone);
  if (patch.careCenterPhone) await saveContact('care_center', patch.careCenterPhone);
}

async function saveContact(kind: 'subject' | 'care_center', phone: string) {
  const id = await getSubjectId();
  if (!id || !remoteInfo) return;
  const path = `/guardian/subjects/${id}/contacts`;
  const found = remoteInfo.contacts.find((c) => c.kind === kind);
  const saved = found
    ? await api<Contact>(`${path}/${found.id}`, {
        method: 'PATCH',
        body: { version: found.version, phone },
      })
    : await api<Contact>(path, {
        method: 'POST',
        body: { kind, name: kind === 'subject' ? remoteInfo.name : '돌봄센터', phone },
      });
  remoteInfo = {
    ...remoteInfo,
    contacts: [...remoteInfo.contacts.filter((c) => c.kind !== kind), saved],
  };
  emit();
}

export type Measurement = {
  id: string;
  at: Date;
  heartRate: number;
  breathRate: number;
  oxygen: number;
};

export type DayStatus = 'normal' | 'alert' | 'unknown';

export type DayRecord = {
  date: Date;
  status: DayStatus;
  measurements: Measurement[];
  /** 그날 심박수 범위. 측정이 없으면 null */
  heartRange: [number, number] | null;
};

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export { dayKey };

export function isSameDay(a: Date, b: Date) {
  return dayKey(a) === dayKey(b);
}

/** 평소 하루의 측정 시각과 값 */
const USUAL_DAY: [number, number, number, number, number][] = [
  [11, 30, 71, 14, 97],
  [13, 10, 72, 14, 96],
  [14, 40, 74, 15, 96],
  [16, 20, 75, 15, 96],
  [18, 0, 73, 14, 96],
  [19, 30, 73, 14, 95],
];

const DATA_YEAR = 2026;
const DATA_MONTH = 9;
const ALERT_DAYS = [25, 26];
const UNKNOWN_DAYS = [9];

function buildDay(day: number): DayRecord {
  const date = new Date(DATA_YEAR, DATA_MONTH, day);
  const status: DayStatus = UNKNOWN_DAYS.includes(day)
    ? 'unknown'
    : ALERT_DAYS.includes(day)
      ? 'alert'
      : 'normal';
  const isToday = isSameDay(date, NOW);
  const rows = status === 'unknown' ? [] : isToday ? USUAL_DAY.slice(0, 1) : USUAL_DAY;
  const measurements = rows.map(([hour, minute, heartRate, breathRate, oxygen]) => ({
    id: `${dayKey(date)}-${hour}${minute}`,
    at: new Date(DATA_YEAR, DATA_MONTH, day, hour, minute),
    heartRate,
    breathRate,
    oxygen,
  }));
  const heartRates = measurements.map((row) => row.heartRate);
  const heartRange: DayRecord['heartRange'] = isToday
    ? [67, 77]
    : heartRates.length
      ? [Math.min(...heartRates), Math.max(...heartRates)]
      : null;
  return { date, status, measurements, heartRange };
}

const records = new Map(
  Array.from({ length: NOW.getDate() }, (_, index) => buildDay(index + 1)).map((record) => [
    dayKey(record.date),
    record,
  ]),
);

/** 기록이 있는 날짜 키 목록 (정적 빌드용) */
export const recordDayKeys = [...records.keys()];

export function getDayRecord(date: Date) {
  return records.get(dayKey(date)) ?? null;
}

export function getDayRecordByKey(key: string) {
  return records.get(key) ?? null;
}

export function getTodayRecord() {
  return records.get(dayKey(NOW))!;
}

export function getMonthRecords(year: number, month: number) {
  return [...records.values()].filter(
    ({ date }) => date.getFullYear() === year && date.getMonth() === month,
  );
}

export const average = (values: number[]) =>
  Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);

/** 측정값 외에 "자세한 값 더보기"로 펼치는 지표 */
export const detailMetrics = { rhythm: 30, tension: 50, stamina: 31 };

export type TimelineBar = { height: number; tone: 'idle' | 'home' | 'checked' };

/** 오늘 하루 그래프 (Figma 832:1337 의 25칸) */
export const todayTimeline: TimelineBar[] = [
  ...Array.from({ length: 11 }, () => ({ height: 2, tone: 'idle' as const })),
  { height: 5, tone: 'home' },
  { height: 13, tone: 'home' },
  { height: 8, tone: 'checked' },
  { height: 41, tone: 'checked' },
  { height: 36, tone: 'home' },
  { height: 86, tone: 'checked' },
  { height: 47, tone: 'home' },
  { height: 23, tone: 'checked' },
  { height: 64, tone: 'home' },
  { height: 33, tone: 'checked' },
  { height: 6, tone: 'checked' },
  { height: 22, tone: 'home' },
  { height: 2, tone: 'idle' },
  { height: 2, tone: 'idle' },
];

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
  const minutes = Math.floor((NOW.getTime() - date.getTime()) / 60_000);
  if (minutes < 60) return `${Math.max(minutes, 1)}분 전`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}시간 전` : `${Math.floor(hours / 24)}일 전`;
}
