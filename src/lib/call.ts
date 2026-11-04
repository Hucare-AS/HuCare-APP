import { Linking } from 'react-native';

import { subject } from '@/lib/care';

/** 대상자에게 전화를 건다. 전화 앱이 없는 환경(PC 브라우저 등)에서는 아무 일도 일어나지 않는다. */
export function callSubject() {
  Linking.openURL(`tel:${subject.phone.replaceAll('-', '')}`).catch(() => {});
}
