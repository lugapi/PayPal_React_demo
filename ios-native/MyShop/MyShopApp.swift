import SwiftUI

@main
struct MyShopApp: App {
    @State private var cart = CartManager()
    @State private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(cart)
                .environment(appState)
        }
    }
}

struct ContentView: View {
    @Environment(CartManager.self) private var cart

    var body: some View {
        TabView {
            NavigationStack {
                ProductListView()
            }
            .tabItem {
                Label("Shop", systemImage: "storefront")
            }

            NavigationStack {
                CartView()
            }
            .tabItem {
                Label("Cart", systemImage: "cart")
            }
            .badge(cart.itemCount)
        }
        .tint(Color(hex: "6C63FF"))
    }
}

// MARK: - Color extension

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b, a: UInt64
        switch hex.count {
        case 6:
            (r, g, b, a) = (int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF, 255)
        case 8:
            (r, g, b, a) = (int >> 24 & 0xFF, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (r, g, b, a) = (0, 0, 0, 255)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
