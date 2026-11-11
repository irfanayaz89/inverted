import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const safe = (f: () => Promise<unknown>) => { f().catch(() => {}); };
const buzz = (ms: number) => {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(ms);
};

export const feedback = {
  tick: () => (Platform.OS === 'web' ? buzz(15) : safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light))),
  thud: () => (Platform.OS === 'web' ? buzz(40) : safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy))),
  success: () => (Platform.OS === 'web' ? buzz(30) : safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success))),
  fail: () => (Platform.OS === 'web' ? buzz(200) : safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error))),
};

/** Saves `score` if it beats the stored best. */
export async function submitBest(key: string, score: number, lowerIsBetter = false) {
  const k = `inverted.best.${key}`;
  let prev: number | null = null;
  try {
    const raw = await AsyncStorage.getItem(k);
    prev = raw == null ? null : Number(raw);
  } catch {}
  const isNew = prev == null || (lowerIsBetter ? score < prev : score > prev);
  if (isNew) { try { await AsyncStorage.setItem(k, String(score)); } catch {} }
  return { best: isNew ? score : (prev as number), isNew };
}
