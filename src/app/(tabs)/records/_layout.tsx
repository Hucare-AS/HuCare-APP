import { Stack } from 'expo-router';

export const unstable_settings = { initialRouteName: 'index' };

export default function RecordsLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'none' }} />;
}
