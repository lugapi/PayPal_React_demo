package com.demo.myshop.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.demo.myshop.model.PaymentMode

@Composable
fun OrderSuccessScreen(
    orderId: String?,
    payerName: String?,
    mode: PaymentMode?,
    onContinueShopping: () -> Unit
) {
    val isPayPal = orderId != null

    // Spring scale animation
    var targetScale by remember { mutableFloatStateOf(0f) }
    val scale by animateFloatAsState(
        targetValue = targetScale,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessLow
        ),
        label = "scale"
    )

    // Fade in animation
    var targetAlpha by remember { mutableFloatStateOf(0f) }
    val alpha by animateFloatAsState(
        targetValue = targetAlpha,
        animationSpec = tween(400),
        label = "alpha"
    )

    LaunchedEffect(Unit) {
        targetScale = 1f
        targetAlpha = 1f
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF7F8FC))
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(Modifier.height(60.dp))

        // Check circle with spring animation
        Surface(
            shape = CircleShape,
            color = Color(0xFFE8F5E9),
            modifier = Modifier
                .size(120.dp)
                .scale(scale)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Text("✅", fontSize = 60.sp)
            }
        }

        Spacer(Modifier.height(20.dp))

        // Title
        Text(
            "Order confirmed!",
            fontSize = 28.sp,
            fontWeight = FontWeight.ExtraBold,
            color = Color(0xFF1A1A2E),
            modifier = Modifier.alpha(alpha)
        )

        Spacer(Modifier.height(8.dp))

        // Subtitle
        Text(
            "Thank you${if (payerName != null) ", $payerName" else ""} for your purchase.\nYou will receive a confirmation email shortly.",
            fontSize = 15.sp,
            color = Color.Gray,
            textAlign = TextAlign.Center,
            modifier = Modifier.alpha(alpha)
        )

        // PayPal details card with blue left border
        if (isPayPal) {
            Spacer(Modifier.height(20.dp))

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .alpha(alpha)
            ) {
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = Color.White,
                    shadowElevation = 2.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(Modifier.padding(20.dp)) {
                        Text(
                            "PayPal Payment Details",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF003087)
                        )

                        Spacer(Modifier.height(14.dp))

                        if (orderId != null) {
                            DetailRow("Order ID", orderId)
                            Spacer(Modifier.height(8.dp))
                        }

                        // Status badge
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                "Status",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Color.Gray
                            )
                            Surface(
                                shape = RoundedCornerShape(50),
                                color = Color(0xFFE8F5E9)
                            ) {
                                Text(
                                    "COMPLETED",
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 3.dp),
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = Color(0xFF2E7D32)
                                )
                            }
                        }

                        if (mode != null) {
                            Spacer(Modifier.height(8.dp))
                            DetailRow("Integration", mode.fullLabel)
                        }
                    }
                }

                // Blue left border overlay
                Box(
                    modifier = Modifier
                        .width(4.dp)
                        .matchParentSize()
                        .clip(RoundedCornerShape(topStart = 16.dp, bottomStart = 16.dp))
                        .background(Color(0xFF003087))
                )
            }
        }

        Spacer(Modifier.height(20.dp))

        // Info box
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = Color.White,
            shadowElevation = 2.dp,
            modifier = Modifier
                .fillMaxWidth()
                .alpha(alpha)
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                InfoRow("📦 Estimated delivery: 3-5 business days")
                InfoRow("📧 Email confirmation")
                InfoRow("🔄 Free returns within 30 days")
            }
        }

        Spacer(Modifier.height(24.dp))

        // Back to shop button
        Button(
            onClick = onContinueShopping,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp)
                .alpha(alpha),
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6C63FF))
        ) {
            Text("Back to shop", fontWeight = FontWeight.Bold, fontSize = 17.sp)
        }

        Spacer(Modifier.height(40.dp))
    }
}

@Composable
private fun DetailRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            label,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            color = Color.Gray
        )
        Text(
            value,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            color = Color(0xFF1A1A2E),
            maxLines = 1
        )
    }
}

@Composable
private fun InfoRow(text: String) {
    Row {
        Text(
            text,
            fontSize = 14.sp,
            color = Color.Gray
        )
        Spacer(Modifier.weight(1f))
    }
}
