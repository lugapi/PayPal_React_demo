package com.demo.myshop.paypal

import android.webkit.WebView
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.braintreepayments.api.PopupBridgeClient
import com.demo.myshop.Config
import com.demo.myshop.MainActivity
import com.demo.myshop.html.PayPalPopupBridgeHTML
import kotlinx.coroutines.delay

/**
 * PopupBridge checkout using the real popup-bridge-android library.
 * PopupBridgeClient injects `window.popupBridge` into the WebView and
 * handles Chrome Custom Tabs natively when the PayPal SDK calls `popupBridge.open(url)`.
 */
@Composable
fun PayPalPopupBridgeCheckout(
    amount: Double,
    appSwitch: Boolean,
    onSuccess: (orderId: String?, payerName: String?) -> Unit
) {
    var loading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        delay(2000)
        loading = false
    }

    Box(Modifier.fillMaxSize()) {
        AndroidView(
            factory = { ctx ->
                WebView(ctx).apply {
                    configurePayPalWebView(this) { msg ->
                        when (msg.type) {
                            "success" -> onSuccess(msg.orderId, msg.payerName)
                            "error" -> errorMessage = msg.message ?: "Unknown PayPal error."
                            else -> {}
                        }
                    }

                    // Initialize PopupBridge — injects window.popupBridge and
                    // handles browser session for popup authentication.
                    val activity = ctx as? MainActivity
                    if (activity != null) {
                        val popupBridgeClient = PopupBridgeClient(
                            activity,
                            this,
                            Config.urlScheme
                        )
                        popupBridgeClient.setErrorListener { error: Exception? ->
                            errorMessage = error?.message ?: "PopupBridge error"
                        }
                        // Store reference so MainActivity can call handleReturnToApp
                        activity.popupBridgeClient = popupBridgeClient
                    }

                    loadDataWithBaseURL(
                        "https://www.paypal.com",
                        PayPalPopupBridgeHTML.generate(amount, appSwitch),
                        "text/html", "UTF-8", null
                    )
                }
            },
            modifier = Modifier.fillMaxSize()
        )

        if (loading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color(0xFFF7F8FC)),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    CircularProgressIndicator(color = Color(0xFF2E7D32))
                    Spacer(Modifier.height(12.dp))
                    Text("Loading PopupBridge…", fontSize = 14.sp, color = Color.Gray)
                }
            }
        }
    }

    errorMessage?.let { msg ->
        AlertDialog(
            onDismissRequest = { errorMessage = null },
            confirmButton = { TextButton(onClick = { errorMessage = null }) { Text("OK") } },
            title = { Text("PayPal Error") },
            text = { Text(msg) }
        )
    }
}
