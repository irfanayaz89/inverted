import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { GameShell } from '../engine/GameShell';
import { useInversion } from '../engine/hooks';
import { feedback, submitBest } from '../engine/feedback';
import { BOARD, Vec } from '../engine/inversion';
import { MAPS, SHAPES, scoreStroke } from '../games/mirrorTrace';

type Score = ReturnType<typeof scoreStroke>;
const pts = (p: Vec[]) => p.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ');

export default function MirrorTraceScreen() {
  const { engine, state } = useInversion();
  const [started, setStarted] = useState(false);
  const [level, setLevel] = useState(0);
  const [stroke, setStroke] = useState<Vec[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [result, setResult] = useState<Score | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [final, setFinal] = useState<{ total: number; best: number; isNew: boolean } | null>(null);

  const shape = SHAPES[level];
  const map = MAPS[level];
  const at = (e: any) => map.f(engine.toBoard(e.nativeEvent.pageX, e.nativeEvent.pageY));

  const onDown = (e: any) => {
    if (final) { setFinal(null); setScores([]); setLevel(0); setStroke([]); setResult(null); return; }
    if (result) {
      if (level + 1 < SHAPES.length) { setLevel(level + 1); setStroke([]); setResult(null); }
      else {
        const total = scores.reduce((a, b) => a + b, 0);
        submitBest('mirror-trace', total).then((b) => setFinal({ total, ...b }));
      }
      return;
    }
    setDrawing(true);
    setStroke([at(e)]);
  };
  const onMove = (e: any) => { if (drawing) setStroke((s) => [...s, at(e)]); };
  const onUp = () => {
    if (!drawing) return;
    setDrawing(false);
    if (stroke.length < 5) { setStroke([]); return; }
    const r = scoreStroke(shape.path, stroke);
    setResult(r);
    setScores((s) => { const n = [...s]; n[level] = r.pts; return n; });
    if (r.pts > 70) feedback.success(); else if (r.pts > 40) feedback.tick(); else feedback.fail();
  };

  const lineColor = result ? (result.pts > 70 ? '#29d17d' : result.pts > 40 ? '#ffc23d' : '#ff3355') : '#4fd3ff';

  return (
    <GameShell
      title="Mirror Trace"
      subtitle="Trace the shape. Your hand will betray you."
      rules={[
        'Put your finger down and trace the grey shape in one stroke, starting at the pink dot.',
        'Your line does NOT appear under your finger. Each level reflects it a new way.',
        'Lift your finger to score. Cover the shape, stay on the line.',
        'Upside down, always. Sideways mirrors it again. Yes, it stacks.',
      ]}
      engine={engine}
      state={state}
      started={started}
      onStart={() => setStarted(true)}
    >
      <View
        style={StyleSheet.absoluteFill}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={onDown}
        onResponderMove={onMove}
        onResponderRelease={onUp}
        onResponderTerminate={onUp}
      >
        <Svg width={BOARD.width} height={BOARD.height} pointerEvents="none">
          <Polyline points={pts(shape.path)} fill="none" stroke="#2c2a3a" strokeWidth={30} strokeLinecap="round" strokeLinejoin="round" />
          <Polyline points={pts(shape.path)} fill="none" stroke="#5d5975" strokeWidth={4} strokeLinejoin="round" />
          <Circle cx={shape.path[0].x} cy={shape.path[0].y} r={12} fill="#ff4f8b" />
          {stroke.length > 1 && (
            <Polyline points={pts(stroke)} fill="none" stroke={lineColor} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
          )}
        </Svg>
        <Text style={[styles.hud, { left: 16 }]} pointerEvents="none">{level + 1}/{SHAPES.length}  {shape.name}</Text>
        <Text style={[styles.hud, styles.map, { right: 16 }]} pointerEvents="none">{map.name}</Text>
        {result ? (
          <View style={styles.result} pointerEvents="none">
            <Text style={styles.pts}>{result.pts} pts</Text>
            <Text style={styles.detail}>covered {Math.round(result.cov * 100)}%  ·  off the line {Math.round(result.offR * 100)}%  ·  tap for next</Text>
          </View>
        ) : stroke.length === 0 ? (
          <Text style={styles.prompt} pointerEvents="none">start on the pink dot (good luck finding it)</Text>
        ) : null}
        {final && (
          <View style={styles.final} pointerEvents="none">
            <Text style={styles.total}>{final.total} / {SHAPES.length * 100}</Text>
            <Text style={styles.finalText}>{final.isNew ? 'New best!' : `Best ${final.best}`}</Text>
            <Text style={styles.detail}>Tap to try again</Text>
          </View>
        )}
      </View>
    </GameShell>
  );
}

const styles = StyleSheet.create({
  hud: { position: 'absolute', top: 22, color: '#fff', fontSize: 20, fontWeight: '700' },
  map: { color: '#ffc23d' },
  prompt: { position: 'absolute', top: 650, left: 0, right: 0, textAlign: 'center', color: '#8a86a3', fontSize: 16 },
  result: { position: 'absolute', top: 590, left: 0, right: 0, height: 110, backgroundColor: '#000b', alignItems: 'center', justifyContent: 'center', gap: 6 },
  pts: { color: '#fff', fontSize: 34, fontWeight: '800' },
  detail: { color: '#bbb', fontSize: 14, textAlign: 'center' },
  final: { ...StyleSheet.absoluteFill, backgroundColor: '#000e', alignItems: 'center', justifyContent: 'center', gap: 12 },
  total: { color: '#29d17d', fontSize: 44, fontWeight: '900' },
  finalText: { color: '#fff', fontSize: 20 },
});
