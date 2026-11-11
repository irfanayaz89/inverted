import Foundation
import Observation

/// Tilt to roll a ball to the goal. Flipping the phone over swaps which colour is solid.
/// Flip while the ball isn't on a grey safe tile and it gets crushed.
///
/// Tiles: W wall, # black, . white, o safe (grey), S start (safe), G goal, ^ spikes.
@Observable
final class NegativeSpaceGame {
    static let levels: [[String]] = [
        ["WWWWWWWWWW", "WS.......W", "W#######.W", "W#######.W", "W........W", "W.#######W",
         "W.#######W", "W........W", "W#######.W", "W#######.W", "W.......GW", "WWWWWWWWWW"],
        ["WWWWWWWWWW", "W#.##...#W", "W####....W", "W####....W", "W#####...W", "W######..W",
         "W######..W", "W#####S..W", "W####...#W", "W#####.##W", "W##o#####W", "W##o#####W",
         "WG##o####W", "WWWWWWWWWW"],
        ["WWWWWWWWWW", "W..######W", "WG.....##W", "W#.....^#W", "W......##W", "W.^..####W",
         "W...o####W", "W..##o###W", "W..####o#W", "W########W", "W########W", "Wo..S####W",
         "W.....###W", "WWWWWWWWWW"],
        ["WWWWWWWWWW", "W.###....W", "W..##....W", "W.S###...W", "W..#^##..W", "W##.#^o.oW",
         "W##......W", "W##.o.###W", "W####o###W", "W^#######W", "W########W", "W####G^#.W",
         "W#####..#W", "WWWWWWWWWW"],
        ["WWWWWWWWWW", "W^.#####.W", "W..#S##o.W", "W.#####..W", "W#####^#oW", "W#o#..###W",
         "W##..^.#oW", "W.....o##W", "W.......^W", "W.^......W", "W........W", "W........W",
         "W....##.GW", "WWWWWWWWWW"],
    ]
    static let names = ["Roll", "First Flip", "Double Back", "Safe Spaces", "Four Flips"]
    static let tile = 40.0
    static let radius = 11.0

    struct Ball { var x = 0.0, y = 0.0, vx = 0.0, vy = 0.0, dead = false }
    struct Banner { var text: String; var until: Double }
    struct Result { var seconds: Double; var deaths: Int; var best: Double; var isNew: Bool }

    private(set) var level = 0
    private(set) var grid: [[Character]] = []
    private(set) var origin = (x: 0.0, y: 0.0)
    private(set) var ball = Ball()
    private(set) var inverted = false
    private(set) var deaths = 0
    private(set) var banner: Banner?
    private(set) var result: Result?
    private(set) var clock = 0.0          // seconds since this run started
    @ObservationIgnored private var frozenUntil = 0.0
    @ObservationIgnored private var pending: (at: Double, action: () -> Void)?

    init() { load(0) }

    func restart() {
        deaths = 0; clock = 0; result = nil
        load(0)
    }

    private func load(_ i: Int) {
        level = i
        grid = Self.levels[i].map { Array($0) }
        inverted = false
        banner = nil
        let T = Self.tile
        origin = ((400 - Double(grid[0].count) * T) / 2, 90 + (600 - Double(grid.count) * T) / 2)
        for (r, row) in grid.enumerated() {
            for (c, ch) in row.enumerated() where ch == "S" {
                ball = Ball(x: origin.x + Double(c) * T + T / 2, y: origin.y + Double(r) * T + T / 2)
            }
        }
    }

    // MARK: grid helpers

    func cell(_ x: Double, _ y: Double) -> Character {
        let c = Int(floor((x - origin.x) / Self.tile)), r = Int(floor((y - origin.y) / Self.tile))
        guard r >= 0, r < grid.count, c >= 0, c < grid[0].count else { return "W" }
        return grid[r][c]
    }

    func isSolid(_ ch: Character) -> Bool {
        ch == "W" || (ch == "#" && !inverted) || (ch == "." && inverted)
    }

    private func hits(_ x: Double, _ y: Double, _ rad: Double, _ test: (Character) -> Bool) -> Bool {
        let T = Self.tile
        let c0 = Int(floor((x - rad - origin.x) / T)), c1 = Int(floor((x + rad - origin.x) / T))
        let r0 = Int(floor((y - rad - origin.y) / T)), r1 = Int(floor((y + rad - origin.y) / T))
        for r in r0...r1 {
            for c in c0...c1 {
                let ch: Character = (r < 0 || r >= grid.count || c < 0 || c >= grid[0].count) ? "W" : grid[r][c]
                guard test(ch) else { continue }
                let left = origin.x + Double(c) * T, top = origin.y + Double(r) * T
                let nx = max(left, min(x, left + T)), ny = max(top, min(y, top + T))
                if (nx - x) * (nx - x) + (ny - y) * (ny - y) < rad * rad { return true }
            }
        }
        return false
    }

    // MARK: events

    private func die(_ why: String) {
        deaths += 1
        ball.dead = true
        banner = Banner(text: why, until: clock + 1.1)
        Feedback.fail()
        let i = level
        pending = (clock + 0.9, { [weak self] in self?.load(i) })
    }

    /// Flipping between the two portrait poses inverts the world.
    func poseChanged(from: Pose, to: Pose) {
        guard result == nil else { return }
        frozenUntil = clock + 0.45
        guard from.isPortrait, to.isPortrait, !ball.dead else { return }
        inverted.toggle()
        Feedback.thud()
        if isSolid(cell(ball.x, ball.y)) { die("CRUSHED"); return }
        if hits(ball.x, ball.y, Self.radius, isSolid) {
            let T = Self.tile
            ball.x = origin.x + floor((ball.x - origin.x) / T) * T + T / 2
            ball.y = origin.y + floor((ball.y - origin.y) / T) * T + T / 2
        }
    }

    func update(dt: Double, gravity g: Vec2) {
        guard result == nil else { return }
        clock += dt
        if let p = pending, clock >= p.at { pending = nil; p.action() }
        if let b = banner, clock > b.until { banner = nil }
        guard !ball.dead, clock > frozenUntil else { return }

        let accel = 1100.0
        ball.vx += g.x * accel * dt
        ball.vy += g.y * accel * dt
        let damp = pow(0.35, dt)
        ball.vx *= damp; ball.vy *= damp
        let speed = (ball.vx * ball.vx + ball.vy * ball.vy).squareRoot(), maxSpeed = 420.0
        if speed > maxSpeed { ball.vx *= maxSpeed / speed; ball.vy *= maxSpeed / speed }

        let steps = 4
        for _ in 0..<steps {
            let nx = ball.x + ball.vx * dt / Double(steps)
            if hits(nx, ball.y, Self.radius, isSolid) { ball.vx *= -0.25 } else { ball.x = nx }
            let ny = ball.y + ball.vy * dt / Double(steps)
            if hits(ball.x, ny, Self.radius, isSolid) { ball.vy *= -0.25 } else { ball.y = ny }
        }

        if hits(ball.x, ball.y, Self.radius - 4, { $0 == "^" }) {
            die("SPIKED")
        } else if cell(ball.x, ball.y) == "G" {
            Feedback.success()
            ball.dead = true
            if level + 1 < Self.levels.count {
                banner = Banner(text: "NICE", until: clock + 0.8)
                let next = level + 1
                pending = (clock + 0.7, { [weak self] in self?.load(next) })
            } else {
                let b = BestScore.submit("negative-space", clock, lowerIsBetter: true)
                result = Result(seconds: clock, deaths: deaths, best: b.best, isNew: b.isNew)
            }
        }
    }
}
