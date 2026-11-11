/**
 * Negative Space: tilt to roll a ball to the goal. Flipping the phone over swaps
 * which colour is solid. Flip while the ball isn't on a grey safe tile and it's crushed.
 *
 * Tiles: W wall, # black, . white, o safe (grey), S start (safe), G goal, ^ spikes.
 * Every level was machine-checked as solvable (see /web for the original prototype).
 */
import { BOARD, Pose, Vec, isPortrait } from '../engine/inversion';

export const LEVELS: string[][] = [
  ['WWWWWWWWWW', 'WS.......W', 'W#######.W', 'W#######.W', 'W........W', 'W.#######W',
   'W.#######W', 'W........W', 'W#######.W', 'W#######.W', 'W.......GW', 'WWWWWWWWWW'],
  ['WWWWWWWWWW', 'W#.##...#W', 'W####....W', 'W####....W', 'W#####...W', 'W######..W',
   'W######..W', 'W#####S..W', 'W####...#W', 'W#####.##W', 'W##o#####W', 'W##o#####W',
   'WG##o####W', 'WWWWWWWWWW'],
  ['WWWWWWWWWW', 'W..######W', 'WG.....##W', 'W#.....^#W', 'W......##W', 'W.^..####W',
   'W...o####W', 'W..##o###W', 'W..####o#W', 'W########W', 'W########W', 'Wo..S####W',
   'W.....###W', 'WWWWWWWWWW'],
  ['WWWWWWWWWW', 'W.###....W', 'W..##....W', 'W.S###...W', 'W..#^##..W', 'W##.#^o.oW',
   'W##......W', 'W##.o.###W', 'W####o###W', 'W^#######W', 'W########W', 'W####G^#.W',
   'W#####..#W', 'WWWWWWWWWW'],
  ['WWWWWWWWWW', 'W^.#####.W', 'W..#S##o.W', 'W.#####..W', 'W#####^#oW', 'W#o#..###W',
   'W##..^.#oW', 'W.....o##W', 'W.......^W', 'W.^......W', 'W........W', 'W........W',
   'W....##.GW', 'WWWWWWWWWW'],
];
export const NAMES = ['Roll', 'First Flip', 'Double Back', 'Safe Spaces', 'Four Flips'];
export const TILE = 40;
export const RADIUS = 11;

export type Events = { crushed?: () => void; spiked?: () => void; flipped?: () => void; goal?: () => void; finished?: (seconds: number, deaths: number) => void };

export class NegativeSpace {
  level = 0;
  grid: string[] = [];
  ox = 0;
  oy = 0;
  ball = { x: 0, y: 0, vx: 0, vy: 0, dead: false };
  inverted = false;
  deaths = 0;
  clock = 0;
  banner: { text: string; until: number } | null = null;
  finished = false;
  private frozenUntil = 0;
  /** Last portrait pose seen. Players often pass through "flat" while flipping, so we
   *  compare portrait poses rather than consecutive poses. */
  private lastPortrait: Pose = 'up';
  private pending: { at: number; run: () => void } | null = null;

  constructor(private events: Events = {}) { this.load(0); }

  /** Call when the game starts so the first flip is measured from how the phone is held now. */
  setPose(p: Pose) { if (isPortrait(p)) this.lastPortrait = p; }

  restart() { this.deaths = 0; this.clock = 0; this.finished = false; this.pending = null; this.load(0); }

  load(i: number) {
    this.level = i;
    this.grid = LEVELS[i];
    this.inverted = false;
    this.banner = null;
    this.ox = (BOARD.width - this.grid[0].length * TILE) / 2;
    this.oy = 90 + (600 - this.grid.length * TILE) / 2;
    this.grid.forEach((row, r) => [...row].forEach((ch, c) => {
      if (ch === 'S') this.ball = { x: this.ox + c * TILE + TILE / 2, y: this.oy + r * TILE + TILE / 2, vx: 0, vy: 0, dead: false };
    }));
  }

  cell(x: number, y: number) {
    const c = Math.floor((x - this.ox) / TILE), r = Math.floor((y - this.oy) / TILE);
    if (r < 0 || r >= this.grid.length || c < 0 || c >= this.grid[0].length) return 'W';
    return this.grid[r][c];
  }

  solid = (ch: string) => ch === 'W' || (ch === '#' && !this.inverted) || (ch === '.' && this.inverted);

  private hits(x: number, y: number, rad: number, test: (ch: string) => boolean) {
    const c0 = Math.floor((x - rad - this.ox) / TILE), c1 = Math.floor((x + rad - this.ox) / TILE);
    const r0 = Math.floor((y - rad - this.oy) / TILE), r1 = Math.floor((y + rad - this.oy) / TILE);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const ch = r < 0 || r >= this.grid.length || c < 0 || c >= this.grid[0].length ? 'W' : this.grid[r][c];
      if (!test(ch)) continue;
      const left = this.ox + c * TILE, top = this.oy + r * TILE;
      const nx = Math.max(left, Math.min(x, left + TILE)), ny = Math.max(top, Math.min(y, top + TILE));
      if ((nx - x) ** 2 + (ny - y) ** 2 < rad * rad) return true;
    }
    return false;
  }

  private die(why: string) {
    this.deaths++;
    this.ball.dead = true;
    this.banner = { text: why, until: this.clock + 1.1 };
    (why === 'CRUSHED' ? this.events.crushed : this.events.spiked)?.();
    const i = this.level;
    this.pending = { at: this.clock + 0.9, run: () => this.load(i) };
  }

  /** Flipping between the two portrait poses (even via flat) inverts the world. */
  poseChanged(_from: Pose, to: Pose) {
    if (this.finished) return;
    this.frozenUntil = this.clock + 0.45;
    if (!isPortrait(to)) return;
    const flipped = to !== this.lastPortrait;
    this.lastPortrait = to;
    if (!flipped || this.ball.dead) return;
    this.inverted = !this.inverted;
    this.events.flipped?.();
    if (this.solid(this.cell(this.ball.x, this.ball.y))) return this.die('CRUSHED');
    if (this.hits(this.ball.x, this.ball.y, RADIUS, this.solid)) {
      this.ball.x = this.ox + Math.floor((this.ball.x - this.ox) / TILE) * TILE + TILE / 2;
      this.ball.y = this.oy + Math.floor((this.ball.y - this.oy) / TILE) * TILE + TILE / 2;
    }
  }

  update(dt: number, g: Vec) {
    if (this.finished) return;
    this.clock += dt;
    if (this.pending && this.clock >= this.pending.at) { const p = this.pending; this.pending = null; p.run(); }
    if (this.banner && this.clock > this.banner.until) this.banner = null;
    const b = this.ball;
    if (b.dead || this.clock <= this.frozenUntil) return;

    const A = 1100;
    b.vx += g.x * A * dt;
    b.vy += g.y * A * dt;
    const damp = Math.pow(0.35, dt);
    b.vx *= damp; b.vy *= damp;
    const sp = Math.hypot(b.vx, b.vy), MAX = 420;
    if (sp > MAX) { b.vx *= MAX / sp; b.vy *= MAX / sp; }
    const N = 4;
    for (let i = 0; i < N; i++) {
      const nx = b.x + (b.vx * dt) / N;
      if (this.hits(nx, b.y, RADIUS, this.solid)) b.vx *= -0.25; else b.x = nx;
      const ny = b.y + (b.vy * dt) / N;
      if (this.hits(b.x, ny, RADIUS, this.solid)) b.vy *= -0.25; else b.y = ny;
    }

    if (this.hits(b.x, b.y, RADIUS - 4, (ch) => ch === '^')) this.die('SPIKED');
    else if (this.cell(b.x, b.y) === 'G') {
      b.dead = true;
      this.events.goal?.();
      if (this.level + 1 < LEVELS.length) {
        this.banner = { text: 'NICE', until: this.clock + 0.8 };
        const next = this.level + 1;
        this.pending = { at: this.clock + 0.7, run: () => this.load(next) };
      } else {
        this.finished = true;
        this.events.finished?.(this.clock, this.deaths);
      }
    }
  }
}
