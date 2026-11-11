import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GameShell } from '../engine/GameShell';
import { useFrame, useInversion } from '../engine/hooks';
import { feedback, submitBest } from '../engine/feedback';
import { BASE_Y, BLOCK_H, CeilingStack, hue, yOf } from '../games/ceilingStack';

export default function CeilingStackScreen() {
  const { engine, state } = useInversion();
  const [started, setStarted] = useState(false);
  const [, setFrame] = useState(0);
  const [best, setBest] = useState<{ best: number; isNew: boolean } | null>(null);

  const game = useRef<CeilingStack | null>(null);
  if (!game.current) {
    game.current = new CeilingStack({
      drop: feedback.tick,
      perfect: feedback.success,
      lose: (score) => { feedback.fail(); submitBest('ceiling-stack', score).then(setBest); },
    });
  }
  const g = game.current;

  useFrame((dt) => { g.update(dt, engine.gravity().x); setFrame((f) => f + 1); }, started);

  return (
    <GameShell
      title="Ceiling Stack"
      subtitle="Build a tower that hangs from the sky."
      rules={[
        'A block slides back and forth. Tap to drop it onto the tower.',
        'Whatever hangs over the edge gets sliced off. Perfect drops grow the block back.',
        'The tower hangs from the ceiling, because everything here is upside down.',
        'Tilting the phone pushes the sliding block like wind, the wrong way. Sideways mirrors it.',
      ]}
      engine={engine}
      state={state}
      started={started}
      onStart={() => { g.reset(); setBest(null); setStarted(true); }}
    >
      <View
        style={StyleSheet.absoluteFill}
        onStartShouldSetResponder={() => true}
        onResponderGrant={() => { if (g.over) setBest(null); g.drop(); }}
      >
        <View style={[StyleSheet.absoluteFill, { transform: [{ translateY: g.cam }] }]} pointerEvents="none">
          <View style={[styles.anchor, { top: BASE_Y + BLOCK_H }]} />
          {g.tower.map((b, i) => (
            <View key={i} style={[styles.block, { left: b.x, top: yOf(i), width: b.w, backgroundColor: hue(i) }]}>
              {b.perfect && <View style={styles.shine} />}
            </View>
          ))}
          {g.debris.map((d, i) => (
            <View key={`d${i}`} style={[styles.block, { left: d.x, top: yOf(d.level) + d.off, width: d.w, backgroundColor: hue(d.level), opacity: d.alpha }]} />
          ))}
          {!g.over && (
            <View style={[styles.block, { left: g.mover.x, top: yOf(g.tower.length), width: g.mover.w, backgroundColor: hue(g.tower.length) }]} />
          )}
        </View>
        <Text style={styles.score} pointerEvents="none">{g.score}</Text>
        {g.streak >= 2 && <Text style={styles.streak} pointerEvents="none">PERFECT x{g.streak}</Text>}
        {g.over && (
          <View style={styles.over} pointerEvents="none">
            <Text style={styles.fell}>IT FELL UP</Text>
            <Text style={styles.overText}>{best ? (best.isNew ? `New best: ${g.score}` : `Best ${best.best}`) : ' '}</Text>
            <Text style={styles.again}>Tap to try again</Text>
          </View>
        )}
      </View>
    </GameShell>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'absolute', left: 0, right: 0, height: 200, backgroundColor: '#4a4660' },
  block: { position: 'absolute', height: BLOCK_H - 2 },
  shine: { height: 4, backgroundColor: '#ffffff66' },
  score: { position: 'absolute', top: 30, left: 0, right: 0, textAlign: 'center', color: '#fff', fontSize: 64, fontWeight: '900' },
  streak: { position: 'absolute', top: 110, left: 0, right: 0, textAlign: 'center', color: '#ffc23d', fontSize: 18, fontWeight: '800' },
  over: { position: 'absolute', top: 230, left: 0, right: 0, height: 200, backgroundColor: '#000c', alignItems: 'center', justifyContent: 'center', gap: 10 },
  fell: { color: '#ff4f8b', fontSize: 40, fontWeight: '900' },
  overText: { color: '#fff', fontSize: 20 },
  again: { color: '#bbb', fontSize: 18 },
});
