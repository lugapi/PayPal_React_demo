package com.demo.myshop.model

data class Product(
    val id: String,
    val name: String,
    val price: Double,
    val emoji: String,
    val description: String
)

val sampleProducts = listOf(
    Product("1", "Wireless Headphones", 79.99, "\uD83C\uDFA7", "Premium sound quality"),
    Product("2", "Smart Watch", 199.99, "⌚", "Fitness & notifications"),
    Product("3", "Portable Speaker", 49.99, "\uD83D\uDD0A", "360° immersive sound"),
    Product("4", "Phone Case", 24.99, "\uD83D\uDCF1", "Shockproof protection"),
    Product("5", "USB-C Cable", 14.99, "\uD83D\uDD0C", "Fast charging, 2m"),
    Product("6", "Webcam HD", 59.99, "\uD83D\uDCF7", "1080p, auto-focus")
)
