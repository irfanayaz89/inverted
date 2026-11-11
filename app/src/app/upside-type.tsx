import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { GameShell } from '../engine/GameShell';
import { useFrame, useInversion } from '../engine/hooks';
import { feedback, submitBest } from '../engine/feedback';

const PHRASES = [
  'turn it the other way', 'up is just a rumour', 'the floor is on the ceiling',
  'my phone hates me', 'left is the new right', 'nothing is where it was',
  'gravity is optional', 'read this upside down', 'flip it and reverse it', 'which way is home',
];
const QWERTY = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
const shuffle = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

/** Each finished phrase makes the keyboard worse. */
const LAYOUTS: { name: string; rows: () => string[] }[] = [
  { name: 'Layout 1: normal (ish)', rows: () => QWERTY },
  { name: 'Layout 2: mirrored', rows: () => QWERTY.map((r) => [...r].reverse().join('')) },
  { name: 'Layout 3: alphabetical', rows: () => ['abcdefghij', 'klmnopqrs', 'tuvwxyz'] },
  { name: 'Layout 4: scrambled', rows: () => { const a = shuffle([...'abcdefghijklmnopqrstuvwxyz']).join(''); return [a.slice(0, 10), a.slice(10, 19), a.slice(19)]; } },
];
const DURATION = 60;

export default function UpsideTypeScreen() {
  const { engine, state } = useInversion();
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [typed, setTyped] = useState('');
  const [layoutIx, setLayoutIx] = useState(0);
  const [rows, setRows] = useState(QWERTY);
  const [elapsed, setElapsed] = useState(0);
  const [stats, setStats] = useState({ correct: 0, errors: 0, done: 0 });
  const [result, setResult] = useState<{ wpm: number; acc: number; best: number; isNew: boolean } | null>(null);
  const order = useRef<string[]>([]);

  const nextPhrase = () => {
    if (!order.current.length) order.current = shuffle(PHRASES);
    setPhrase(order.current.pop()!);
    setTyped('');
  };
  const setLayout = (i: number) => { const L = LAYOUTS[Math.min(i, LAYOUTS.length - 1)]; setLayoutIx(i); setRows(L.rows()); };

  const begin = () => {
    setStats({ correct: 0, errors: 0, done: 0 });
    setElapsed(0);
    setResult(null);
    setLayout(0);
    nextPhrase();
    setPlaying(true);
  };

  const press = (v: string) => {
    if (!playing) return;
    if (v === 'back') { setTyped((t) => t.slice(0, -1)); return; }
    if (typed.length >= phrase.length) return;
    const ok = v === phrase[typed.length];
    const t = typed + v;
    setTyped(t);
    setStats((s) => ({ ...s, correct: s.correct + (ok ? 1 : 0), errors: s.errors + (ok ? 0 : 1) }));
    if (ok) feedback.tick(); else feedback.fail();
    if (t === phrase) {
      feedback.success();
      setStats((s) => ({ ...s, done: s.done + 1 }));
      setLayout(layoutIx + 1);
      nextPhrase();
    }
  };

  useFrame((dt) => {
    if (!playing) return;
    const e = elapsed + dt;
    setElapsed(e);
    if (e >= DURATION) {
      setPlaying(false);
      const wpm = Math.round(stats.correct / 5);
      const acc = stats.correct + stats.errors ? Math.round((100 * stats.correct) / (stats.correct + stats.errors)) : 0;
      submitBest('upside-type', wpm).then((b) => setResult({ wpm, acc, ...b }));
    }
  }, started);

  // Laptop testing: the physical keyboard works too.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => {
      if (/^[a-z ]$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('back');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const wpm = Math.round(stats.correct / 5 / Math.max(elapsed / 60, 1 / 60));

  return (
    <GameShell
      title="Upside Type"
      subtitle="A typing test you will fail."
      rules={[
        'Type the phrase on the keyboard as fast as you can. 60 seconds.',
        'The whole thing is upside down, keyboard included. Flip the phone and it flips back.',
        'Every phrase you finish, the keyboard gets worse: mirrored, then ABC order, then scrambled.',
        'Sideways = mirror writing.',
      ]}
      engine={engine}
      state={state}
      started={started}
      onStart={() => { setStarted(true); begin(); }}
    >
      <View style={styles.hud}>
        <Text style={styles.hudText}>{wpm} wpm</Text>
        <Text style={styles.hudText}>Layout {Math.min(layoutIx, 3) + 1}</Text>
      </View>
      <Text style={styles.layout}>{LAYOUTS[Math.min(layoutIx, 3)].name}</Text>
      <Text style={styles.target}>
        {[...phrase].map((ch, i) => {
          const done = i < typed.length;
          const style = done ? (typed[i] === ch ? styles.ok : styles.bad) : i === typed.length ? styles.cur : styles.todo;
          return <Text key={i} style={style}>{ch === ' ' ? ' ' : ch}</Text>;
        })}
      </Text>
      <Text style={styles.timer}>{Math.max(0, Math.ceil(DURATION - elapsed))}</Text>
      <View style={styles.kb}>
        {rows.map((r) => (
          <View key={r} style={styles.row}>
            {[...r].map((ch) => <Key key={ch} label={ch} onPress={() => press(ch)} />)}
          </View>
        ))}
        <View style={styles.row}>
          <Key label="⌫" wide={70} onPress={() => press('back')} />
          <Key label="space" wide={170} onPress={() => press(' ')} />
        </View>
      </View>
      {result && (
        <View style={styles.over}>
          <Text style={styles.overTitle}>Time.</Text>
          <Text style={styles.overText}>{result.wpm} wpm upside down, {result.acc}% accuracy</Text>
          <Text style={styles.overText}>{stats.done} phrases, reached layout {Math.min(layoutIx, 3) + 1}</Text>
          <Text style={styles.overText}>{result.isNew ? 'New best!' : `Best ${result.best} wpm`}</Text>
          <Pressable style={styles.btn} onPress={begin}><Text style={styles.btnText}>Again</Text></Pressable>
        </View>
      )}
    </GameShell>
  );
}

/** Keys fire on touch-down (no press delay), like a real keyboard. */
function Key({ label, onPress, wide }: { label: string; onPress: () => void; wide?: number }) {
  const [hit, setHit] = useState(false);
  return (
    <View
      onStartShouldSetResponder={() => true}
      onResponderGrant={() => { setHit(true); onPress(); }}
      onResponderRelease={() => setHit(false)}
      onResponderTerminate={() => setHit(false)}
      style={[styles.key, wide ? { width: wide } : null, hit && styles.keyHit]}
    >
      <Text style={[styles.keyText, wide ? { fontSize: 15 } : null]} pointerEvents="none">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hud: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 12 },
  hudText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  layout: { position: 'absolute', top: 48, left: 0, right: 0, textAlign: 'center', color: '#ffc23d', fontWeight: '700', fontSize: 15 },
  target: { position: 'absolute', top: 90, left: 20, right: 20, fontSize: 26, lineHeight: 35, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontWeight: '600' },
  ok: { color: '#29d17d' },
  bad: { color: '#fff', backgroundColor: '#ff3355' },
  cur: { color: '#fff', textDecorationLine: 'underline', textDecorationColor: '#ffc23d' },
  todo: { color: '#77748a' },
  timer: { position: 'absolute', top: 250, left: 0, right: 0, textAlign: 'center', fontSize: 64, fontWeight: '900', color: '#ffffff22' },
  kb: { position: 'absolute', left: 4, right: 4, bottom: 10, gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 5 },
  key: { width: 34, height: 54, borderRadius: 8, backgroundColor: '#2d2a3e', alignItems: 'center', justifyContent: 'center' },
  keyHit: { backgroundColor: '#ff4f8b' },
  keyText: { color: '#fff', fontSize: 22, fontWeight: '600' },
  over: { ...StyleSheet.absoluteFill, backgroundColor: '#0d0d12ee', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 30 },
  overTitle: { color: '#fff', fontSize: 34, fontWeight: '800' },
  overText: { color: '#cfc8e6', fontSize: 17, textAlign: 'center' },
  btn: { backgroundColor: '#ff4f8b', borderRadius: 12, paddingHorizontal: 26, paddingVertical: 12 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
