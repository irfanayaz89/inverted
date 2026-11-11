/**
 * Inverted engine: the rule every game and app in this project shares.
 *
 * - Portrait, either way up: the game always stays UPSIDE DOWN to the player.
 * - Landscape: the game turns to face the player, but MIRRORED.
 * - Tilt moves things the wrong way too (tilt right, roll left).
 *
 * The native app is locked to portrait, so we read gravity and do every rotation
 * ourselves. On the web we read the browser's tilt sensor (deviceorientation),
 * which needs HTTPS and, on iPhone, a permission tap.
 */
import { Dimensions, Platform } from 'react-native';
import { DeviceMotion } from 'expo-sensors';

export type Pose = 'up' | 'right' | 'down' | 'left' | 'flat' | 'facedown';
export type Vec = { x: number; y: number };

export const POSE_ANGLE: Partial<Record<Pose, number>> = { up: 0, right: 90, down: 180, left: 270 };
export const isPortrait = (p: Pose) => p === 'up' || p === 'down';
export const isLandscape = (p: Pose) => p === 'left' || p === 'right';

export const BOARD = { width: 400, height: 700 };

export type InversionConfig = {
  upsideDown: boolean;
  mirrorLandscape: boolean;
  invertControls: boolean;
  /** How far the phone must lean out of flat before we trust a pose (0..1). */
  tiltThreshold: number;
  /** A new pose must hold this long (ms) before the screen flips. */
  settleMs: number;
};

export const defaultConfig: InversionConfig = {
  upsideDown: true,
  mirrorLandscape: true,
  invertControls: true,
  tiltThreshold: 0.45,
  settleMs: 250,
};

export type InversionState = {
  pose: Pose;
  /** Cumulative degrees, so flips animate the short way round. */
  rotation: number;
  mirrored: boolean;
  landscape: boolean;
  hasSensor: boolean;
};

type Vec3 = { x: number; y: number; z: number };
const DEG = Math.PI / 180;

function rot(v: Vec, deg: number): Vec {
  const c = Math.cos(deg * DEG), s = Math.sin(deg * DEG);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

function browserScreenAngle(): number {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return 0;
  const so = (window.screen as any)?.orientation;
  let a = 0;
  if (so && typeof so.angle === 'number') a = so.angle;
  else if (typeof (window as any).orientation === 'number') a = (window as any).orientation;
  return ((a % 360) + 360) % 360;
}

export class InversionEngine {
  config: InversionConfig;
  private state: InversionState = { pose: 'up', rotation: 180, mirrored: false, landscape: false, hasSensor: false };
  /** Earth "up" in device coordinates: x right, y toward the top edge, z out of the screen. */
  private up: Vec3 = { x: 0, y: 0.8, z: 0.6 };
  private sim = false;
  private simTilt: Vec = { x: 0, y: 0 };
  private candidate: Pose | null = null;
  private candidateSince = 0;
  private listeners = new Set<() => void>();
  private poseListeners = new Set<(from: Pose, to: Pose) => void>();
  private cleanup: (() => void)[] = [];

  constructor(config: Partial<InversionConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  // --- subscription (for useSyncExternalStore) -------------------------------
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  };
  getState = () => this.state;
  onPoseChange(fn: (from: Pose, to: Pose) => void) {
    this.poseListeners.add(fn);
    return () => { this.poseListeners.delete(fn); };
  }
  private set(patch: Partial<InversionState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  /** Call from a tap (iPhone Safari only shows the prompt inside a user gesture). */
  async requestPermission() {
    try {
      if (Platform.OS === 'web') {
        const DOE = (globalThis as any).DeviceOrientationEvent;
        if (DOE?.requestPermission) await DOE.requestPermission();
      } else {
        await DeviceMotion.requestPermissionsAsync();
      }
    } catch {
      // desktop or denied: keyboard fallback still works
    }
  }

  start() {
    if (this.cleanup.length) return;
    if (Platform.OS === 'web') this.startWeb();
    else this.startNative();
    const id = setInterval(() => this.updatePose(), 50);
    this.cleanup.push(() => clearInterval(id));
  }

  stop() {
    this.cleanup.forEach((c) => c());
    this.cleanup = [];
  }

  private startNative() {
    DeviceMotion.setUpdateInterval(16);
    const sub = DeviceMotion.addListener((m) => {
      const a = m.accelerationIncludingGravity;
      if (!a) return;
      // On both iOS and Android, expo-sensors reports this pointing DOWN, in m/s².
      const n = Math.hypot(a.x, a.y, a.z) || 1;
      const k = 0.25; // low-pass so shakes don't flip the screen
      this.up = {
        x: this.up.x + (-a.x / n - this.up.x) * k,
        y: this.up.y + (-a.y / n - this.up.y) * k,
        z: this.up.z + (-a.z / n - this.up.z) * k,
      };
      if (!this.state.hasSensor) this.set({ hasSensor: true });
    });
    this.cleanup.push(() => sub.remove());
  }

  private startWeb() {
    const onOrient = (e: any) => {
      if (e.beta == null || this.sim) return;
      const b = e.beta * DEG, g = e.gamma * DEG;
      this.up = { x: -Math.cos(b) * Math.sin(g), y: Math.sin(b), z: Math.cos(b) * Math.cos(g) };
      if (!this.state.hasSensor) this.set({ hasSensor: true });
    };
    // Laptop testing: 1 upright, 2 upside down, 3/4 sideways, 5 flat, 6 face down, arrows tilt.
    const SIM: Record<string, Vec3> = {
      '1': { x: 0, y: 0.94, z: 0.34 }, '2': { x: 0, y: -0.94, z: 0.34 },
      '3': { x: 0.94, y: 0, z: 0.34 }, '4': { x: -0.94, y: 0, z: 0.34 },
      '5': { x: 0, y: 0, z: 1 }, '6': { x: 0, y: 0, z: -1 },
    };
    const onKey = (e: KeyboardEvent) => {
      if (SIM[e.key]) { this.sim = true; this.up = SIM[e.key]; this.updatePose(true); }
      const t = 0.5;
      if (e.key === 'ArrowLeft') this.simTilt.x = -t;
      if (e.key === 'ArrowRight') this.simTilt.x = t;
      if (e.key === 'ArrowUp') this.simTilt.y = -t;
      if (e.key === 'ArrowDown') this.simTilt.y = t;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') this.simTilt.x = 0;
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') this.simTilt.y = 0;
    };
    const relayout = () => this.applyPose(this.state.pose, true);
    window.addEventListener('deviceorientation', onOrient);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('orientationchange', relayout);
    this.cleanup.push(() => {
      window.removeEventListener('deviceorientation', onOrient);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('orientationchange', relayout);
    });
  }

  /** Fake a pose (laptop / simulator testing). */
  simulate(p: Pose) {
    const SIM: Record<Pose, Vec3> = {
      up: { x: 0, y: 0.94, z: 0.34 }, down: { x: 0, y: -0.94, z: 0.34 },
      right: { x: 0.94, y: 0, z: 0.34 }, left: { x: -0.94, y: 0, z: 0.34 },
      flat: { x: 0, y: 0, z: 1 }, facedown: { x: 0, y: 0, z: -1 },
    };
    this.sim = true;
    this.up = SIM[p];
    this.updatePose(true);
  }
  simulateTilt(t: Vec) { this.simTilt = t; }

  // --- pose detection --------------------------------------------------------
  private rawPose(): Pose {
    const u = this.up;
    const planar = Math.hypot(u.x, u.y);
    if (planar < this.config.tiltThreshold) return u.z >= 0 ? 'flat' : 'facedown';
    const a = (((Math.atan2(u.x, u.y) / DEG) % 360) + 360) % 360;
    const cur = POSE_ANGLE[this.state.pose];
    if (cur !== undefined) {
      let d = Math.abs(a - cur);
      d = Math.min(d, 360 - d);
      if (d < 60) return this.state.pose; // hysteresis
    }
    if (a < 45 || a >= 315) return 'up';
    if (a < 135) return 'right';
    if (a < 225) return 'down';
    return 'left';
  }

  private updatePose(force = false) {
    const p = this.rawPose();
    if (p === this.state.pose) { this.candidate = null; return; }
    const now = Date.now();
    if (!force) {
      if (p !== this.candidate) { this.candidate = p; this.candidateSince = now; return; }
      if (now - this.candidateSince < this.config.settleMs) return;
    }
    const prev = this.state.pose;
    this.candidate = null;
    this.applyPose(p);
    this.poseListeners.forEach((fn) => fn(prev, p));
  }

  private applyPose(p: Pose, relayoutOnly = false) {
    const pa = POSE_ANGLE[p];
    if (pa === undefined) { if (!relayoutOnly) this.set({ pose: p }); return; }
    const land = isLandscape(p);
    let target = pa - browserScreenAngle() + (!land && this.config.upsideDown ? 180 : 0);
    target += 360 * Math.round((this.state.rotation - target) / 360);
    this.set({ pose: p, rotation: target, mirrored: land && this.config.mirrorLandscape, landscape: land });
  }

  // --- coordinates -----------------------------------------------------------
  /** Gravity in board coordinates (x right, y down, units of g), inverted so motion fights you. */
  gravity(): Vec {
    const g = this.realGravity();
    if (!this.config.invertControls) return g;
    return this.state.landscape ? { x: -g.x, y: g.y } : { x: -g.x, y: -g.y };
  }

  /** Gravity as physics would have it, in board coordinates. */
  realGravity(): Vec {
    const s = this.state;
    if (this.sim || !s.hasSensor) {
      const base = s.landscape ? { x: 0, y: 1 } : this.config.upsideDown ? { x: 0, y: -1 } : { x: 0, y: 1 };
      let tx = this.simTilt.x, ty = this.simTilt.y;
      if (!s.landscape && this.config.upsideDown) { tx = -tx; ty = -ty; }
      if (s.mirrored) tx = -tx;
      const flat = s.pose === 'flat' || s.pose === 'facedown';
      const k = flat ? 0 : 0.6;
      return { x: base.x * k + tx, y: base.y * k + ty };
    }
    let g: Vec = { x: -this.up.x, y: this.up.y }; // screen coords, y down
    g = rot(g, -browserScreenAngle());
    g = rot(g, -s.rotation);
    if (s.mirrored) g.x = -g.x;
    return g;
  }

  /** Board scale that fits the current window. */
  scale(): number {
    const { width: vw, height: vh } = Dimensions.get('window');
    const q = Math.abs(Math.round(this.state.rotation) % 180);
    const sideways = q === 90;
    const w = sideways ? BOARD.height : BOARD.width, h = sideways ? BOARD.width : BOARD.height;
    return Math.min(vw / w, vh / h);
  }

  /** Window point (pageX/pageY) -> board coordinates. The board is centred in the window. */
  toBoard(pageX: number, pageY: number): Vec {
    const { width: vw, height: vh } = Dimensions.get('window');
    const sc = this.scale();
    let p = { x: (pageX - vw / 2) / sc, y: (pageY - vh / 2) / sc };
    p = rot(p, -this.state.rotation);
    if (this.state.mirrored) p.x = -p.x;
    return { x: p.x + BOARD.width / 2, y: p.y + BOARD.height / 2 };
  }
}
