package com.demo.myshop.paypal

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.browser.customtabs.CustomTabsIntent
import com.demo.myshop.Config
import kotlinx.coroutines.launch

@Composable
fun PayPalNativeCheckout(
    amount: Double,
    onSuccess: (orderId: String?, payerName: String?) -> Unit
) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var loading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var pendingOrderId by remember { mutableStateOf<String?>(null) }

    // Handle return from browser
    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) {
        pendingOrderId?.let { orderId ->
            scope.launch {
                try {
                    val captured = PayPalService.captureOrder(orderId)
                    if (captured) onSuccess(orderId, null)
                    else errorMessage = "Payment capture failed."
                } catch (e: Exception) {
                    errorMessage = e.message ?: "Capture error"
                } finally {
                    loading = false
                }
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF7F8FC))
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("Total to pay", fontSize = 18.sp, color = Color(0xFF555555))
        Spacer(Modifier.height(6.dp))
        Text(
            "%.2f €".format(amount),
            fontSize = 40.sp, fontWeight = FontWeight.ExtraBold,
            color = Color(0xFF1A1A2E), letterSpacing = (-1).sp
        )
        Spacer(Modifier.height(28.dp))

        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column(Modifier.padding(20.dp)) {
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = Color(0xFFEDE7F6)
                ) {
                    Text(
                        "🔐 Native — REST API (Android)",
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp),
                        fontSize = 12.sp, fontWeight = FontWeight.Bold,
                        color = Color(0xFF6C63FF)
                    )
                }
                Spacer(Modifier.height(18.dp))

                Button(
                    onClick = {
                        loading = true
                        scope.launch {
                            try {
                                val orderId = PayPalService.createOrder(amount)
                                pendingOrderId = orderId
                                val approvalUrl = PayPalService.getApprovalUrl(orderId)

                                val intent = CustomTabsIntent.Builder().build()
                                intent.launchUrl(context, Uri.parse(approvalUrl))
                            } catch (e: Exception) {
                                errorMessage = e.message ?: "Error creating order"
                                loading = false
                            }
                        }
                    },
                    enabled = !loading,
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFFC439))
                ) {
                    if (loading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(24.dp),
                            color = Color(0xFF003087), strokeWidth = 2.dp
                        )
                    } else {
                        Text("Pay with PayPal", color = Color(0xFF003087), fontWeight = FontWeight.Bold)
                    }
                }

                Spacer(Modifier.height(14.dp))
                Text(
                    "Order created via REST API.\nApproval in Chrome Custom Tab.",
                    fontSize = 12.sp, color = Color(0xFF999999),
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }

        Spacer(Modifier.height(12.dp))
        OutlinedButton(
            onClick = { /* cancel handled by navigation */ },
            modifier = Modifier.fillMaxWidth().height(50.dp),
            shape = RoundedCornerShape(12.dp)
        ) {
            Text("Cancel", color = Color(0xFF999999))
        }

        Spacer(Modifier.height(20.dp))
        Text("🔒 Secured by PayPal", fontSize = 12.sp, color = Color(0xFFBBBBBB))
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
