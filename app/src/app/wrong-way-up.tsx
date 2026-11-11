import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GameShell } from '../engine/GameShell';
import { useFrame, useInversion } from '../engine/hooks';
import { feedback, submitBest } from '../engine/feedback';

type Move = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'TAP' | 'WAIT';
const DIRS: Move[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
const OPP: Record<Move, Move> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT', TAP: 'WAIT', WAIT: 'TAP' };
const ARROW: Record<string, string> = { UP: '↑', DOWN: '↓', LEFT: '←', RIGHT: '→' };
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

type Round = { word: Move; red: boolean; want: Move; decoy: string; t0: number; limit: number };

export default function WrongWayUpScreen() {
  const { engine, state } = useInversion();
  const [started, setStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [round, setRound] = useState<Round | null>(null);
  const [progress, setProgress] = useState(1);
  const [flash, setFlash] = useState<string | null>(null);
  const [over, setOver] = useState<{ score: number; best: number; isNew: boolean } | null>(null);
  const down = useRef<{ x: number; y: number } | null>(null);
  const limit = useRef(2200);
  const clock = useRef(0);

  const next = (s: number) => {
    const pool = s < 4 ? DIRS : [...DIRS, 'TAP', 'WAIT'] as Move[];
    const word = pick(pool);
    const red = s >= 2 && Math.random() < Math.min(0.55, 0.2 + s * 0.03);
    setRound({ word, red, want: red ? OPP[word] : word, decoy: ARROW[pick(DIRS)], t0: clock.current, limit: limit.current });
  };

  const begin = () => {
    setScore(0); setLives(3); setOver(null); limit.current = 2200; clock.current = 0;
    next(0);
  };

  const answer = (got: Move) => {
    if (!round || over) return;
    const r = round;
    setRound(null);
    if (got === r.want) {
      const s = score + 1;
      setScore(s);
      limit.current = Math.max(650, limit.current * 0.95);
      feedback.tick();
      setFlash('#29d17d');
      setTimeout(() => { setFlash(null); next(s); }, 220);
    } else {
      const l = lives - 1;
      setLives(l);
      feedback.fail();
      setFlash('#ff3355');
      if (l <= 0) {
        setTimeout(() => setFlash(null), 220);
        submitBest('wrong-way-up', score).then((b) => setOver({ score, ...b }));
      } else {
        setTimeout(() => { setFlash(null); next(score); }, 220);
      }
    }
  };

  useFrame((dt) => {
    clock.current += dt * 1000;
    if (!round || over) return;
    const left = 1 - (clock.current - round.t0) / round.limit;
    setProgress(Math.max(0, left));
    if (left <= 0) answer('WAIT');
  }, started);

  return (
    <GameShell
      title="Wrong Way Up"
      subtitle="A reflex game where every direction lies."
      rules={[
        'GREEN word: do exactly what it says (swipe that way, tap, or wait).',
        'RED word: do the opposite. Red TAP means hands off, red WAIT means tap.',
        "UP means the game's up. The game is upside down. Good luck.",
        'The big arrow is a liar. Ignore it.',
        'Turn sideways and everything mirrors, so LEFT and RIGHT swap too.',
      ]}
      engine={engine}
      state={state}
      started={started}
      onStart={() => { setStarted(true); begin(); }}
    >
      <View
        style={StyleSheet.absoluteFill}
        onStartShouldSetResponder={() => true}
        onResponderGrant={(e) => { down.current = engine.toBoard(e.nativeEvent.pageX, e.nativeEvent.pageY); }}
        onResponderRelease={(e) => {
          if (!down.current) return;
          const up = engine.toBoard(e.nativeEvent.pageX, e.nativeEvent.pageY);
          const dx = up.x - down.current.x, dy = up.y - down.current.y;
          down.current = null;
          if (Math.hypot(dx, dy) < 30) return answer('TAP');
          if (Math.abs(dx) > Math.abs(dy)) answer(dx > 0 ? 'RIGHT' : 'LEFT');
          else answer(dy > 0 ? 'DOWN' : 'UP');
        }}
      >
        <View style={styles.hud}>
          <Text style={styles.hudText}>{score}</Text>
          <Text style={styles.hudText}>{'♥'.repeat(Math.max(0, lives))}{'♡'.repeat(3 - Math.max(0, lives))}</Text>
        </View>
        <View style={styles.bar}><View style={[styles.fill, { width: `${progress * 100}%` }]} /></View>
        {round && (
          <>
            <Text style={styles.rule}>{round.red ? 'do the opposite' : 'do it'}</Text>
            <Text style={[styles.cmd, { color: round.red ? '#ff3355' : '#29d17d' }]}>{round.word}</Text>
            <Text style={styles.arrow}>{round.decoy}</Text>
          </>
        )}
        {flash && <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: flash, opacity: 0.45 }]} />}
      </View>
      {over && (
        <View style={styles.over}>
          <Text style={styles.overTitle}>Wrong way.</Text>
          <Text style={styles.overText}>Score {over.score}</Text>
          <Text style={styles.overText}>{over.isNew ? 'New best!' : `Best ${over.best}`}</Text>
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
  rule: { position: 'absolute', top: 160, left: 0, right: 0, textAlign: 'center', color: '#aaa', fontSize: 18 },
  cmd: { position: 'absolute', top: 200, left: 0, right: 0, textAlign: 'center', fontSize: 86, fontWeight: '900', letterSpacing: 2 },
  arrow: { position: 'absolute', top: 390, left: 0, right: 0, textAlign: 'center', fontSize: 140, color: '#ffffff33' },
  over: { ...StyleSheet.absoluteFill, backgroundColor: '#0d0d12ee', alignItems: 'center', justifyContent: 'center', gap: 14 },
  overTitle: { color: '#fff', fontSize: 34, fontWeight: '800' },
  overText: { color: '#cfc8e6', fontSize: 18 },
  btn: { backgroundColor: '#ff4f8b', borderRadius: 12, paddingHorizontal: 26, paddingVertical: 12 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
