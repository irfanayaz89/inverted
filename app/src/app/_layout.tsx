import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" hidden />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0d0d12' }, animation: 'fade' }} />
    </>
  );
}
