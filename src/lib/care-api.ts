import { ApiError } from '@/lib/api';
import { authedRequest, currentUser } from '@/lib/auth';
import {
  METRIC_KEYS,
  monthKey,
  NoSubjectError,
  parseDayKey,
  type Assessment,
  type CareEvent,
  type CareSource,
  type DayRecord,
  type DayStatus,
  type HomeStatus,
  type Measurement,
  type MetricKey,
  type NotificationPrefs,
  type Presence,
  type TimelineBar,
} from '@/lib/care-model';

/**
 * HuCare 백엔드(/api/v1/guardian/*) 응답을 화면 모델로 바꾼다.
 * 응답 모양은 Swagger 에 스키마가 없어 백엔드 GuardianQueries · GuardianManagement 구현을 기준으로 적었다.
 */

type ApiSubject = {
  id: string;
  name: string;
  type: 'elderly' | 'infant';
  time_zone: string;
  /** 보호자가 직접 적은 호칭(예: 어머니) 또는 관계 코드(child 등) */
  relationship: string | null;
  role: string;
  version: number;
};

type ApiMetric = {
  key: MetricKey;
  value: number | null;
  availability: 'available' | 'not_measured' | 'failed' | 'unsupported';
  quality: 'valid' | 'insufficient' | 'unknown';
  assessment: Assessment;
};

type ApiMeasurement = { id: string; measured_at: string; metrics: ApiMetric[] };

type ApiEvent = {
  id: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string | null;
  occurred_at: string;
  acknowledgement: { user_name: string | null; acknowledged_at: string } | null;
};

type ApiHome = {
  subject: ApiSubject;
  status: { code: HomeStatus; message: string };
  device: { id: string; location: string | null; connection_state: string } | null;
  presence: { state: Presence };
  latest_measurement: ApiMeasurement | null;
  primary_event: ApiEvent | null;
};

type ApiActivity = {
  state: 'future' | 'observed' | 'unobserved';
  present_seconds: number;
  measurement_count: number;
};

type ApiDay = {
  date: string;
  summary: {
    measurement_count: number;
    event_count: number;
    hr_min: number | null;
    hr_max: number | null;
  };
  activity: ApiActivity[];
  items: { kind: 'measurement' | 'event'; measurement?: ApiMeasurement }[];
};

type ApiCalendar = {
  summary: { elapsed_days: number; usual_days: number; unknown_days: number; event_count: number };
  days: { date: string; status: 'ok' | 'alert' | 'unknown' | 'future' }[];
};

type ApiContact = { kind: 'subject' | 'care_center' | 'family'; name: string; phone: string };
type ApiMember = { user_id: string; name: string };

type ApiPrefs = {
  fall: boolean;
  inactivity: boolean;
  device_offline: boolean;
  night_mode: 'immediate' | 'morning';
  version: number;
};

type Page<T> = { items: T[]; next_cursor: string | null };

/** 한 화면에서 보여줄 최대 개수 (백엔드 limit 상한) */
const PAGE_LIMIT = 100;
/** 타임라인 막대 최대 높이 (px) */
const BAR_MAX = 86;

const RELATIONSHIP_CODES = new Set([
  'child',
  'parent',
  'spouse',
  'sibling',
  'grandchild',
  'relative',
]);

/** 직접 적은 호칭이 있으면 쓰고, 관계 코드만 있으면 이름을 쓴다 */
const subjectLabel = (subject: ApiSubject) =>
  subject.relationship && !RELATIONSHIP_CODES.has(subject.relationship)
    ? subject.relationship
    : subject.name;

function toMeasurement(raw: ApiMeasurement): Measurement {
  const byKey = new Map(raw.metrics.map((metric) => [metric.key, metric]));
  return {
    id: raw.id,
    at: new Date(raw.measured_at),
    metrics: Object.fromEntries(
      METRIC_KEYS.map((key) => {
        const metric = byKey.get(key);
        const valid = metric?.availability === 'available' && metric.quality === 'valid';
        return [
          key,
          {
            value: valid && metric.value !== null ? metric.value : null,
            assessment: valid ? metric.assessment : 'unknown',
          },
        ];
      }),
    ) as Measurement['metrics'],
  };
}

function toEvent(raw: ApiEvent): CareEvent {
  const ack = raw.acknowledgement;
  return {
    id: raw.id,
    title: raw.title,
    lines: (raw.description ?? '').split('\n').filter((line) => line.trim()),
    at: new Date(raw.occurred_at),
    ack: ack ? { by: ack.user_name ?? '가족', at: new Date(ack.acknowledged_at) } : undefined,
  };
}

function toBar(hour: ApiActivity): TimelineBar {
  const ratio = Math.min(1, hour.present_seconds / 3600);
  if (hour.measurement_count > 0) {
    return { tone: 'checked', height: Math.max(8, Math.round(BAR_MAX * ratio)) };
  }
  if (hour.state === 'observed' && ratio > 0) {
    return { tone: 'home', height: Math.max(5, Math.round(BAR_MAX * ratio)) };
  }
  return { tone: 'idle', height: 2 };
}

const CALENDAR_STATUS: Record<ApiCalendar['days'][number]['status'], DayStatus | 'none'> = {
  ok: 'normal',
  alert: 'alert',
  unknown: 'unknown',
  future: 'none',
};

let subjectPromise: Promise<ApiSubject> | null = null;
let prefsVersion: number | null = null;

/** 보호자 계정의 첫 번째 대상자. 여러 명을 고르는 화면은 아직 없다. */
function subject() {
  subjectPromise ??= authedRequest<Page<ApiSubject>>('/guardian/subjects', {
    query: { limit: 1 },
  }).then((page) => {
    const first = page.items[0];
    if (!first) throw new NoSubjectError();
    return first;
  });
  // 실패했으면 다음 호출에서 다시 시도한다
  subjectPromise.catch(() => {
    subjectPromise = null;
  });
  return subjectPromise;
}

async function home() {
  const { id } = await subject();
  return authedRequest<ApiHome>('/guardian/home', { query: { subject_id: id } });
}

async function fetchPrefs() {
  const { id } = await subject();
  const raw = await authedRequest<ApiPrefs>(`/guardian/subjects/${id}/notification-preferences`);
  prefsVersion = raw.version;
  return toPrefs(raw);
}

const toPrefs = (raw: ApiPrefs): NotificationPrefs => ({
  fall: raw.fall,
  inactive: raw.inactivity,
  deviceOff: raw.device_offline,
  nightAlert: raw.night_mode === 'immediate' ? 'as-is' : 'morning',
});

async function patchPrefs(patch: Partial<NotificationPrefs>) {
  const { id } = await subject();
  if (prefsVersion === null) await fetchPrefs();
  const raw = await authedRequest<ApiPrefs>(`/guardian/subjects/${id}/notification-preferences`, {
    method: 'PATCH',
    body: {
      version: prefsVersion,
      ...(patch.fall !== undefined && { fall: patch.fall }),
      ...(patch.inactive !== undefined && { inactivity: patch.inactive }),
      ...(patch.deviceOff !== undefined && { device_offline: patch.deviceOff }),
      ...(patch.nightAlert !== undefined && {
        night_mode: patch.nightAlert === 'as-is' ? 'immediate' : 'morning',
      }),
    },
  });
  prefsVersion = raw.version;
  return toPrefs(raw);
}

export const apiSource: CareSource = {
  now: () => new Date(),

  async home() {
    const raw = await home();
    return {
      guardianName: currentUser()?.displayName ?? '',
      subjectLabel: subjectLabel(raw.subject),
      place: raw.device?.location ?? null,
      presence: raw.presence.state,
      status: raw.status.code,
      statusMessage: raw.status.message,
      latest: raw.latest_measurement ? toMeasurement(raw.latest_measurement) : null,
      primaryEvent: raw.primary_event ? toEvent(raw.primary_event) : null,
    };
  },

  async events() {
    const { id } = await subject();
    const page = await authedRequest<Page<ApiEvent>>('/guardian/events', {
      query: { subject_id: id, limit: PAGE_LIMIT },
    });
    return page.items.map(toEvent);
  },

  async day(key) {
    const { id } = await subject();
    const raw = await authedRequest<ApiDay>('/guardian/day', {
      query: { subject_id: id, date: key, limit: PAGE_LIMIT },
    });
    const measurements = raw.items
      .flatMap((item) =>
        item.kind === 'measurement' && item.measurement ? [item.measurement] : [],
      )
      .map(toMeasurement)
      .reverse();
    const { measurement_count, event_count, hr_min, hr_max } = raw.summary;
    const hasValid = measurements.some(({ metrics }) =>
      Object.values(metrics).some((metric) => metric.value !== null),
    );
    const record: DayRecord = {
      date: parseDayKey(raw.date) ?? parseDayKey(key)!,
      status: event_count > 0 ? 'alert' : hasValid ? 'normal' : 'unknown',
      measurementCount: measurement_count,
      measurements,
      eventCount: event_count,
      heartRange:
        hr_min !== null && hr_max !== null ? [Math.round(hr_min), Math.round(hr_max)] : null,
      timeline: raw.activity.map(toBar),
    };
    return record;
  },

  async month(year, month) {
    const { id } = await subject();
    const raw = await authedRequest<ApiCalendar>('/guardian/calendar', {
      query: { subject_id: id, month: monthKey(year, month) },
    });
    return {
      days: raw.days.map((day) => ({
        date: parseDayKey(day.date)!,
        status: CALENDAR_STATUS[day.status],
      })),
      elapsedDays: raw.summary.elapsed_days,
      usualDays: raw.summary.usual_days,
      unknownDays: raw.summary.unknown_days,
      eventCount: raw.summary.event_count,
    };
  },

  async profile() {
    const target = await subject();
    const [contacts, members, homeView] = await Promise.all([
      authedRequest<{ items: ApiContact[] }>(`/guardian/subjects/${target.id}/contacts`),
      authedRequest<{ items: ApiMember[] }>(`/guardian/subjects/${target.id}/members`),
      home(),
    ]);
    const me = currentUser()?.id;
    const phoneOf = (kind: ApiContact['kind']) =>
      contacts.items.find((contact) => contact.kind === kind)?.phone ?? null;
    return {
      subjectLabel: subjectLabel(target),
      phone: phoneOf('subject'),
      place: homeView.device?.location ?? null,
      family: members.items.map((member) => (member.user_id === me ? '나' : member.name)),
      careCenterPhone: phoneOf('care_center'),
    };
  },

  notificationPrefs: fetchPrefs,

  async updateNotificationPrefs(patch) {
    try {
      return await patchPrefs(patch);
    } catch (error) {
      // 다른 기기에서 먼저 바꿨으면 최신 버전을 받아 한 번 더 시도한다
      if (error instanceof ApiError && error.code === 'VERSION_CONFLICT') {
        await fetchPrefs();
        return patchPrefs(patch);
      }
      throw error;
    }
  },

  async acknowledge(id) {
    return toEvent(await authedRequest<ApiEvent>(`/events/${id}/ack`, { method: 'POST' }));
  },

  reset() {
    subjectPromise = null;
    prefsVersion = null;
  },
};
