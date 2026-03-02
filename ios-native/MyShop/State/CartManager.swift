import SwiftUI

@Observable
final class CartManager {
    var items: [CartItem] = []

    var totalPrice: Double {
        items.reduce(0) { $0 + $1.subtotal }
    }

    var itemCount: Int {
        items.reduce(0) { $0 + $1.quantity }
    }

    func addItem(_ product: Product) {
        if let index = items.firstIndex(where: { $0.product.id == product.id }) {
            items[index].quantity += 1
        } else {
            items.append(CartItem(product: product, quantity: 1))
        }
    }

    func removeItem(_ product: Product) {
        if let index = items.firstIndex(where: { $0.product.id == product.id }) {
            if items[index].quantity > 1 {
                items[index].quantity -= 1
            } else {
                items.remove(at: index)
            }
        }
    }

    func deleteItem(_ product: Product) {
        items.removeAll { $0.product.id == product.id }
    }

    func clearCart() {
        items.removeAll()
    }
}
