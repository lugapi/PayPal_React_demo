# MyShop — Native iOS (SwiftUI)

A native iOS clone of the React Native PayPal demo app, built with **SwiftUI** and **Swift 6**. It showcases the same 4 PayPal integration approaches in a pure native context.

## Payment Modes

| Mode | Description | Key Technology |
|------|-------------|----------------|
| **Native REST API** | Server-side order creation via PayPal REST API, buyer approval in `ASWebAuthenticationSession` | `URLSession` + `ASWebAuthenticationSession` |
| **WebView (JS SDK V5)** | PayPal JS SDK rendered inside a `WKWebView`, full in-app experience | `WKWebView` + `WKScriptMessageHandler` |
| **PopupBridge (Hybrid)** | JS SDK in `WKWebView`, but buyer approval opens in a secure native browser session | `WKWebView` + [`popup-bridge-ios`](https://github.com/braintree/popup-bridge-ios) |
| **JS SDK V6** | Latest PayPal JS SDK with session-based tokenization | `WKWebView` + PayPal V6 Web Components |

## PopupBridge Integration

The PopupBridge mode uses the **real [`popup-bridge-ios`](https://github.com/braintree/popup-bridge-ios) library** (v3.0.0) from Braintree, added via Swift Package Manager.

### How it works

```
┌─────────────────────────────────────────────────────────┐
│  WKWebView                                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │  PayPal JS SDK loads                              │  │
│  │  SDK detects window.popupBridge → uses it         │  │
│  │  User taps "Pay with PayPal"                      │  │
│  │  SDK calls popupBridge.open(approvalURL)           │  │
│  └──────────────────────┬────────────────────────────┘  │
│                         │                                │
│  ┌──────────────────────▼────────────────────────────┐  │
│  │  POPPopupBridge (native)                          │  │
│  │  Receives message via WKScriptMessageHandler      │  │
│  │  Opens ASWebAuthenticationSession                 │  │
│  └──────────────────────┬────────────────────────────┘  │
└─────────────────────────┼───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│  ASWebAuthenticationSession (system browser)            │
│  User logs in to PayPal with biometrics / password      │
│  PayPal redirects to popupbridgev1://popupbridgev1/...  │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│  POPPopupBridge catches the return URL                  │
│  Parses query params (token, PayerID)                   │
│  Injects JS: window.popupBridge.onComplete(null, {...}) │
│  PayPal SDK resumes onApprove → captures order          │
└─────────────────────────────────────────────────────────┘
```

### What `POPPopupBridge` does under the hood

1. **Injects JavaScript** at document start — creates `window.popupBridge` with:
   - `getReturnUrlPrefix()` — returns `popupbridgev1://popupbridgev1/`
   - `open(url)` — posts a message to the native `WKScriptMessageHandler`
   - `onComplete` — callback invoked by the native side after authentication

2. **Intercepts popup requests** — When the PayPal JS SDK calls `popupBridge.open(url)`, the native handler receives the URL and opens an `ASWebAuthenticationSession`.

3. **Handles the return** — When PayPal redirects back to the `popupbridgev1://` scheme, `ASWebAuthenticationSession` catches it. `POPPopupBridge` parses the URL components and injects a JS call to `window.popupBridge.onComplete(null, { path, queryItems, hash })`.

4. **SDK completes the flow** — The PayPal SDK receives the parsed token/PayerID via `onComplete`, proceeds to the `onApprove` callback, and captures the order.

### Key files

| File | Role |
|------|------|
| [`PayPalPopupBridgeCheckout.swift`](MyShop/PayPal/PayPalPopupBridgeCheckout.swift) | SwiftUI view that creates a `WKWebView` and initializes `POPPopupBridge` |
| [`PayPalPopupBridgeHTML.swift`](MyShop/HTML/PayPalPopupBridgeHTML.swift) | HTML template with PayPal JS SDK — no JS polyfill needed, the native library handles everything |
| [`project.yml`](project.yml) | XcodeGen config with `PopupBridge` SPM dependency |

### Why PopupBridge?

The standard `WKWebView` cannot handle `window.open()` popups or cross-origin redirects that the PayPal JS SDK relies on for buyer authentication. PopupBridge solves this by:

- Bridging `window.open()` calls to a native `ASWebAuthenticationSession`
- Providing a secure, system-managed browser session (with access to Safari cookies / passkeys)
- Returning parsed URL parameters back to the web page seamlessly

This is the **recommended approach** for hybrid apps that embed the PayPal JS SDK in a WebView on iOS.

## App Switch

All applicable modes (WebView and PopupBridge) support the **App Switch** toggle. When enabled, the PayPal JS SDK adds `appSwitchWhenAvailable: true` to the Buttons configuration, which redirects the buyer to the native PayPal app for authentication (biometrics / passkey) instead of the in-WebView login.

The resume flow is handled automatically:
```javascript
if (buttons.hasReturned()) { buttons.resume(); }
else { buttons.render('#paypal-button-container'); }
```

## Project Structure

```
ios-native/
├── project.yml                          # XcodeGen project definition
├── MyShop/
│   ├── MyShopApp.swift                  # App entry point, TabView
│   ├── Config.swift                     # PayPal credentials, URL scheme
│   ├── Info.plist                       # URL scheme (myshopnative://), ATS
│   ├── Models/
│   │   ├── Product.swift                # Product catalog
│   │   ├── CartItem.swift               # Cart item with quantity
│   │   └── PaymentMode.swift            # Enum: native, webview, popupbridge, v6
│   ├── State/
│   │   ├── CartManager.swift            # @Observable cart state
│   │   └── AppState.swift               # @Observable: payment mode, app switch
│   ├── Views/
│   │   ├── ProductListView.swift        # Product grid with add-to-cart
│   │   ├── CartView.swift               # Cart with quantity controls
│   │   ├── CheckoutView.swift           # Checkout form, mode toggle, payments
│   │   └── OrderSuccessView.swift       # Order confirmation with PayPal details
│   ├── PayPal/
│   │   ├── PayPalService.swift          # REST API: tokens, create/capture order
│   │   ├── PayPalWebView.swift          # WKWebView wrapper + message handler
│   │   ├── PayPalNativeButton.swift     # Native REST API mode
│   │   ├── PayPalWebViewCheckout.swift  # WebView JS SDK mode
│   │   ├── PayPalPopupBridgeCheckout.swift  # PopupBridge mode (real library)
│   │   └── PayPalV6WebViewCheckout.swift    # V6 SDK mode
│   └── HTML/
│       ├── PayPalCheckoutHTML.swift      # WebView HTML template
│       ├── PayPalPopupBridgeHTML.swift   # PopupBridge HTML template
│       └── PayPalV6CheckoutHTML.swift    # V6 HTML template
```

## Requirements

- Xcode 16+
- iOS 17.0+
- Swift 6.0
- [XcodeGen](https://github.com/yonaskolb/XcodeGen) (for project generation)

## Getting Started

```bash
# Install XcodeGen if needed
brew install xcodegen

# Generate the Xcode project
cd ios-native
xcodegen generate

# Open in Xcode
open MyShop.xcodeproj
```

Configure your PayPal sandbox credentials in [`Config.swift`](MyShop/Config.swift) or set environment variables:
```
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_client_secret
```

## Dependencies

| Package | Version | Source | Purpose |
|---------|---------|--------|---------|
| [PopupBridge](https://github.com/braintree/popup-bridge-ios) | 3.0.0+ | SPM | Native bridge between WKWebView popups and ASWebAuthenticationSession |

## Tech Stack

| Technology | Version |
|------------|---------|
| Swift | 6.0 |
| SwiftUI | iOS 17+ |
| WKWebView | WebKit |
| ASWebAuthenticationSession | AuthenticationServices |
| PayPal JS SDK | V5 + V6 |
| XcodeGen | Project generation |
