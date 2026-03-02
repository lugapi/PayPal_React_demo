package com.demo.myshop.paypal

import com.demo.myshop.Config
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.Credentials
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

object PayPalService {
    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    data class PayPalTokens(
        val accessToken: String,
        val clientToken: String
    )

    suspend fun getAccessToken(): String = withContext(Dispatchers.IO) {
        val credential = Credentials.basic(Config.paypalClientID, Config.paypalClientSecret)
        val request = Request.Builder()
            .url("${Config.paypalBaseURL}/v1/oauth2/token")
            .post("grant_type=client_credentials".toRequestBody("application/x-www-form-urlencoded".toMediaType()))
            .header("Authorization", credential)
            .build()

        val response = client.newCall(request).execute()
        val body = response.body?.string() ?: throw Exception("Empty response")
        if (!response.isSuccessful) throw Exception("Token request failed: $body")

        JSONObject(body).getString("access_token")
    }

    suspend fun createOrder(amount: Double): String = withContext(Dispatchers.IO) {
        val accessToken = getAccessToken()
        val amountStr = "%.2f".format(amount)

        val orderJson = JSONObject().apply {
            put("intent", "CAPTURE")
            put("purchase_units", org.json.JSONArray().apply {
                put(JSONObject().apply {
                    put("amount", JSONObject().apply {
                        put("currency_code", "EUR")
                        put("value", amountStr)
                    })
                    put("description", "myshop order")
                })
            })
        }

        val request = Request.Builder()
            .url("${Config.paypalBaseURL}/v2/checkout/orders")
            .post(orderJson.toString().toRequestBody("application/json".toMediaType()))
            .header("Authorization", "Bearer $accessToken")
            .header("Content-Type", "application/json")
            .build()

        val response = client.newCall(request).execute()
        val body = response.body?.string() ?: throw Exception("Empty response")
        if (!response.isSuccessful) throw Exception("Create order failed: $body")

        val order = JSONObject(body)
        order.getString("id")
    }

    suspend fun captureOrder(orderId: String): Boolean = withContext(Dispatchers.IO) {
        val accessToken = getAccessToken()

        val request = Request.Builder()
            .url("${Config.paypalBaseURL}/v2/checkout/orders/$orderId/capture")
            .post("".toRequestBody("application/json".toMediaType()))
            .header("Authorization", "Bearer $accessToken")
            .header("Content-Type", "application/json")
            .build()

        val response = client.newCall(request).execute()
        val body = response.body?.string() ?: throw Exception("Empty response")

        if (response.isSuccessful) {
            val json = JSONObject(body)
            json.optString("status") == "COMPLETED"
        } else {
            false
        }
    }

    suspend fun getPayPalTokens(): PayPalTokens = withContext(Dispatchers.IO) {
        val accessToken = getAccessToken()

        val request = Request.Builder()
            .url("${Config.paypalBaseURL}/v1/identity/generate-token")
            .post("".toRequestBody("application/json".toMediaType()))
            .header("Authorization", "Bearer $accessToken")
            .header("Content-Type", "application/json")
            .header("Accept-Language", "en_US")
            .build()

        val response = client.newCall(request).execute()
        val body = response.body?.string() ?: throw Exception("Empty response")
        if (!response.isSuccessful) throw Exception("Client token request failed: $body")

        val clientToken = JSONObject(body).getString("client_token")
        PayPalTokens(accessToken = accessToken, clientToken = clientToken)
    }

    fun getApprovalUrl(orderId: String): String {
        return "${Config.paypalWebURL}/checkoutnow?token=$orderId"
    }
}
