/**
 * Flip Focus: a focus timer that only runs while the phone is face down.
 * Pick it up for longer than the grace period and the session is broken.
 * Pure logic: feed it the clock and the current pose.
 */
import { Pose } from '../engine/inversion';

export type FocusPhase = 'idle' | 'armed' | 'running' | 'peeking' | 'done' | 'broken';
export const GRACE_MS = 3000;

export class FlipFocus {
  phase: FocusPhase = 'idle';
  durationMs = 0;
  focusedMs = 0;
  peekLeftMs = GRACE_MS;
  private last = 0;
  private peekStart = 0;

  constructor(private events: { started?: () => void; peek?: () => void; resumed?: () => void; done?: (minutes: number) => void; broken?: () => void } = {}) {}

  arm(durationMs: number) {
    this.durationMs = durationMs;
    this.focusedMs = 0;
    this.peekLeftMs = GRACE_MS;
    this.phase = 'armed';
  }

  reset() { this.phase = 'idle'; }

  get remainingMs() { return Math.max(0, this.durationMs - this.focusedMs); }

  update(now: number, pose: Pose) {
    const down = pose === 'facedown';
    switch (this.phase) {
      case 'armed':
        if (down) { this.phase = 'running'; this.last = now; this.events.started?.(); }
        break;
      case 'running':
        this.focusedMs += now - this.last;
        this.last = now;
        if (this.focusedMs >= this.durationMs) {
          this.focusedMs = this.durationMs;
          this.phase = 'done';
          this.events.done?.(this.durationMs / 60000);
        } else if (!down) {
          this.phase = 'peeking';
          this.peekStart = now;
          this.peekLeftMs = GRACE_MS;
          this.events.peek?.();
        }
        break;
      case 'peeking':
        this.peekLeftMs = Math.max(0, GRACE_MS - (now - this.peekStart));
        if (down) { this.phase = 'running'; this.last = now; this.events.resumed?.(); }
        else if (this.peekLeftMs <= 0) { this.phase = 'broken'; this.events.broken?.(); }
        break;
    }
  }
}

export const fmt = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
