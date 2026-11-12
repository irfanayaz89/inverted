/**
 * Echo Back: watch the pads light up, then play the pattern back in REVERSE.
 * From round 3 the board sometimes spins after the show, so every pad has moved.
 * Pure logic, driven by a millisecond clock.
 */
export const PAD_COLORS = ['#ff4f8b', '#ffc23d', '#29d17d', '#4fd3ff'];
const STEP = 560, LIT = 380, GAP = 500;

export type EchoPhase = 'show' | 'input' | 'over';

export class EchoBack {
  seq: number[] = [];
  phase: EchoPhase = 'show';
  round = 0;          // rounds completed = score
  flipped = false;
  lit: number | null = null;
  private showStart = 0;
  private inputIx = 0;
  private litUntil = 0;
  private nextRoundAt = 0;

  constructor(private events: { beep?: (pad: number) => void; good?: () => void; over?: (score: number) => void } = {}, private rnd: () => number = Math.random) {}

  private pick() { return Math.floor(this.rnd() * 4); }

  start(now: number) {
    this.round = 0;
    this.seq = [this.pick(), this.pick(), this.pick()];
    this.beginShow(now);
  }

  private beginShow(now: number) {
    this.phase = 'show';
    this.flipped = false;
    this.lit = null;
    this.showStart = now + GAP;
    this.inputIx = 0;
  }

  /** Which screen slot (0 TL, 1 TR, 2 BL, 3 BR) a pad sits in right now. */
  slotOf(pad: number) { return this.flipped ? 3 - pad : pad; }

  /** How many taps are still owed this round. */
  get remaining() { return this.seq.length - this.inputIx; }

  update(now: number) {
    if (this.phase === 'show') {
      const t = now - this.showStart;
      if (t < 0) { this.lit = null; return; }
      const i = Math.floor(t / STEP);
      if (i >= this.seq.length) {
        this.lit = null;
        this.phase = 'input';
        this.flipped = this.round >= 2 && this.rnd() < 0.5;
        return;
      }
      const on = t - i * STEP < LIT;
      const next = on ? this.seq[i] : null;
      if (next !== null && this.lit !== next) this.events.beep?.(next);
      this.lit = next;
    } else if (this.phase === 'input') {
      if (this.lit !== null && now > this.litUntil) this.lit = null;
      if (this.nextRoundAt && now >= this.nextRoundAt) {
        this.nextRoundAt = 0;
        this.seq.push(this.pick());
        this.beginShow(now);
      }
    }
  }

  tap(pad: number, now: number) {
    if (this.phase !== 'input' || this.nextRoundAt) return;
    const want = this.seq[this.seq.length - 1 - this.inputIx];
    this.lit = pad;
    this.litUntil = now + 180;
    if (pad !== want) {
      this.phase = 'over';
      this.events.over?.(this.round);
      return;
    }
    this.events.beep?.(pad);
    this.inputIx++;
    if (this.inputIx >= this.seq.length) {
      this.round++;
      this.events.good?.();
      this.nextRoundAt = now + 700;
    }
  }
}
