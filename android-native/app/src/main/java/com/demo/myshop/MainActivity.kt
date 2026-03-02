package com.demo.myshop

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.demo.myshop.model.PaymentMode
import com.demo.myshop.state.AppState
import com.demo.myshop.state.CartManager
import com.demo.myshop.ui.screens.*
import com.demo.myshop.ui.theme.MyShopTheme

class MainActivity : ComponentActivity() {
    // PopupBridgeClient reference for handling return from browser
    var popupBridgeClient: com.braintreepayments.api.PopupBridgeClient? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MyShopTheme {
                MyShopApp()
            }
        }
    }

    override fun onResume() {
        super.onResume()
        popupBridgeClient?.handleReturnToApp(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        popupBridgeClient?.handleReturnToApp(intent)
    }
}

@Composable
fun MyShopApp() {
    val navController = rememberNavController()
    val cartManager: CartManager = viewModel()
    val appState: AppState = viewModel()

    NavHost(navController = navController, startDestination = "main") {
        composable("main") {
            MainTabScreen(
                cartManager = cartManager,
                onCheckout = { navController.navigate("checkout") }
            )
        }

        composable("checkout") {
            CheckoutScreen(
                cartItems = cartManager.items,
                subtotal = cartManager.total,
                appState = appState,
                onSuccess = { orderId, payerName, mode ->
                    cartManager.clear()
                    navController.navigate(
                        "success?orderId=${orderId ?: ""}&payerName=${payerName ?: ""}&mode=${mode.name}"
                    ) {
                        popUpTo("main") { inclusive = false }
                    }
                },
                onCancel = { navController.popBackStack() }
            )
        }

        composable(
            "success?orderId={orderId}&payerName={payerName}&mode={mode}",
            arguments = listOf(
                navArgument("orderId") { type = NavType.StringType; defaultValue = "" },
                navArgument("payerName") { type = NavType.StringType; defaultValue = "" },
                navArgument("mode") { type = NavType.StringType; defaultValue = "" }
            )
        ) { backStackEntry ->
            val orderId = backStackEntry.arguments?.getString("orderId")?.ifEmpty { null }
            val payerName = backStackEntry.arguments?.getString("payerName")?.ifEmpty { null }
            val modeName = backStackEntry.arguments?.getString("mode") ?: ""
            val mode = PaymentMode.entries.firstOrNull { it.name == modeName }

            OrderSuccessScreen(
                orderId = orderId,
                payerName = payerName,
                mode = mode,
                onContinueShopping = {
                    navController.navigate("main") {
                        popUpTo("main") { inclusive = true }
                    }
                }
            )
        }
    }
}

@Composable
fun MainTabScreen(
    cartManager: CartManager,
    onCheckout: () -> Unit
) {
    var selectedTab by remember { mutableIntStateOf(0) }

    Scaffold(
        bottomBar = {
            NavigationBar(
                containerColor = MaterialTheme.colorScheme.surface
            ) {
                NavigationBarItem(
                    icon = { Icon(Icons.Default.ShoppingBag, contentDescription = "Shop") },
                    label = { Text("Shop") },
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 }
                )
                NavigationBarItem(
                    icon = {
                        BadgedBox(
                            badge = {
                                if (cartManager.itemCount > 0) {
                                    Badge { Text("${cartManager.itemCount}") }
                                }
                            }
                        ) {
                            Icon(Icons.Default.ShoppingCart, contentDescription = "Cart")
                        }
                    },
                    label = { Text("Cart") },
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 }
                )
            }
        }
    ) { innerPadding ->
        Box(Modifier.padding(innerPadding)) {
            when (selectedTab) {
                0 -> ProductListScreen(onAddToCart = { cartManager.addProduct(it) })
                1 -> CartScreen(
                    items = cartManager.items,
                    total = cartManager.total,
                    onAdd = { cartManager.addProduct(it) },
                    onRemoveOne = { cartManager.removeOne(it) },
                    onDelete = { cartManager.deleteProduct(it) },
                    onCheckout = onCheckout
                )
            }
        }
    }
}
