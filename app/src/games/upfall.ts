/**
 * Upfall: stars and bombs fall UP toward your paddle (the inverted board puts the
 * paddle at the top of the screen). Catch stars, dodge bombs. The paddle is steered
 * by tilt, and the tilt is inverted.
 */
import { BOARD } from '../engine/inversion';

export const PADDLE_W = 96, PADDLE_Y = 630, PADDLE_H = 16, ITEM_R = 15;
export type Item = { id: number; x: number; y: number; good: boolean };

export class Upfall {
  paddleX = BOARD.width / 2;
  items: Item[] = [];
  score = 0;
  lives = 3;
  over = false;
  private spawnIn = 0.8;
  private nextId = 1;

  constructor(private events: { catch?: () => void; hurt?: () => void; over?: (score: number) => void } = {}, private rnd: () => number = Math.random) {}

  reset() {
    this.paddleX = BOARD.width / 2;
    this.items = [];
    this.score = 0; this.lives = 3; this.over = false;
    this.spawnIn = 0.8;
  }

  private hurt() {
    this.lives--;
    this.events.hurt?.();
    if (this.lives <= 0) { this.over = true; this.events.over?.(this.score); }
  }

  /** tiltX: gravity x in board coordinates (already inverted by the engine). */
  update(dt: number, tiltX: number) {
    if (this.over) return;
    this.paddleX = Math.max(PADDLE_W / 2, Math.min(BOARD.width - PADDLE_W / 2, this.paddleX + tiltX * 700 * dt));

    this.spawnIn -= dt;
    if (this.spawnIn <= 0) {
      this.spawnIn = Math.max(0.38, 1.0 - this.score * 0.02);
      this.items.push({ id: this.nextId++, x: 30 + this.rnd() * (BOARD.width - 60), y: -ITEM_R, good: this.rnd() > 0.3 });
    }

    const speed = 190 + Math.min(260, this.score * 5);
    const keep: Item[] = [];
    for (const it of this.items) {
      it.y += speed * dt;
      const onPaddle = it.y + ITEM_R >= PADDLE_Y && it.y - ITEM_R <= PADDLE_Y + PADDLE_H && Math.abs(it.x - this.paddleX) <= PADDLE_W / 2 + ITEM_R * 0.6;
      if (onPaddle) {
        if (it.good) { this.score++; this.events.catch?.(); } else this.hurt();
      } else if (it.y - ITEM_R > BOARD.height) {
        if (it.good) this.hurt();          // a star got away
      } else keep.push(it);
      if (this.over) return;
    }
    this.items = keep;
  }
}
