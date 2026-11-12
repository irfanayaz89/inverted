# Inverted

Phone games and apps that fight back. However you hold the phone, the game stays **upside down**. Turn it sideways and it **mirrors**. Tilt controls are inverted too.

## Layout

| Folder | What it is |
|---|---|
| `app/` | **The real app.** Expo (SDK 58) + Expo Router, TypeScript. Ships to iOS, Android and web from one codebase. |
| `web/` | The original HTML prototypes of all five games (live at https://inverted-prototypes.vercel.app). Reference for porting. |
| `ios-swift/` | An early SwiftUI draft of the engine and Negative Space, kept for reference if a game later goes native. Not built or maintained. |

## The app

```bash
cd app
npm install
npx expo start          # scan the QR code with Expo Go, or press w for web
npm run typecheck
npm run build:web       # static web build in app/dist
```

Motion sensors on the web need HTTPS, and iPhone Safari asks for permission when you tap Start.
On a laptop, keys 1-6 fake the phone's pose (1 upright, 2 upside down, 3/4 sideways, 5 flat, 6 face down) and arrow keys fake tilt.

### How it's built

- `src/engine/inversion.ts`: the inversion engine. Reads gravity (expo-sensors `DeviceMotion` on native, `deviceorientation` on web), detects the pose with hysteresis, works out the board rotation/mirror, and returns gravity in board coordinates with controls inverted.
- `src/engine/InvertedStage.tsx`: draws a fixed 400x700 board, centred and rotated/mirrored with a spring animation. Map touches with `engine.toBoard(pageX, pageY)`.
- `src/engine/GameShell.tsx`: readable intro card, then the inverted board.
- `src/games/*`: game logic, framework-free. `src/app/*`: screens.

### Games

| Game | Status |
|---|---|
| Negative Space (tilt puzzle, flip to swap solid colours) | Ported |
| Wrong Way Up (reflex swipes where every direction lies) | Ported |
| Ceiling Stack (stacker hanging from the ceiling, tilt = wind) | Ported |
| Upside Type (60s typing test, keyboard gets worse each phrase) | Ported |
| Mirror Trace (trace shapes while your line is reflected) | Ported |
| Upfall (stars and bombs fall up; inverted-tilt paddle) | New |
| Flip Off (party game: get the phone into the pose it shouts, unless it's a trap) | New |
| Echo Back (memory: replay the pad pattern in reverse; the board sometimes spins) | New |

### Apps

| App | What it does |
|---|---|
| Flip Focus | Focus timer that only counts while the phone is face down. 3 second grace if you pick it up, then the streak breaks. Stats kept in AsyncStorage. Uses expo-keep-awake so the screen doesn't lock mid-session. |
| Flip Text | Turns typed text upside down or backwards, with Copy and Share. The one screen that is not inverted, so you can type. |

Taps use the responder system (`onStartShouldSetResponder` / `onResponderGrant`) rather than `Pressable.onPressIn`, which didn't fire inside the transformed board on react-native-web.
