package com.demo.myshop.paypal

import android.webkit.WebView
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.demo.myshop.html.PayPalV6CheckoutHTML
import kotlinx.coroutines.launch

@Composable
fun PayPalV6WebViewCheckout(
    amount: Double,
    onSuccess: (orderId: String?, payerName: String?) -> Unit
) {
    var loading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        scope.launch {
            try {
                val tokens = PayPalService.getPayPalTokens()
                // tokens are passed to the HTML but we load after getting them
                loading = false
            } catch (e: Exception) {
                errorMessage = e.message
                loading = false
            }
        }
    }

    // We need tokens before rendering, so track them
    var tokens by remember { mutableStateOf<PayPalService.PayPalTokens?>(null) }

    LaunchedEffect(Unit) {
        try {
            tokens = PayPalService.getPayPalTokens()
        } catch (e: Exception) {
            errorMessage = e.message
        }
    }

    Box(Modifier.fillMaxSize()) {
        tokens?.let { t ->
            AndroidView(
                factory = { context ->
                    WebView(context).apply {
                        configurePayPalWebView(this) { msg ->
                            when (msg.type) {
                                "success" -> onSuccess(msg.orderId, msg.payerName)
                                "error" -> errorMessage = msg.message ?: "Unknown PayPal error."
                                else -> {}
                            }
                        }
                        loadDataWithBaseURL(
                            "https://www.sandbox.paypal.com",
                            PayPalV6CheckoutHTML.generate(amount, t.accessToken, t.clientToken),
                            "text/html", "UTF-8", null
                        )
                    }
                },
                modifier = Modifier.fillMaxSize()
            )
        }

        if (loading || tokens == null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color(0xFFF7F8FC)),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    CircularProgressIndicator(color = Color(0xFF003087))
                    Spacer(Modifier.height(12.dp))
                    Text("Initializing PayPal V6 SDK…", fontSize = 14.sp, color = Color.Gray)
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
