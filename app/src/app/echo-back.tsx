import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GameShell } from '../engine/GameShell';
import { useFrame, useInversion } from '../engine/hooks';
import { feedback, submitBest } from '../engine/feedback';
import { EchoBack, PAD_COLORS } from '../games/echoBack';

const PAD = 170, GAP = 16, LEFT = (400 - PAD * 2 - GAP) / 2, TOP = 190;

export default function EchoBackScreen() {
  const { engine, state } = useInversion();
  const [started, setStarted] = useState(false);
  const [, setFrame] = useState(0);
  const [best, setBest] = useState<{ best: number; isNew: boolean } | null>(null);

  const game = useRef<EchoBack | null>(null);
  if (!game.current) {
    game.current = new EchoBack({
      beep: feedback.tick,
      good: feedback.success,
      over: (score) => { feedback.fail(); submitBest('echo-back', score).then(setBest); },
    });
  }
  const g = game.current;
  const begin = () => { setBest(null); g.start(Date.now()); };

  useFrame(() => { g.update(Date.now()); setFrame((f) => f + 1); }, started);

  return (
    <GameShell
      title="Echo Back"
      subtitle="Remember the pattern. Play it backwards."
      rules={[
        'Watch the pads light up in order.',
        'Then tap them back in REVERSE order, last one first.',
        'From round 3 the board sometimes spins after the show, so go by colour, not position.',
        'It is all upside down, and sideways mirrors it. Naturally.',
      ]}
      engine={engine}
      state={state}
      started={started}
      onStart={() => { setStarted(true); begin(); }}
    >
      <Text style={styles.score}>Round {g.round + 1}</Text>
      <Text style={styles.status}>
        {g.phase === 'show' ? 'watch' : g.phase === 'input' ? `backwards: ${g.remaining} to go` : ' '}
      </Text>
      {g.phase === 'input' && g.flipped && <Text style={styles.flipped}>THE BOARD SPUN</Text>}
      {PAD_COLORS.map((color, pad) => {
        const slot = g.slotOf(pad);
        const on = g.lit === pad;
        return (
          <View
            key={pad}
            onStartShouldSetResponder={() => true}
            onResponderGrant={() => g.tap(pad, Date.now())}
            style={[
              styles.pad,
              { left: LEFT + (slot % 2) * (PAD + GAP), top: TOP + Math.floor(slot / 2) * (PAD + GAP), backgroundColor: color, opacity: on ? 1 : 0.28 },
              on && styles.padOn,
            ]}
          />
        );
      })}
      {g.phase === 'over' && (
        <View style={styles.over}>
          <Text style={styles.overTitle}>Wrong pad.</Text>
          <Text style={styles.overText}>You echoed {g.round} {g.round === 1 ? 'round' : 'rounds'}</Text>
          <Text style={styles.overText}>{best ? (best.isNew ? 'New best!' : `Best ${best.best}`) : ' '}</Text>
          <Pressable style={styles.btn} onPress={begin}><Text style={styles.btnText}>Again</Text></Pressable>
        </View>
      )}
    </GameShell>
  );
}

const styles = StyleSheet.create({
  score: { position: 'absolute', top: 40, left: 0, right: 0, textAlign: 'center', color: '#fff', fontSize: 30, fontWeight: '800' },
  status: { position: 'absolute', top: 90, left: 0, right: 0, textAlign: 'center', color: '#bdb6d6', fontSize: 18 },
  flipped: { position: 'absolute', top: 130, left: 0, right: 0, textAlign: 'center', color: '#ffc23d', fontSize: 18, fontWeight: '800' },
  pad: { position: 'absolute', width: PAD, height: PAD, borderRadius: 26 },
  padOn: { borderWidth: 6, borderColor: '#fff' },
  over: { ...StyleSheet.absoluteFill, backgroundColor: '#0d0d12ee', alignItems: 'center', justifyContent: 'center', gap: 14 },
  overTitle: { color: '#fff', fontSize: 34, fontWeight: '800' },
  overText: { color: '#cfc8e6', fontSize: 18 },
  btn: { backgroundColor: '#ff4f8b', borderRadius: 12, paddingHorizontal: 26, paddingVertical: 12 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
