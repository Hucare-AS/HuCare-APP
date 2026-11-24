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

/** 돌봄 대상 종류. 백엔드는 아직 반려동물을 받지 않는다 */
export type SubjectKind = 'elder' | 'child' | 'pet';

/** 카메라형만 사진·영상을 볼 수 있다. 백엔드가 기기 모델을 알려주지 않으면 null */
export type DeviceKind = 'camera' | 'radar';

/** 홈 대상 목록 카드 (Figma 976:4495) */
export type SubjectSummary = {
  id: string;
  label: string;
  kind: SubjectKind;
  place: string | null;
  device: DeviceKind | null;
  status: HomeStatus;
  statusMessage: string;
  presence: Presence;
  /** 확인이 필요한 가장 중요한 알림 제목 */
  primaryEventTitle: string | null;
  latest: Measurement | null;
  unackedCount: number;
};

export type NewSubject = {
  kind: SubjectKind;
  name: string;
  /** 연령대 · 종·크기 */
  info: string | null;
  place: string;
};

/** at 이 null 이면 찍은 시각을 모른다 (백엔드 하루 사진). uri 가 없으면 자리 표시 상자로 보여준다 */
export type Photo = {
  id: string;
  at: Date | null;
  place: string;
  title: string;
  /** 목록용 이미지 (백엔드는 썸네일) */
  uri?: string;
  /** 크게 볼 때 원본을 불러온다 */
  loadOriginal?: () => Promise<string>;
};

/** 사진 · 이벤트 영상. supported 가 false 면 이유를 보여준다 */
export type MediaDay =
  | {
      supported: true;
      photos: Photo[];
      videos: Photo[];
      /** 사진·영상이 비었을 때 덧붙일 안내 (예: 동의·권한이 없으면 보이지 않는다) */
      photoNote?: string;
      videoNote?: string;
    }
  | { supported: false; reason: string };

export type TrendMetric = 'hr' | 'rr' | 'spo2';
export type TrendPeriod = 'day' | 'week' | 'month' | 'year';

/** 값이 없는 이유 (백엔드 missing_reason) */
export type TrendMissing =
  'no_device_binding' | 'offline' | 'unsupported' | 'insufficient_quality' | 'not_measured';

/** verified: 기기가 확인한 값, assumed: 추정한 값 */
export type TrendConfidence = 'verified' | 'assumed' | 'mixed' | 'unknown';

/** 추세 한 칸. 일간은 1분(목업은 측정 1번), 주·월·연간은 하루 */
export type TrendBucket = {
  start: Date;
  end: Date;
  value: number | null;
  count: number;
  confidence: TrendConfidence | null;
  missing: TrendMissing | null;
};

/** 개인 기준선. collecting 이면 아직 모으는 중, unsupported 면 이 기기·지표는 기준선이 없다 */
export type TrendBaseline =
  | { status: 'ready'; value: number }
  | { status: 'collecting'; validDays: number; requiredDays: number }
  | { status: 'unsupported' };

export type TrendSeries = {
  from: Date;
  until: Date;
  buckets: TrendBucket[];
  baseline: TrendBaseline;
};

/** 기간의 [시작, 끝). 주는 월요일부터, 월·연은 1일부터 (백엔드 /trends 와 같다) */
export function trendRange(period: TrendPeriod, anchor: Date): [Date, Date] {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const d = anchor.getDate();
  if (period === 'week') {
    const monday = d - ((anchor.getDay() + 6) % 7);
    return [new Date(y, m, monday), new Date(y, m, monday + 7)];
  }
  if (period === 'month') return [new Date(y, m, 1), new Date(y, m + 1, 1)];
  if (period === 'year') return [new Date(y, 0, 1), new Date(y + 1, 0, 1)];
  return [new Date(y, m, d), new Date(y, m, d + 1)];
}

export type HomeSummary = {
  guardianName: string;
  /** 대상자 호칭 (예: 어머니). 없으면 이름 */
  subjectLabel: string;
  device: DeviceKind | null;
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

export type FamilyMember = {
  id: string;
  /** 내 계정이면 "나" */
  name: string;
  me: boolean;
};

export type Profile = {
  subjectLabel: string;
  phone: string | null;
  place: string | null;
  /** 함께 보는 가족 (나 포함) */
  family: FamilyMember[];
  /** 주 보호자만 가족을 초대하거나 내보낼 수 있다 */
  canManage: boolean;
  careCenterPhone: string | null;
};

export type NightAlert = 'as-is' | 'morning';

export type QuietHours = { start: string; end: string };

export type NotificationPrefs = {
  fall: boolean;
  inactive: boolean;
  deviceOff: boolean;
  nightAlert: NightAlert;
  /** 기준선 이탈 알림 (보호자마다 고른다) */
  baselineDeviation: boolean;
  /** 방해금지 시간 (HH:mm). null 이면 쓰지 않는다. 긴급 알림은 이 시간에도 온다 */
  quietHours: QuietHours | null;
  /** 하루 돌봄 기록 요약 알림 */
  dailySummary: boolean;
};

export type DeviceConnection = 'online' | 'offline' | 'unknown';

/** 고른 대상에 연결된 기기 */
export type DeviceInfo = {
  id: string;
  /** 대상-기기 연결 id (해지할 때 쓴다) */
  bindingId: string | null;
  place: string | null;
  kind: DeviceKind | null;
  model: string | null;
  firmware: string | null;
  connection: DeviceConnection;
  /** 기기가 붙은 Wi-Fi. 서버는 모른다 */
  network: string | null;
};

/** 펌웨어 새 버전 확인 결과. null 이면 확인할 수 없다 */
export type FirmwareCheck = { latest: boolean; version: string | null } | null;

export type ConsentPurpose = 'metrics' | 'photo' | 'video';

export type ConsentItem = {
  purpose: ConsentPurpose;
  /** null 이면 아직 고르지 않았다 */
  granted: boolean | null;
  decidedAt: Date | null;
};

export type DeletionKind = 'delete_photos' | 'end_care';

/** 공지 · 안내 문서 */
export type SupportDoc = { id: string; title: string; effectiveAt: Date | null };
export type SupportArticle = SupportDoc & { body: string };

/** 계정에 연결된 대상자가 없음 */
export class NoSubjectError extends Error {
  constructor() {
    super('아직 연결된 어르신이 없어요.');
    this.name = 'NoSubjectError';
  }
}

/** null 이면 지운다. 설치 장소는 기기에 저장되므로 지울 수 없다 */
export type ProfilePatch = {
  phone?: string | null;
  careCenterPhone?: string | null;
  place?: string;
};

/** 내가 만든 6자리 초대 코드. validMinutes 는 발급부터 만료까지 */
export type Invite = { code: string; expiresAt: Date; validMinutes: number };

export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';

/** 받은 초대를 수락하기 전에 보여줄 정보 */
export type InvitePreview = {
  subjectName: string;
  /** 거실 · 레이더형 */
  subjectDetail: string | null;
  inviterName: string;
  status: InviteStatus;
  expiresAt: Date;
};

/** 실시간 변경 알림 종류. membership_revoked 면 대상 목록부터 다시 읽는다 */
export type LiveChange = 'changed' | 'membership_revoked';

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
  /** 전화번호·돌봄센터 연락처 저장·삭제, 기기 설치 장소 저장 */
  saveProfile(patch: ProfilePatch): Promise<void>;
  /** 함께 보는 가족을 내보낸다. 나를 고르면 이 대상의 돌봄에서 나간다 */
  removeMember(id: string): Promise<void>;
  /** 함께 볼 가족을 부를 초대를 만든다 */
  createInvite(): Promise<Invite>;
  /** 계정의 모든 돌봄 대상 */
  subjects(): Promise<SubjectSummary[]>;
  /** 이후 조회할 대상. null 이면 첫 번째 대상 */
  setSubject(id: string | null): void;
  /** 새 대상을 만들고 id 를 돌려준다 */
  createSubject(input: NewSubject): Promise<string>;
  /**
   * 받은 초대를 확인한다. 백엔드는 6자리 코드를 미리 볼 수 없어 null 을 돌려주고,
   * 초대 링크(/invitations/{id}?token=)만 미리 본다
   */
  previewInvite(code: string): Promise<InvitePreview | null>;
  acceptInvite(code: string): Promise<void>;
  declineInvite(code: string): Promise<void>;
  /** 초대 입력 칸 안내 */
  readonly inviteInput: { label: string; placeholder: string; hint: string };
  /** 고른 대상의 변경을 실시간으로 받는다 (웹 · 백엔드만). 구독을 끊는 함수를 돌려준다 */
  watch?(onChange: (change: LiveChange) => void): () => void;
  media(key: string): Promise<MediaDay>;
  /** 고른 대상에 연결된 기기 (지금은 많아야 하나) */
  devices(): Promise<DeviceInfo[]>;
  checkFirmware(deviceId: string): Promise<FirmwareCheck>;
  /** 기기 Wi-Fi 를 바꾼다. 휴대폰 앱이 Bluetooth 로 기기에 전달해야 한다 */
  changeWifi(deviceId: string, network: string, password: string): Promise<void>;
  restartDevice(deviceId: string): Promise<void>;
  unlinkDevice(device: DeviceInfo): Promise<void>;
  consents(): Promise<ConsentItem[]>;
  setConsent(purpose: ConsentPurpose, granted: boolean): Promise<void>;
  requestDeletion(kind: DeletionKind): Promise<void>;
  documents(): Promise<SupportDoc[]>;
  document(id: string): Promise<SupportArticle>;
  /** 문의를 보내고 접수 번호를 돌려준다 */
  sendSupport(message: string): Promise<string>;
  /** 접수한 문의에 상담용 기기 진단 공유를 켜거나 끈다 */
  setCsMode(ticket: string, on: boolean): Promise<void>;
  /** anchor 가 든 기간의 추세 */
  trend(metric: TrendMetric, period: TrendPeriod, anchor: Date): Promise<TrendSeries>;
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
