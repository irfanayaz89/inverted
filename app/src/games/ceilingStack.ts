/**
 * Ceiling Stack: a block slides back and forth; tap to drop it onto the tower.
 * Overhang is sliced off, perfect drops (within 5px) keep the width and, after a
 * streak of 3, grow it back. The tower is built from the board's bottom, which the
 * inverted stage shows at the top of the screen, so it hangs from the ceiling and
 * sliced pieces "fall" up. Tilt pushes the sliding block like wind.
 */
import { BOARD } from '../engine/inversion';

export const BLOCK_H = 26;
export const BASE_Y = 660;
export const yOf = (i: number) => BASE_Y - i * BLOCK_H;
export const hue = (i: number) => `hsl(${(i * 11 + 300) % 360}, 80%, 60%)`;

export type Block = { x: number; w: number; perfect?: boolean };
export type Debris = { x: number; w: number; level: number; vy: number; off: number; alpha: number };

export class CeilingStack {
  tower: Block[] = [];
  mover: Block = { x: 0, w: 0 };
  debris: Debris[] = [];
  dir = 1;
  speed = 150;
  score = 0;
  over = false;
  streak = 0;
  cam = 0;

  constructor(private events: { drop?: () => void; perfect?: () => void; lose?: (score: number) => void } = {}) {
    this.reset();
  }

  reset() {
    this.tower = [{ x: 90, w: 220 }];
    this.debris = [];
    this.score = 0;
    this.over = false;
    this.streak = 0;
    this.cam = 0;
    this.spawn();
  }

  private spawn() {
    const top = this.tower[this.tower.length - 1];
    this.dir = Math.random() < 0.5 ? 1 : -1;
    this.speed = 150 + Math.min(260, this.tower.length * 9);
    this.mover = { x: this.dir > 0 ? -top.w : BOARD.width, w: top.w };
  }

  drop() {
    if (this.over) return this.reset();
    const top = this.tower[this.tower.length - 1];
    const m = this.mover;
    const l = Math.max(top.x, m.x), r = Math.min(top.x + top.w, m.x + m.w);
    const level = this.tower.length;
    if (r - l <= 0) {
      this.debris.push({ x: m.x, w: m.w, level, vy: 0, off: 0, alpha: 1 });
      this.over = true;
      this.events.lose?.(this.score);
      return;
    }
    if (Math.abs(m.x - top.x) < 5) {
      this.streak++;
      const w = Math.min(260, top.w + (this.streak >= 3 ? 10 : 0));
      this.tower.push({ x: top.x - (w - top.w) / 2, w, perfect: true });
      this.events.perfect?.();
    } else {
      this.streak = 0;
      if (m.x < l) this.debris.push({ x: m.x, w: l - m.x, level, vy: 0, off: 0, alpha: 1 });
      if (m.x + m.w > r) this.debris.push({ x: r, w: m.x + m.w - r, level, vy: 0, off: 0, alpha: 1 });
      this.tower.push({ x: l, w: r - l });
      this.events.drop?.();
    }
    this.score = this.tower.length - 1;
    this.spawn();
  }

  /** windX: gravity x in board coordinates (already inverted by the engine). */
  update(dt: number, windX: number) {
    if (!this.over) {
      this.mover.x += (this.dir * this.speed + windX * 380) * dt;
      if (this.mover.x > BOARD.width) this.dir = -1;
      if (this.mover.x + this.mover.w < 0) this.dir = 1;
    }
    for (const d of this.debris) {
      d.vy += 900 * dt;
      d.off += d.vy * dt;
      d.alpha = Math.max(0, d.alpha - dt * 0.8);
    }
    this.debris = this.debris.filter((d) => d.alpha > 0);
    const want = Math.max(0, (this.tower.length - 12) * BLOCK_H);
    this.cam += (want - this.cam) * Math.min(1, dt * 5);
  }
}
