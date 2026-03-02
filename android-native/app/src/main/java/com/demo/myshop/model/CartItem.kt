package com.demo.myshop.model

data class CartItem(
    val product: Product,
    val quantity: Int = 1
) {
    val subtotal: Double get() = product.price * quantity
}
