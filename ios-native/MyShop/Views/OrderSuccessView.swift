import SwiftUI

struct OrderSuccessView: View {
    let orderId: String?
    let payerName: String?
    let method: String?
    let mode: PaymentMode?

    @Environment(\.dismiss) private var dismiss
    @State private var scale: CGFloat = 0
    @State private var opacity: Double = 0

    private var isPayPal: Bool { method == "paypal" }

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                Spacer(minLength: 40)

                // Check circle
                ZStack {
                    Circle()
                        .fill(Color(hex: "E8F5E9"))
                        .frame(width: 120, height: 120)
                    Text("✅")
                        .font(.system(size: 60))
                }
                .scaleEffect(scale)
                .opacity(opacity)

                Text("Order confirmed!")
                    .font(.system(size: 28, weight: .heavy))
                    .foregroundStyle(Color(hex: "1A1A2E"))
                    .opacity(opacity)

                Text("Thank you\(payerName != nil ? ", \(payerName!)" : "") for your purchase.\nYou will receive a confirmation email shortly.")
                    .font(.system(size: 15))
                    .foregroundStyle(.gray)
                    .multilineTextAlignment(.center)
                    .opacity(opacity)

                // PayPal details
                if isPayPal {
                    VStack(spacing: 14) {
                        Text("PayPal Payment Details")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(Color(hex: "003087"))
                            .frame(maxWidth: .infinity, alignment: .leading)

                        if let orderId {
                            detailRow(label: "Order ID", value: orderId)
                        }

                        HStack {
                            Text("Status")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(.gray)
                            Spacer()
                            Text("COMPLETED")
                                .font(.system(size: 11, weight: .heavy))
                                .foregroundStyle(Color(hex: "2E7D32"))
                                .padding(.horizontal, 10)
                                .padding(.vertical, 3)
                                .background(Color(hex: "E8F5E9"))
                                .clipShape(Capsule())
                        }

                        if let mode {
                            detailRow(label: "Integration", value: mode.fullLabel)
                        }
                    }
                    .padding(20)
                    .background(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .overlay(
                        HStack {
                            Rectangle()
                                .fill(Color(hex: "003087"))
                                .frame(width: 4)
                            Spacer()
                        }
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                    )
                    .shadow(color: .black.opacity(0.06), radius: 8, y: 2)
                    .opacity(opacity)
                }

                // Info box
                VStack(spacing: 12) {
                    infoRow("📦 Estimated delivery: 3-5 business days")
                    infoRow("📧 Email confirmation")
                    infoRow("🔄 Free returns within 30 days")
                }
                .padding(20)
                .background(.white)
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .shadow(color: .black.opacity(0.06), radius: 8, y: 2)
                .opacity(opacity)

                Button {
                    // Pop to root
                    dismiss()
                } label: {
                    Text("Back to shop")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(Color(hex: "6C63FF"))
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                }
                .opacity(opacity)

                Spacer(minLength: 40)
            }
            .padding(.horizontal, 24)
        }
        .background(Color(hex: "F7F8FC"))
        .navigationBarBackButtonHidden()
        .onAppear {
            withAnimation(.spring(duration: 0.5, bounce: 0.4)) {
                scale = 1
            }
            withAnimation(.easeOut(duration: 0.4)) {
                opacity = 1
            }
        }
    }

    private func detailRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(.gray)
            Spacer()
            Text(value)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Color(hex: "1A1A2E"))
                .lineLimit(1)
        }
    }

    private func infoRow(_ text: String) -> some View {
        HStack {
            Text(text)
                .font(.system(size: 14))
                .foregroundStyle(.gray)
            Spacer()
        }
    }
}
