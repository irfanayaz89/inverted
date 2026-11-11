import SwiftUI

/// The readable "how to play" card shown before a game starts. It is deliberately
/// NOT inverted: it's the last moment of mercy.
struct GameIntro: View {
    let title: String
    let subtitle: String
    let rules: [String]
    let onStart: () -> Void

    var body: some View {
        VStack(spacing: 18) {
            Text(title)
                .font(.system(size: 40, weight: .black, design: .rounded))
                .foregroundStyle(LinearGradient(colors: [.pink, .orange], startPoint: .leading, endPoint: .trailing))
                .rotationEffect(.degrees(180))
            Text(subtitle).foregroundStyle(.secondary)
            VStack(alignment: .leading, spacing: 10) {
                ForEach(rules, id: \.self) { rule in
                    HStack(alignment: .top, spacing: 8) {
                        Text("•")
                        Text(rule)
                    }
                }
            }
            .font(.callout)
            .padding(.horizontal)
            Button(action: onStart) {
                Text("Start")
                    .font(.title3.bold())
                    .padding(.horizontal, 44)
                    .padding(.vertical, 14)
                    .background(Capsule().fill(Color.pink))
                    .foregroundStyle(.white)
            }
            .padding(.top, 8)
        }
        .padding(24)
        .frame(maxWidth: 420)
    }
}
