import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GameShell } from '../engine/GameShell';
import { useFrame, useInversion } from '../engine/hooks';
import { feedback, submitBest } from '../engine/feedback';
import { FlipOff, POSE_NAME } from '../games/flipOff';

export default function FlipOffScreen() {
  const { engine, state } = useInversion({ settleMs: 200 });
  const [started, setStarted] = useState(false);
  const [, setFrame] = useState(0);
  const [best, setBest] = useState<{ best: number; isNew: boolean } | null>(null);

  const game = useRef<FlipOff | null>(null);
  if (!game.current) {
    game.current = new FlipOff({
      hit: feedback.success,
      miss: feedback.fail,
      over: (score) => { submitBest('flip-off', score).then(setBest); },
    });
  }
  const g = game.current;
  const begin = () => { setBest(null); g.start(Date.now(), engine.getState().pose); };

  useFrame(() => { g.update(Date.now(), engine.getState().pose); setFrame((f) => f + 1); }, started);

  const r = g.round;
  return (
    <GameShell
      title="Flip Off"
      subtitle="The phone shouts a pose. Get it there in time."
      rules={[
        'GREEN command: move the phone into that pose before the bar runs out.',
        'RED command: it is a trap. Do not move.',
        'FREEZE: do not move either.',
        'A buzz means you got it, which helps when the screen is face down.',
        'Pass it round: whoever loses the last life is out.',
      ]}
      engine={engine}
      state={state}
      started={started}
      onStart={() => { setStarted(true); begin(); }}
    >
      <View style={styles.hud}>
        <Text style={styles.hudText}>{g.score}</Text>
        <Text style={styles.hudText}>{'♥'.repeat(Math.max(0, g.lives))}{'♡'.repeat(3 - Math.max(0, g.lives))}</Text>
      </View>
      <View style={styles.bar}><View style={[styles.fill, { width: `${g.left(Date.now()) * 100}%` }]} /></View>
      {r && (
        <View style={styles.center}>
          <Text style={styles.rule}>{r.label === 'FREEZE' ? 'stay exactly as you are' : r.red ? "trap: don't move" : 'do it'}</Text>
          <Text style={[styles.cmd, { color: r.red ? '#ff3355' : r.label === 'FREEZE' ? '#4fd3ff' : '#29d17d' }]}>{r.label}</Text>
        </View>
      )}
      <Text style={styles.now}>right now: {POSE_NAME[state.pose]}</Text>
      {g.over && (
        <View style={styles.over}>
          <Text style={styles.overTitle}>Flipped out.</Text>
          <Text style={styles.overText}>Score {g.score}</Text>
          <Text style={styles.overText}>{best ? (best.isNew ? 'New best!' : `Best ${best.best}`) : ' '}</Text>
          <Pressable style={styles.btn} onPress={begin}><Text style={styles.btnText}>Again</Text></Pressable>
        </View>
      )}
    </GameShell>
  );
}

const styles = StyleSheet.create({
  hud: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 12 },
  hudText: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 3 },
  bar: { position: 'absolute', left: 20, right: 20, top: 70, height: 10, borderRadius: 6, backgroundColor: '#2a2838', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#ffc23d' },
  center: { position: 'absolute', top: 200, left: 10, right: 10, alignItems: 'center', gap: 12 },
  rule: { color: '#aaa', fontSize: 18 },
  cmd: { fontSize: 64, lineHeight: 72, fontWeight: '900', textAlign: 'center' },
  now: { position: 'absolute', bottom: 40, left: 0, right: 0, textAlign: 'center', color: '#77748a', fontSize: 16 },
  over: { ...StyleSheet.absoluteFill, backgroundColor: '#0d0d12ee', alignItems: 'center', justifyContent: 'center', gap: 14 },
  overTitle: { color: '#fff', fontSize: 34, fontWeight: '800' },
  overText: { color: '#cfc8e6', fontSize: 18 },
  btn: { backgroundColor: '#ff4f8b', borderRadius: 12, paddingHorizontal: 26, paddingVertical: 12 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
