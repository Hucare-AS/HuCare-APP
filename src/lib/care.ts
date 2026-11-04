import { useSyncExternalStore } from 'react';

/**
 * HuCare 데이터 (목업).
 * 백엔드가 생기면 이 파일의 내용만 API 호출로 바꾼다. 화면은 여기서 내보내는 함수와 훅만 쓴다.
 * 날짜를 고정해 두어 Figma 시안과 같은 화면이 나오고, 새로고침하면 "확인했어요" 상태가 처음으로 돌아간다.
 */

/** 시연 기준 시각 (Figma 시안의 "오늘" = 2026-10-26) */
export const NOW = new Date(2026, 9, 26, 22, 30);

export const guardian = { fullName: '김영희', givenName: '영희' };

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

const initialEvents: CareEvent[] = [
  { id: 'fall-1026', kind: 'fall', at: new Date(2026, 9, 26, 19, 30), heartRate: 48 },
  {
    id: 'inactive-1026',
    kind: 'inactive',
    at: new Date(2026, 9, 26, 17, 54),
    heartRate: 70,
    ack: { by: guardian.fullName, at: new Date(2026, 9, 26, 18, 18) },
  },
  {
    id: 'device-1025',
    kind: 'deviceOff',
    at: new Date(2026, 9, 25, 16, 54),
    ack: { by: guardian.fullName, at: new Date(2026, 9, 25, 17, 1) },
  },
];

let events = initialEvents;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 최신순 이벤트 목록 */
export function useEvents() {
  return useSyncExternalStore(
    subscribe,
    () => events,
    () => initialEvents,
  );
}

/** 보호자가 알림을 확인했다고 기록한다. 이미 확인한 알림은 처음 기록을 유지한다. */
export function acknowledgeEvent(id: string) {
  events = events.map((event) =>
    event.id === id && !event.ack ? { ...event, ack: { by: guardian.fullName, at: NOW } } : event,
  );
  listeners.forEach((listener) => listener());
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
