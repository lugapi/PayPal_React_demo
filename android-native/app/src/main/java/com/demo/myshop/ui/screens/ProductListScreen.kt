package com.demo.myshop.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.demo.myshop.model.Product
import com.demo.myshop.model.sampleProducts
import kotlinx.coroutines.delay

@Composable
fun ProductListScreen(
    onAddToCart: (Product) -> Unit
) {
    var addedProductId by remember { mutableStateOf<String?>(null) }

    LazyVerticalGrid(
        columns = GridCells.Fixed(2),
        contentPadding = PaddingValues(16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF7F8FC))
    ) {
        items(sampleProducts) { product ->
            ProductCard(
                product = product,
                showCheck = addedProductId == product.id,
                onAdd = {
                    onAddToCart(product)
                    addedProductId = product.id
                }
            )
        }
    }

    // Auto-dismiss checkmark after 1s
    LaunchedEffect(addedProductId) {
        if (addedProductId != null) {
            delay(1000)
            addedProductId = null
        }
    }
}

@Composable
private fun ProductCard(
    product: Product,
    showCheck: Boolean,
    onAdd: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = Color.White,
        shadowElevation = 2.dp
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Emoji with animated checkmark overlay
            Box(
                modifier = Modifier.height(60.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(product.emoji, fontSize = 50.sp)

                // Animated green checkmark badge
                if (showCheck) {
                    Surface(
                        shape = CircleShape,
                        color = Color(0xFF4CAF50).copy(alpha = 0.9f),
                        modifier = Modifier
                            .size(30.dp)
                            .align(Alignment.TopEnd)
                            .offset(x = 10.dp, y = (-5).dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(
                                "✓",
                                color = Color.White,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }

            Text(
                product.name,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color(0xFF1A1A2E),
                textAlign = TextAlign.Center,
                maxLines = 2
            )

            Text(
                product.description,
                fontSize = 11.sp,
                color = Color.Gray,
                textAlign = TextAlign.Center
            )

            Spacer(Modifier.height(4.dp))

            Text(
                "%.2f €".format(product.price),
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF6C63FF)
            )

            Spacer(Modifier.height(8.dp))

            Button(
                onClick = onAdd,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(38.dp),
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6C63FF)),
                contentPadding = PaddingValues(0.dp)
            ) {
                Text(
                    "Add to cart",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
    }
}
