import { Image as ExpoImage } from 'expo-image';
import { cssInterop } from 'nativewind';

// expo-image 는 서드파티 컴포넌트라 className 을 style 로 연결해 줘야 한다.
cssInterop(ExpoImage, { className: 'style' });

export { ExpoImage as Image };
