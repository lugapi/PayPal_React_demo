package com.demo.myshop.paypal

import android.webkit.WebView
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.demo.myshop.html.PayPalCheckoutHTML
import kotlinx.coroutines.delay

@Composable
fun PayPalWebViewCheckout(
    amount: Double,
    appSwitch: Boolean,
    onSuccess: (orderId: String?, payerName: String?) -> Unit
) {
    var loading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        delay(2000)
        loading = false
    }

    Box(Modifier.fillMaxSize()) {
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
                        "https://www.paypal.com",
                        PayPalCheckoutHTML.generate(amount, appSwitch),
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
                    CircularProgressIndicator(color = Color(0xFFE65100))
                    Spacer(Modifier.height(12.dp))
                    Text("Loading PayPal JS SDK…", fontSize = 14.sp, color = Color.Gray)
                }
            }
        }
    }

    errorMessage?.let { msg ->
        androidx.compose.material3.AlertDialog(
            onDismissRequest = { errorMessage = null },
            confirmButton = { androidx.compose.material3.TextButton(onClick = { errorMessage = null }) { Text("OK") } },
            title = { Text("PayPal Error") },
            text = { Text(msg) }
        )
    }
}
