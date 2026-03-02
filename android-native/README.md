# MyShop — Native Android (Jetpack Compose)

A native Android clone of the React Native PayPal demo app, built with **Kotlin** and **Jetpack Compose**. It showcases the same 4 PayPal integration approaches in a pure native Android context.

## Payment Modes

| Mode | Description | Key Technology |
|------|-------------|----------------|
| **Native REST API** | Server-side order creation via PayPal REST API, buyer approval in Chrome Custom Tab | `OkHttp` + `CustomTabsIntent` |
| **WebView (JS SDK V5)** | PayPal JS SDK rendered inside an Android `WebView`, full in-app experience | `WebView` + `@JavascriptInterface` |
| **PopupBridge (Hybrid)** | JS SDK in `WebView`, but buyer approval opens in a secure native browser session | `WebView` + [`popup-bridge-android`](https://github.com/braintree/popup-bridge-android) |
| **JS SDK V6** | Latest PayPal JS SDK with session-based tokenization | `WebView` + PayPal V6 Web Components |

## PopupBridge Integration

The PopupBridge mode uses the **real [`popup-bridge-android`](https://github.com/braintree/popup-bridge-android) library** (v5.1.0) from Braintree, added via Gradle.

### How it works

```
┌─────────────────────────────────────────────────────────┐
│  Android WebView                                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │  PayPal JS SDK loads                              │  │
│  │  SDK detects window.popupBridge → uses it         │  │
│  │  User taps "Pay with PayPal"                      │  │
│  │  SDK calls popupBridge.open(approvalURL)           │  │
│  └──────────────────────┬────────────────────────────┘  │
│                         │                                │
│  ┌──────────────────────▼────────────────────────────┐  │
│  │  PopupBridgeClient (native)                       │  │
│  │  Receives message via JavascriptInterface         │  │
│  │  Opens Chrome Custom Tab                          │  │
│  └──────────────────────┬────────────────────────────┘  │
└─────────────────────────┼───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│  Chrome Custom Tab (system browser)                     │
│  User logs in to PayPal with biometrics / password      │
│  PayPal redirects to myshopandroid://...                 │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│  PopupBridgeClient catches the return URL via Intent    │
│  Parses query params (token, PayerID)                   │
│  Injects JS: window.popupBridge.onComplete(null, {...}) │
│  PayPal SDK resumes onApprove → captures order          │
└─────────────────────────────────────────────────────────┘
```

### Key files

| File | Role |
|------|------|
| [`PayPalPopupBridgeCheckout.kt`](app/src/main/java/com/demo/myshop/paypal/PayPalPopupBridgeCheckout.kt) | Compose screen that creates a `WebView` and initializes `PopupBridgeClient` |
| [`PayPalPopupBridgeHTML.kt`](app/src/main/java/com/demo/myshop/html/PayPalPopupBridgeHTML.kt) | HTML template — no JS polyfill needed, the native library handles everything |
| [`AndroidManifest.xml`](app/src/main/AndroidManifest.xml) | Deep link `intent-filter` for `myshopandroid://` scheme |

## App Switch

WebView and PopupBridge modes support the **App Switch** toggle. When enabled, the PayPal JS SDK adds `appSwitchWhenAvailable: true` to the Buttons configuration.

The resume flow is handled automatically:
```javascript
if (buttons.hasReturned()) { buttons.resume(); }
else { buttons.render('#paypal-button-container'); }
```

## Project Structure

```
android-native/
├── build.gradle.kts                   # Root Gradle config
├── settings.gradle.kts                # Project settings
├── gradle.properties                  # Gradle + PayPal credentials
├── gradlew                            # Gradle wrapper script
├── app/
│   ├── build.gradle.kts               # App-level Gradle (dependencies)
│   └── src/main/
│       ├── AndroidManifest.xml        # App manifest + deep links
│       ├── res/values/
│       │   ├── themes.xml             # Material theme
│       │   └── colors.xml             # Brand colors
│       └── java/com/demo/myshop/
│           ├── MainActivity.kt        # Entry point, navigation, tabs
│           ├── Config.kt              # PayPal credentials, URL scheme
│           ├── model/
│           │   ├── Product.kt         # Product catalog
│           │   ├── CartItem.kt        # Cart item with quantity
│           │   └── PaymentMode.kt     # Enum: native, webview, popupbridge, v6
│           ├── state/
│           │   ├── CartManager.kt     # ViewModel cart state
│           │   └── AppState.kt        # ViewModel: payment mode, app switch
│           ├── ui/
│           │   ├── theme/Theme.kt     # Material 3 theme
│           │   └── screens/
│           │       ├── ProductListScreen.kt   # Product grid
│           │       ├── CartScreen.kt          # Cart with quantity controls
│           │       ├── CheckoutScreen.kt      # Checkout, mode toggle, payments
│           │       └── OrderSuccessScreen.kt  # Success with PayPal details
│           ├── paypal/
│           │   ├── PayPalService.kt             # REST API client (OkHttp)
│           │   ├── PayPalWebViewClient.kt       # WebView config + JS bridge
│           │   ├── PayPalNativeCheckout.kt      # Native REST API mode
│           │   ├── PayPalWebViewCheckout.kt     # WebView JS SDK mode
│           │   ├── PayPalPopupBridgeCheckout.kt # PopupBridge mode (real library)
│           │   └── PayPalV6WebViewCheckout.kt   # V6 SDK mode
│           └── html/
│               ├── PayPalCheckoutHTML.kt        # WebView HTML template
│               ├── PayPalPopupBridgeHTML.kt     # PopupBridge HTML template
│               └── PayPalV6CheckoutHTML.kt      # V6 HTML template
```

## Requirements

- Android Studio Hedgehog (2023.1) or later
- Android SDK 35 (API level 35)
- Min SDK 26 (Android 8.0)
- Kotlin 2.0+
- JDK 17

## Getting Started

```bash
# Open in Android Studio
open -a "Android Studio" android-native/
```

Or import the project via **File > Open** in Android Studio.

### Configure PayPal credentials

Add your sandbox credentials to `gradle.properties`:

```properties
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_client_secret
```

To prevent accidentally committing credentials:
```bash
git update-index --assume-unchanged android-native/gradle.properties
```

### Build & Run

1. Open the project in Android Studio
2. Sync Gradle (Android Studio will prompt)
3. Select an emulator or connected device
4. Run the app (Shift+F10)

## Dependencies

| Package | Version | Source | Purpose |
|---------|---------|--------|---------|
| [PopupBridge](https://github.com/braintree/popup-bridge-android) | 5.1.0 | Maven Central | Native bridge between WebView popups and Chrome Custom Tabs |
| [OkHttp](https://github.com/square/okhttp) | 4.12.0 | Maven Central | HTTP client for PayPal REST API |
| Compose BOM | 2024.12.01 | Google | Jetpack Compose UI toolkit |
| Navigation Compose | 2.8.5 | Google | Screen navigation |
| Chrome Custom Tabs | 1.8.0 | Google | Native browser for PayPal approval |

## Tech Stack

| Technology | Version |
|------------|---------|
| Kotlin | 2.0 |
| Jetpack Compose | Material 3 |
| Android WebView | WebKit |
| Chrome Custom Tabs | AndroidX Browser |
| PayPal JS SDK | V5 + V6 |
| OkHttp | 4.12 |
