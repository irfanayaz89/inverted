import SwiftUI

/// Hosts a game drawn on a fixed 400x700 board and keeps it upside down / mirrored
/// according to the engine. Touch locations inside `content` are already in board
/// coordinates, because SwiftUI maps gestures through the transforms for us.
struct InvertedStage<Content: View>: View {
    static var boardSize: CGSize { CGSize(width: 400, height: 700) }

    let engine: InversionEngine
    @ViewBuilder var content: () -> Content

    var body: some View {
        GeometryReader { geo in
            let size = Self.boardSize
            let quarter = Int(abs(engine.rotation.truncatingRemainder(dividingBy: 180)).rounded())
            let sideways = quarter == 90
            let w = sideways ? size.height : size.width
            let h = sideways ? size.width : size.height
            let scale = min(geo.size.width / w, geo.size.height / h)

            content()
                .frame(width: size.width, height: size.height)
                .clipped()
                .contentShape(Rectangle())
                .scaleEffect(x: engine.mirrored ? -1 : 1, y: 1)
                .rotationEffect(.degrees(engine.rotation))
                .scaleEffect(scale)
                .frame(width: geo.size.width, height: geo.size.height)
                .animation(.spring(response: 0.45, dampingFraction: 0.65), value: engine.rotation)
                .animation(.spring(response: 0.45, dampingFraction: 0.65), value: engine.mirrored)
        }
        .background(Color(red: 0.05, green: 0.05, blue: 0.07))
        .ignoresSafeArea()
    }
}
