import { Platform, Share } from 'react-native';

/** 웹은 클립보드에 복사하고 안내 문구를 돌려준다. 네이티브는 공유 창을 연다 */
export async function shareText(text: string, copied: string) {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return copied;
  }
  await Share.share({ message: text });
  return null;
}
