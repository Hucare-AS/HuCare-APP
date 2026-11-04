import { Link, Stack } from 'expo-router';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View className="flex-1 items-center justify-center gap-4 bg-surface px-6">
        <Text variant="section">페이지를 찾을 수 없습니다.</Text>
        <Link href="/home" className="text-base text-primary underline">
          홈으로 돌아가기
        </Link>
      </View>
    </>
  );
}
