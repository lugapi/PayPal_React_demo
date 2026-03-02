import Foundation

enum Config {
    // MARK: - PayPal Sandbox Credentials
    // Values are read from Secrets.xcconfig via Info.plist.
    // Copy Secrets.xcconfig.example → Secrets.xcconfig and fill in your credentials.
    // Get your credentials at https://developer.paypal.com → Apps & Credentials

    static let paypalClientID: String = {
        Bundle.main.infoDictionary?["PayPalClientID"] as? String ?? "YOUR_PAYPAL_CLIENT_ID"
    }()

    static let paypalClientSecret: String = {
        Bundle.main.infoDictionary?["PayPalClientSecret"] as? String ?? "YOUR_PAYPAL_CLIENT_SECRET"
    }()

    static let paypalBaseURL = "https://api-m.sandbox.paypal.com"
    static let paypalWebURL = "https://www.sandbox.paypal.com"

    // Deep link scheme used for return URLs
    static let urlScheme = "myshopnative"
}
