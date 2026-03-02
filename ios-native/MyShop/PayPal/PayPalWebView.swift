import SwiftUI
import WebKit

/// Message types received from the PayPal WebView via postMessage
struct PayPalWebViewMessage {
    enum MessageType: String {
        case success
        case cancel
        case error
        case popupOpen = "popup_open"
        case popupReturn = "popup_return"
    }

    let type: MessageType
    let orderId: String?
    let payerName: String?
    let message: String?
    let url: String?
    let token: String?
}

/// A reusable WKWebView wrapper for PayPal checkout flows
struct PayPalWebViewRepresentable: UIViewRepresentable {
    let html: String
    let baseURL: URL?
    let onMessage: (PayPalWebViewMessage) -> Void
    var uiDelegate: WKUIDelegate?

    func makeCoordinator() -> Coordinator {
        Coordinator(onMessage: onMessage)
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        let handler = context.coordinator
        config.userContentController.add(handler, name: "paypalHandler")

        // Inject a script to redirect postMessage to our handler
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
        if let delegate = uiDelegate {
            webView.uiDelegate = delegate
        }
        webView.isOpaque = false
        webView.backgroundColor = UIColor(Color(hex: "F7F8FC"))
        webView.scrollView.backgroundColor = UIColor(Color(hex: "F7F8FC"))

        // Store reference for JS injection
        context.coordinator.webView = webView

        webView.loadHTMLString(html, baseURL: baseURL)
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    class Coordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
        let onMessage: (PayPalWebViewMessage) -> Void
        weak var webView: WKWebView?

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

        func injectJavaScript(_ js: String) {
            webView?.evaluateJavaScript(js, completionHandler: nil)
        }
    }
}
