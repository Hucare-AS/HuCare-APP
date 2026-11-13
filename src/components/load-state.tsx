import { ActivityIndicator, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { errorMessage } from '@/lib/care';
import { cn } from '@/lib/cn';

type LoadStateProps = {
  resource: { loading: boolean; error: Error | null; reload: () => void };
  className?: string;
};

/** 데이터가 아직 없을 때: 불러오는 중이면 스피너, 실패했으면 이유와 다시 시도 버튼 */
export function LoadState({ resource, className }: LoadStateProps) {
  if (resource.error && !resource.loading) {
    return (
      <View className={cn('items-center gap-3 px-6 py-10', className)}>
        <Text className="text-center text-muted">{errorMessage(resource.error)}</Text>
        <Button label="다시 시도" variant="outline" onPress={resource.reload} className="px-6" />
      </View>
    );
  }
  return (
    <View className={cn('items-center py-10', className)}>
      <ActivityIndicator accessibilityLabel="불러오는 중" color="#EF7000" />
    </View>
  );
}
