import Foundation

struct CartItem: Identifiable, Hashable {
    let product: Product
    var quantity: Int

    var id: Int { product.id }
    var subtotal: Double { product.price * Double(quantity) }
}
