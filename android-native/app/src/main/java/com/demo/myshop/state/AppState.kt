package com.demo.myshop.state

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import com.demo.myshop.model.PaymentMode

class AppState : ViewModel() {
    var paymentMode by mutableStateOf(PaymentMode.NATIVE)
    var appSwitchEnabled by mutableStateOf(false)
}
