package com.demo.myshop.state

import androidx.compose.runtime.mutableStateListOf
import androidx.lifecycle.ViewModel
import com.demo.myshop.model.CartItem
import com.demo.myshop.model.Product

class CartManager : ViewModel() {
    private val _items = mutableStateListOf<CartItem>()
    val items: List<CartItem> get() = _items

    val total: Double get() = _items.sumOf { it.subtotal }
    val itemCount: Int get() = _items.sumOf { it.quantity }

    fun addProduct(product: Product) {
        val index = _items.indexOfFirst { it.product.id == product.id }
        if (index >= 0) {
            _items[index] = _items[index].copy(quantity = _items[index].quantity + 1)
        } else {
            _items.add(CartItem(product))
        }
    }

    fun removeOne(product: Product) {
        val index = _items.indexOfFirst { it.product.id == product.id }
        if (index >= 0) {
            val item = _items[index]
            if (item.quantity > 1) {
                _items[index] = item.copy(quantity = item.quantity - 1)
            } else {
                _items.removeAt(index)
            }
        }
    }

    fun deleteProduct(product: Product) {
        _items.removeAll { it.product.id == product.id }
    }

    fun clear() {
        _items.clear()
    }
}
