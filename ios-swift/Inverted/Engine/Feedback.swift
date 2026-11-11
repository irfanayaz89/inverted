import UIKit

enum Feedback {
    static func tick() { UIImpactFeedbackGenerator(style: .light).impactOccurred() }
    static func thud() { UIImpactFeedbackGenerator(style: .heavy).impactOccurred() }
    static func success() { UINotificationFeedbackGenerator().notificationOccurred(.success) }
    static func fail() { UINotificationFeedbackGenerator().notificationOccurred(.error) }
}

enum BestScore {
    /// Stores `score` if it beats the saved best. Returns the best and whether it's new.
    @discardableResult
    static func submit(_ key: String, _ score: Double, lowerIsBetter: Bool = false) -> (best: Double, isNew: Bool) {
        let k = "inverted.best.\(key)"
        let d = UserDefaults.standard
        guard d.object(forKey: k) != nil else {
            d.set(score, forKey: k)
            return (score, true)
        }
        let prev = d.double(forKey: k)
        let better = lowerIsBetter ? score < prev : score > prev
        if better { d.set(score, forKey: k) }
        return (better ? score : prev, better)
    }
}
