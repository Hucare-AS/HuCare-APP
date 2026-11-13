import { Linking } from 'react-native';

/** 전화를 건다. 번호가 없거나 전화 앱이 없는 환경(PC 브라우저 등)에서는 아무 일도 일어나지 않는다. */
export function callPhone(phone: string | null | undefined) {
  if (!phone) return;
  Linking.openURL(`tel:${phone.replace(/[^+0-9]/g, '')}`).catch(() => {});
}
