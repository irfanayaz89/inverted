import SwiftUI

struct NegativeSpaceView: View {
    @State private var engine = InversionEngine(config: .init(tiltThreshold: 0.6, settle: 0.3))
    @State private var game = NegativeSpaceGame()

    var body: some View {
        GameScreen(
            title: "Negative Space",
            subtitle: "Tilt to roll. Flip to invert the world.",
            rules: [
                "Tilt the phone to roll the ball to the green goal. It rolls the wrong way.",
                "Black is wall, white is floor. Flip the phone over and they swap.",
                "The screen flips back so it is always upside down. Sorry.",
                "Only flip while the ball sits on a grey safe tile, or it gets crushed.",
                "Red spikes are always deadly. Sideways = mirror world.",
            ],
            engine: engine,
            onStart: {
                game.restart()
                engine.onPoseChange = { [game] from, to in game.poseChanged(from: from, to: to) }
            },
            onTick: { [engine, game] dt in game.update(dt: dt, gravity: engine.gravity()) }
        ) {
            TimelineView(.animation) { _ in
                Canvas { ctx, _ in draw(&ctx) }
            }
            .onTapGesture { if game.result != nil { game.restart() } }
        }
    }

    private func draw(_ ctx: inout GraphicsContext) {
        let T = NegativeSpaceGame.tile
        let paper = Color(red: 0.96, green: 0.95, blue: 0.91)
        let ink = Color(white: 0.07)
        ctx.fill(Path(CGRect(x: 0, y: 0, width: 400, height: 700)), with: .color(Color(red: 0.1, green: 0.1, blue: 0.14)))

        for (r, row) in game.grid.enumerated() {
            for (c, ch) in row.enumerated() {
                let rect = CGRect(x: game.origin.x + Double(c) * T, y: game.origin.y + Double(r) * T, width: T, height: T)
                let fill: Color
                switch ch {
                case "W": fill = Color(red: 0.29, green: 0.27, blue: 0.38)
                case "#": fill = ink
                case ".": fill = paper
                case "o", "S": fill = Color(red: 0.55, green: 0.54, blue: 0.63)
                case "G": fill = Color(red: 0.16, green: 0.82, blue: 0.49)
                default: fill = game.inverted ? paper : ink
                }
                ctx.fill(Path(rect), with: .color(fill))
                if ch == "^" {
                    var spikes = Path()
                    for k in 0..<3 {
                        let x = rect.minX + Double(k) * 13
                        spikes.move(to: CGPoint(x: x + 1, y: rect.maxY - 4))
                        spikes.addLine(to: CGPoint(x: x + 7.5, y: rect.minY + 6))
                        spikes.addLine(to: CGPoint(x: x + 14, y: rect.maxY - 4))
                    }
                    ctx.fill(spikes, with: .color(Color(red: 1, green: 0.2, blue: 0.33)))
                }
                if ch == "o" || ch == "S" {
                    ctx.stroke(Path(rect.insetBy(dx: 5, dy: 5)), with: .color(.white.opacity(0.35)), lineWidth: 2)
                }
                // hatch whichever colour is currently solid, so you can read the rules at a glance
                if (ch == "#" && !game.inverted) || (ch == "." && game.inverted) {
                    var hatch = Path()
                    var k = -T
                    while k < T {
                        hatch.move(to: CGPoint(x: rect.minX + max(0, k), y: rect.minY + max(0, -k)))
                        hatch.addLine(to: CGPoint(x: rect.minX + min(T, k + T), y: rect.minY + min(T, T - k)))
                        k += 10
                    }
                    ctx.stroke(hatch, with: .color((game.inverted ? Color.black : .white).opacity(0.18)), lineWidth: 1)
                }
            }
        }

        let b = game.ball
        if !b.dead {
            let R = NegativeSpaceGame.radius
            ctx.fill(Path(ellipseIn: CGRect(x: b.x - R, y: b.y - R, width: 2 * R, height: 2 * R)), with: .color(.orange))
            ctx.fill(Path(ellipseIn: CGRect(x: b.x - 7.5, y: b.y - 7.5, width: 7, height: 7)), with: .color(.white.opacity(0.7)))
        }

        let name = NegativeSpaceGame.names[game.level]
        ctx.draw(Text("Level \(game.level + 1)/\(NegativeSpaceGame.levels.count): \(name)").font(.system(size: 20, weight: .bold)).foregroundStyle(.white),
                 at: CGPoint(x: 16, y: 34), anchor: .leading)
        ctx.draw(Text("Deaths \(game.deaths)").font(.system(size: 20, weight: .bold)).foregroundStyle(.white),
                 at: CGPoint(x: 384, y: 34), anchor: .trailing)
        ctx.draw(Text("Solid now: \(game.inverted ? "WHITE" : "BLACK")   \(String(format: "%.1f", game.clock))s").font(.system(size: 14)).foregroundStyle(.gray),
                 at: CGPoint(x: 16, y: 58), anchor: .leading)

        if let banner = game.banner {
            ctx.fill(Path(CGRect(x: 0, y: 300, width: 400, height: 100)), with: .color(.black.opacity(0.65)))
            ctx.draw(Text(banner.text).font(.system(size: 54, weight: .black)).foregroundStyle(.yellow), at: CGPoint(x: 200, y: 350))
        }
        if let res = game.result {
            ctx.fill(Path(CGRect(x: 0, y: 0, width: 400, height: 700)), with: .color(.black.opacity(0.85)))
            ctx.draw(Text("ESCAPED").font(.system(size: 40, weight: .black)).foregroundStyle(.green), at: CGPoint(x: 200, y: 270))
            ctx.draw(Text("\(String(format: "%.1f", res.seconds))s with \(res.deaths) deaths").font(.system(size: 22)).foregroundStyle(.white), at: CGPoint(x: 200, y: 320))
            ctx.draw(Text(res.isNew ? "New best!" : "Best: \(String(format: "%.1f", res.best))s").font(.system(size: 22)).foregroundStyle(.white), at: CGPoint(x: 200, y: 355))
            ctx.draw(Text("Tap to play again").font(.system(size: 18)).foregroundStyle(.gray), at: CGPoint(x: 200, y: 410))
        }
    }
}
