/*
 * Inverted engine: shared by every prototype.
 *
 * The rule: whatever way you hold the phone, the game stays UPSIDE DOWN to you.
 * Hold it sideways (landscape) and the game snaps to your view but MIRRORED.
 *
 * It reads the raw tilt sensor (deviceorientation) rather than trusting the OS
 * auto-rotate, so it works with rotation lock on, and on iPhones that refuse to
 * rotate to upside-down portrait.
 *
 * API
 *   const inv = Inverted.create({ root, width, height, ...options })
 *   inv.onStart(fn)            called once the player taps Start (sensors granted)
 *   inv.onPose(fn(pose, prev)) pose: 'up' | 'down' | 'left' | 'right' | 'flat' | 'facedown'
 *   inv.gravity()              {x, y, z} real gravity in GAME coordinates (units of g)
 *   inv.toLocal(clientX, clientY)  screen point -> game coordinates
 *   inv.pose, inv.mirrored, inv.landscape
 *   inv.shake                  recent shake strength (0..)
 *
 * Desktop testing: keys 1-4 = hold upright / upside down / landscape left / right,
 * 5 = flat, 6 = face down, arrow keys = tilt, S = shake.
 */
(function () {
  const DEG = Math.PI / 180;

  function screenAngle() {
    let a = 0;
    if (screen.orientation && typeof screen.orientation.angle === 'number') a = screen.orientation.angle;
    else if (typeof window.orientation === 'number') a = window.orientation;
    return ((a % 360) + 360) % 360;
  }

  function rot(v, deg) {
    const c = Math.cos(deg * DEG), s = Math.sin(deg * DEG);
    return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
  }

  const POSE_ANGLE = { up: 0, right: 90, down: 180, left: 270 };

  function create(opts) {
    const o = Object.assign({
      width: 400, height: 700,
      upsideDown: true,          // portrait: stay upside down to the viewer
      mirrorLandscape: true,     // landscape: mirror
      tiltThreshold: 0.45,       // how much in-plane tilt before we trust a pose (0..1)
      settleMs: 250,             // pose must hold this long before we flip
      invertControls: true,      // tilt moves things the WRONG way too, not just the picture
      title: 'Inverted', subtitle: '', howTo: [],
    }, opts);

    const root = o.root;
    root.classList.add('inv-root');
    root.style.width = o.width + 'px';
    root.style.height = o.height + 'px';

    const state = {
      beta: 70, gamma: 0, hasSensor: false, sim: false,
      simTilt: { x: 0, y: 0 },
      pose: 'up', candidate: null, candidateSince: 0,
      rotation: 180, mirror: 1, scale: 1,
      lastAngleUsed: 180,
      shake: 0,
      started: false,
    };
    const poseListeners = [], startListeners = [];

    // ---- sensor input ------------------------------------------------------
    function upVector() {
      const b = state.beta * DEG, g = state.gamma * DEG;
      // Earth "up" expressed in device coordinates (x right, y toward top edge, z out of screen)
      return { x: -Math.cos(b) * Math.sin(g), y: Math.sin(b), z: Math.cos(b) * Math.cos(g) };
    }

    function rawPose() {
      const u = upVector();
      const planar = Math.hypot(u.x, u.y);
      if (planar < o.tiltThreshold) return u.z >= 0 ? 'flat' : 'facedown';
      const phi = Math.atan2(u.x, u.y) / DEG; // clockwise angle of "up" from the top edge
      const a = ((phi % 360) + 360) % 360;
      // Hysteresis: stay in the current pose unless we're clearly in another one.
      if (POSE_ANGLE[state.pose] !== undefined) {
        let d = Math.abs(a - POSE_ANGLE[state.pose]); d = Math.min(d, 360 - d);
        if (d < 60) return state.pose;
      }
      if (a < 45 || a >= 315) return 'up';
      if (a < 135) return 'right';
      if (a < 225) return 'down';
      return 'left';
    }

    function updatePose() {
      const p = rawPose();
      const now = performance.now();
      if (p === state.pose) { state.candidate = null; return; }
      if (p !== state.candidate) { state.candidate = p; state.candidateSince = now; return; }
      if (now - state.candidateSince < o.settleMs) return;
      const prev = state.pose;
      state.pose = p;
      state.candidate = null;
      layout();
      poseListeners.forEach(fn => fn(p, prev));
    }

    window.addEventListener('deviceorientation', e => {
      if (e.beta == null || state.sim) return;
      state.hasSensor = true;
      state.beta = e.beta; state.gamma = e.gamma;
      updatePose();
    });

    let lastAcc = null;
    window.addEventListener('devicemotion', e => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null) return;
      if (lastAcc) {
        const d = Math.abs(a.x - lastAcc.x) + Math.abs(a.y - lastAcc.y) + Math.abs(a.z - lastAcc.z);
        state.shake = Math.max(state.shake * 0.9, d);
      }
      lastAcc = { x: a.x, y: a.y, z: a.z };
    });
    setInterval(() => { state.shake *= 0.85; updatePose(); }, 50);

    // ---- layout: keep the game upside down / mirrored -----------------------
    function layout() {
      const vw = window.innerWidth, vh = window.innerHeight;
      const pa = POSE_ANGLE[state.pose];
      let land = false;
      if (pa !== undefined) {
        // Where is the viewer's "up" inside the current browser viewport?
        const viewerUp = pa - screenAngle();
        // e.g. pose 'right' = earth-up is toward the device's right edge, so content top -> right = rotate(90).
        land = (pa === 90 || pa === 270);
        let target = viewerUp + ((!land && o.upsideDown) ? 180 : 0);
        // pick the equivalent angle closest to the last one so the flip animates the short way
        const last = state.lastAngleUsed;
        target = target + 360 * Math.round((last - target) / 360);
        state.rotation = target;
        state.lastAngleUsed = target;
        state.mirror = (land && o.mirrorLandscape) ? -1 : 1;
        state.landscape = land;
      }
      const sideways = Math.abs(((state.rotation % 180) + 180) % 180 - 90) < 1;
      const w = sideways ? o.height : o.width, h = sideways ? o.width : o.height;
      state.scale = Math.min(vw / w, vh / h);
      root.style.transform =
        `translate(-50%, -50%) rotate(${state.rotation}deg) scale(${state.scale}) scaleX(${state.mirror})`;
    }
    window.addEventListener('resize', layout);
    window.addEventListener('orientationchange', () => setTimeout(layout, 200));
    if (screen.orientation) screen.orientation.addEventListener('change', () => setTimeout(layout, 50));

    // ---- coordinate helpers --------------------------------------------------
    // Real gravity in game coordinates makes things roll the way the phone tilts, which
    // the eye reads as normal. To invert the motion too, reflect it: in portrait
    // everything goes the opposite way (tilt right = roll left, and "down" pulls up);
    // in landscape it is a mirror, so only left/right swap.
    function gravity() {
      const g = realGravity();
      if (!o.invertControls) return g;
      if (state.landscape) return { x: -g.x, y: g.y, z: g.z };
      return { x: -g.x, y: -g.y, z: g.z };
    }

    function realGravity() {
      if (state.sim || !state.hasSensor) {
        // Simulated: gravity points to the viewer's floor (content top when upside down)
        const base = state.landscape ? { x: 0, y: 1 } : (o.upsideDown ? { x: 0, y: -1 } : { x: 0, y: 1 });
        const t = state.simTilt;
        // Tilt input is in viewer space; convert into content space.
        let tx = t.x, ty = t.y;
        if (!state.landscape && o.upsideDown) { tx = -tx; ty = -ty; }
        if (state.mirror < 0) tx = -tx;
        const flat = state.pose === 'flat' || state.pose === 'facedown';
        const s = flat ? 0 : 0.6;
        return { x: base.x * s + tx, y: base.y * s + ty, z: flat ? 1 : 0.5 };
      }
      const u = upVector();
      // gravity (pointing down) on the device screen, screen coords (x right, y down)
      let g = { x: -u.x, y: u.y };
      g = rot(g, -screenAngle());          // into viewport coords
      g = rot(g, -state.rotation);         // into content coords
      g.x *= state.mirror;
      return { x: g.x, y: g.y, z: -u.z };
    }

    function toLocal(cx, cy) {
      const vw = window.innerWidth, vh = window.innerHeight;
      let p = { x: (cx - vw / 2) / state.scale, y: (cy - vh / 2) / state.scale };
      p = rot(p, -state.rotation);
      p.x *= state.mirror;
      return { x: p.x + o.width / 2, y: p.y + o.height / 2 };
    }

    // ---- start overlay (needed for iOS motion permission) -------------------
    const overlay = document.createElement('div');
    overlay.className = 'inv-start';
    overlay.innerHTML = `
      <div class="inv-card">
        <h1>${o.title}</h1>
        ${o.subtitle ? `<p class="inv-sub">${o.subtitle}</p>` : ''}
        <ul>${o.howTo.map(t => `<li>${t}</li>`).join('')}</ul>
        <button class="inv-go">Tap to start</button>
        <p class="inv-note">Rotation lock can stay on: the game reads your tilt sensor, not the screen rotation.</p>
        <a class="inv-back" href="index.html">&larr; all prototypes</a>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.inv-go').addEventListener('click', async () => {
      try {
        if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) {
          await DeviceOrientationEvent.requestPermission();
        }
        if (typeof DeviceMotionEvent !== 'undefined' && DeviceMotionEvent.requestPermission) {
          await DeviceMotionEvent.requestPermission();
        }
      } catch (e) { /* desktop or denied: fall back to keys */ }
      overlay.remove();
      state.started = true;
      layout();
      startListeners.forEach(fn => fn());
      setTimeout(() => { if (!state.hasSensor) showHint(); }, 1200);
    });

    function showHint() {
      const h = document.createElement('div');
      h.className = 'inv-hint';
      h.textContent = 'No tilt sensor found. Keys: 1 upright, 2 upside down, 3/4 sideways, 5 flat, 6 face down, arrows tilt, S shake';
      document.body.appendChild(h);
      setTimeout(() => h.remove(), 7000);
    }

    // ---- keyboard simulation for desktop ------------------------------------
    const SIM = { '1': [70, 0], '2': [-70, 0], '3': [0, -70], '4': [0, 70], '5': [0, 0], '6': [180, 0] };
    window.addEventListener('keydown', e => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (SIM[e.key]) {
        state.sim = true;
        [state.beta, state.gamma] = SIM[e.key];
        state.candidate = null;
        updatePose(); state.candidateSince = -1e9; updatePose();
      }
      const t = 0.5;
      if (e.key === 'ArrowLeft') state.simTilt.x = -t;
      if (e.key === 'ArrowRight') state.simTilt.x = t;
      if (e.key === 'ArrowUp') state.simTilt.y = -t;
      if (e.key === 'ArrowDown') state.simTilt.y = t;
      if (e.key === 's' || e.key === 'S') state.shake = 30;
    });
    window.addEventListener('keyup', e => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') state.simTilt.x = 0;
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') state.simTilt.y = 0;
    });

    document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
    // first placement without the flip animation
    root.style.transition = 'none';
    layout();
    root.getBoundingClientRect();
    requestAnimationFrame(() => { root.style.transition = ''; });

    return {
      onPose: fn => poseListeners.push(fn),
      onStart: fn => startListeners.push(fn),
      gravity, toLocal, layout,
      get pose() { return state.pose; },
      get mirrored() { return state.mirror < 0; },
      get landscape() { return !!state.landscape; },
      get shake() { return state.shake; },
      get started() { return state.started; },
      get hasSensor() { return state.hasSensor; },
      options: o,
    };
  }

  // tiny sound + buzz helpers shared by all games
  let ac = null;
  function beep(freq = 440, ms = 90, type = 'square', vol = 0.08) {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const osc = ac.createOscillator(), g = ac.createGain();
      osc.type = type; osc.frequency.value = freq;
      g.gain.value = vol;
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + ms / 1000);
      osc.connect(g).connect(ac.destination);
      osc.start(); osc.stop(ac.currentTime + ms / 1000);
    } catch (e) {}
  }
  function buzz(ms = 40) { if (navigator.vibrate) navigator.vibrate(ms); }

  function best(key, score, lowerIsBetter = false) {
    const k = 'inverted:' + key;
    const prev = parseFloat(localStorage.getItem(k));
    const better = isNaN(prev) || (lowerIsBetter ? score < prev : score > prev);
    if (better) localStorage.setItem(k, score);
    return { best: better ? score : prev, isNew: better };
  }

  window.Inverted = { create, beep, buzz, best };
})();
