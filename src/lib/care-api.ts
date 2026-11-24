import { Platform } from 'react-native';

import { ApiError, idempotencyKey } from '@/lib/api';
import { authedFetch, authedRequest, authedStream, currentUser } from '@/lib/auth';
import {
  METRIC_KEYS,
  monthKey,
  NoSubjectError,
  parseDayKey,
  type Assessment,
  type CareEvent,
  type CareSource,
  type InvitePreview,
  type LiveChange,
  type ProfilePatch,
  type DayRecord,
  type DayStatus,
  type HomeStatus,
  type HomeSummary,
  type Measurement,
  type SubjectKind,
  type SubjectSummary,
  type MetricKey,
  type NotificationPrefs,
  type Presence,
  type TimelineBar,
  type DeviceKind,
  type TrendBaseline,
  type TrendBucket,
  type TrendConfidence,
  type TrendMissing,
  dayKey,
  trendRange,
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
  confidence?: string | null;
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
  /** 연결된 기기 모델이 지원하는 기능. 기기가 없거나 모델을 모르면 model 이 null */
  capabilities?: { model: string | null; photo?: boolean; event_video?: boolean } | null;
  /** 지금 이 보호자가 쓸 수 있는 기능 (기기 지원 · 동의 · 권한을 모두 따진 값) */
  available_features?: { photo?: boolean; event_video?: boolean };
  presence: { state: Presence };
  /** 지표별 기준선 비교 (status: ready · collecting · unsupported …) */
  baselines?: Record<string, { status: string; deviation?: number | null }>;
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

type ApiContact = {
  id: string;
  kind: 'subject' | 'care_center' | 'family';
  name: string;
  phone: string;
  version: number;
};
type ApiMember = {
  id: string;
  user_id: string;
  name: string;
  role: 'owner' | 'caregiver' | 'viewer';
};

type ApiDevice = { id: string; location: string | null; version: number };

type ApiTrendPoint = {
  start_at: string;
  end_at: string;
  value: number | null;
  sample_count: number;
  confidence?: TrendConfidence | null;
  missing_reason: TrendMissing | null;
  baseline: {
    status: 'ready' | 'collecting' | 'unsupported';
    value?: number | null;
    valid_days?: number;
    required_days?: number;
  };
};

type ApiInvitation = {
  subject_name: string;
  inviter_name: string;
  status: InvitePreview['status'];
  expires_at: string;
};

type ApiPrefs = {
  fall: boolean;
  inactivity: boolean;
  device_offline: boolean;
  night_mode: 'immediate' | 'morning';
  version: number;
  quiet_start: string | null;
  quiet_end: string | null;
  baseline_deviation: boolean;
  daily_summary: boolean;
};

type ApiDeviceDetail = ApiDevice & {
  model: string | null;
  firmware_version: string | null;
  connection_state: 'online' | 'offline' | 'unknown';
};

type ApiBinding = { id: string; device_id: string; started_at: string; ended_at: string | null };

type ApiConsents = {
  items: {
    purpose: 'metrics' | 'photo' | 'video' | 'training';
    policy: { version: string } | null;
    decision: { granted: boolean; decided_at: string } | null;
  }[];
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
            confidence:
              metric?.confidence === 'verified' || metric?.confidence === 'assumed'
                ? metric.confidence
                : null,
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

/** 한 계정에서 불러올 대상 수 (백엔드 기본값) */
const SUBJECT_LIMIT = 50;

let listPromise: Promise<ApiSubject[]> | null = null;
let selectedId: string | null = null;
let prefsVersion: number | null = null;

function subjectList() {
  listPromise ??= authedRequest<Page<ApiSubject>>('/guardian/subjects', {
    query: { limit: SUBJECT_LIMIT },
  }).then((page) => page.items);
  // 실패했으면 다음 호출에서 다시 시도한다
  listPromise.catch(() => {
    listPromise = null;
  });
  return listPromise;
}

/** 고른 대상. 고르지 않았거나 목록에서 사라졌으면 첫 번째 대상 */
async function subject() {
  const items = await subjectList();
  const found = items.find((item) => item.id === selectedId) ?? items[0];
  if (!found) throw new NoSubjectError();
  return found;
}

const SUBJECT_KIND: Record<ApiSubject['type'], SubjectKind> = { elderly: 'elder', infant: 'child' };

/** 초대 링크 `.../{id}?token={43자}` 에서 id 와 token 을 꺼낸다 */
function parseInvite(text: string) {
  const match =
    /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\?token=([A-Za-z0-9_-]{43})/i.exec(
      text.trim(),
    );
  if (!match) throw new Error('받은 초대 링크를 그대로 붙여 넣어 주세요.');
  return { id: match[1], token: match[2] };
}

function localTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul';
  } catch {
    return 'Asia/Seoul';
  }
}

/** 고른 대상의 지금 기기 연결 */
async function activeBinding(subjectId: string) {
  const { items } = await authedRequest<{ items: ApiBinding[] }>(
    `/guardian/subjects/${subjectId}/device-bindings`,
  );
  return items.find((binding) => binding.ended_at === null) ?? null;
}

function toBaselines(raw: ApiHome) {
  const result: HomeSummary['baselines'] = {};
  for (const [key, comparison] of Object.entries(raw.baselines ?? {})) {
    if (!METRIC_KEYS.includes(key as MetricKey)) continue;
    if (comparison.status === 'ready' && typeof comparison.deviation === 'number') {
      result[key as MetricKey] = { status: 'ready', deviation: comparison.deviation };
    } else if (comparison.status === 'collecting') {
      result[key as MetricKey] = { status: 'collecting' };
    }
  }
  return result;
}

const isInviteCode = (text: string) => /^\d{6}$/.test(text.trim());

/** 기기 모델이 사진·영상을 남기면 카메라형, 아니면 레이더형. 모델을 모르면 null */
function deviceKind(raw: ApiHome): DeviceKind | null {
  const caps = raw.capabilities;
  if (!raw.device || !caps?.model) return null;
  return caps.photo || caps.event_video ? 'camera' : 'radar';
}

/** 마지막 칸의 기준선으로 기간 전체 기준선을 정한다 */
function toBaseline(points: ApiTrendPoint[]): TrendBaseline {
  const last = [...points].reverse().find((point) => point.baseline.status !== 'unsupported');
  if (!last) return { status: 'unsupported' };
  const { status, value, valid_days, required_days } = last.baseline;
  if (status === 'ready' && typeof value === 'number') return { status: 'ready', value };
  return { status: 'collecting', validDays: valid_days ?? 0, requiredDays: required_days ?? 0 };
}

/** JPEG 응답을 <Image> 에 넣을 data: 주소로 바꾼다 (웹 · 네이티브 공통) */
async function toDataUri(response: Response) {
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('사진을 읽지 못했어요.'));
    reader.readAsDataURL(blob);
  });
}

/** 기기 설치 장소는 대상이 아니라 연결된 기기에 저장된다 */
async function savePlace(location: string) {
  const raw = await home();
  if (!raw.device) throw new Error('연결된 기기가 없어 설치 장소를 저장할 수 없어요.');
  const device = await authedRequest<ApiDevice>(`/guardian/devices/${raw.device.id}`);
  await authedRequest(`/guardian/devices/${device.id}`, {
    method: 'PATCH',
    body: { version: device.version, location },
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** SSE 한 덩어리에서 event 이름과 id 를 꺼낸다 */
function parseSse(block: string) {
  const field = (name: string) => new RegExp(`^${name}:\\s?(.*)$`, 'm').exec(block)?.[1] ?? null;
  return { event: field('event'), id: field('id') };
}

/**
 * /stream 을 읽어 변경이 오면 알린다. 서버가 60초마다 연결을 닫으므로 다시 붙고, 실패하면 점점 늦게 다시 시도한다.
 * 네이티브 fetch 는 본문을 흘려 읽을 수 없어 웹에서만 쓴다.
 */
function watchStream(onChange: (change: LiveChange) => void) {
  const controller = new AbortController();
  (async () => {
    let delay = 1000;
    while (!controller.signal.aborted) {
      try {
        const { id } = await subject();
        const response = await authedStream('/stream', { subject_id: id }, controller.signal);
        delay = 1000;
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true }).replace(/\r/g, '');
          let end = buffer.indexOf('\n\n');
          while (end >= 0) {
            const { event, id: eventId } = parseSse(buffer.slice(0, end));
            buffer = buffer.slice(end + 2);
            end = buffer.indexOf('\n\n');
            // 연결 직후 오는 ready 이벤트와 keepalive 주석은 변경이 아니다
            if (!event || eventId?.startsWith('ready-')) continue;
            if (event === 'membership_revoked') {
              listPromise = null;
              onChange('membership_revoked');
            } else {
              onChange('changed');
            }
          }
        }
      } catch {
        if (controller.signal.aborted) return;
        delay = Math.min(delay * 2, 30_000);
      }
      await sleep(delay);
    }
  })();
  return () => controller.abort();
}

async function home(id?: string) {
  const subjectId = id ?? (await subject()).id;
  return authedRequest<ApiHome>('/guardian/home', { query: { subject_id: subjectId } });
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
  baselineDeviation: raw.baseline_deviation,
  quietHours:
    raw.quiet_start && raw.quiet_end
      ? { start: raw.quiet_start.slice(0, 5), end: raw.quiet_end.slice(0, 5) }
      : null,
  dailySummary: raw.daily_summary,
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
      ...(patch.baselineDeviation !== undefined && {
        baseline_deviation: patch.baselineDeviation,
      }),
      ...(patch.dailySummary !== undefined && { daily_summary: patch.dailySummary }),
      ...(patch.quietHours !== undefined && {
        quiet_start: patch.quietHours?.start ?? null,
        quiet_end: patch.quietHours?.end ?? null,
        quiet_time_zone: patch.quietHours ? localTimeZone() : null,
      }),
    },
  });
  prefsVersion = raw.version;
  return toPrefs(raw);
}

/** 연락처가 있으면 version 을 실어 수정하고, 없으면 새로 만든다. phone 이 null 이면 지운다 */
async function saveContact(kind: 'subject' | 'care_center', phone: string | null) {
  const target = await subject();
  const path = `/guardian/subjects/${target.id}/contacts`;
  const { items } = await authedRequest<{ items: ApiContact[] }>(path);
  const found = items.find((contact) => contact.kind === kind);
  if (phone === null) {
    if (found) await authedRequest(`${path}/${found.id}`, { method: 'DELETE' });
    return;
  }
  if (found) {
    await authedRequest(`${path}/${found.id}`, {
      method: 'PATCH',
      body: { version: found.version, phone },
    });
  } else {
    await authedRequest(path, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey() },
      body: { kind, name: kind === 'subject' ? target.name : '돌봄센터', phone },
    });
  }
}

export const apiSource: CareSource = {
  now: () => new Date(),

  async home() {
    const raw = await home();
    return {
      guardianName: currentUser()?.displayName ?? '',
      subjectLabel: subjectLabel(raw.subject),
      device: deviceKind(raw),
      place: raw.device?.location ?? null,
      presence: raw.presence.state,
      status: raw.status.code,
      statusMessage: raw.status.message,
      latest: raw.latest_measurement ? toMeasurement(raw.latest_measurement) : null,
      primaryEvent: raw.primary_event ? toEvent(raw.primary_event) : null,
      baselines: toBaselines(raw),
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
      family: members.items.map((member) => ({
        id: member.id,
        name: member.user_id === me ? '나' : member.name,
        me: member.user_id === me,
      })),
      canManage: members.items.some((member) => member.user_id === me && member.role === 'owner'),
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

  async saveProfile(patch: ProfilePatch) {
    if (patch.phone !== undefined) await saveContact('subject', patch.phone);
    if (patch.careCenterPhone !== undefined) {
      await saveContact('care_center', patch.careCenterPhone);
    }
    if (patch.place !== undefined) await savePlace(patch.place);
  },

  async removeMember(memberId) {
    const { id } = await subject();
    await authedRequest(`/guardian/subjects/${id}/members/${memberId}`, { method: 'DELETE' });
    // 나를 내보냈으면 이 대상이 목록에서 빠진다
    listPromise = null;
  },

  async createInvite() {
    const { id } = await subject();
    // 새 코드를 만들면 전에 만든 대기 중 코드는 서버가 취소한다
    const raw = await authedRequest<{ code: string; expires_at: string }>(
      `/guardian/subjects/${id}/invite-codes`,
      { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey() }, body: {} },
    );
    const expiresAt = new Date(raw.expires_at);
    return {
      code: raw.code,
      expiresAt,
      validMinutes: Math.round((expiresAt.getTime() - Date.now()) / 60_000),
    };
  },

  async subjects() {
    const items = await subjectList();
    return Promise.all(
      items.map(async (item): Promise<SubjectSummary> => {
        const [raw, summary] = await Promise.all([
          home(item.id),
          authedRequest<{ unacknowledged_count: number }>('/guardian/events/summary', {
            query: { subject_id: item.id },
          }),
        ]);
        return {
          id: item.id,
          label: subjectLabel(item),
          kind: SUBJECT_KIND[item.type],
          place: raw.device?.location ?? null,
          device: deviceKind(raw),
          status: raw.status.code,
          statusMessage: raw.status.message,
          presence: raw.presence.state,
          primaryEventTitle: raw.primary_event?.title ?? null,
          latest: raw.latest_measurement ? toMeasurement(raw.latest_measurement) : null,
          unackedCount: summary.unacknowledged_count,
        };
      }),
    );
  },

  setSubject(id) {
    if (id === selectedId) return;
    selectedId = id;
    prefsVersion = null;
  },

  async createSubject({ kind, name }) {
    if (kind === 'pet') throw new Error('반려동물 등록은 아직 지원하지 않아요.');
    // 연령대 · 설치 장소는 대상 생성 API 에 항목이 없어 보내지 않는다 (장소는 기기 연결 때 정해진다)
    const created = await authedRequest<ApiSubject>('/guardian/subjects', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey() },
      body: { name, type: kind === 'elder' ? 'elderly' : 'infant', relationship: name },
    });
    listPromise = null;
    return created.id;
  },

  async previewInvite(code) {
    // 6자리 코드는 미리 볼 수 없어 바로 수락한다
    if (isInviteCode(code)) return null;
    const { id, token } = parseInvite(code);
    const raw = await authedRequest<ApiInvitation>(`/guardian/invitations/${id}`, {
      query: { token },
    });
    return {
      subjectName: raw.subject_name,
      subjectDetail: null,
      inviterName: raw.inviter_name,
      status: raw.status,
      expiresAt: new Date(raw.expires_at),
    };
  },

  async acceptInvite(code) {
    if (isInviteCode(code)) {
      await authedRequest('/guardian/invite-codes/redeem', {
        method: 'POST',
        body: { code: code.trim() },
      });
    } else {
      const { id, token } = parseInvite(code);
      await authedRequest(`/guardian/invitations/${id}/accept`, {
        method: 'POST',
        body: { token },
      });
    }
    listPromise = null;
  },

  async declineInvite(code) {
    const { id, token } = parseInvite(code);
    await authedRequest(`/guardian/invitations/${id}/decline`, { method: 'POST', body: { token } });
  },

  inviteInput: {
    label: '6자리 초대 코드',
    placeholder: '초대 코드 6자리를 입력해주세요',
    hint: '코드는 24시간 동안 쓸 수 있어요. 초대 링크를 받았다면 링크를 붙여 넣어도 돼요.',
  },

  async media(key) {
    const target = await subject();
    const raw = await home(target.id);
    const kind = deviceKind(raw);
    if (kind !== 'camera') {
      return {
        supported: false,
        reason:
          kind === 'radar'
            ? '레이더형 기기는 사진과 영상을 남기지 않아요.'
            : '카메라형 기기를 연결하면 사진을 볼 수 있어요.',
      };
    }
    const videoNote = '이벤트 영상은 문자 인증 뒤 볼 수 있는데, 앱에서는 아직 준비 중이에요.';
    if (!raw.available_features?.photo) {
      return {
        supported: true,
        photos: [],
        videos: [],
        photoNote: '사진 수집에 동의하고 주 보호자가 사진 보기를 허용해야 볼 수 있어요.',
        videoNote,
      };
    }
    const path = `/guardian/subjects/${target.id}/photos/${key}`;
    const response = await authedFetch(path, {
      query: { variant: 'thumbnail' },
      accept: 'image/jpeg',
    });
    // 그날 사진이 없거나 볼 수 없으면 404 를 준다
    if (response.status === 404) return { supported: true, photos: [], videos: [], videoNote };
    if (!response.ok)
      throw new ApiError(response.status, 'PHOTO_ERROR', '사진을 불러오지 못했어요.');
    const place = raw.device?.location ?? '집';
    return {
      supported: true,
      photos: [
        {
          id: key,
          at: null,
          place,
          title: `${place} 사진`,
          uri: await toDataUri(response),
          loadOriginal: async () => {
            const original = await authedFetch(path, { accept: 'image/jpeg' });
            if (!original.ok)
              throw new ApiError(original.status, 'PHOTO_ERROR', '사진을 불러오지 못했어요.');
            return toDataUri(original);
          },
        },
      ],
      videos: [],
      videoNote,
    };
  },

  async devices() {
    const target = await subject();
    const raw = await home(target.id);
    if (!raw.device) return [];
    const [device, binding] = await Promise.all([
      authedRequest<ApiDeviceDetail>(`/guardian/devices/${raw.device.id}`),
      activeBinding(target.id),
    ]);
    return [
      {
        id: device.id,
        bindingId: binding?.id ?? null,
        place: device.location,
        kind: deviceKind(raw),
        model: device.model,
        firmware: device.firmware_version,
        connection: device.connection_state,
        network: null,
      },
    ];
  },

  async checkFirmware() {
    // 새 버전 배포 정보를 주는 API 가 아직 없다
    return null;
  },

  async changeWifi() {
    throw new Error('Wi-Fi 는 휴대폰 앱에서 Bluetooth 로 기기에 전달해야 바꿀 수 있어요.');
  },

  async restartDevice(deviceId) {
    await authedRequest(`/guardian/devices/${deviceId}/commands`, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey() },
      body: { kind: 'restart' },
    });
  },

  async unlinkDevice(device) {
    if (!device.bindingId) throw new Error('연결 정보를 찾지 못했어요.');
    await authedRequest(`/guardian/device-bindings/${device.bindingId}/end`, { method: 'POST' });
  },

  async consents() {
    const { id } = await subject();
    const raw = await authedRequest<ApiConsents>(`/guardian/subjects/${id}/consents`);
    return raw.items.flatMap((item) =>
      item.purpose === 'training'
        ? []
        : [
            {
              purpose: item.purpose,
              granted: item.decision?.granted ?? null,
              decidedAt: item.decision ? new Date(item.decision.decided_at) : null,
            },
          ],
    );
  },

  async setConsent(purpose, granted) {
    const { id } = await subject();
    const raw = await authedRequest<ApiConsents>(`/guardian/subjects/${id}/consents`);
    const version = raw.items.find((item) => item.purpose === purpose)?.policy?.version;
    if (!version) throw new Error('동의 문서를 찾지 못했어요.');
    await authedRequest(`/guardian/subjects/${id}/consent-decisions`, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey() },
      body: { purpose, policy_version: version, granted },
    });
  },

  async requestDeletion(kind) {
    const { id } = await subject();
    await authedRequest(`/guardian/subjects/${id}/deletion-requests`, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey() },
      body: { kind },
    });
  },

  async documents() {
    const raw = await authedRequest<{
      items: { id: string; title: string; effective_at: string | null }[];
    }>('/documents');
    return raw.items.map((doc) => ({
      id: doc.id,
      title: doc.title,
      effectiveAt: doc.effective_at ? new Date(doc.effective_at) : null,
    }));
  },

  async document(id) {
    const raw = await authedRequest<{
      id: string;
      title: string;
      effective_at: string | null;
      content_markdown: string;
    }>(`/documents/${id}`);
    return {
      id: raw.id,
      title: raw.title,
      effectiveAt: raw.effective_at ? new Date(raw.effective_at) : null,
      body: raw.content_markdown,
    };
  },

  async sendSupport(message) {
    const raw = await authedRequest<{ id: string }>('/guardian/support-requests', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey() },
      body: { message },
    });
    return raw.id;
  },

  async setCsMode(ticket, on) {
    const path = `/guardian/support-requests/${ticket}/diagnostics`;
    if (!on) {
      await authedRequest(path, { method: 'DELETE' });
      return;
    }
    const target = await subject();
    const binding = await activeBinding(target.id);
    if (!binding) throw new Error('연결된 기기가 있어야 CS 모드를 켤 수 있어요.');
    // 지난 하루(연결 이후)의 기기 통신 진단을 하루 동안 상담 담당자에게 보여준다
    const now = Date.now();
    const from = Math.max(now - 86_400_000, new Date(binding.started_at).getTime());
    await authedRequest(path, {
      method: 'PUT',
      body: {
        subject_id: target.id,
        from_at: new Date(from).toISOString(),
        until_at: new Date(now).toISOString(),
        expires_at: new Date(now + 86_000_000).toISOString(),
      },
    });
  },

  async trend(metric, period, anchor) {
    const { id } = await subject();
    const [from, until] = trendRange(period, anchor);
    const raw = await authedRequest<{ points: ApiTrendPoint[] }>(
      `/guardian/subjects/${id}/trends`,
      { query: { metric, period, date: dayKey(anchor) } },
    );
    const buckets: TrendBucket[] = raw.points.map((point) => ({
      start: new Date(point.start_at),
      end: new Date(point.end_at),
      value: point.value,
      count: point.sample_count,
      confidence: point.value === null ? null : (point.confidence ?? 'unknown'),
      missing: point.value === null ? (point.missing_reason ?? 'not_measured') : null,
    }));
    return { from, until, buckets, baseline: toBaseline(raw.points) };
  },

  watch(onChange) {
    if (Platform.OS !== 'web' || typeof TextDecoder === 'undefined') return () => {};
    return watchStream(onChange);
  },

  reset() {
    listPromise = null;
    selectedId = null;
    prefsVersion = null;
  },
};
