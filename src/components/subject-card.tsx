import { Pressable } from 'react-native';

import { Text } from '@/components/ui/text';
import {
  isSameDay,
  now,
  formatDate,
  type DeviceKind,
  type Measurement,
  type Presence,
  type SubjectKind,
  type SubjectSummary,
} from '@/lib/care';
import { cn } from '@/lib/cn';

export const KIND_LABEL: Record<SubjectKind, string> = {
  elder: '어르신',
  child: '어린이',
  pet: '반려동물',
};

export const DEVICE_LABEL: Record<DeviceKind, string> = {
  camera: '카메라형',
  radar: '레이더형',
};

const PRESENCE_LABEL: Record<Presence, string> = {
  present: '재실',
  absent: '외출',
  measuring: '측정 중',
  difficult: '측정 어려움',
  unknown: '상태 확인 중',
};

/** 어르신 · 거실 · 레이더형 (모르는 항목은 뺀다) */
export function subjectMeta(subject: SubjectSummary, parts: ('place' | 'device')[]) {
  return [
    KIND_LABEL[subject.kind],
    parts.includes('place') ? subject.place : null,
    parts.includes('device') && subject.device ? DEVICE_LABEL[subject.device] : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** 카드 상태 줄: 확인이 필요하거나 연결이 끊기면 빨강, 나머지는 초록 */
export function statusLine(subject: SubjectSummary): {
  text: string;
  tone: 'red' | 'green' | 'muted';
} {
  if (subject.status === 'offline') return { text: '연결 끊김 · 마지막 상태 확인', tone: 'red' };
  if (subject.status === 'alert' || subject.primaryEventTitle) {
    return {
      text: `확인 필요 · ${subject.primaryEventTitle ?? subject.statusMessage}`,
      tone: 'red',
    };
  }
  if (subject.status === 'no_measurement')
    return { text: '아직 측정 기록이 없어요', tone: 'muted' };
  const message = subject.statusMessage.replace(/[.。]$/, '');
  return { text: `${PRESENCE_LABEL[subject.presence]} · ${message}`, tone: 'green' };
}

/** 심박 71 bpm    호흡 14 회/분 */
export function vitalsLine(latest: Measurement | null) {
  const hr = latest?.metrics.hr.value;
  const rr = latest?.metrics.rr.value;
  return `심박 ${hr != null ? `${hr} bpm` : '—'}    호흡 ${rr != null ? `${rr} 회/분` : '—'}`;
}

/** 14:32 */
export function formatClock(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** 오늘 14:32 / 10월 25일 14:32 */
export function lastSeen(latest: Measurement | null) {
  if (!latest) return '기록 없음';
  const day = isSameDay(latest.at, now()) ? '오늘' : formatDate(latest.at);
  return `${day} ${formatClock(latest.at)}`;
}

const TONE = { red: 'text-care-red', green: 'text-care-green', muted: 'text-muted' } as const;

type SubjectCardProps = {
  subject: SubjectSummary;
  /** 기본: "어머니   ›" */
  title?: string;
  meta: string;
  /** 기본: "미확인 알림 2" */
  unackedLabel?: string;
  onPress?: () => void;
};

/** 대상 카드 (Figma HC/subject 950:307) */
export function SubjectCard({
  subject,
  title = `${subject.label}   ›`,
  meta,
  unackedLabel = '미확인 알림',
  onPress,
}: SubjectCardProps) {
  const status = statusLine(subject);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${subject.label}, ${status.text}`}
      onPress={onPress}
      disabled={!onPress}
      className="gap-2 rounded-lg bg-white p-4 shadow-subject active:opacity-70"
    >
      <Text className="text-[21px] font-bold leading-[30px] tracking-normal">{title}</Text>
      <Text className="text-[12px] leading-[17px] tracking-normal text-[#777777]">{meta}</Text>
      <Text className={cn('font-semibold leading-[20px] tracking-normal', TONE[status.tone])}>
        {status.text}
      </Text>
      <Text className="text-[16px] font-semibold leading-[23px] tracking-normal">
        {vitalsLine(subject.latest)}
      </Text>
      <Text className="text-[11px] leading-[16px] tracking-normal text-[#777777]">
        {lastSeen(subject.latest)} · {unackedLabel} {subject.unackedCount}
      </Text>
    </Pressable>
  );
}
