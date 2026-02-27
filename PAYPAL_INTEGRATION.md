# PayPal Integration — Deep-Dive Technical Documentation

This document covers the architecture, trade-offs, and implementation details of the **four PayPal integration modes** in myshop. It is intended for developers who want to understand why each mode works the way it does, what its limitations are, and how to evolve toward a production-ready setup.

---

## Table of Contents

1. [Background — Why four modes?](#1-background--why-four-modes)
2. [Mode 1 — Native REST API](#2-mode-1--native-rest-api)
3. [Mode 2 — WebView JS SDK (V5)](#3-mode-2--webview-js-sdk-v5)
4. [Mode 3 — PopupBridge Hybrid](#4-mode-3--popupbridge-hybrid)
5. [Mode 4 — JS SDK V6](#5-mode-4--js-sdk-v6)
6. [What popup-bridge-ios actually does](#6-what-popup-bridge-ios-actually-does)
7. [Our JS simulation vs. the real library](#7-our-js-simulation-vs-the-real-library)
8. [Path to a fully native PopupBridge integration in a React Native app](#8-path-to-a-fully-native-popupbridge-integration-in-a-react-native-app)
9. [How to integrate the real PopupBridge in a React (web) app](#9-how-to-integrate-the-real-popupbridge-in-a-react-web-app)
10. [Production architecture recommendations](#10-production-architecture-recommendations)

---

## 1. Background — Why four modes?

Integrating PayPal into a React Native app involves a fundamental tension between two concerns.

**Security of the approval step.** The PayPal login page — where the user enters their PayPal email and password — must be displayed in a trusted browser context that shows an HTTPS address bar. `ASWebAuthenticationSession` on iOS and Chrome Custom Tabs on Android fulfill this requirement. A bare WKWebView does not: it has no visible address bar, making it impossible for the user to verify they are on `paypal.com` and not a spoofed page. PayPal's own policies prohibit loading the approval URL inside an in-app WebView.

**Flexibility of order creation.** PayPal offers two ways to create orders: the REST API (requires a `CLIENT_SECRET`) and the JavaScript SDK (requires only a `CLIENT_ID`). The REST API gives the server full control over amounts and validation but requires your secret to be present at creation time. The JS SDK is simpler but normally runs entirely in the browser.

The four modes each make a different choice along both axes:

| | Order creation | Approval UI | Capture |
|---|---|---|---|
| **Native REST API** | REST API (RN side, `CLIENT_SECRET` needed) | `ASWebAuthenticationSession` ✅ | REST API (RN side) |
| **WebView JS SDK V5** | PayPal JS SDK (browser, `CLIENT_ID` only) | WKWebView ⚠️ | PayPal JS SDK (browser) |
| **PopupBridge Hybrid** | PayPal JS SDK (browser, `CLIENT_ID` only) | `ASWebAuthenticationSession` ✅ | REST API (RN side) + JS SDK fallback |
| **JS SDK V6** | REST API (WebView, `CLIENT_SECRET` needed) | SDK popup (WebView) | REST API (WebView) |

---

## 2. Mode 1 — Native REST API

### What it does

The entire payment flow runs on the React Native side using `fetch()` calls to the PayPal Orders REST API v2. No WebView is involved.

```
RN app
  │
  ├─ POST /v2/checkout/orders          → PayPal API (creates order, gets approve URL)
  │     Authorization: Basic base64(CLIENT_ID:CLIENT_SECRET)
  │
  ├─ ASWebAuthenticationSession         → opens approve URL in Safari sheet
  │     deep-link return: myshop://paypal-return?token=ORDER_ID
  │
  └─ POST /v2/checkout/orders/{id}/capture → PayPal API (captures funds)
```

### Why `CLIENT_SECRET` is in the app — and why this is a problem

The REST API requires HTTP Basic authentication with `CLIENT_ID:CLIENT_SECRET`. In this demo the secret is hardcoded in the TypeScript source. **This is only acceptable for local development.** In production, any secret embedded in a mobile app binary can be extracted by a determined attacker using tools like `strings`, `Frida`, or a network proxy. If the secret is compromised, an attacker can create and capture orders on your behalf.

**The correct approach** is to move every REST API call to a server you control:

```
RN app  ──POST /api/create-order──>  Your backend  ──POST /v2/checkout/orders──>  PayPal
RN app  ──POST /api/capture──>       Your backend  ──POST /v2/checkout/orders/{id}/capture──>  PayPal
```

The backend holds the `CLIENT_SECRET`; the app only ever receives the approval URL and the capture result.

### Deep-link callback

After `ASWebAuthenticationSession` opens the approval URL, PayPal redirects the user to the return URL you specified when creating the order (e.g. `https://example.com/paypal-return` or a custom scheme like `myshop://paypal-return`). `openAuthSessionAsync` captures this redirect and resolves its promise with the final URL, which contains `token=ORDER_ID` in the query string. The app then uses that token to call the capture endpoint.

### Pros and cons

| Pros | Cons |
|---|---|
| No WebView, fully native UX | `CLIENT_SECRET` required at order-creation time |
| Approval in trusted browser (ASWebAuth) | Secret cannot safely live in the mobile app |
| Full control over order data | Requires a backend proxy for production |

---

## 3. Mode 2 — WebView JS SDK (V5)

### What it does

A full HTML page with the PayPal JavaScript SDK is loaded inside a React Native `WebView`. The SDK renders the official PayPal Smart Buttons. When the user taps the PayPal button, the SDK normally opens a popup; inside the WebView, `window.open()` is intercepted and the popup URL is opened in the same WebView (via `createWindow: true` on Android or a second WebView on iOS). The entire approval flow happens inside the WebView.

```
WebView (HTML page)
  │
  ├─ <script src="https://www.paypal.com/sdk/js?client-id=...">
  │
  ├─ paypal.Buttons({ createOrder, onApprove }).render('#paypal-button-container')
  │
  ├─ User taps button → SDK tries window.open(approvalUrl)
  │     ↓ intercepted by our window.open override
  │     ↓ opens URL inside same WebView (or sends message to RN)
  │
  └─ onApprove({ orderID }) → SDK calls capture internally or RN receives orderID
```

### HTML page structure

The HTML is generated by `paypalWebViewHtml.ts` and embedded as a string into the WebView's `source={{ html: ... }}` prop. The key sections are:

1. **`window.popupBridge` stub** — An empty object is injected at the top so the SDK does not crash when it probes for PopupBridge support.
2. **`window.open` override** — Sends an `OPEN_URL` message to React Native. React Native then calls `WebBrowser.openBrowserAsync()` (not `openAuthSessionAsync`) so the URL opens in a simple in-app browser without a deep-link callback requirement.
3. **`paypal.Buttons()`** — The real SDK renders the button. `createOrder` creates the order via the REST API and returns the order ID. `onApprove` calls `actions.order.capture()` (which uses the SDK's built-in REST call).

### The address bar problem

When the SDK opens the approval URL inside the WebView, the user sees a WebView frame with no address bar. This violates PayPal's terms of service and removes the user's ability to verify the URL. In a production app, PayPal may reject or sandbox your app for this reason. Mode 3 (PopupBridge) solves this.

### Communication between the WebView and React Native

The WebView communicates to RN by calling `window.ReactNativeWebView.postMessage(JSON.stringify(payload))`. React Native reads this via the `onMessage` prop. In the other direction, RN injects JavaScript into the WebView with `webViewRef.current.injectJavaScript(code)`.

### Pros and cons

| Pros | Cons |
|---|---|
| No `CLIENT_SECRET` needed | Approval in WebView, no address bar ⚠️ |
| Real PayPal Smart Buttons | Violates PayPal ToS for production |
| Simplest to set up | No deep-link support for popup |

---

## 4. Mode 3 — PopupBridge Hybrid

### Concept

Mode 3 renders the exact same HTML page as Mode 2 (real PayPal JS SDK, real Smart Buttons) but adds two key injections **before** the SDK script loads:

1. **`window.popupBridge`** — A polyfill that tells the SDK "this environment supports PopupBridge; use my `open()` method instead of `window.open()` to display the approval popup."
2. **`window.open` override** — A fallback for SDKs that do not respect `window.popupBridge.open`.

When the SDK needs to show the approval page it calls `window.popupBridge.open(url)` (or `window.open(url)`). Instead of opening a browser tab that the WebView cannot manage, both paths send a message to React Native. RN then opens the URL in **`expo-web-browser.openAuthSessionAsync()`**, which maps to `ASWebAuthenticationSession` on iOS — a proper system browser sheet with a visible address bar.

### Message flow

```
WebView HTML
  │
  ├─ inject BEFORE SDK:
  │     window.popupBridge.open = (url) => postMessage({ type: 'popup_open', url })
  │     window.open = (url) => postMessage({ type: 'popup_open', url })   // fallback
  │
  ├─ paypal.Buttons().render('#container')
  │
  └─ User taps button
        ↓
        SDK calls window.popupBridge.open(approvalUrl)
              ↓
        postMessage({ type: 'popup_open', url: 'https://www.paypal.com/checkoutnow?token=...' })

React Native (PayPalPopupBridgeCheckout.tsx)
  │
  ├─ receives 'popup_open' message
  │
  ├─ WebBrowser.openAuthSessionAsync(approvalUrl, 'myshop://')
  │     ↓ iOS opens ASWebAuthenticationSession
  │     ↓ User logs in, approves
  │     ↓ PayPal redirects to myshop://paypal-return?token=ORDER_ID&...
  │
  ├─ parse ORDER_ID from return URL
  │
  ├─ attempt 1: inject window.onPopupBridgeComplete(returnUrl)
  │     ↓ SDK may call onApprove() internally → SDK captures via REST
  │
  └─ attempt 2 (fallback): POST /v2/checkout/orders/{ORDER_ID}/capture directly from RN
```

### Why two capture paths?

The PayPal JS SDK's support for `window.popupBridge.onComplete` is not publicly documented and varies by SDK version. In some versions, calling `popupBridge.onComplete(null, returnUrl)` causes the SDK to parse the return URL, extract the order ID, and call the `onApprove` callback — which then lets the SDK's `actions.order.capture()` handle the capture. In other versions the SDK ignores `onComplete`. The RN-side REST capture is therefore always attempted as a fallback to guarantee the order is captured regardless of SDK behavior.

### popupBridge polyfill in detail

```javascript
// Injected into the WebView BEFORE the PayPal SDK <script> tag loads

window.popupBridge = {
  // Tell the SDK what scheme to use for the return URL
  getReturnUrlPrefix: function() {
    return 'myshop://';
  },

  // Called by the SDK instead of window.open() when PopupBridge is detected
  open: function(url) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({ type: 'popup_open', url: url })
    );
    // Return undefined — the SDK does not expect a Window object here
  },

  // The SDK may set this callback; we call it after ASWebAuth completes
  // onComplete: function(err, url) { ... }   ← set by the SDK, called by us
};

// Fallback: some SDK versions ignore popupBridge and use window.open directly
var _nativeOpen = window.open;
window.open = function(url, name, features) {
  if (url && url.indexOf('paypal.com') !== -1) {
    window.popupBridge.open(url);
    // Return a fake Window object to prevent SDK crashes
    return {
      closed: false,
      close: function() {},
      location: { href: url }
    };
  }
  return _nativeOpen.apply(window, arguments);
};
```

### Pros and cons

| Pros | Cons |
|---|---|
| Real PayPal Smart Buttons | Simulates PopupBridge in JS, not native |
| Approval in ASWebAuthenticationSession ✅ | Dual capture path adds complexity |
| No `CLIENT_SECRET` for order creation | `CLIENT_SECRET` still needed for fallback capture |
| Closest to production-quality among the three | Requires a backend proxy for production |

---

## 5. Mode 4 — JS SDK V6

### What it does

The PayPal JS SDK V6 is a **complete rewrite** of the integration experience. It replaces the V5 callback-based `paypal.Buttons()` API with a modern, session-based architecture using native web components.

The HTML page is loaded in a WebView (like Modes 2 & 3), but the SDK and API patterns are entirely different:

```
RN component mount
  │
  ├─ getPayPalTokens()
  │     POST /v1/oauth2/token (grant_type=client_credentials, response_type=client_token, intent=sdk_init)
  │     ◄── { access_token (used as clientToken for SDK) }
  │
  ├─ render <WebView source={{ html }} />
  │
  WebView (HTML page)
    │
    ├─ <script src="sandbox.paypal.com/web-sdk/v6/core">
    │
    ├─ paypal.createInstance({ clientToken, components: ['paypal-payments'] })
    │
    ├─ findEligibleMethods({ currencyCode: 'EUR' })
    │     └─ isEligible('paypal') → true/false
    │
    ├─ createPayPalOneTimePaymentSession({ onApprove, onCancel, onError })
    │
    ├─ <paypal-button type="pay">   ← native web component (not paypal.Buttons())
    │     └─ click → session.start({ presentationMode: 'auto' }, createOrder())
    │
    ├─ createOrder()
    │     POST /v2/checkout/orders (with Bearer accessToken)
    │     ◄── { id: ORDER_ID }
    │     return { orderId: ORDER_ID }
    │
    ├─ [SDK opens approval popup — user logs in & approves]
    │
    ├─ onApprove({ orderId })
    │     POST /v2/checkout/orders/{orderId}/capture (with Bearer accessToken)
    │     ◄── { status: 'COMPLETED', payer: {...} }
    │
    └─ postMessage({ type: 'success', orderId, payerName })
          └─ RN navigates to /order-success
```

### Key architectural differences from V5

| Aspect | JS SDK V5 (Modes 2 & 3) | JS SDK V6 (Mode 4) |
|---|---|---|
| **SDK script URL** | `paypal.com/sdk/js?client-id=...` | `sandbox.paypal.com/web-sdk/v6/core` |
| **Authentication** | `CLIENT_ID` in script URL | `clientToken` (JWT) from OAuth endpoint |
| **Button rendering** | `paypal.Buttons({...}).render('#container')` | `<paypal-button type="pay">` web component |
| **Initialization** | Implicit when script loads | Explicit: `paypal.createInstance()` |
| **Eligibility** | Implicit | Explicit: `findEligibleMethods()` |
| **Payment flow** | `createOrder` / `onApprove` callbacks | Session-based: `createPayPalOneTimePaymentSession()` + `session.start()` |
| **Order creation** | `actions.order.create()` (client-side, no secret) | REST API call (requires `accessToken`) |
| **Capture** | `actions.order.capture()` (client-side) | REST API call (requires `accessToken`) |
| **Presentation** | SDK manages popup internally | `presentationMode`: `'auto'`, `'popup'`, `'modal'`, `'redirect'` |

### The clientToken — how it works

The V6 SDK requires a `clientToken` for initialization. This is **not** the Braintree client token from `/v1/identity/generate-token` (which is a base64-encoded JSON blob). It is the `access_token` returned by:

```
POST /v1/oauth2/token
Authorization: Basic base64(CLIENT_ID:CLIENT_SECRET)
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&response_type=client_token&intent=sdk_init&domains[]=example.com
```

The `response_type=client_token` and `intent=sdk_init` parameters tell PayPal to return an access token formatted as a JWT that the V6 SDK accepts. The response contains a standard `access_token` field — this is used as the `clientToken` parameter in `paypal.createInstance()`.

### Implementation files

- **RN component:** `components/PayPalV6WebViewCheckout.tsx` — fetches tokens on mount, renders WebView
- **HTML template:** `utils/paypalV6CheckoutHtml.ts` — V6 SDK init, session, button, order create/capture
- **Token helper:** `utils/paypal.ts` → `getPayPalTokens()` — returns `{ accessToken, clientToken }`

### Pros and cons

| Pros | Cons |
|---|---|
| Modern session-based architecture | Requires `CLIENT_SECRET` for token and order management |
| Native web components (`<paypal-button>`) | More complex initialization (token → createInstance → eligibility → session) |
| Explicit eligibility checking | V6 is still in limited release at PayPal |
| Multiple presentation modes (auto, popup, modal, redirect) | Heavier setup than V5 for simple integrations |
| Server-side order management by design | |

---

## 6. What popup-bridge-ios actually does

[`popup-bridge-ios`](https://github.com/braintree/popup-bridge-ios) is a Swift/Objective-C library from Braintree (PayPal's parent company). It is designed to be used with a `WKWebView` in a native iOS app. Here is what it does at each layer:

### Native layer (Swift/ObjC)

The library provides a class — typically `BTPopupBridge` — that takes a reference to your `WKWebView` and sets itself as the view's `WKUIDelegate`. The `WKUIDelegate` protocol includes the method:

```swift
func webView(
  _ webView: WKWebView,
  createWebViewWith configuration: WKWebViewConfiguration,
  for navigationAction: WKNavigationAction,
  windowFeatures: WKWindowFeatures
) -> WKWebView?
```

This delegate method is called by the OS whenever JavaScript running in the WebView calls `window.open()`. Instead of opening a new WKWebView (the default behavior), `BTPopupBridge` intercepts the call and:

1. Stores the URL.
2. Opens it in `ASWebAuthenticationSession` (on iOS 12+) or `SFAuthenticationSession` (iOS 11).
3. Passes its own custom URL scheme (or a universal link) as the `callbackURLScheme`.

When `ASWebAuthenticationSession` calls back with a URL matching the scheme, the library:

1. Calls `webView.evaluateJavaScript("window.popupBridge.onComplete(null, '\(returnUrl)')")`.
2. The JS-side `popupBridge.onComplete` handler (set by the PayPal SDK) processes the return URL and continues the checkout flow.

### JS layer (injected by the library)

The library also injects a small JavaScript snippet into the WKWebView (via `WKUserScript` before page load). This snippet defines `window.popupBridge` with the `getReturnUrlPrefix()` and `open()` methods that the PayPal SDK knows to look for. The `open()` method in the injected script simply calls back into the native layer via a `WKScriptMessageHandler` message — this is analogous to `window.ReactNativeWebView.postMessage()` but using WebKit's native message-passing channel.

### Why this is more robust than our JS simulation

| Aspect | popup-bridge-ios | Our JS simulation |
|---|---|---|
| Intercept point | OS-level (`WKUIDelegate`) | JS-level (`window.open` override) |
| Can be bypassed by SDK? | No — the OS intercepts before JS | Yes — if SDK uses an iframe or other technique |
| `window.popupBridge` injection | Via `WKUserScript` (before page load, guaranteed) | Via HTML string prepended to page |
| ASWebAuth integration | Native Swift call | `expo-web-browser` JS wrapper |
| Result injection | `evaluateJavaScript()` from native | `injectJavaScript()` from RN (equivalent) |

---

## 7. Our JS simulation vs. the real library

### Why we cannot use popup-bridge-ios in Expo managed workflow

`popup-bridge-ios` is a native iOS library. To use it in a React Native project you need to:

1. Have access to the Xcode project (`ios/` directory).
2. Add the library via Swift Package Manager or CocoaPods.
3. Write a native module (or use a config plugin) that:
   - Creates a `WKWebView` configured with a `BTPopupBridge` delegate.
   - Exposes the WebView to React Native (e.g. as a custom `RCTViewManager`).

In **Expo managed workflow** there is no `ios/` directory — Expo generates it at build time. You cannot directly edit native files. This is why we simulate the behavior in JavaScript/TypeScript instead.

### Feature comparison

| Feature | Real popup-bridge-ios | Our simulation |
|---|---|---|
| Works in Expo managed workflow | No | Yes |
| Requires Xcode / native build | Yes | No |
| Intercepts `window.open` before JS runs | Yes | No (JS override, same-turn) |
| Handles SDK iframe popups | Possibly | No |
| Handles SDK that ignores `popupBridge` | Yes (OS intercept) | Partially (window.open override) |
| Approval in ASWebAuthenticationSession | Yes | Yes (via expo-web-browser) |
| Deep-link callback | Yes | Yes (Expo Linking) |

### Practical impact

For the PayPal JS SDK (as of 2024–2025), the JS simulation works reliably because:

- The SDK checks for `window.popupBridge` before calling `window.open`.
- Our polyfill is injected before the SDK script loads.
- The SDK does call `window.popupBridge.open()` when the polyfill is present.

The simulation would fail if PayPal changed the SDK to use a technique that bypasses both `window.popupBridge` and `window.open` overrides (e.g. a hidden `<a target="_blank">` click, a service worker redirect, or a `window.location` change). The native library is immune to all of these because the interception happens at the OS level.

---

## 8. Path to a fully native PopupBridge integration in a React Native app

If you want to use the real `popup-bridge-ios` library in a React Native project, here is the complete path.

### Step 1 — Eject from Expo managed workflow

```bash
npx expo prebuild
```

This generates the `ios/` and `android/` directories. From this point on you manage native dependencies yourself (via `pod install` for iOS). You lose the ability to use Expo Go for testing but gain full native control.

> **Warning:** Prebuild is one-way. Reverting to managed workflow requires deleting the generated directories and is generally impractical once you have native customizations.

### Step 2 — Add popup-bridge-ios via CocoaPods

In `ios/Podfile`, add:

```ruby
pod 'PopupBridge', '~> 1.0'
```

Then run:

```bash
cd ios && pod install
```

### Step 3 — Write a native module

Create `ios/PayPalPopupBridge/PayPalPopupBridgeModule.swift`:

```swift
import Foundation
import React
import WebKit
import PopupBridge  // from the pod

@objc(PayPalPopupBridgeModule)
class PayPalPopupBridgeModule: RCTViewManager {

  override func view() -> UIView! {
    let webView = WKWebView()
    let popupBridge = BTPopupBridge(webView: webView, returnURLScheme: "myshop")
    popupBridge.delegate = self
    // Store references so RCTViewManager can inject JS / receive messages
    return webView
  }

  override static func requiresMainQueueSetup() -> Bool { true }
}

extension PayPalPopupBridgeModule: BTPopupBridgeDelegate {
  func popupBridge(_ bridge: BTPopupBridge, requestsPresentationOf viewController: UIViewController) {
    // Present the ASWebAuthenticationSession view controller
    RCTPresentedViewController()?.present(viewController, animated: true)
  }
  func popupBridge(_ bridge: BTPopupBridge, requestsDismissalOf viewController: UIViewController) {
    viewController.dismiss(animated: true)
  }
}
```

This is a simplified skeleton. A production implementation would also need to expose methods to the JS side (`loadURL`, `injectJavaScript`, `onMessage`) and bridge the `popupBridge.onComplete` callback back to React Native.

### Step 4 — Register the module (ObjC bridge file)

Create `ios/PayPalPopupBridge/PayPalPopupBridgeModule.m`:

```objc
#import <React/RCTBridgeModule.h>
#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(PayPalPopupBridgeModule, RCTViewManager)
RCT_EXTERN_METHOD(loadURL:(NSString *)url)
@end
```

### Step 5 — Use in React Native

```tsx
import { requireNativeComponent } from 'react-native';

const PayPalWebView = requireNativeComponent('PayPalPopupBridgeModule');

export function PayPalNativeCheckout() {
  return (
    <PayPalWebView
      style={{ flex: 1 }}
      onMessage={(e) => console.log(e.nativeEvent.data)}
    />
  );
}
```

### Alternative: write an Expo Config Plugin

Instead of manually editing native files, you can write a config plugin that modifies the generated `ios/` directory during `expo prebuild`. The plugin would:

1. Add `PopupBridge` to the Podfile.
2. Copy the Swift/ObjC bridge files into the Xcode project.
3. Register the native module.

This approach is compatible with EAS Build and avoids manually maintaining native files. See the [Expo Config Plugins guide](https://docs.expo.dev/config-plugins/introduction/) for details.

---

## 9. How to integrate the real PopupBridge in a React (web) app

This section addresses a different scenario: a **React web application** (not React Native) running in a browser, where you want to use the PayPal JS SDK with the PopupBridge pattern.

In a web context, the concept of "PopupBridge" as a native library does not apply — there is no WKWebView to configure. However, the PayPal JS SDK's popup approval flow can still be customized.

### The standard web flow

In a normal web app, when the user clicks the PayPal button the SDK calls `window.open(approvalUrl)` and opens a popup window on the same origin. This popup is a real browser popup — it has an address bar and is subject to popup blockers.

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID"></script>
</head>
<body>
  <div id="paypal-button-container"></div>
  <script>
    paypal.Buttons({
      createOrder: function(data, actions) {
        return actions.order.create({
          purchase_units: [{ amount: { value: '9.99' } }]
        });
      },
      onApprove: function(data, actions) {
        return actions.order.capture().then(function(details) {
          alert('Transaction completed by ' + details.payer.name.given_name);
        });
      }
    }).render('#paypal-button-container');
  </script>
</body>
</html>
```

This works out of the box in a standard web browser and is the **recommended approach for web apps**. No PopupBridge library is needed.

### When you might want a PopupBridge-like pattern on web

The PopupBridge pattern becomes relevant on web in two specific scenarios:

**Scenario A: Your React app is loaded inside a WebView in a native mobile app.**
This is exactly our Mode 3 scenario. The "native app" wraps a React web app in a WKWebView/Android WebView, and the PopupBridge library on the native side intercepts `window.open()` calls from the web app and routes them through `ASWebAuthenticationSession`. From the web app's perspective, it just calls `window.open()` as normal; the native layer handles the rest.

**Scenario B: You want to replace the popup with a redirect flow.**
Some web apps (especially mobile web apps where popups are blocked) use PayPal's redirect flow instead of the popup flow. In this case the PayPal button redirects the entire page to the approval URL, and PayPal redirects back to your `return_url` after approval.

To force the redirect flow with the JS SDK:

```javascript
paypal.Buttons({
  // Disable the popup, force redirect
  fundingSource: paypal.FUNDING.PAYPAL,
  createOrder: function(data, actions) {
    return actions.order.create({
      purchase_units: [{ amount: { value: '9.99' } }],
      application_context: {
        return_url: 'https://yourapp.com/paypal-return',
        cancel_url: 'https://yourapp.com/paypal-cancel'
      }
    });
  },
  // onApprove is called when PayPal redirects back
  onApprove: function(data, actions) {
    return actions.order.capture();
  }
}).render('#paypal-button-container');
```

### Integrating PayPal in a React component (web)

```tsx
// PayPalButton.tsx
import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    paypal: any;
  }
}

interface Props {
  amount: string;
  onSuccess: (details: any) => void;
  onError: (error: any) => void;
}

export function PayPalButton({ amount, onSuccess, onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendered = useRef(false);

  useEffect(() => {
    if (rendered.current || !containerRef.current || !window.paypal) return;
    rendered.current = true;

    window.paypal.Buttons({
      createOrder: (_data: any, actions: any) => {
        return actions.order.create({
          purchase_units: [{ amount: { value: amount } }]
        });
      },
      onApprove: (_data: any, actions: any) => {
        return actions.order.capture().then(onSuccess).catch(onError);
      },
      onError
    }).render(containerRef.current);
  }, [amount, onSuccess, onError]);

  return <div ref={containerRef} />;
}
```

Load the SDK script in your `index.html` (or use `@paypal/react-paypal-js` which handles this automatically):

```bash
npm install @paypal/react-paypal-js
```

```tsx
// App.tsx
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

export function App() {
  return (
    <PayPalScriptProvider options={{ 'client-id': 'YOUR_CLIENT_ID', currency: 'USD' }}>
      <PayPalButtons
        createOrder={(data, actions) =>
          actions.order.create({
            purchase_units: [{ amount: { value: '9.99' } }]
          })
        }
        onApprove={(data, actions) =>
          actions.order.capture().then((details) => {
            console.log('Paid!', details);
          })
        }
      />
    </PayPalScriptProvider>
  );
}
```

### Security note for React web apps

Even in a web app, **never call the PayPal Orders REST API directly from the browser with your `CLIENT_SECRET`**. The secret would be visible in browser dev tools and network logs. Use the JS SDK's `actions.order.create()` (which uses `CLIENT_ID` only) for order creation, and proxy all server-side calls through your backend.

For order creation requiring custom validation (custom amounts, coupon logic, inventory checks), use the `createOrder` callback to call your backend, which then calls PayPal's REST API with the secret and returns the order ID:

```typescript
createOrder: async () => {
  const response = await fetch('/api/create-paypal-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cartItems: cart, couponCode })
  });
  const { orderID } = await response.json();
  return orderID;   // returned to the SDK, which handles the approval UI
}
```

---

## 10. Production architecture recommendations

Regardless of the integration mode, a production PayPal integration requires a backend proxy. Here is the recommended architecture:

```
Mobile App / Web App
  │
  ├─ POST /api/orders           (create order)
  │     body: { items, currency }
  │     response: { orderID, approveURL }
  │
  ├─ [user approves in ASWebAuth / browser popup]
  │
  └─ POST /api/orders/{id}/capture
        response: { status, transactionID }

Backend (Node.js / Python / etc.)
  │
  ├─ Holds CLIENT_SECRET in environment variable
  ├─ Validates cart items against your database (prevent price tampering)
  ├─ POST https://api-m.paypal.com/v2/checkout/orders
  ├─ POST https://api-m.paypal.com/v2/checkout/orders/{id}/capture
  └─ Records transaction in your database
```

### Webhook verification

After capture, PayPal sends a webhook to your backend confirming the payment. Always verify webhooks using PayPal's `/v1/notifications/verify-webhook-signature` endpoint before fulfilling orders — the capture response from your `/api/capture` call is sufficient for immediate confirmation, but the webhook provides a durable, server-side record.

### Sandbox vs. production

- Use `https://api-m.sandbox.paypal.com` and sandbox credentials during development.
- Switch to `https://api-m.paypal.com` and live credentials for production.
- The PayPal JS SDK URL also has a mode: `?client-id=...` uses live by default; add `&intent=capture` and nothing else for production, or test with a sandbox `CLIENT_ID` pointing at the sandbox JS SDK.

### Environment variables

```
# Backend .env
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_MODE=sandbox   # or "live"
PAYPAL_WEBHOOK_ID=...

# Mobile app (safe to expose)
EXPO_PUBLIC_PAYPAL_CLIENT_ID=...
EXPO_PUBLIC_API_BASE_URL=https://api.yourapp.com
```

Never put `PAYPAL_CLIENT_SECRET` or any other secret in the mobile app's environment, build artifact, or version control.
