import { Platform } from 'react-native';

import {
  dayKey,
  isSameDay,
  METRIC_KEYS,
  metricValues,
  parseDayKey,
  type CalendarDay,
  type CareEvent,
  type CareSource,
  type DayRecord,
  type DayStatus,
  type DeviceKind,
  type HomeStatus,
  type Measurement,
  type MetricKey,
  type NotificationPrefs,
  type Presence,
  type Profile,
  type SubjectKind,
  type SubjectSummary,
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

const UNKNOWN_DAYS = [9];

/** 카메라형 기기가 사진을 남기는 시각 (Figma 976:4855) */
const PHOTO_TIMES: [number, number][] = [
  [14, 30],
  [12, 0],
  [9, 30],
  [7, 0],
];

type MockSubject = {
  id: string;
  label: string;
  kind: SubjectKind;
  device: DeviceKind | null;
  /** 어머니 값에 더해 대상마다 다른 숫자를 만든다 */
  offset: { hr: number; rr: number };
  /** 기기 연결이 끊겨 오늘 기록이 없다 */
  offline: boolean;
  /** 새로 등록해 아직 측정 기록이 없다 */
  empty: boolean;
  presence: Presence;
  events: MockEvent[];
  profile: Profile;
  records?: Map<string, DayRecord>;
};

function newSubject(
  fields: Pick<MockSubject, 'id' | 'label' | 'kind' | 'device'> &
    Partial<MockSubject> & { place: string },
): MockSubject {
  return {
    offset: { hr: 0, rr: 0 },
    offline: false,
    empty: false,
    presence: 'present',
    events: [],
    ...fields,
    profile: fields.profile ?? {
      subjectLabel: fields.label,
      phone: null,
      place: fields.place,
      family: ['나'],
      careCenterPhone: null,
    },
  };
}

/** 홈 대상 목록 시안(976:4495)의 세 대상. 어머니가 기존 화면 시안의 데이터다 */
let subjects: MockSubject[] = [
  newSubject({
    id: 'mother',
    label: '어머니',
    kind: 'elder',
    device: 'camera',
    place: '거실',
    presence: 'measuring',
    events: [
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
    ],
    profile: {
      subjectLabel: '어머니',
      phone: '010-0000-0000',
      place: '거실',
      family: ['나', '동생'],
      careCenterPhone: '011-0000-0000',
    },
  }),
  newSubject({
    id: 'jiwoo',
    label: '지우',
    kind: 'child',
    device: 'camera',
    place: '놀이방',
    offset: { hr: 17, rr: 6 },
  }),
  newSubject({
    id: 'bori',
    label: '보리',
    kind: 'pet',
    device: 'radar',
    place: '거실',
    offset: { hr: 20, rr: 8 },
    offline: true,
    presence: 'unknown',
    events: [{ id: 'device-bori-1026', kind: 'deviceOff', at: new Date(2026, 9, 26, 13, 20) }],
  }),
];

let selectedId: string | null = null;

function current() {
  return subjects.find((subject) => subject.id === selectedId) ?? subjects[0];
}

function measurement(
  subject: MockSubject,
  date: Date,
  [hour, minute, hr, rr, spo2]: (typeof USUAL_DAY)[number],
): Measurement {
  const values: Record<MetricKey, number> = {
    hr: hr + subject.offset.hr,
    rr: rr + subject.offset.rr,
    spo2,
    ...DETAIL_VALUES,
  };
  return {
    id: `${subject.id}-${dayKey(date)}-${hour}${minute}`,
    at: new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute),
    metrics: Object.fromEntries(
      METRIC_KEYS.map((key) => [key, { value: values[key], assessment: 'usual' }]),
    ) as Measurement['metrics'],
  };
}

function buildDay(subject: MockSubject, date: Date): DayRecord {
  const isToday = isSameDay(date, NOW);
  const events = subject.events.filter((event) => isSameDay(event.at, date));
  const noData =
    subject.empty || (subject.offline && isToday) || UNKNOWN_DAYS.includes(date.getDate());
  const status: DayStatus = noData ? 'unknown' : events.length ? 'alert' : 'normal';
  const rows = noData ? [] : isToday ? USUAL_DAY.slice(0, 1) : USUAL_DAY;
  const measurements = rows.map((row) => measurement(subject, date, row));
  const heartRates = metricValues(measurements, 'hr');
  const isMotherToday = subject.id === 'mother' && isToday;
  return {
    date,
    status,
    measurementCount: measurements.length,
    measurements,
    eventCount: events.length,
    heartRange: isMotherToday
      ? [67, 77]
      : heartRates.length
        ? [Math.min(...heartRates), Math.max(...heartRates)]
        : null,
    timeline: isMotherToday ? TODAY_TIMELINE : [],
  };
}

/** 이번 달 1일부터 오늘까지. 새로 등록한 대상은 오늘 하루만 있다 */
function records(subject: MockSubject) {
  if (!subject.records) {
    const first = subject.empty ? NOW.getDate() : 1;
    const days = Array.from(
      { length: NOW.getDate() - first + 1 },
      (_, index) => new Date(NOW.getFullYear(), NOW.getMonth(), first + index),
    );
    subject.records = new Map(days.map((date) => [dayKey(date), buildDay(subject, date)]));
  }
  return subject.records;
}

function homeStatus(subject: MockSubject, unacked: MockEvent | undefined) {
  if (unacked && subject.offline && unacked.kind === 'deviceOff') {
    return { status: 'offline' as HomeStatus, message: '기기 연결이 끊겼어요.' };
  }
  if (unacked) return { status: 'alert' as HomeStatus, message: '확인할 소식이 있어요.' };
  if (subject.offline) return { status: 'offline' as HomeStatus, message: '기기 연결이 끊겼어요.' };
  if (subject.empty) {
    return { status: 'no_measurement' as HomeStatus, message: '아직 측정된 기록이 없어요.' };
  }
  return { status: 'ok' as HomeStatus, message: '평소와 비슷해요.' };
}

function latestOf(subject: MockSubject) {
  const today = records(subject).get(dayKey(NOW));
  return today?.measurements[today.measurements.length - 1] ?? null;
}

function summary(subject: MockSubject): SubjectSummary {
  const unacked = subject.events.filter((event) => !event.ack);
  const { status, message } = homeStatus(subject, unacked[0]);
  return {
    id: subject.id,
    label: subject.label,
    kind: subject.kind,
    place: subject.profile.place,
    device: subject.device,
    status,
    statusMessage: message,
    presence: subject.presence,
    primaryEventTitle: unacked[0] ? EVENT_COPY[unacked[0].kind].title : null,
    latest: latestOf(subject),
    unackedCount: unacked.length,
  };
}

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

/** 초대 코드로 참여하면 생기는 대상 */
const INVITED_ID = 'grandma';

/** 화면이 로딩 상태를 한 번 거치도록 비동기로 돌려준다 */
const resolve = <T>(value: T) => Promise.resolve(value);

export const mockSource: CareSource = {
  now: () => NOW,

  home() {
    const subject = current();
    const unacked = subject.events.find((event) => !event.ack);
    const { status, message } = homeStatus(subject, unacked);
    return resolve({
      guardianName: GUARDIAN_NAME,
      subjectLabel: subject.label,
      device: subject.device,
      place: subject.profile.place,
      presence: subject.presence,
      status,
      statusMessage: message,
      latest: latestOf(subject),
      primaryEvent: unacked ? toCareEvent(unacked) : null,
    });
  },

  events: () => resolve(current().events.map(toCareEvent)),

  day(key) {
    const record = records(current()).get(key);
    return record ? resolve(record) : Promise.reject(new Error('이 날짜의 기록을 찾을 수 없어요.'));
  },

  month(year, month) {
    const subject = current();
    const byKey = records(subject);
    const lastDay = new Date(year, month + 1, 0).getDate();
    const days: CalendarDay[] = Array.from({ length: lastDay }, (_, index) => {
      const date = new Date(year, month, index + 1);
      return { date, status: byKey.get(dayKey(date))?.status ?? 'none' };
    });
    const recorded = days.filter((day) => day.status !== 'none');
    return resolve({
      days,
      elapsedDays: recorded.length,
      usualDays: recorded.filter((day) => day.status === 'normal').length,
      unknownDays: recorded.filter((day) => day.status === 'unknown').length,
      eventCount: subject.events.filter(
        ({ at }) => at.getFullYear() === year && at.getMonth() === month,
      ).length,
    });
  },

  profile: () => resolve(current().profile),

  saveContacts(patch) {
    const subject = current();
    subject.profile = {
      ...subject.profile,
      ...(patch.phone && { phone: patch.phone }),
      ...(patch.careCenterPhone && { careCenterPhone: patch.careCenterPhone }),
    };
    return resolve(undefined);
  },

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
    const subject = current();
    subject.events = subject.events.map((event) =>
      event.id === id && !event.ack ? { ...event, ack: { by: GUARDIAN_NAME, at: NOW } } : event,
    );
    const event = subject.events.find((item) => item.id === id);
    return event
      ? resolve(toCareEvent(event))
      : Promise.reject(new Error('알림을 찾을 수 없어요.'));
  },

  subjects: () => resolve(subjects.map(summary)),

  setSubject(id) {
    selectedId = id;
  },

  createSubject({ kind, name, place }) {
    const id = `new-${subjects.length + 1}`;
    subjects = [
      ...subjects,
      newSubject({ id, label: name, kind, device: null, place, empty: true }),
    ];
    return resolve(id);
  },

  joinByInvite(code) {
    if (!/^\d{6}$/.test(code.trim())) {
      return Promise.reject(new Error('6자리 숫자 코드를 입력해 주세요.'));
    }
    if (subjects.some((subject) => subject.id === INVITED_ID)) {
      return Promise.reject(new Error('이미 참여한 대상이에요.'));
    }
    subjects = [
      ...subjects,
      newSubject({
        id: INVITED_ID,
        label: '할머니',
        kind: 'elder',
        device: 'radar',
        place: '안방',
        offset: { hr: -3, rr: 1 },
      }),
    ];
    return resolve(undefined);
  },

  inviteInput: {
    label: '6자리 초대 코드',
    placeholder: '초대 코드 6자리를 입력해주세요',
    hint: '코드가 만료됐다면 새 코드를 요청하세요.',
  },

  media(key) {
    const subject = current();
    if (subject.device !== 'camera') {
      return resolve({
        supported: false,
        reason: subject.device
          ? '레이더형 기기는 사진과 영상을 남기지 않아요.'
          : '카메라형 기기를 연결하면 사진을 볼 수 있어요.',
      });
    }
    const date = parseDayKey(key);
    const record = records(subject).get(key);
    if (!date || !record?.measurementCount)
      return resolve({ supported: true, photos: [], videos: [] });
    const place = subject.profile.place ?? '집';
    const photos = PHOTO_TIMES.map(([hour, minute]) => ({
      id: `${key}-${hour}${minute}`,
      at: new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute),
      place,
      title: `${place} 사진`,
    })).filter((photo) => photo.at <= NOW);
    const videos = subject.events
      .filter((event) => event.kind !== 'deviceOff' && isSameDay(event.at, date))
      .map((event) => ({ id: event.id, at: event.at, place, title: EVENT_COPY[event.kind].title }));
    return resolve({ supported: true, photos, videos });
  },

  reset() {},
};
