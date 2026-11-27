import { useLocalSearchParams } from 'expo-router';

import { useDevices, type DeviceInfo, type QuietHours } from '@/lib/care';

export const CONNECTION_LABEL: Record<DeviceInfo['connection'], string> = {
  online: '연결됨',
  offline: '연결 끊김',
  unknown: '연결 확인 중',
};

/** 거실 기기 */
export const deviceName = (device: DeviceInfo) => `${device.place ?? '집'} 기기`;

/** 주소의 ?id= 기기. 없으면 첫 번째 기기 */
export function useDevice() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const resource = useDevices();
  const device = resource.data?.find((item) => item.id === id) ?? resource.data?.[0] ?? null;
  return { resource, device };
}

/** 22:00 → 오후 10:00 */
function clockLabel(time: string) {
  const [h, m] = time.split(':').map(Number);
  const half = h < 12 ? '오전' : '오후';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${half} ${hour}:${String(m).padStart(2, '0')}`;
}

/** 오후 10:00 ~ 오전 7:00 */
export const quietLabel = (hours: QuietHours) =>
  `${clockLabel(hours.start)} ~ ${clockLabel(hours.end)}`;
