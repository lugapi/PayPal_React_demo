import SwiftUI
import AuthenticationServices

struct PayPalNativeButton: View {
    let amount: Double
    let onSuccess: (_ orderId: String?, _ payerName: String?) -> Void

    @State private var loading = false
    @State private var errorMessage: String?

    var body: some View {
        Button {
            Task { await handlePress() }
        } label: {
            if loading {
                ProgressView()
                    .tint(.white)
            } else {
                HStack(spacing: 0) {
                    Text("Pay")
                        .font(.system(size: 20, weight: .heavy))
                        .foregroundStyle(Color(hex: "003087"))
                    Text("Pal")
                        .font(.system(size: 20, weight: .heavy))
                        .foregroundStyle(Color(hex: "009CDE"))
                }
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(Color(hex: "FFC439"))
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .disabled(loading)
        .opacity(loading ? 0.7 : 1)
        .alert("PayPal Error", isPresented: .init(
            get: { errorMessage != nil },
            set: { if !$0 { errorMessage = nil } }
        )) {
            Button("OK") { errorMessage = nil }
        } message: {
            Text(errorMessage ?? "")
        }
    }

    @MainActor
    private func handlePress() async {
        loading = true
        defer { loading = false }

        do {
            let accessToken = try await PayPalService.getAccessToken()
            let order = try await PayPalService.createOrder(amount: amount, accessToken: accessToken)

            // Open in ASWebAuthenticationSession
            guard let approvalURL = URL(string: order.approvalUrl) else {
                errorMessage = "Invalid approval URL."
                return
            }

            let callbackScheme = Config.urlScheme
            let returnURL = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<URL, Error>) in
                let session = ASWebAuthenticationSession(
                    url: approvalURL,
                    callbackURLScheme: callbackScheme
                ) { url, error in
                    if let url {
                        continuation.resume(returning: url)
                    } else if let error {
                        continuation.resume(throwing: error)
                    } else {
                        continuation.resume(throwing: PayPalError.captureFailed)
                    }
                }
                session.presentationContextProvider = WebAuthContextProvider.shared
                session.prefersEphemeralWebBrowserSession = false
                session.start()
            }

            // Extract token from return URL
            let components = URLComponents(url: returnURL, resolvingAgainstBaseURL: false)
            guard let token = components?.queryItems?.first(where: { $0.name == "token" })?.value else {
                errorMessage = "PayPal token missing from return URL."
                return
            }

            let captured = try await PayPalService.captureOrder(orderId: token)
            if captured {
                onSuccess(token, nil)
            } else {
                errorMessage = "Payment capture failed."
            }
        } catch is CancellationError {
            // User cancelled — no error
        } catch let error as ASWebAuthenticationSessionError where error.code == .canceledLogin {
            // User cancelled
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

/// Provides the presentation anchor for ASWebAuthenticationSession
final class WebAuthContextProvider: NSObject, ASWebAuthenticationPresentationContextProviding {
    static let shared = WebAuthContextProvider()

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = scene.windows.first
        else {
            return ASPresentationAnchor()
        }
        return window
    }
}
