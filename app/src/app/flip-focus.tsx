import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useKeepAwake } from 'expo-keep-awake';
import { GameShell } from '../engine/GameShell';
import { useFrame, useInversion } from '../engine/hooks';
import { feedback } from '../engine/feedback';
import { FlipFocus, fmt } from '../games/flipFocus';

const OPTIONS = [
  { label: '10 sec test', ms: 10_000 },
  { label: '5 min', ms: 5 * 60_000 },
  { label: '15 min', ms: 15 * 60_000 },
  { label: '25 min', ms: 25 * 60_000 },
  { label: '50 min', ms: 50 * 60_000 },
];
const KEY = 'inverted.focus.stats';
type Stats = { sessions: number; minutes: number; streak: number };

export default function FlipFocusScreen() {
  useKeepAwake();
  const { engine, state } = useInversion({ settleMs: 400 });
  const [started, setStarted] = useState(false);
  const [, setFrame] = useState(0);
  const [stats, setStats] = useState<Stats>({ sessions: 0, minutes: 0, streak: 0 });
  const statsRef = useRef(stats);
  statsRef.current = stats;

  const save = (s: Stats) => { setStats(s); AsyncStorage.setItem(KEY, JSON.stringify(s)).catch(() => {}); };
  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => { if (raw) setStats(JSON.parse(raw)); }).catch(() => {});
  }, []);

  const timer = useRef<FlipFocus | null>(null);
  if (!timer.current) {
    timer.current = new FlipFocus({
      started: feedback.thud,
      peek: feedback.fail,
      resumed: feedback.tick,
      done: (minutes) => {
        feedback.success(); setTimeout(feedback.success, 500); setTimeout(feedback.success, 1000);
        const s = statsRef.current;
        save({ sessions: s.sessions + 1, minutes: Math.round((s.minutes + minutes) * 10) / 10, streak: s.streak + 1 });
      },
      broken: () => { feedback.fail(); save({ ...statsRef.current, streak: 0 }); },
    });
  }
  const t = timer.current;

  useFrame(() => { t.update(Date.now(), engine.getState().pose); setFrame((f) => f + 1); }, started);

  return (
    <GameShell
      title="Flip Focus"
      subtitle="A focus timer that only runs while your phone is face down."
      rules={[
        'Pick how long you want to focus, then put the phone face down.',
        'The timer only counts while it stays face down. It buzzes when you are done.',
        'Pick it up and you get 3 seconds to put it back before the session breaks.',
        'Finish sessions in a row to build a streak. Peeking resets it.',
      ]}
      engine={engine}
      state={state}
      started={started}
      onStart={() => { t.reset(); setStarted(true); }}
    >
      <View style={styles.fill}>
        {t.phase === 'idle' && (
          <>
            <Text style={styles.h}>How long?</Text>
            {OPTIONS.map((o) => (
              <Pressable key={o.label} style={styles.opt} onPress={() => t.arm(o.ms)}>
                <Text style={styles.optText}>{o.label}</Text>
              </Pressable>
            ))}
            <Text style={styles.stats}>{stats.sessions} sessions  ·  {stats.minutes} min focused  ·  streak {stats.streak}</Text>
          </>
        )}
        {t.phase === 'armed' && (
          <>
            <Text style={styles.big}>{fmt(t.durationMs)}</Text>
            <Text style={styles.h}>Put the phone face down to start</Text>
            <Pressable style={styles.ghost} onPress={() => t.reset()}><Text style={styles.ghostText}>Cancel</Text></Pressable>
          </>
        )}
        {t.phase === 'running' && (
          <>
            <Text style={styles.big}>{fmt(t.remainingMs)}</Text>
            <Text style={styles.h}>Focusing. You should not be reading this.</Text>
          </>
        )}
        {t.phase === 'peeking' && (
          <>
            <Text style={[styles.big, styles.warn]}>{Math.ceil(t.peekLeftMs / 1000)}</Text>
            <Text style={[styles.h, styles.warn]}>PUT IT BACK</Text>
            <Text style={styles.stats}>{fmt(t.remainingMs)} left</Text>
          </>
        )}
        {t.phase === 'done' && (
          <>
            <Text style={[styles.big, styles.good]}>Done</Text>
            <Text style={styles.h}>{fmt(t.durationMs)} of focus. Streak {stats.streak}.</Text>
            <Pressable style={styles.opt} onPress={() => t.reset()}><Text style={styles.optText}>Go again</Text></Pressable>
          </>
        )}
        {t.phase === 'broken' && (
          <>
            <Text style={[styles.big, styles.warn]}>You peeked</Text>
            <Text style={styles.h}>{fmt(t.focusedMs)} focused before you cracked. Streak reset.</Text>
            <Pressable style={styles.opt} onPress={() => t.reset()}><Text style={styles.optText}>Try again</Text></Pressable>
          </>
        )}
      </View>
    </GameShell>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 28 },
  h: { color: '#cfc8e6', fontSize: 20, fontWeight: '600', textAlign: 'center' },
  big: { color: '#fff', fontSize: 76, fontWeight: '900', textAlign: 'center' },
  warn: { color: '#ff3355' },
  good: { color: '#29d17d' },
  opt: { backgroundColor: '#2d2a3e', borderRadius: 14, paddingVertical: 14, width: 240, alignItems: 'center' },
  optText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  ghost: { padding: 12 },
  ghostText: { color: '#8f89a6', fontSize: 16 },
  stats: { color: '#8f89a6', fontSize: 14, marginTop: 10, textAlign: 'center' },
});
