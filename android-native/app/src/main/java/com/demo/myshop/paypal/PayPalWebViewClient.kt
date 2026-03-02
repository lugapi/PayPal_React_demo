package com.demo.myshop.paypal

import android.annotation.SuppressLint
import android.webkit.JavascriptInterface
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import org.json.JSONObject

data class PayPalWebViewMessage(
    val type: String,
    val orderId: String? = null,
    val payerName: String? = null,
    val message: String? = null,
    val url: String? = null,
    val token: String? = null
)

/**
 * JavaScript interface exposed to the WebView as `window.AndroidBridge`.
 * Receives JSON messages from the PayPal HTML pages.
 */
class AndroidBridgeInterface(
    private val onMessage: (PayPalWebViewMessage) -> Unit
) {
    @JavascriptInterface
    fun postMessage(data: String) {
        try {
            val json = JSONObject(data)
            val msg = PayPalWebViewMessage(
                type = json.optString("type"),
                orderId = json.optString("orderId").ifEmpty { null },
                payerName = json.optString("payerName").ifEmpty { null },
                message = json.optString("message").ifEmpty { null },
                url = json.optString("url").ifEmpty { null },
                token = json.optString("token").ifEmpty { null }
            )
            onMessage(msg)
        } catch (_: Exception) {}
    }
}

@SuppressLint("SetJavaScriptEnabled")
fun configurePayPalWebView(
    webView: WebView,
    onMessage: (PayPalWebViewMessage) -> Unit
) {
    webView.settings.apply {
        javaScriptEnabled = true
        domStorageEnabled = true
        mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        useWideViewPort = true
        loadWithOverviewMode = true
        setSupportMultipleWindows(false)
    }

    webView.addJavascriptInterface(AndroidBridgeInterface(onMessage), "AndroidBridge")
    webView.webViewClient = WebViewClient()
}
