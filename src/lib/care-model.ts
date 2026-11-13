/**
 * 화면이 쓰는 HuCare 데이터 모양. 백엔드(care-api.ts)와 목업(care-mock.ts)이 모두 이 모양으로 돌려준다.
 */

/** 심박수 · 호흡수 · 산소포화도 · 심장 리듬 안정도(HRV) · 긴장도 · 체력 지표(VO2max) */
export const METRIC_KEYS = ['hr', 'rr', 'spo2', 'hrv', 'stress', 'vo2max'] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];

/** usual: 평소와 비슷 · changed: 평소와 다름 · unknown: 판단할 수 없음 */
export type Assessment = 'usual' | 'changed' | 'unknown';

/** 측정하지 못했거나 품질이 낮은 값은 value 가 null 이다 */
export type Metric = { value: number | null; assessment: Assessment };

export type Measurement = {
  id: string;
  at: Date;
  metrics: Record<MetricKey, Metric>;
};

export type CareEvent = {
  id: string;
  title: string;
  /** 상세 팝업 본문 줄 */
  lines: string[];
  at: Date;
  ack?: { by: string; at: Date };
};

export type Presence = 'present' | 'absent' | 'measuring' | 'difficult' | 'unknown';

/** 홈 보드 상태. 백엔드 /guardian/home 의 status.code 와 같다 */
export type HomeStatus = 'alert' | 'offline' | 'no_measurement' | 'unknown' | 'changed' | 'ok';

export type HomeSummary = {
  guardianName: string;
  /** 대상자 호칭 (예: 어머니). 없으면 이름 */
  subjectLabel: string;
  /** 기기 설치 장소 */
  place: string | null;
  presence: Presence;
  status: HomeStatus;
  statusMessage: string;
  latest: Measurement | null;
  /** 확인이 필요한 가장 중요한 알림 */
  primaryEvent: CareEvent | null;
};

export type DayStatus = 'normal' | 'alert' | 'unknown';

export type TimelineBar = { height: number; tone: 'idle' | 'home' | 'checked' };

export type DayRecord = {
  date: Date;
  status: DayStatus;
  measurementCount: number;
  /** 측정 시각 오름차순 */
  measurements: Measurement[];
  eventCount: number;
  /** 그날 심박수 범위. 유효한 측정이 없으면 null */
  heartRange: [number, number] | null;
  /** 시간대별 막대 그래프 */
  timeline: TimelineBar[];
};

/** none: 아직 오지 않은 날이거나 기록이 없는 날 (점 없음, 누를 수 없음) */
export type CalendarDay = { date: Date; status: DayStatus | 'none' };

export type MonthRecord = {
  days: CalendarDay[];
  /** 기록을 볼 수 있는 날 수 (오늘까지) */
  elapsedDays: number;
  usualDays: number;
  unknownDays: number;
  eventCount: number;
};

export type Profile = {
  subjectLabel: string;
  phone: string | null;
  place: string | null;
  /** 함께 보는 가족 (나 포함) */
  family: string[];
  careCenterPhone: string | null;
};

export type NightAlert = 'as-is' | 'morning';

export type NotificationPrefs = {
  fall: boolean;
  inactive: boolean;
  deviceOff: boolean;
  nightAlert: NightAlert;
};

/** 계정에 연결된 대상자가 없음 */
export class NoSubjectError extends Error {
  constructor() {
    super('아직 연결된 어르신이 없어요.');
    this.name = 'NoSubjectError';
  }
}

export type CareSource = {
  /** 화면의 "지금". 목업은 Figma 시안 시각으로 고정돼 있다 */
  now(): Date;
  home(): Promise<HomeSummary>;
  /** 최신순 */
  events(): Promise<CareEvent[]>;
  day(key: string): Promise<DayRecord>;
  month(year: number, month: number): Promise<MonthRecord>;
  profile(): Promise<Profile>;
  notificationPrefs(): Promise<NotificationPrefs>;
  updateNotificationPrefs(patch: Partial<NotificationPrefs>): Promise<NotificationPrefs>;
  acknowledge(id: string): Promise<CareEvent>;
  /** 로그아웃 시 대상자 등 기억해 둔 값을 버린다 */
  reset(): void;
};

const pad = (value: number) => String(value).padStart(2, '0');

/** 2026-10-26 */
export const dayKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** 2026-10 */
export const monthKey = (year: number, month: number) => `${year}-${pad(month + 1)}`;

/** 'YYYY-MM-DD' 를 로컬 자정 Date 로. 형식이 틀리면 null */
export function parseDayKey(key: string | undefined) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key ?? '');
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return dayKey(date) === key ? date : null;
}

export function isSameDay(a: Date, b: Date) {
  return dayKey(a) === dayKey(b);
}

export function average(values: number[]) {
  return values.length
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : null;
}

/** 유효한 값만 모은다 */
export function metricValues(measurements: Measurement[], key: MetricKey) {
  return measurements.flatMap(({ metrics }) =>
    metrics[key].value === null ? [] : [metrics[key].value],
  );
}
