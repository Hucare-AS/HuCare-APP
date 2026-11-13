import { Platform } from 'react-native';

import {
  dayKey,
  isSameDay,
  METRIC_KEYS,
  metricValues,
  type CalendarDay,
  type CareEvent,
  type CareSource,
  type DayRecord,
  type DayStatus,
  type Measurement,
  type MetricKey,
  type NotificationPrefs,
  type TimelineBar,
} from '@/lib/care-model';

/**
 * 목업 데이터. EXPO_PUBLIC_API_URL 이 비어 있을 때 쓴다 (시연 · E2E).
 * 날짜를 고정해 두어 Figma 시안과 같은 화면이 나오고, 새로고침하면 "확인했어요" 상태가 처음으로 돌아간다.
 */

/** 시연 기준 시각 (Figma 시안의 "오늘" = 2026-10-26) */
const NOW = new Date(2026, 9, 26, 22, 30);

const GUARDIAN_NAME = '김영희';

type MockEvent = {
  id: string;
  kind: 'fall' | 'inactive' | 'deviceOff';
  at: Date;
  heartRate?: number;
  ack?: { by: string; at: Date };
};

const EVENT_COPY: Record<
  MockEvent['kind'],
  { title: string; lines: (event: MockEvent) => string[] }
> = {
  fall: {
    title: '넘어지셨을 수 있어요',
    lines: (event) => [
      '카메라가 갑자기 쓰러지는 움직임을 감지했어요.',
      `전화로 안부를 확인해 주세요. 그 때 심박수는 ${event.heartRate}이었어요.`,
    ],
  },
  inactive: {
    title: '오래 움직임이 없었어요',
    lines: (event) => [
      '평소보다 오랫동안 움직임이 보이지 않았어요.',
      `외출 중일 수도 있습니다. 그때 심박수는 ${event.heartRate}이었어요.`,
    ],
  },
  // Figma 에 상세 문구가 없어 임시로 쓴 문안
  deviceOff: {
    title: '기기가 꺼져 있었어요',
    lines: () => ['기기가 꺼져 있는 동안에는 건강을 확인할 수 없어요.'],
  },
};

let events: MockEvent[] = [
  { id: 'fall-1026', kind: 'fall', at: new Date(2026, 9, 26, 19, 30), heartRate: 48 },
  {
    id: 'inactive-1026',
    kind: 'inactive',
    at: new Date(2026, 9, 26, 17, 54),
    heartRate: 70,
    ack: { by: GUARDIAN_NAME, at: new Date(2026, 9, 26, 18, 18) },
  },
  {
    id: 'device-1025',
    kind: 'deviceOff',
    at: new Date(2026, 9, 25, 16, 54),
    ack: { by: GUARDIAN_NAME, at: new Date(2026, 9, 25, 17, 1) },
  },
];

const toCareEvent = (event: MockEvent): CareEvent => ({
  id: event.id,
  title: EVENT_COPY[event.kind].title,
  lines: EVENT_COPY[event.kind].lines(event),
  at: event.at,
  ack: event.ack,
});

/** 평소 하루의 측정 시각과 값: 시, 분, 심박수, 호흡수, 산소포화도 */
const USUAL_DAY: [number, number, number, number, number][] = [
  [11, 30, 71, 14, 97],
  [13, 10, 72, 14, 96],
  [14, 40, 74, 15, 96],
  [16, 20, 75, 15, 96],
  [18, 0, 73, 14, 96],
  [19, 30, 73, 14, 95],
];

/** "자세한 값 더보기" 지표 */
const DETAIL_VALUES: Pick<Record<MetricKey, number>, 'hrv' | 'stress' | 'vo2max'> = {
  hrv: 30,
  stress: 50,
  vo2max: 31,
};

/** 오늘 하루 그래프 (Figma 832:1337 의 25칸) */
const TODAY_TIMELINE: TimelineBar[] = [
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

const DATA_YEAR = 2026;
const DATA_MONTH = 9;
const ALERT_DAYS = [25, 26];
const UNKNOWN_DAYS = [9];

function measurement(date: Date, [hour, minute, hr, rr, spo2]: (typeof USUAL_DAY)[number]) {
  const values: Record<MetricKey, number> = { hr, rr, spo2, ...DETAIL_VALUES };
  return {
    id: `${dayKey(date)}-${hour}${minute}`,
    at: new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute),
    metrics: Object.fromEntries(
      METRIC_KEYS.map((key) => [key, { value: values[key], assessment: 'usual' }]),
    ) as Measurement['metrics'],
  };
}

function buildDay(day: number): DayRecord {
  const date = new Date(DATA_YEAR, DATA_MONTH, day);
  const status: DayStatus = UNKNOWN_DAYS.includes(day)
    ? 'unknown'
    : ALERT_DAYS.includes(day)
      ? 'alert'
      : 'normal';
  const isToday = isSameDay(date, NOW);
  const rows = status === 'unknown' ? [] : isToday ? USUAL_DAY.slice(0, 1) : USUAL_DAY;
  const measurements = rows.map((row) => measurement(date, row));
  const heartRates = metricValues(measurements, 'hr');
  const heartRange: DayRecord['heartRange'] = isToday
    ? [67, 77]
    : heartRates.length
      ? [Math.min(...heartRates), Math.max(...heartRates)]
      : null;
  return {
    date,
    status,
    measurementCount: measurements.length,
    measurements,
    eventCount: events.filter((event) => isSameDay(event.at, date)).length,
    heartRange,
    timeline: isToday ? TODAY_TIMELINE : [],
  };
}

const records = new Map(
  Array.from({ length: NOW.getDate() }, (_, index) => buildDay(index + 1)).map((record) => [
    dayKey(record.date),
    record,
  ]),
);

/** Figma 설정 화면(786:539)의 초기 상태 */
const DEFAULT_PREFS: NotificationPrefs = {
  fall: true,
  inactive: true,
  deviceOff: false,
  nightAlert: 'as-is',
};

/** 목업 알림 설정은 웹 localStorage 에 남긴다 (실제 모드에서는 계정에 저장) */
const PREFS_KEY = 'hucare.mock-notifications.v1';

function webStorage(): Storage | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function loadPrefs(): NotificationPrefs {
  try {
    const saved = webStorage()?.getItem(PREFS_KEY);
    return saved ? { ...DEFAULT_PREFS, ...JSON.parse(saved) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

let prefs: NotificationPrefs | null = null;

/** 화면이 로딩 상태를 한 번 거치도록 비동기로 돌려준다 */
const resolve = <T>(value: T) => Promise.resolve(value);

export const mockSource: CareSource = {
  now: () => NOW,

  home() {
    const today = records.get(dayKey(NOW))!;
    const unacked = events.find((event) => !event.ack);
    return resolve({
      guardianName: GUARDIAN_NAME,
      subjectLabel: '어머니',
      place: '거실',
      presence: 'measuring',
      status: unacked ? 'alert' : 'ok',
      statusMessage: unacked ? '확인할 소식이 있어요.' : '평소와 비슷해요.',
      latest: today.measurements[today.measurements.length - 1] ?? null,
      primaryEvent: unacked ? toCareEvent(unacked) : null,
    });
  },

  events: () => resolve(events.map(toCareEvent)),

  day(key) {
    const record = records.get(key);
    return record ? resolve(record) : Promise.reject(new Error('이 날짜의 기록을 찾을 수 없어요.'));
  },

  month(year, month) {
    const lastDay = new Date(year, month + 1, 0).getDate();
    const days: CalendarDay[] = Array.from({ length: lastDay }, (_, index) => {
      const date = new Date(year, month, index + 1);
      return { date, status: records.get(dayKey(date))?.status ?? 'none' };
    });
    const recorded = days.filter((day) => day.status !== 'none');
    return resolve({
      days,
      elapsedDays: recorded.length,
      usualDays: recorded.filter((day) => day.status === 'normal').length,
      unknownDays: recorded.filter((day) => day.status === 'unknown').length,
      eventCount: events.filter(({ at }) => at.getFullYear() === year && at.getMonth() === month)
        .length,
    });
  },

  profile: () =>
    resolve({
      subjectLabel: '어머니',
      phone: '010-0000-0000',
      place: '거실',
      family: ['나', '동생'],
      careCenterPhone: '011-0000-0000',
    }),

  notificationPrefs: () => resolve((prefs ??= loadPrefs())),

  updateNotificationPrefs(patch) {
    const next = { ...(prefs ?? loadPrefs()), ...patch };
    prefs = next;
    try {
      webStorage()?.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {
      // 저장이 막혀 있으면 메모리 값으로만 동작한다
    }
    return resolve(next);
  },

  acknowledge(id) {
    events = events.map((event) =>
      event.id === id && !event.ack ? { ...event, ack: { by: GUARDIAN_NAME, at: NOW } } : event,
    );
    const event = events.find((item) => item.id === id);
    return event
      ? resolve(toCareEvent(event))
      : Promise.reject(new Error('알림을 찾을 수 없어요.'));
  },

  reset() {},
};
