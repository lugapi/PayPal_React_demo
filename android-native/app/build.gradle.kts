plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.demo.myshop"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.demo.myshop"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        // PayPal credentials from gradle.properties or environment
        buildConfigField("String", "PAYPAL_CLIENT_ID",
            "\"${project.findProperty("PAYPAL_CLIENT_ID") ?: "YOUR_PAYPAL_CLIENT_ID"}\"")
        buildConfigField("String", "PAYPAL_CLIENT_SECRET",
            "\"${project.findProperty("PAYPAL_CLIENT_SECRET") ?: "YOUR_PAYPAL_CLIENT_SECRET"}\"")
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    // Compose BOM
    val composeBom = platform("androidx.compose:compose-bom:2024.12.01")
    implementation(composeBom)
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material:material-icons-extended")
    debugImplementation("androidx.compose.ui:ui-tooling")

    // Navigation
    implementation("androidx.navigation:navigation-compose:2.8.5")

    // Activity + Lifecycle
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")

    // Networking
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.json:json:20240303")

    // PopupBridge
    implementation("com.braintreepayments.api:popup-bridge:5.1.0")

    // Chrome Custom Tabs (for native mode)
    implementation("androidx.browser:browser:1.8.0")

    // Core
    implementation("androidx.core:core-ktx:1.15.0")
}
