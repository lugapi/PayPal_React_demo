import Foundation

struct Product: Identifiable, Hashable {
    let id: Int
    let name: String
    let price: Double
    let emoji: String
    let description: String
}

let productCatalog: [Product] = [
    Product(id: 1, name: "Wireless Headphones", price: 79.99, emoji: "🎧", description: "Premium sound quality"),
    Product(id: 2, name: "Smart Watch", price: 199.99, emoji: "⌚", description: "Track your fitness"),
    Product(id: 3, name: "Laptop Stand", price: 49.99, emoji: "💻", description: "Ergonomic design"),
    Product(id: 4, name: "Mechanical Keyboard", price: 129.99, emoji: "⌨️", description: "Cherry MX switches"),
    Product(id: 5, name: "USB-C Hub", price: 39.99, emoji: "🔌", description: "7-in-1 adapter"),
    Product(id: 6, name: "Desk Lamp", price: 59.99, emoji: "💡", description: "LED with dimmer"),
]
