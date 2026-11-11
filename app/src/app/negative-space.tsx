import { memo, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GameShell } from '../engine/GameShell';
import { useFrame, useInversion } from '../engine/hooks';
import { feedback, submitBest } from '../engine/feedback';
import { LEVELS, NAMES, NegativeSpace, RADIUS, TILE } from '../games/negativeSpace';

const PAPER = '#f4f1e8', INK = '#111';

export default function NegativeSpaceScreen() {
  const { engine, state } = useInversion({ tiltThreshold: 0.6, settleMs: 300 });
  const [started, setStarted] = useState(false);
  const [, setFrame] = useState(0);
  const [result, setResult] = useState<{ seconds: number; deaths: number; best: number; isNew: boolean } | null>(null);

  const game = useRef<NegativeSpace | null>(null);
  if (!game.current) {
    game.current = new NegativeSpace({
      crushed: feedback.fail,
      spiked: feedback.fail,
      flipped: feedback.thud,
      goal: feedback.success,
      finished: async (seconds, deaths) => {
        const b = await submitBest('negative-space', seconds, true);
        setResult({ seconds, deaths, ...b });
      },
    });
  }
  const g = game.current;

  useEffect(() => engine.onPoseChange((from, to) => g.poseChanged(from, to)), [engine, g]);
  useFrame((dt) => { g.update(dt, engine.gravity()); setFrame((f) => f + 1); }, started);

  return (
    <GameShell
      title="Negative Space"
      subtitle="Tilt to roll. Flip to invert the world."
      rules={[
        'Tilt the phone to roll the ball to the green goal. It rolls the wrong way.',
        'Black is wall, white is floor. Flip the phone over and they swap.',
        'The screen flips back so it is always upside down. Sorry.',
        'Only flip while the ball sits on a grey safe tile, or it gets crushed.',
        'Red spikes are always deadly. Sideways = mirror world.',
      ]}
      engine={engine}
      state={state}
      started={started}
      onStart={() => { g.restart(); g.setPose(engine.getState().pose); setResult(null); setStarted(true); }}
    >
      <Grid level={g.level} inverted={g.inverted} ox={g.ox} oy={g.oy} />
      {!g.ball.dead && (
        <View style={[styles.ball, { left: g.ball.x - RADIUS, top: g.ball.y - RADIUS }]}>
          <View style={styles.shine} />
        </View>
      )}
      <Text style={[styles.hud, { left: 16 }]}>Level {g.level + 1}/{LEVELS.length}: {NAMES[g.level]}</Text>
      <Text style={[styles.hud, { right: 16 }]}>Deaths {g.deaths}</Text>
      <Text style={styles.sub}>Solid now: {g.inverted ? 'WHITE' : 'BLACK'}   {g.clock.toFixed(1)}s</Text>
      {g.banner && (
        <View style={styles.banner}><Text style={styles.bannerText}>{g.banner.text}</Text></View>
      )}
      {result && (
        <Pressable style={styles.result} onPress={() => { g.restart(); setResult(null); }}>
          <Text style={styles.escaped}>ESCAPED</Text>
          <Text style={styles.resultText}>{result.seconds.toFixed(1)}s with {result.deaths} deaths</Text>
          <Text style={styles.resultText}>{result.isNew ? 'New best!' : `Best: ${result.best.toFixed(1)}s`}</Text>
          <Text style={styles.again}>Tap to play again</Text>
        </Pressable>
      )}
    </GameShell>
  );
}

/** The tiles only change when the level or the inversion changes, so memoise them. */
const Grid = memo(function Grid({ level, inverted, ox, oy }: { level: number; inverted: boolean; ox: number; oy: number }) {
  const rows = LEVELS[level];
  return (
    <>
      {rows.map((row, r) => [...row].map((ch, c) => {
        const solidNow = (ch === '#' && !inverted) || (ch === '.' && inverted);
        const bg = ch === 'W' ? '#4a4660' : ch === '#' ? INK : ch === '.' ? PAPER
          : ch === 'o' || ch === 'S' ? '#8d8aa0' : ch === 'G' ? '#29d17d' : inverted ? PAPER : INK;
        return (
          <View key={`${r}-${c}`} style={[styles.tile, { left: ox + c * TILE, top: oy + r * TILE, backgroundColor: bg }, solidNow && (inverted ? styles.solidLight : styles.solidDark)]}>
            {ch === '^' && <Text style={styles.spike}>▲▲▲</Text>}
            {(ch === 'o' || ch === 'S') && <View style={styles.safe} />}
          </View>
        );
      }))}
    </>
  );
});

const styles = StyleSheet.create({
  tile: { position: 'absolute', width: TILE, height: TILE, alignItems: 'center', justifyContent: 'center' },
  solidDark: { borderWidth: 3, borderColor: '#2b2b2b' },
  solidLight: { borderWidth: 3, borderColor: '#d8d3c4' },
  spike: { color: '#ff3355', fontSize: 12, letterSpacing: -1 },
  safe: { width: TILE - 10, height: TILE - 10, borderWidth: 2, borderColor: '#ffffff66' },
  ball: { position: 'absolute', width: RADIUS * 2, height: RADIUS * 2, borderRadius: RADIUS, backgroundColor: '#ff7a1a' },
  shine: { position: 'absolute', left: 4, top: 4, width: 7, height: 7, borderRadius: 4, backgroundColor: '#ffffffaa' },
  hud: { position: 'absolute', top: 20, color: '#fff', fontSize: 20, fontWeight: '700' },
  sub: { position: 'absolute', top: 48, left: 16, color: '#bbb', fontSize: 14 },
  banner: { position: 'absolute', top: 300, left: 0, right: 0, height: 100, backgroundColor: '#000a', alignItems: 'center', justifyContent: 'center' },
  bannerText: { color: '#ffc23d', fontSize: 54, fontWeight: '900' },
  result: { ...StyleSheet.absoluteFill, backgroundColor: '#000d', alignItems: 'center', justifyContent: 'center', gap: 10 },
  escaped: { color: '#29d17d', fontSize: 40, fontWeight: '900' },
  resultText: { color: '#fff', fontSize: 22 },
  again: { color: '#bbb', fontSize: 18, marginTop: 20 },
});
