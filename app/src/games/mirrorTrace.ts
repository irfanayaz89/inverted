/**
 * Mirror Trace: trace a shape in one stroke, but your line is drawn reflected away
 * from your finger, a different way each level.
 */
import { Vec } from '../engine/inversion';

export const CX = 200, CY = 390;
const poly = (pts: [number, number][], closed = false): Vec[] => {
  const p = pts.map(([x, y]) => ({ x: CX + x, y: CY + y }));
  if (closed) p.push(p[0]);
  return p;
};
const curve = (f: (t: number) => [number, number], n = 120): Vec[] => {
  const p: Vec[] = [];
  for (let i = 0; i <= n; i++) { const [x, y] = f(i / n); p.push({ x: CX + x, y: CY + y }); }
  return p;
};

export const SHAPES: { name: string; path: Vec[] }[] = [
  { name: 'Zig', path: poly([[-140, -40], [-70, 60], [0, -40], [70, 60], [140, -40]]) },
  { name: 'Triangle', path: poly([[0, -150], [140, 110], [-140, 110]], true) },
  { name: 'House', path: poly([[-110, 140], [-110, -20], [0, -140], [110, -20], [110, 140]]) },
  { name: 'Star', path: poly(Array.from({ length: 5 }, (_, i) => { const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5; return [150 * Math.cos(a), 150 * Math.sin(a)] as [number, number]; }), true) },
  { name: 'Spiral', path: curve((t) => { const a = t * Math.PI * 5, r = 20 + 130 * t; return [r * Math.cos(a), r * Math.sin(a)]; }, 200) },
  { name: 'Heart', path: curve((t) => { const a = t * Math.PI * 2; return [9 * 16 * Math.sin(a) ** 3, -9 * (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) - 10]; }) },
];

export const MAPS: { name: string; f: (p: Vec) => Vec }[] = [
  { name: 'mirror left/right', f: (p) => ({ x: 2 * CX - p.x, y: p.y }) },
  { name: 'mirror top/bottom', f: (p) => ({ x: p.x, y: 2 * CY - p.y }) },
  { name: 'both at once', f: (p) => ({ x: 2 * CX - p.x, y: 2 * CY - p.y }) },
  { name: 'turned 90°', f: (p) => ({ x: CX - (p.y - CY), y: CY + (p.x - CX) }) },
  { name: 'mirror + 90°', f: (p) => ({ x: CX + (p.y - CY), y: CY + (p.x - CX) }) },
  { name: 'everything', f: (p) => ({ x: CX - (p.y - CY), y: CY - (p.x - CX) }) },
];

export function resample(path: Vec[], step = 6): Vec[] {
  const out: Vec[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let k = 0; k < n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
  }
  out.push(path[path.length - 1]);
  return out;
}

/** Score 0..100: how much of the shape you covered, minus how much you drew off it. */
export function scoreStroke(shape: Vec[], stroke: Vec[]) {
  const TOL = 20;
  const samples = resample(shape);
  let covered = 0;
  for (const s of samples) if (stroke.some((p) => (p.x - s.x) ** 2 + (p.y - s.y) ** 2 < TOL * TOL)) covered++;
  const pts = resample(stroke.length > 1 ? stroke : [stroke[0], stroke[0]]);
  let off = 0;
  for (const p of pts) if (!samples.some((s) => (p.x - s.x) ** 2 + (p.y - s.y) ** 2 < (TOL + 6) ** 2)) off++;
  const cov = covered / samples.length, offR = off / pts.length;
  return { cov, offR, pts: Math.max(0, Math.round(100 * cov - 60 * offR)) };
}
