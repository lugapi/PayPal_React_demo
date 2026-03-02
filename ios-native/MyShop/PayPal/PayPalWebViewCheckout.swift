import SwiftUI

struct PayPalWebViewCheckout: View {
    let amount: Double
    let appSwitch: Bool
    let onSuccess: (_ orderId: String?, _ payerName: String?) -> Void

    @State private var loading = true
    @State private var cancelled = false
    @State private var errorMessage: String?

    var body: some View {
        ZStack {
            PayPalWebViewRepresentable(
                html: PayPalCheckoutHTML.generate(amount: amount, appSwitch: appSwitch),
                baseURL: URL(string: "https://www.paypal.com"),
                onMessage: handleMessage
            )

            if loading {
                ProgressView()
                    .tint(Color(hex: "6C63FF"))
                    .scaleEffect(1.5)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color(hex: "F7F8FC"))
            }
        }
        .onAppear {
            // Give webview a moment to load
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) { loading = false }
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
            cancelled = true
        case .error:
            errorMessage = msg.message ?? "Unknown PayPal error."
        default:
            break
        }
    }
}
