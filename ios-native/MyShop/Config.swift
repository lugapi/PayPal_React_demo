import Foundation

enum Config {
    // MARK: - PayPal Sandbox Credentials
    // Set these values or use environment variables.
    // Get your credentials at https://developer.paypal.com → Apps & Credentials

    static let paypalClientID: String = {
        ProcessInfo.processInfo.environment["PAYPAL_CLIENT_ID"]
            ?? "YOUR_PAYPAL_CLIENT_ID"
    }()

    static let paypalClientSecret: String = {
        ProcessInfo.processInfo.environment["PAYPAL_CLIENT_SECRET"]
            ?? "YOUR_PAYPAL_CLIENT_SECRET"
    }()

    static let paypalBaseURL = "https://api-m.sandbox.paypal.com"
    static let paypalWebURL = "https://www.sandbox.paypal.com"

    // Deep link scheme used for return URLs
    static let urlScheme = "myshopnative"
}
