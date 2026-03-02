import Foundation

enum PayPalService {

    // MARK: - Access Token

    static func getAccessToken() async throws -> String {
        let url = URL(string: "\(Config.paypalBaseURL)/v1/oauth2/token")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")

        let credentials = "\(Config.paypalClientID):\(Config.paypalClientSecret)"
        let base64 = Data(credentials.utf8).base64EncodedString()
        request.setValue("Basic \(base64)", forHTTPHeaderField: "Authorization")
        request.httpBody = "grant_type=client_credentials".data(using: .utf8)

        let (data, _) = try await URLSession.shared.data(for: request)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        guard let token = json?["access_token"] as? String else {
            throw PayPalError.tokenFailed
        }
        return token
    }

    // MARK: - Create Order

    struct CreateOrderResult {
        let orderId: String
        let approvalUrl: String
    }

    static func createOrder(amount: Double, accessToken: String) async throws -> CreateOrderResult {
        let url = URL(string: "\(Config.paypalBaseURL)/v2/checkout/orders")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let body: [String: Any] = [
            "intent": "CAPTURE",
            "purchase_units": [[
                "amount": [
                    "currency_code": "EUR",
                    "value": String(format: "%.2f", amount)
                ],
                "description": "myshop order"
            ]],
            "application_context": [
                "return_url": "\(Config.urlScheme)://paypal-return",
                "cancel_url": "\(Config.urlScheme)://paypal-cancel"
            ]
        ]

        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, _) = try await URLSession.shared.data(for: request)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]

        guard let id = json?["id"] as? String,
              let links = json?["links"] as? [[String: Any]],
              let approveLink = links.first(where: { ($0["rel"] as? String) == "approve" }),
              let approvalUrl = approveLink["href"] as? String
        else {
            throw PayPalError.createOrderFailed
        }

        return CreateOrderResult(orderId: id, approvalUrl: approvalUrl)
    }

    // MARK: - Capture Order

    static func captureOrder(orderId: String) async throws -> Bool {
        let token = try await getAccessToken()
        let url = URL(string: "\(Config.paypalBaseURL)/v2/checkout/orders/\(orderId)/capture")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, _) = try await URLSession.shared.data(for: request)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        let status = json?["status"] as? String
        return status == "COMPLETED"
    }

    // MARK: - Get PayPal Tokens (for V6 SDK)

    struct PayPalTokens {
        let accessToken: String
        let clientToken: String
    }

    static func getPayPalTokens() async throws -> PayPalTokens {
        let accessToken = try await getAccessToken()

        let url = URL(string: "\(Config.paypalBaseURL)/v1/identity/generate-token")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (data, _) = try await URLSession.shared.data(for: request)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]

        guard let clientToken = json?["client_token"] as? String else {
            throw PayPalError.tokenFailed
        }

        return PayPalTokens(accessToken: accessToken, clientToken: clientToken)
    }
}

enum PayPalError: LocalizedError {
    case tokenFailed
    case createOrderFailed
    case captureFailed

    var errorDescription: String? {
        switch self {
        case .tokenFailed:      return "Failed to get PayPal access token."
        case .createOrderFailed: return "Failed to create PayPal order."
        case .captureFailed:    return "Failed to capture PayPal order."
        }
    }
}
