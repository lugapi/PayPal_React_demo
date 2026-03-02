import SwiftUI

struct ProductListView: View {
    @Environment(CartManager.self) private var cart
    @State private var addedProductId: Int?

    let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12),
    ]

    var body: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 12) {
                ForEach(productCatalog) { product in
                    ProductCard(
                        product: product,
                        showCheck: addedProductId == product.id
                    ) {
                        cart.addItem(product)
                        withAnimation(.spring(duration: 0.3)) {
                            addedProductId = product.id
                        }
                        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                            withAnimation { addedProductId = nil }
                        }
                    }
                }
            }
            .padding(16)
        }
        .background(Color(hex: "F7F8FC"))
        .navigationTitle("MyShop")
    }
}

struct ProductCard: View {
    let product: Product
    let showCheck: Bool
    let onAdd: () -> Void

    var body: some View {
        VStack(spacing: 10) {
            ZStack {
                Text(product.emoji)
                    .font(.system(size: 50))

                if showCheck {
                    Circle()
                        .fill(.green.opacity(0.9))
                        .frame(width: 30, height: 30)
                        .overlay {
                            Image(systemName: "checkmark")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(.white)
                        }
                        .offset(x: 25, y: -20)
                        .transition(.scale.combined(with: .opacity))
                }
            }
            .frame(height: 60)

            Text(product.name)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(Color(hex: "1A1A2E"))
                .multilineTextAlignment(.center)
                .lineLimit(2)

            Text(product.description)
                .font(.system(size: 11))
                .foregroundStyle(.gray)

            Text(String(format: "%.2f €", product.price))
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(Color(hex: "6C63FF"))

            Button(action: onAdd) {
                Text("Add to cart")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(Color(hex: "6C63FF"))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
        .padding(14)
        .background(.white)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.06), radius: 8, y: 2)
    }
}
