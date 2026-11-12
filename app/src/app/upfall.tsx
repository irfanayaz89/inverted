import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GameShell } from '../engine/GameShell';
import { useFrame, useInversion } from '../engine/hooks';
import { feedback, submitBest } from '../engine/feedback';
import { ITEM_R, PADDLE_H, PADDLE_W, PADDLE_Y, Upfall } from '../games/upfall';

export default function UpfallScreen() {
  // Tilting hard to steer shouldn't flip the screen mid-game, so demand a firmer pose.
  const { engine, state } = useInversion({ tiltThreshold: 0.6, settleMs: 350 });
  const [started, setStarted] = useState(false);
  const [, setFrame] = useState(0);
  const [best, setBest] = useState<{ best: number; isNew: boolean } | null>(null);

  const game = useRef<Upfall | null>(null);
  if (!game.current) {
    game.current = new Upfall({
      catch: feedback.tick,
      hurt: feedback.fail,
      over: (score) => { submitBest('upfall', score).then(setBest); },
    });
  }
  const g = game.current;

  useFrame((dt) => { g.update(dt, engine.gravity().x); setFrame((f) => f + 1); }, started);

  return (
    <GameShell
      title="Upfall"
      subtitle="Everything falls up. Catch the stars."
      rules={[
        'Stars and bombs fall UP the screen toward your paddle.',
        'Tilt the phone to slide the paddle. It slides the wrong way.',
        'Catch stars. A star that gets past you costs a life, and so does catching a bomb.',
        'Sideways mirrors it.',
      ]}
      engine={engine}
      state={state}
      started={started}
      onStart={() => { g.reset(); setBest(null); setStarted(true); }}
    >
      <View
        style={StyleSheet.absoluteFill}
        onStartShouldSetResponder={() => true}
        onResponderGrant={() => { if (g.over) { setBest(null); g.reset(); } }}
      >
        {g.items.map((it) => (
          <View key={it.id} pointerEvents="none" style={[styles.item, { left: it.x - ITEM_R, top: it.y - ITEM_R, backgroundColor: it.good ? '#ffc23d' : '#ff3355' }]}>
            <Text style={styles.glyph}>{it.good ? '★' : '✕'}</Text>
          </View>
        ))}
        <View pointerEvents="none" style={[styles.paddle, { left: g.paddleX - PADDLE_W / 2 }]} />
        <Text style={styles.score} pointerEvents="none">{g.score}</Text>
        <Text style={styles.lives} pointerEvents="none">{'♥'.repeat(Math.max(0, g.lives))}{'♡'.repeat(3 - Math.max(0, g.lives))}</Text>
        {g.over && (
          <View style={styles.over} pointerEvents="none">
            <Text style={styles.overTitle}>Dropped it. Upwards.</Text>
            <Text style={styles.overText}>{best ? (best.isNew ? `New best: ${g.score}` : `Score ${g.score}  ·  Best ${best.best}`) : ' '}</Text>
            <Text style={styles.again}>Tap to try again</Text>
          </View>
        )}
      </View>
    </GameShell>
  );
}

const styles = StyleSheet.create({
  item: { position: 'absolute', width: ITEM_R * 2, height: ITEM_R * 2, borderRadius: ITEM_R, alignItems: 'center', justifyContent: 'center' },
  glyph: { color: '#15151d', fontSize: 16, fontWeight: '900' },
  paddle: { position: 'absolute', top: PADDLE_Y, width: PADDLE_W, height: PADDLE_H, borderRadius: 8, backgroundColor: '#4fd3ff' },
  score: { position: 'absolute', top: 24, left: 16, color: '#ffffff55', fontSize: 54, fontWeight: '900' },
  lives: { position: 'absolute', top: 40, right: 16, color: '#fff', fontSize: 20, letterSpacing: 3 },
  over: { position: 'absolute', top: 240, left: 0, right: 0, height: 190, backgroundColor: '#000c', alignItems: 'center', justifyContent: 'center', gap: 10 },
  overTitle: { color: '#ff4f8b', fontSize: 28, fontWeight: '900' },
  overText: { color: '#fff', fontSize: 19 },
  again: { color: '#bbb', fontSize: 17 },
});
