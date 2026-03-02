import SwiftUI

struct PayPalV6WebViewCheckout: View {
    let amount: Double
    let onSuccess: (_ orderId: String?, _ payerName: String?) -> Void

    @State private var tokens: PayPalService.PayPalTokens?
    @State private var loading = true
    @State private var errorMessage: String?

    var body: some View {
        ZStack {
            if let tokens {
                PayPalWebViewRepresentable(
                    html: PayPalV6CheckoutHTML.generate(
                        amount: amount,
                        accessToken: tokens.accessToken,
                        clientToken: tokens.clientToken
                    ),
                    baseURL: URL(string: "https://www.sandbox.paypal.com"),
                    onMessage: handleMessage
                )
            }

            if loading {
                VStack(spacing: 12) {
                    ProgressView()
                        .tint(Color(hex: "E65100"))
                        .scaleEffect(1.5)
                    Text("Initializing PayPal V6 SDK…")
                        .font(.system(size: 14))
                        .foregroundStyle(.gray)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color(hex: "F7F8FC"))
            }
        }
        .task {
            do {
                tokens = try await PayPalService.getPayPalTokens()
                // Give webview time to render
                try? await Task.sleep(for: .seconds(2))
                loading = false
            } catch {
                errorMessage = error.localizedDescription
                loading = false
            }
        }
        .alert("PayPal Error", isPresented: .init(
            get: { errorMessage != nil },
            set: { if !$0 { errorMessage = nil } }
        )) {
            Button("OK") { errorMessage = nil }
        } message: {
            Text(errorMessage ?? "")
        }
    }

    private func handleMessage(_ msg: PayPalWebViewMessage) {
        switch msg.type {
        case .success:
            onSuccess(msg.orderId, msg.payerName)
        case .cancel:
            break
        case .error:
            errorMessage = msg.message ?? "Unknown PayPal error."
        default:
            break
        }
    }
}
