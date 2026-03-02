import SwiftUI
import WebKit
import PopupBridge

struct PayPalPopupBridgeCheckout: View {
    let amount: Double
    let appSwitch: Bool
    let onSuccess: (_ orderId: String?, _ payerName: String?) -> Void

    @State private var loading = true
    @State private var errorMessage: String?

    var body: some View {
        ZStack {
            PopupBridgeWebView(
                html: PayPalPopupBridgeHTML.generate(amount: amount, appSwitch: appSwitch),
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
            break
        case .error:
            errorMessage = msg.message ?? "Unknown PayPal error."
        default:
            break
        }
    }
}

/// A WKWebView wrapper that integrates the real PopupBridge library.
/// POPPopupBridge injects `window.popupBridge` into the web view and
/// handles `ASWebAuthenticationSession` natively when the PayPal SDK
/// calls `popupBridge.open(url)`.
struct PopupBridgeWebView: UIViewRepresentable {
    let html: String
    let baseURL: URL?
    let onMessage: (PayPalWebViewMessage) -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(onMessage: onMessage)
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        let handler = context.coordinator
        config.userContentController.add(handler, name: "paypalHandler")

        // Inject ReactNativeWebView shim so our postMsg() JS helper works
        let script = WKUserScript(
            source: """
            window.ReactNativeWebView = {
                postMessage: function(data) {
                    window.webkit.messageHandlers.paypalHandler.postMessage(data);
                }
            };
            """,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false
        )
        config.userContentController.addUserScript(script)

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.isOpaque = false
        webView.backgroundColor = UIColor(Color(hex: "F7F8FC"))
        webView.scrollView.backgroundColor = UIColor(Color(hex: "F7F8FC"))

        // Initialize PopupBridge — this injects `window.popupBridge` and
        // registers a WKScriptMessageHandler for popup interception.
        let popupBridge = POPPopupBridge(webView: webView, prefersEphemeralWebBrowserSession: false)
        context.coordinator.popupBridge = popupBridge

        webView.loadHTMLString(html, baseURL: baseURL)
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    class Coordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
        let onMessage: (PayPalWebViewMessage) -> Void
        var popupBridge: POPPopupBridge?

        init(onMessage: @escaping (PayPalWebViewMessage) -> Void) {
            self.onMessage = onMessage
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard let body = message.body as? String,
                  let data = body.data(using: .utf8),
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let typeStr = json["type"] as? String,
                  let type = PayPalWebViewMessage.MessageType(rawValue: typeStr)
            else { return }

            let msg = PayPalWebViewMessage(
                type: type,
                orderId: json["orderId"] as? String,
                payerName: json["payerName"] as? String,
                message: json["message"] as? String,
                url: json["url"] as? String,
                token: json["token"] as? String
            )
            DispatchQueue.main.async { self.onMessage(msg) }
        }
    }
}
