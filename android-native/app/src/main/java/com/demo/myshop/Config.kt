package com.demo.myshop

object Config {
    val paypalClientID: String = BuildConfig.PAYPAL_CLIENT_ID
    val paypalClientSecret: String = BuildConfig.PAYPAL_CLIENT_SECRET

    const val paypalBaseURL = "https://api-m.sandbox.paypal.com"
    const val paypalWebURL = "https://www.sandbox.paypal.com"

    // Deep link scheme for PopupBridge return URLs
    const val urlScheme = "myshopandroid"
}
