import SwiftUI

struct CartView: View {
    @Environment(CartManager.self) private var cart

    var body: some View {
        Group {
            if cart.items.isEmpty {
                emptyCart
            } else {
                cartContent
            }
        }
        .background(Color(hex: "F7F8FC"))
        .navigationTitle("Cart")
    }

    private var emptyCart: some View {
        VStack(spacing: 16) {
            Text("🛒")
                .font(.system(size: 60))
            Text("Your cart is empty")
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(.gray)
            Text("Browse our products and add items!")
                .font(.system(size: 14))
                .foregroundStyle(.gray.opacity(0.7))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var cartContent: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(spacing: 12) {
                    ForEach(cart.items) { item in
                        CartItemRow(item: item)
                    }
                }
                .padding(16)
            }

            // Bottom bar
            VStack(spacing: 12) {
                HStack {
                    Text("Total")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(Color(hex: "1A1A2E"))
                    Spacer()
                    Text(String(format: "%.2f €", cart.totalPrice))
                        .font(.system(size: 22, weight: .heavy))
                        .foregroundStyle(Color(hex: "6C63FF"))
                }

                NavigationLink(destination: CheckoutView()) {
                    Text("Checkout")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(Color(hex: "6C63FF"))
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                }
            }
            .padding(16)
            .background(.white)
            .shadow(color: .black.opacity(0.08), radius: 10, y: -4)
        }
    }
}

struct CartItemRow: View {
    @Environment(CartManager.self) private var cart
    let item: CartItem

    var body: some View {
        HStack(spacing: 12) {
            Text(item.product.emoji)
                .font(.system(size: 36))
                .frame(width: 56, height: 56)
                .background(Color(hex: "F7F8FC"))
                .clipShape(RoundedRectangle(cornerRadius: 12))

            VStack(alignment: .leading, spacing: 4) {
                Text(item.product.name)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Color(hex: "1A1A2E"))
                Text(String(format: "%.2f €", item.product.price))
                    .font(.system(size: 13))
                    .foregroundStyle(.gray)
            }

            Spacer()

            HStack(spacing: 12) {
                Button { cart.removeItem(item.product) } label: {
                    Image(systemName: "minus.circle.fill")
                        .font(.system(size: 22))
                        .foregroundStyle(Color(hex: "6C63FF"))
                }

                Text("\(item.quantity)")
                    .font(.system(size: 16, weight: .bold))
                    .frame(minWidth: 20)

                Button { cart.addItem(item.product) } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 22))
                        .foregroundStyle(Color(hex: "6C63FF"))
                }
            }

            Button { cart.deleteItem(item.product) } label: {
                Image(systemName: "trash")
                    .font(.system(size: 14))
                    .foregroundStyle(.red.opacity(0.7))
            }
            .padding(.leading, 4)
        }
        .padding(14)
        .background(.white)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.06), radius: 8, y: 2)
    }
}
