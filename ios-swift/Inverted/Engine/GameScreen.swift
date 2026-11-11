import SwiftUI

/// Common shell for every game: intro card, the inverted board, a close button,
/// the frame loop, and (in the Simulator) buttons that fake the phone's pose.
struct GameScreen<Board: View>: View {
    let title: String
    let subtitle: String
    let rules: [String]
    let engine: InversionEngine
    var onStart: () -> Void = {}
    var onTick: (Double) -> Void = { _ in }
    @ViewBuilder var board: () -> Board

    @Environment(\.dismiss) private var dismiss
    @State private var started = false
    @State private var loop = GameLoop()

    var body: some View {
        ZStack(alignment: .topLeading) {
            if started {
                InvertedStage(engine: engine, content: board)
            } else {
                GameIntro(title: title, subtitle: subtitle, rules: rules) {
                    started = true
                    onStart()
                    loop.tick = onTick
                    loop.start()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }

            Button { dismiss() } label: {
                Image(systemName: "xmark")
                    .font(.headline)
                    .padding(12)
                    .background(.ultraThinMaterial, in: Circle())
            }
            .padding()

            #if targetEnvironment(simulator)
            if started { SimulatorControls(engine: engine) }
            #endif
        }
        .preferredColorScheme(.dark)
        .toolbar(.hidden, for: .navigationBar)
        .statusBarHidden()
        .onAppear { engine.start() }
        .onDisappear { loop.stop(); engine.stop() }
    }
}

#if targetEnvironment(simulator)
/// The Simulator has no motion sensor, so fake one.
private struct SimulatorControls: View {
    let engine: InversionEngine
    @State private var tilt = 0.0

    var body: some View {
        VStack(spacing: 8) {
            HStack {
                ForEach([Pose.up, .down, .left, .right, .flat], id: \.self) { p in
                    Button(p.rawValue) { engine.simulate(p) }
                        .buttonStyle(.bordered)
                }
            }
            Slider(value: $tilt, in: -0.6...0.6) { Text("tilt") }
                .onChange(of: tilt) { _, v in engine.simulateTilt(Vec2(x: v, y: 0)) }
        }
        .font(.caption)
        .padding(10)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
    }
}
#endif
