import { ReactNode, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { InversionEngine, InversionState } from './inversion';
import { InvertedStage } from './InvertedStage';

type Props = {
  title: string;
  subtitle: string;
  rules: string[];
  engine: InversionEngine;
  state: InversionState;
  onStart: () => void;
  started: boolean;
  children: ReactNode;
};

/** Readable intro card (the last moment of mercy), then the inverted board. */
export function GameShell({ title, subtitle, rules, engine, state, onStart, started, children }: Props) {
  const router = useRouter();
  const [hint, setHint] = useState(false);

  const start = async () => {
    await engine.requestPermission();
    onStart();
    if (Platform.OS === 'web') setTimeout(() => setHint(!engine.getState().hasSensor), 1200);
  };

  return (
    <View style={styles.screen}>
      {started ? (
        <InvertedStage engine={engine} state={state}>{children}</InvertedStage>
      ) : (
        <ScrollView contentContainerStyle={styles.intro}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          {rules.map((r) => (
            <Text key={r} style={styles.rule}>•  {r}</Text>
          ))}
          <Pressable style={styles.go} onPress={start}>
            <Text style={styles.goText}>Start</Text>
          </Pressable>
          <Text style={styles.note}>Rotation lock can stay on: the game reads your tilt sensor.</Text>
        </ScrollView>
      )}
      <Pressable style={styles.close} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={12}>
        <Text style={styles.closeText}>✕</Text>
      </Pressable>
      {hint && (
        <Pressable style={styles.hint} onPress={() => setHint(false)}>
          <Text style={styles.hintText}>
            No tilt sensor found. Keys: 1 upright, 2 upside down, 3/4 sideways, 5 flat, 6 face down, arrows tilt.
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0d0d12' },
  intro: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12, maxWidth: 440, alignSelf: 'center' },
  title: { fontSize: 40, fontWeight: '900', color: '#ff4f8b', transform: [{ rotate: '180deg' }], marginBottom: 4 },
  subtitle: { color: '#bdb6d6', fontSize: 16, marginBottom: 8, textAlign: 'center' },
  rule: { color: '#ddd', fontSize: 15, lineHeight: 21, alignSelf: 'stretch' },
  go: { marginTop: 14, backgroundColor: '#ff4f8b', borderRadius: 999, paddingHorizontal: 44, paddingVertical: 14 },
  goText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  note: { color: '#8f89a6', fontSize: 12, textAlign: 'center' },
  close: { position: 'absolute', top: 44, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffffff22', alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  hint: { position: 'absolute', left: 10, right: 10, bottom: 14, backgroundColor: '#000c', padding: 10, borderRadius: 10 },
  hintText: { color: '#fff', fontSize: 13, textAlign: 'center' },
});
