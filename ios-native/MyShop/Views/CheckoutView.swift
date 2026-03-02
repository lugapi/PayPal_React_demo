import SwiftUI

struct CheckoutView: View {
    @Environment(CartManager.self) private var cart
    @Environment(AppState.self) private var appState
    @State private var navigateToSuccess = false
    @State private var successOrderId: String?
    @State private var successPayerName: String?
    @State private var showModeSheet = false

    // Pre-filled form for demo
    @State private var firstName = "John"
    @State private var lastName = "Smith"
    @State private var email = "john.smith@example.com"
    @State private var address = "123 Main Street"
    @State private var city = "Paris"
    @State private var zip = "75001"
    @State private var cardNumber = "4111 1111 1111 1111"
    @State private var cardExpiry = "12/28"
    @State private var cardCvv = "123"
    @State private var cardLoading = false

    private let shipping = 4.99
    private var total: Double { cart.totalPrice + shipping }

    var body: some View {
        Group {
            switch appState.paymentMode {
            case .native:
                nativeCheckout
            case .webview:
                PayPalWebViewCheckout(amount: total, appSwitch: appState.appSwitchEnabled, onSuccess: handlePayPalSuccess)
            case .popupbridge:
                PayPalPopupBridgeCheckout(amount: total, appSwitch: appState.appSwitchEnabled, onSuccess: handlePayPalSuccess)
            case .webviewv6:
                PayPalV6WebViewCheckout(amount: total, onSuccess: handlePayPalSuccess)
            }
        }
        .navigationTitle("Checkout")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { toolbarContent }
        .navigationDestination(isPresented: $navigateToSuccess) {
            OrderSuccessView(
                orderId: successOrderId,
                payerName: successPayerName,
                method: "paypal",
                mode: appState.paymentMode
            )
        }
        .confirmationDialog("PayPal Integration Mode", isPresented: $showModeSheet) {
            ForEach(PaymentMode.allCases) { mode in
                Button(mode.fullLabel) {
                    appState.paymentMode = mode
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Choose how PayPal is integrated in this demo.")
        }
    }

    // MARK: - Toolbar

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItem(placement: .topBarTrailing) {
            HStack(spacing: 6) {
                appSwitchToggle
                modePill
            }
        }
    }

    @ViewBuilder
    private var appSwitchToggle: some View {
        @Bindable var state = appState
        let supported = appState.paymentMode.supportsAppSwitch

        HStack(spacing: 2) {
            Text("App Switch")
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(supported ? Color.gray : Color.gray.opacity(0.4))

            Toggle("", isOn: Binding(
                get: { supported && state.appSwitchEnabled },
                set: { newValue in
                    if supported {
                        state.appSwitchEnabled = newValue
                    }
                }
            ))
            .toggleStyle(SwitchToggleStyle(tint: .green))
            .scaleEffect(0.7)
            .frame(width: 40)
            .opacity(supported ? 1 : 0.4)
        }
        .onTapGesture {
            if !supported {
                showAppSwitchAlert()
            }
        }
    }

    private var modePill: some View {
        Button { showModeSheet = true } label: {
            Text(appState.paymentMode.label)
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(Color(hex: "1A1A2E"))
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(pillBackground)
                .clipShape(Capsule())
        }
    }

    private var pillBackground: Color {
        switch appState.paymentMode {
        case .native:      return Color(hex: "EDE9FF")
        case .webview:     return Color(hex: "E3F2FD")
        case .popupbridge: return Color(hex: "E8F5E9")
        case .webviewv6:   return Color(hex: "FFF3E0")
        }
    }

    // MARK: - Native checkout form

    private var nativeCheckout: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Order summary
                GroupBox {
                    VStack(spacing: 8) {
                        ForEach(cart.items) { item in
                            HStack {
                                Text("\(item.product.emoji) \(item.product.name) × \(item.quantity)")
                                    .font(.system(size: 13))
                                    .foregroundStyle(.gray)
                                Spacer()
                                Text(String(format: "%.2f €", item.subtotal))
                                    .font(.system(size: 13, weight: .semibold))
                            }
                        }
                        Divider()
                        HStack {
                            Text("Shipping")
                                .font(.system(size: 14))
                                .foregroundStyle(.gray)
                            Spacer()
                            Text(String(format: "%.2f €", shipping))
                                .font(.system(size: 13, weight: .semibold))
                        }
                        HStack {
                            Text("Total")
                                .font(.system(size: 16, weight: .bold))
                            Spacer()
                            Text(String(format: "%.2f €", total))
                                .font(.system(size: 18, weight: .heavy))
                                .foregroundStyle(Color(hex: "6C63FF"))
                        }
                    }
                } label: {
                    Text("📦 Order Summary")
                        .font(.system(size: 16, weight: .bold))
                }

                // Shipping address
                GroupBox {
                    VStack(spacing: 10) {
                        HStack(spacing: 12) {
                            FormField(label: "First name", text: $firstName)
                            FormField(label: "Last name", text: $lastName)
                        }
                        FormField(label: "Email", text: $email)
                        FormField(label: "Address", text: $address)
                        HStack(spacing: 12) {
                            FormField(label: "City", text: $city)
                            FormField(label: "ZIP", text: $zip)
                                .frame(maxWidth: 100)
                        }
                    }
                } label: {
                    Text("🏠 Shipping Address")
                        .font(.system(size: 16, weight: .bold))
                }

                // Card payment
                GroupBox {
                    VStack(spacing: 10) {
                        FormField(label: "Card number", text: $cardNumber)
                        HStack(spacing: 12) {
                            FormField(label: "Expiry", text: $cardExpiry)
                            FormField(label: "CVV", text: $cardCvv)
                        }
                        Text("🔒 100% secure payment")
                            .font(.system(size: 12))
                            .foregroundStyle(.gray)
                            .frame(maxWidth: .infinity, alignment: .center)
                    }
                } label: {
                    Text("💳 Payment")
                        .font(.system(size: 16, weight: .bold))
                }

                // PayPal button
                PayPalNativeButton(amount: total, onSuccess: handlePayPalSuccess)

                // Separator
                HStack {
                    Rectangle().fill(Color.gray.opacity(0.3)).frame(height: 1)
                    Text("OR")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(.gray)
                    Rectangle().fill(Color.gray.opacity(0.3)).frame(height: 1)
                }

                // Card submit
                Button {
                    cardLoading = true
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                        cardLoading = false
                        cart.clearCart()
                        navigateToSuccess = true
                    }
                } label: {
                    Text(cardLoading ? "Processing..." : "💳 Pay by card \(String(format: "%.2f", total)) €")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 18)
                        .background(cardLoading ? Color(hex: "A09CFF") : Color(hex: "6C63FF"))
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                }
                .disabled(cardLoading)
            }
            .padding(16)
        }
        .background(Color(hex: "F7F8FC"))
    }

    // MARK: - Handlers

    private func handlePayPalSuccess(orderId: String?, payerName: String?) {
        cart.clearCart()
        successOrderId = orderId
        successPayerName = payerName
        navigateToSuccess = true
    }

    private func showAppSwitchAlert() {
        guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = scene.windows.first,
              let vc = window.rootViewController else { return }

        let alert = UIAlertController(
            title: "App Switch unavailable",
            message: "App Switch is only available with JS SDK V5 modes (WebView and PopupBridge). Switch to one of these modes to enable it.",
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        vc.present(alert, animated: true)
    }
}

// MARK: - Form Field

struct FormField: View {
    let label: String
    @Binding var text: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(.gray)
            TextField(label, text: $text)
                .font(.system(size: 15))
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(Color(hex: "FAFAFA"))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(Color(hex: "E0E0E0"), lineWidth: 1.5)
                )
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .autocorrectionDisabled()
        }
    }
}
