package com.demo.myshop.model

import androidx.compose.ui.graphics.Color

enum class PaymentMode(
    val label: String,
    val fullLabel: String,
    val color: Color,
    val pillColor: Color,
    val supportsAppSwitch: Boolean
) {
    NATIVE("📱 Native", "📱 Native REST API", Color(0xFF6C63FF), Color(0xFFEDE9FF), false),
    WEBVIEW("🌐 WebView", "🌐 WebView JS SDK", Color(0xFFE65100), Color(0xFFE3F2FD), true),
    POPUP_BRIDGE("🔗 Hybrid", "🔗 PopupBridge (Hybrid)", Color(0xFF2E7D32), Color(0xFFE8F5E9), true),
    V6("🚀 V6 SDK", "🚀 JS SDK V6", Color(0xFF003087), Color(0xFFFFF3E0), false);
}
