import Foundation

enum PaymentMode: String, CaseIterable, Identifiable {
    case native
    case webview
    case popupbridge
    case webviewv6

    var id: String { rawValue }

    var label: String {
        switch self {
        case .native:      return "📱 Native"
        case .webview:     return "🌐 WebView"
        case .popupbridge: return "🔗 Hybrid"
        case .webviewv6:   return "🚀 V6 SDK"
        }
    }

    var fullLabel: String {
        switch self {
        case .native:      return "📱 Native REST API"
        case .webview:     return "🌐 WebView JS SDK"
        case .popupbridge: return "🔗 PopupBridge (Hybrid)"
        case .webviewv6:   return "🚀 JS SDK V6"
        }
    }

    var pillColor: String {
        switch self {
        case .native:      return "purple"
        case .webview:     return "blue"
        case .popupbridge: return "green"
        case .webviewv6:   return "orange"
        }
    }

    var supportsAppSwitch: Bool {
        self == .webview || self == .popupbridge
    }
}
