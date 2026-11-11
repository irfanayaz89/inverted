import CoreMotion
import Observation
import SwiftUI

/// How the player is physically holding the phone.
enum Pose: String, Equatable {
    case up, right, down, left, flat, faceDown

    /// Direction of "earth up", clockwise from the phone's top edge.
    var angle: Double? {
        switch self {
        case .up: 0
        case .right: 90
        case .down: 180
        case .left: 270
        case .flat, .faceDown: nil
        }
    }

    var isPortrait: Bool { self == .up || self == .down }
    var isLandscape: Bool { self == .left || self == .right }
}

struct Vec2: Equatable {
    var x: Double
    var y: Double
    static let zero = Vec2(x: 0, y: 0)
}

/// The shared rule for every Inverted game and app:
/// - Portrait, either way up: the game always stays upside down to the player.
/// - Landscape: the game turns to face the player, but mirrored.
/// - Tilt moves things the wrong way too (tilt right, roll left).
///
/// The app itself is locked to portrait, so the OS never rotates anything.
/// We read gravity from CoreMotion and do all rotation ourselves.
@Observable
final class InversionEngine {
    struct Config {
        var upsideDown = true
        var mirrorLandscape = true
        var invertControls = true
        /// How far the phone must lean out of flat before we trust a pose (0...1).
        var tiltThreshold = 0.45
        /// A new pose must hold this long before the screen flips.
        var settle: TimeInterval = 0.25
    }

    var config: Config

    private(set) var pose: Pose = .up
    private(set) var previousPose: Pose = .up
    /// Cumulative rotation in degrees, so animations always take the short way round.
    private(set) var rotation: Double = 180
    private(set) var mirrored = false
    private(set) var landscape = false
    /// Bumps every time the pose changes, handy for `onChange`.
    private(set) var poseChanges = 0

    @ObservationIgnored var onPoseChange: ((_ from: Pose, _ to: Pose) -> Void)?

    @ObservationIgnored private let motion = CMMotionManager()
    @ObservationIgnored private var up = SIMD3<Double>(0, 0.8, 0.6)   // earth-up in device coords
    @ObservationIgnored private var candidate: Pose?
    @ObservationIgnored private var candidateSince = Date()
    @ObservationIgnored private(set) var simulatedTilt = Vec2.zero

    var hasSensor: Bool { motion.isDeviceMotionAvailable }

    init(config: Config = Config()) {
        self.config = config
    }

    deinit { motion.stopDeviceMotionUpdates() }

    func start() {
        guard motion.isDeviceMotionAvailable, !motion.isDeviceMotionActive else { return }
        motion.deviceMotionUpdateInterval = 1.0 / 60.0
        motion.startDeviceMotionUpdates(to: .main) { [weak self] data, _ in
            guard let self, let g = data?.gravity else { return }
            // CoreMotion gravity points down: x right, y toward the top edge, z out of the screen.
            self.up = SIMD3(-g.x, -g.y, -g.z)
            self.updatePose()
        }
    }

    func stop() { motion.stopDeviceMotionUpdates() }

    // MARK: - Pose detection

    private func rawPose() -> Pose {
        let planar = (up.x * up.x + up.y * up.y).squareRoot()
        if planar < config.tiltThreshold { return up.z >= 0 ? .flat : .faceDown }
        var a = atan2(up.x, up.y) * 180 / .pi
        a = (a.truncatingRemainder(dividingBy: 360) + 360).truncatingRemainder(dividingBy: 360)
        // Hysteresis: stay put unless we're clearly in another quadrant.
        if let current = pose.angle {
            var d = abs(a - current)
            d = min(d, 360 - d)
            if d < 60 { return pose }
        }
        switch a {
        case ..<45, 315...: return .up
        case ..<135: return .right
        case ..<225: return .down
        default: return .left
        }
    }

    private func updatePose(force: Bool = false) {
        let p = rawPose()
        guard p != pose else { candidate = nil; return }
        if !force {
            if p != candidate { candidate = p; candidateSince = Date(); return }
            if Date().timeIntervalSince(candidateSince) < config.settle { return }
        }
        apply(pose: p)
    }

    private func apply(pose p: Pose) {
        let prev = pose
        previousPose = prev
        pose = p
        candidate = nil
        if let pa = p.angle {
            let land = p.isLandscape
            var target = pa + ((!land && config.upsideDown) ? 180 : 0)
            target += 360 * ((rotation - target) / 360).rounded()
            rotation = target
            mirrored = land && config.mirrorLandscape
            landscape = land
        }
        poseChanges += 1
        onPoseChange?(prev, p)
    }

    // MARK: - Gravity in game coordinates

    /// Gravity in the game's own coordinates (x right, y down, units of g), already
    /// inverted so the motion fights the player.
    func gravity() -> Vec2 {
        let g = realGravity()
        guard config.invertControls else { return g }
        return landscape ? Vec2(x: -g.x, y: g.y) : Vec2(x: -g.x, y: -g.y)
    }

    /// Gravity as physics would have it: things fall toward the real floor.
    func realGravity() -> Vec2 {
        if !hasSensor {
            // Simulator: pretend the phone is held at a comfortable angle.
            let base = landscape ? Vec2(x: 0, y: 0.6) : Vec2(x: 0, y: config.upsideDown ? -0.6 : 0.6)
            var t = simulatedTilt
            if !landscape && config.upsideDown { t = Vec2(x: -t.x, y: -t.y) }
            if mirrored { t.x = -t.x }
            return Vec2(x: base.x + t.x, y: base.y + t.y)
        }
        let down = -up
        var v = Vec2(x: down.x, y: -down.y)          // screen coords, y down
        let r = -rotation * .pi / 180
        v = Vec2(x: v.x * cos(r) - v.y * sin(r), y: v.x * sin(r) + v.y * cos(r))
        if mirrored { v.x = -v.x }
        return v
    }

    // MARK: - Simulator helpers

    func simulate(_ p: Pose) {
        switch p {
        case .up: up = SIMD3(0, 0.94, 0.34)
        case .down: up = SIMD3(0, -0.94, 0.34)
        case .right: up = SIMD3(0.94, 0, 0.34)
        case .left: up = SIMD3(-0.94, 0, 0.34)
        case .flat: up = SIMD3(0, 0, 1)
        case .faceDown: up = SIMD3(0, 0, -1)
        }
        updatePose(force: true)
    }

    func simulateTilt(_ t: Vec2) { simulatedTilt = t }
}
