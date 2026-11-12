/**
 * Flip Off: the phone shouts a pose and you have to get it there in time.
 * Green = do it. Red = it's a trap, don't move. FREEZE = don't move either.
 * Pure logic: feed it the clock (ms) and the current pose.
 */
import { Pose } from '../engine/inversion';

export type Command = { label: string; test: (p: Pose) => boolean };
export const COMMANDS: Command[] = [
  { label: 'UPRIGHT', test: (p) => p === 'up' },
  { label: 'UPSIDE DOWN', test: (p) => p === 'down' },
  { label: 'SIDEWAYS', test: (p) => p === 'left' || p === 'right' },
  { label: 'FLAT', test: (p) => p === 'flat' },
  { label: 'FACE DOWN', test: (p) => p === 'facedown' },
];
export const POSE_NAME: Record<Pose, string> = { up: 'upright', down: 'upside down', left: 'sideways', right: 'sideways', flat: 'flat', facedown: 'face down' };

export type Round = { label: string; hold: boolean; red: boolean; test: (p: Pose) => boolean; t0: number; limit: number; startPose: Pose };

export class FlipOff {
  score = 0;
  lives = 3;
  round: Round | null = null;
  over = false;
  private limit = 4000;
  private nextAt = 0;

  constructor(private events: { hit?: () => void; miss?: () => void; over?: (score: number) => void } = {}, private rnd: () => number = Math.random) {}

  start(now: number, pose: Pose) {
    this.score = 0; this.lives = 3; this.over = false; this.limit = 4000;
    this.deal(now, pose);
  }

  private deal(now: number, pose: Pose) {
    const freeze = this.score >= 2 && this.rnd() < 0.15;
    if (freeze) {
      this.round = { label: 'FREEZE', hold: true, red: false, test: () => false, t0: now, limit: 1800, startPose: pose };
      return;
    }
    const options = COMMANDS.filter((c) => !c.test(pose));
    const cmd = options[Math.floor(this.rnd() * options.length)];
    const red = this.score >= 3 && this.rnd() < 0.25;
    this.round = { label: cmd.label, hold: red, red, test: cmd.test, t0: now, limit: red ? 1800 : this.limit, startPose: pose };
  }

  /** 0..1 of the time left in this round. */
  left(now: number) { return this.round ? Math.max(0, 1 - (now - this.round.t0) / this.round.limit) : 0; }

  private resolve(ok: boolean, now: number) {
    this.round = null;
    if (ok) {
      this.score++;
      this.limit = Math.max(1800, this.limit * 0.95);
      this.events.hit?.();
    } else {
      this.lives--;
      this.events.miss?.();
      if (this.lives <= 0) { this.over = true; this.events.over?.(this.score); return; }
    }
    this.nextAt = now + 600;
  }

  update(now: number, pose: Pose) {
    if (this.over) return;
    const r = this.round;
    if (!r) { if (now >= this.nextAt) this.deal(now, pose); return; }
    const timeUp = now - r.t0 >= r.limit;
    if (r.hold) {
      if (pose !== r.startPose) this.resolve(false, now);   // you moved
      else if (timeUp) this.resolve(true, now);
    } else {
      if (r.test(pose)) this.resolve(true, now);
      else if (timeUp) this.resolve(false, now);
    }
  }
}
