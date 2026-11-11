import QuartzCore

/// A frame-rate tick for games. Call `start` in onAppear and `stop` in onDisappear
/// (the display link retains its target until stopped).
final class GameLoop: NSObject {
    var tick: ((Double) -> Void)?
    private var link: CADisplayLink?
    private var last: CFTimeInterval = 0

    func start() {
        guard link == nil else { return }
        last = 0
        let l = CADisplayLink(target: self, selector: #selector(step(_:)))
        l.add(to: .main, forMode: .common)
        link = l
    }

    func stop() {
        link?.invalidate()
        link = nil
    }

    @objc private func step(_ l: CADisplayLink) {
        let now = l.timestamp
        let dt = last == 0 ? 1.0 / 60.0 : min(1.0 / 30.0, now - last)
        last = now
        tick?(dt)
    }
}
