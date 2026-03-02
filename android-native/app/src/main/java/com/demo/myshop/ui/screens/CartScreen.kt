package com.demo.myshop.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.AddCircle
import androidx.compose.material.icons.filled.RemoveCircle
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.demo.myshop.model.CartItem
import com.demo.myshop.model.Product

@Composable
fun CartScreen(
    items: List<CartItem>,
    total: Double,
    onAdd: (Product) -> Unit,
    onRemoveOne: (Product) -> Unit,
    onDelete: (Product) -> Unit,
    onCheckout: () -> Unit
) {
    if (items.isEmpty()) {
        // Empty cart
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFFF7F8FC)),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("🛒", fontSize = 60.sp)
                Spacer(Modifier.height(16.dp))
                Text(
                    "Your cart is empty",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.Gray
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    "Browse our products and add items!",
                    fontSize = 14.sp,
                    color = Color.Gray.copy(alpha = 0.7f)
                )
            }
        }
    } else {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFFF7F8FC))
        ) {
            // Cart items
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.weight(1f)
            ) {
                items(items) { cartItem ->
                    CartItemRow(
                        item = cartItem,
                        onAdd = { onAdd(cartItem.product) },
                        onRemoveOne = { onRemoveOne(cartItem.product) },
                        onDelete = { onDelete(cartItem.product) }
                    )
                }
            }

            // Bottom bar
            Surface(
                color = Color.White,
                shadowElevation = 10.dp
            ) {
                Column(Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "Total",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF1A1A2E)
                        )
                        Text(
                            "%.2f €".format(total),
                            fontSize = 22.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color(0xFF6C63FF)
                        )
                    }

                    Spacer(Modifier.height(12.dp))

                    Button(
                        onClick = onCheckout,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6C63FF))
                    ) {
                        Text(
                            "Checkout",
                            fontWeight = FontWeight.Bold,
                            fontSize = 17.sp
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun CartItemRow(
    item: CartItem,
    onAdd: () -> Unit,
    onRemoveOne: () -> Unit,
    onDelete: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = Color.White,
        shadowElevation = 2.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Emoji in rounded rect background
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = Color(0xFFF7F8FC),
                modifier = Modifier.size(56.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(item.product.emoji, fontSize = 36.sp)
                }
            }

            Spacer(Modifier.width(12.dp))

            // Name + price
            Column(Modifier.weight(1f)) {
                Text(
                    item.product.name,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFF1A1A2E)
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    "%.2f €".format(item.product.price),
                    fontSize = 13.sp,
                    color = Color.Gray
                )
            }

            // Quantity controls — circular filled icons like iOS
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                IconButton(
                    onClick = onRemoveOne,
                    modifier = Modifier.size(28.dp)
                ) {
                    Icon(
                        Icons.Default.RemoveCircle,
                        contentDescription = "Remove one",
                        tint = Color(0xFF6C63FF),
                        modifier = Modifier.size(22.dp)
                    )
                }

                Text(
                    "${item.quantity}",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.widthIn(min = 20.dp),
                    textAlign = TextAlign.Center
                )

                IconButton(
                    onClick = onAdd,
                    modifier = Modifier.size(28.dp)
                ) {
                    Icon(
                        Icons.Default.AddCircle,
                        contentDescription = "Add one",
                        tint = Color(0xFF6C63FF),
                        modifier = Modifier.size(22.dp)
                    )
                }
            }

            Spacer(Modifier.width(4.dp))

            // Trash button
            IconButton(
                onClick = onDelete,
                modifier = Modifier.size(28.dp)
            ) {
                Icon(
                    Icons.Default.Delete,
                    contentDescription = "Delete",
                    tint = Color.Red.copy(alpha = 0.7f),
                    modifier = Modifier.size(14.dp)
                )
            }
        }
    }
}
