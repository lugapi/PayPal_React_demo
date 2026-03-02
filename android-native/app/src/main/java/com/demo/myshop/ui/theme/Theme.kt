package com.demo.myshop.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val Background = Color(0xFFF7F8FC)
val Primary = Color(0xFF6C63FF)
val OnPrimary = Color.White
val Surface = Color.White
val OnSurface = Color(0xFF1A1A2E)
val SecondaryText = Color(0xFF999999)

private val LightColorScheme = lightColorScheme(
    primary = Primary,
    onPrimary = OnPrimary,
    background = Background,
    surface = Surface,
    onSurface = OnSurface,
    surfaceVariant = Color(0xFFF0F0F5)
)

@Composable
fun MyShopTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = LightColorScheme,
        content = content
    )
}
