import SwiftUI

@Observable
final class AppState {
    var paymentMode: PaymentMode = .native
    var appSwitchEnabled: Bool = false
}
