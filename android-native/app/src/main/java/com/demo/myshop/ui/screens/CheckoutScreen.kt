package com.demo.myshop.ui.screens

import android.app.AlertDialog
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.demo.myshop.model.CartItem
import com.demo.myshop.model.PaymentMode
import com.demo.myshop.paypal.*
import com.demo.myshop.state.AppState

@Composable
fun CheckoutScreen(
    cartItems: List<CartItem>,
    subtotal: Double,
    appState: AppState,
    onSuccess: (orderId: String?, payerName: String?, mode: PaymentMode) -> Unit,
    onCancel: () -> Unit
) {
    val mode = appState.paymentMode
    val appSwitch = appState.appSwitchEnabled
    val context = LocalContext.current
    var showModeSheet by remember { mutableStateOf(false) }

    val shipping = 4.99
    val total = subtotal + shipping

    // Unified layout: toolbar + content that switches based on mode
    Column(modifier = Modifier.fillMaxSize()) {
        // Top bar with mode pill + app switch (always visible, like iOS toolbar)
        CheckoutTopBar(
            mode = mode,
            appSwitch = appSwitch,
            onModeTap = { showModeSheet = true },
            onAppSwitchChange = { newValue ->
                if (!mode.supportsAppSwitch) {
                    AlertDialog.Builder(context)
                        .setTitle("App Switch unavailable")
                        .setMessage("App Switch is only available with JS SDK V5 modes (WebView and PopupBridge). Switch to one of these modes to enable it.")
                        .setPositiveButton("OK", null)
                        .show()
                } else {
                    appState.appSwitchEnabled = newValue
                }
            }
        )

        // Content area — switches based on mode (key forces WebView recreation)
        key(mode, appSwitch) {
            when (mode) {
                PaymentMode.NATIVE -> NativeCheckoutForm(
                    cartItems = cartItems,
                    shipping = shipping,
                    total = total,
                    onSuccess = { orderId, payerName -> onSuccess(orderId, payerName, mode) }
                )
                PaymentMode.WEBVIEW -> PayPalWebViewCheckout(total, appSwitch) { orderId, payerName ->
                    onSuccess(orderId, payerName, mode)
                }
                PaymentMode.POPUP_BRIDGE -> PayPalPopupBridgeCheckout(total, appSwitch) { orderId, payerName ->
                    onSuccess(orderId, payerName, mode)
                }
                PaymentMode.V6 -> PayPalV6WebViewCheckout(total) { orderId, payerName ->
                    onSuccess(orderId, payerName, mode)
                }
            }
        }
    }

    // Mode selection dialog
    if (showModeSheet) {
        ModeSelectionDialog(
            currentMode = mode,
            onSelect = { appState.paymentMode = it },
            onDismiss = { showModeSheet = false }
        )
    }
}

// Native mode: full checkout form (like iOS nativeCheckout)
@Composable
private fun NativeCheckoutForm(
    cartItems: List<CartItem>,
    shipping: Double,
    total: Double,
    onSuccess: (orderId: String?, payerName: String?) -> Unit
) {
    var firstName by remember { mutableStateOf("John") }
    var lastName by remember { mutableStateOf("Smith") }
    var email by remember { mutableStateOf("john.smith@example.com") }
    var address by remember { mutableStateOf("123 Main Street") }
    var city by remember { mutableStateOf("Paris") }
    var zip by remember { mutableStateOf("75001") }
    var cardNumber by remember { mutableStateOf("4111 1111 1111 1111") }
    var cardExpiry by remember { mutableStateOf("12/28") }
    var cardCvv by remember { mutableStateOf("123") }
    var cardLoading by remember { mutableStateOf(false) }
    var showNativePayPal by remember { mutableStateOf(false) }

    if (showNativePayPal) {
        PayPalNativeCheckout(total) { orderId, payerName ->
            onSuccess(orderId, payerName)
        }
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF7F8FC))
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 📦 Order Summary
        GroupBoxSection(title = "📦 Order Summary") {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                cartItems.forEach { item ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            "${item.product.emoji} ${item.product.name} × ${item.quantity}",
                            fontSize = 13.sp,
                            color = Color.Gray
                        )
                        Text(
                            "%.2f €".format(item.subtotal),
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }

                HorizontalDivider(color = Color(0xFFE0E0E0))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Shipping", fontSize = 14.sp, color = Color.Gray)
                    Text("%.2f €".format(shipping), fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Total", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    Text("%.2f €".format(total), fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF6C63FF))
                }
            }
        }

        // 🏠 Shipping Address
        GroupBoxSection(title = "🏠 Shipping Address") {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Box(Modifier.weight(1f)) { FormField("First name", firstName) { firstName = it } }
                    Box(Modifier.weight(1f)) { FormField("Last name", lastName) { lastName = it } }
                }
                FormField("Email", email, KeyboardType.Email) { email = it }
                FormField("Address", address) { address = it }
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Box(Modifier.weight(1f)) { FormField("City", city) { city = it } }
                    Box(Modifier.weight(0.5f)) { FormField("ZIP", zip) { zip = it } }
                }
            }
        }

        // 💳 Payment
        GroupBoxSection(title = "💳 Payment") {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                FormField("Card number", cardNumber) { cardNumber = it }
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Box(Modifier.weight(1f)) { FormField("Expiry", cardExpiry) { cardExpiry = it } }
                    Box(Modifier.weight(1f)) { FormField("CVV", cardCvv, KeyboardType.Number) { cardCvv = it } }
                }
                Text(
                    "🔒 100% secure payment",
                    fontSize = 12.sp,
                    color = Color.Gray,
                    modifier = Modifier.fillMaxWidth(),
                    textAlign = TextAlign.Center
                )
            }
        }

        // PayPal button (first, like iOS)
        Button(
            onClick = { showNativePayPal = true },
            modifier = Modifier.fillMaxWidth().height(52.dp),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFFC439))
        ) {
            Text("Pay with PayPal", color = Color(0xFF003087), fontWeight = FontWeight.Bold, fontSize = 16.sp)
        }

        // OR separator
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            HorizontalDivider(Modifier.weight(1f), color = Color.Gray.copy(alpha = 0.3f))
            Text("  OR  ", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Color.Gray)
            HorizontalDivider(Modifier.weight(1f), color = Color.Gray.copy(alpha = 0.3f))
        }

        // Card submit button
        Button(
            onClick = { cardLoading = true },
            enabled = !cardLoading,
            modifier = Modifier.fillMaxWidth().height(56.dp),
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = if (cardLoading) Color(0xFFA09CFF) else Color(0xFF6C63FF)
            )
        ) {
            Text(
                if (cardLoading) "Processing..." else "💳 Pay by card %.2f €".format(total),
                fontWeight = FontWeight.Bold,
                fontSize = 17.sp
            )
        }

        // Simulate card payment completion
        LaunchedEffect(cardLoading) {
            if (cardLoading) {
                kotlinx.coroutines.delay(1500)
                cardLoading = false
                onSuccess(null, "$firstName $lastName")
            }
        }

        Spacer(Modifier.height(16.dp))
    }
}

// Top bar row with App Switch toggle + mode pill (like iOS toolbar)
@Composable
private fun CheckoutTopBar(
    mode: PaymentMode,
    appSwitch: Boolean,
    onModeTap: () -> Unit,
    onAppSwitchChange: (Boolean) -> Unit
) {
    val supported = mode.supportsAppSwitch

    Surface(
        color = Color.White,
        shadowElevation = 2.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.End
        ) {
            // App Switch toggle
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.alpha(if (supported) 1f else 0.4f)
            ) {
                Text(
                    "App Switch",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.Gray
                )
                Spacer(Modifier.width(2.dp))
                Switch(
                    checked = supported && appSwitch,
                    onCheckedChange = onAppSwitchChange,
                    modifier = Modifier.height(24.dp),
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = Color.White,
                        checkedTrackColor = Color(0xFF4CAF50)
                    )
                )
            }

            Spacer(Modifier.width(6.dp))

            // Mode pill
            Surface(
                shape = RoundedCornerShape(50),
                color = mode.pillColor,
                modifier = Modifier.clickable(onClick = onModeTap)
            ) {
                Text(
                    mode.label,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF1A1A2E)
                )
            }
        }
    }
}

// GroupBox-like section matching iOS GroupBox
@Composable
private fun GroupBoxSection(
    title: String,
    content: @Composable () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = Color.White,
        shadowElevation = 1.dp
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(
                title,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 12.dp)
            )
            content()
        }
    }
}

// Form field matching iOS FormField
@Composable
private fun FormField(
    label: String,
    value: String,
    keyboardType: KeyboardType = KeyboardType.Text,
    onValueChange: (String) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(label, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Color.Gray)
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(10.dp),
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
            singleLine = true,
            textStyle = LocalTextStyle.current.copy(fontSize = 15.sp),
            colors = OutlinedTextFieldDefaults.colors(
                unfocusedBorderColor = Color(0xFFE0E0E0),
                focusedBorderColor = Color(0xFF6C63FF),
                unfocusedContainerColor = Color(0xFFFAFAFA),
                focusedContainerColor = Color(0xFFFAFAFA)
            )
        )
    }
}

// Mode selection dialog (like iOS confirmationDialog)
@Composable
private fun ModeSelectionDialog(
    currentMode: PaymentMode,
    onSelect: (PaymentMode) -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("PayPal Integration Mode") },
        text = {
            Column {
                Text(
                    "Choose how PayPal is integrated in this demo.",
                    fontSize = 14.sp,
                    color = Color.Gray,
                    modifier = Modifier.padding(bottom = 16.dp)
                )
                PaymentMode.entries.forEach { mode ->
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                onSelect(mode)
                                onDismiss()
                            },
                        color = if (mode == currentMode) mode.pillColor else Color.Transparent,
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(
                            mode.fullLabel,
                            modifier = Modifier.padding(12.dp),
                            fontWeight = if (mode == currentMode) FontWeight.Bold else FontWeight.Normal
                        )
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}
