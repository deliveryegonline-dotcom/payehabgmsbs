import React, { useState } from 'react';
import {
  Smartphone,
  Copy,
  Check,
  Download,
  Code2,
  FileCode,
  ShieldCheck,
  Zap,
  Terminal,
  Cpu,
  Layers,
  AlertCircle,
  FolderGit2,
} from 'lucide-react';

export const AdminAndroidDevCenter: React.FC = () => {
  const [activeFile, setActiveFile] = useState<string>('manifest');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyCode = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const manifestXml = `<?xml version="1.0" encoding="utf-8"?>
<!-- AndroidManifest.xml: أذونات قراءة رسائل SMS والتشغيل في الخلفية -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.ehabgm.pay.forwarder">

    <!-- الأذونات الأساسية لالتقاط رسائل فودافون كاش وإنستاباي -->
    <uses-permission android:name="android.permission.RECEIVE_SMS" />
    <uses-permission android:name="android.permission.READ_SMS" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.BATTERY_STATS" />
    <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="EHABGM Pay Forwarder"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.EhabgmPay"
        android:usesCleartextTraffic="false">

        <activity
            android:name=".ui.MainActivity"
            android:exported="true"
            android:screenOrientation="portrait">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <activity
            android:name=".ui.QrScanActivity"
            android:exported="false"
            android:screenOrientation="portrait" />

        <!-- مستقبل رسائل SMS عالي الأولوية (Priority 999) -->
        <receiver
            android:name=".receiver.SmsBroadcastReceiver"
            android:exported="true"
            android:permission="android.permission.BROADCAST_SMS">
            <intent-filter android:priority="999">
                <action android:name="android.provider.Telephony.SMS_RECEIVED" />
            </intent-filter>
        </receiver>

        <!-- خدمة العمل المستمر في الخلفية دون إيقاف النظام (Foreground Service) -->
        <service
            android:name=".service.ForwarderForegroundService"
            android:foregroundServiceType="dataSync"
            android:exported="false" />

    </application>
</manifest>`;

  const smsReceiverKt = `package com.ehabgm.pay.forwarder.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log
import com.ehabgm.pay.forwarder.data.AppPreferences
import com.ehabgm.pay.forwarder.network.GatewayApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.regex.Pattern

/**
 * SmsBroadcastReceiver: يلتقط رسائل فودافون كاش وإنستاباي وأورنچ واتصالات فور وصولها
 * ويقوم باستخراج المبلغ ورقم العملية وتمريرها لسيرفر EHABGM Pay مشفرة بـ HMAC
 */
class SmsBroadcastReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (messages.isNullOrEmpty()) return

        val fullBody = StringBuilder()
        var sender = ""

        for (sms in messages) {
            sender = sms.displayOriginatingAddress ?: sms.originatingAddress ?: "Unknown"
            fullBody.append(sms.displayMessageBody ?: sms.messageBody ?: "")
        }

        val rawText = fullBody.toString()
        Log.d("EHABGM_SMS", "SMS Received from: $sender | Body: $rawText")

        val prefs = AppPreferences(context)
        if (!prefs.isPaired) {
            Log.w("EHABGM_SMS", "Device not paired yet. Skipping forward.")
            return
        }

        // فحص ما إذا كان المرسل أحد مزودي الدفع المعتمدين في مصر
        val isTargetSender = sender.contains("VF-Cash", ignoreCase = true) ||
                sender.contains("Vodafone", ignoreCase = true) ||
                sender.contains("InstaPay", ignoreCase = true) ||
                sender.contains("Orange", ignoreCase = true) ||
                sender.contains("Etisalat", ignoreCase = true) ||
                sender.contains("010", ignoreCase = true)

        if (!isTargetSender) {
            Log.i("EHABGM_SMS", "SMS not from payment provider. Ignored.")
            return
        }

        // استخراج المبلغ ورقم العملية بالريجكس
        val (amount, txnId) = extractPaymentDetails(rawText)

        // إرسال البيانات فورياً لسيرفر المنصة في Background Coroutine
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val success = GatewayApiClient.sendSmsIngestion(
                    context = context,
                    sender = sender,
                    rawText = rawText,
                    amount = amount,
                    transactionId = txnId
                )
                Log.i("EHABGM_SMS", "Forwarding status to server: $success")
            } catch (e: Exception) {
                Log.e("EHABGM_SMS", "Failed to forward SMS", e)
            }
        }
    }

    private fun extractPaymentDetails(body: String): Pair<Double, String> {
        var amount = 0.0
        var txnId = ""

        // استخراج المبلغ: (مثال: تم تحويل 150.23 جنيه أو 150 EGP)
        val amountPattern = Pattern.compile("(\\\\d+(?:\\\\.\\\\d{1,2})?)\\\\s*(?:جنيه|ج\\\\.م|EGP|LE)", Pattern.CASE_INSENSITIVE)
        val amountMatcher = amountPattern.matcher(body)
        if (amountMatcher.find()) {
            amount = amountMatcher.group(1)?.toDoubleOrNull() ?: 0.0
        }

        // استخراج رقم العملية (رقم المرجع أو كود التحويل)
        val txnPattern = Pattern.compile("(?:عملية رقم|رقم العملية|Ref|Trx ID|Trx)[:\\\\s]*([A-Za-z0-9\\\\-_]+)", Pattern.CASE_INSENSITIVE)
        val txnMatcher = txnPattern.matcher(body)
        if (txnMatcher.find()) {
            txnId = txnMatcher.group(1) ?: ""
        }

        return Pair(amount, txnId)
    }
}`;

  const apiClientKt = `package com.ehabgm.pay.forwarder.network

import android.content.Context
import android.os.BatteryManager
import com.ehabgm.pay.forwarder.data.AppPreferences
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.nio.charset.StandardCharsets
import java.util.concurrent.TimeUnit
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * GatewayApiClient: يقوم بتوقيع الرسائل بتشفير HMAC-SHA256 وإرسالها لبوابة EHABGM Pay
 */
object GatewayApiClient {

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    private val JSON_MEDIA_TYPE = "application/json; charset=utf-8".toMediaType()

    /**
     * إرسال رسالة الـ SMS المستلمة إلى نقطة النهاية /api/device/sms
     */
    fun sendSmsIngestion(
        context: Context,
        sender: String,
        rawText: String,
        amount: Double,
        transactionId: String
    ): Boolean {
        val prefs = AppPreferences(context)
        val baseUrl = prefs.gatewayUrl.ifEmpty { "https://pay.ehabgm.sbs" }
        val deviceId = prefs.deviceId
        val deviceSecret = prefs.deviceSecret

        val timestamp = System.currentTimeMillis()
        val jsonPayload = JSONObject().apply {
            put("deviceId", deviceId)
            put("sender", sender)
            put("rawText", rawText)
            put("amount", amount)
            put("transactionId", transactionId)
            put("receivedAt", System.currentTimeMillis())
        }.toString()

        // حساب توقيع HMAC-SHA256
        val signature = computeHmacSha256(jsonPayload, deviceSecret)

        val request = Request.Builder()
            .url("$baseUrl/api/device/sms")
            .post(jsonPayload.toRequestBody(JSON_MEDIA_TYPE))
            .addHeader("Content-Type", "application/json")
            .addHeader("X-Device-Id", deviceId)
            .addHeader("X-Timestamp", timestamp.toString())
            .addHeader("X-Signature", signature)
            .build()

        client.newCall(request).execute().use { response ->
            return response.isSuccessful
        }
    }

    /**
     * إرسال نبضة فحص دورية (Heartbeat) كل 60 ثانية لتأكيد اتصال الهاتف ونسبة الشحن
     */
    fun sendHeartbeat(context: Context): Boolean {
        val prefs = AppPreferences(context)
        val baseUrl = prefs.gatewayUrl.ifEmpty { "https://pay.ehabgm.sbs" }
        val deviceId = prefs.deviceId
        val deviceSecret = prefs.deviceSecret

        val bm = context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        val batteryPct = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)

        val timestamp = System.currentTimeMillis()
        val jsonPayload = JSONObject().apply {
            put("deviceId", deviceId)
            put("batteryLevel", batteryPct)
            put("isCharging", true)
            put("networkType", "WiFi/4G")
            put("appVersion", "1.2.0")
        }.toString()

        val signature = computeHmacSha256(jsonPayload, deviceSecret)

        val request = Request.Builder()
            .url("$baseUrl/api/device/heartbeat")
            .post(jsonPayload.toRequestBody(JSON_MEDIA_TYPE))
            .addHeader("Content-Type", "application/json")
            .addHeader("X-Device-Id", deviceId)
            .addHeader("X-Timestamp", timestamp.toString())
            .addHeader("X-Signature", signature)
            .build()

        client.newCall(request).execute().use { response ->
            return response.isSuccessful
        }
    }

    private fun computeHmacSha256(data: String, secret: String): String {
        val sha256Hmac = Mac.getInstance("HmacSHA256")
        val secretKey = SecretKeySpec(secret.toByteArray(StandardCharsets.UTF_8), "HmacSHA256")
        sha256Hmac.init(secretKey)
        val signedBytes = sha256Hmac.doFinal(data.toByteArray(StandardCharsets.UTF_8))
        return signedBytes.joinToString("") { "%02x".format(it) }
    }
}`;

  const buildGradleKts = `// app/build.gradle.kts
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

android {
    namespace = "com.ehabgm.pay.forwarder"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.ehabgm.pay.forwarder"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.2.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = true
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
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    
    // OkHttp & Coroutines للاتصال الفوري
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    
    // مسح رموز QR عبر الكاميرا
    implementation("com.journeyapps:zxing-android-embedded:4.3.0")
    implementation("com.google.zxing:core:3.5.3")
}`;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-gradient-to-l from-indigo-950/80 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-xs font-bold border border-indigo-500/20">
              <FolderGit2 className="w-3.5 h-3.5" />
              مركز تطوير تطبيق الأندرويد المفتوح المصدر (Android Client Native APK)
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              مشروع أندرويد متكامل لقراءة رسائل SMS وتأكيد الدفعات
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              هنا تجد الأكواد المصدرية الكاملة بلغة Kotlin لبناء ملف APK مخصص للعملاء والتجار. يقوم التطبيق بقراءة إشعارات التحويل فور وصولها على الهاتف وإرسالها فورياً مشفرة بـ HMAC-SHA256 إلى بوابتك.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => copyCode('all', `${manifestXml}\n\n${smsReceiverKt}\n\n${apiClientKt}`)}
              className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/20"
            >
              {copiedKey === 'all' ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              نسخ كامل الكود المصدري
            </button>
          </div>
        </div>
      </div>

      {/* Guide Steps to Build APK */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span>خطوات بناء الـ APK ونشره للتجار (Build Guide):</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
            <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center">1</span>
            <h4 className="font-bold text-white">فتح المشروع في Android Studio</h4>
            <p className="text-slate-400">أنشئ مشروعاً جديداً بصيغة Empty Views Activity وانسخ ملفات Kotlin والأذونات أدناه.</p>
          </div>

          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
            <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center">2</span>
            <h4 className="font-bold text-white">تخصيص الدومين الافتراضي</h4>
            <p className="text-slate-400">الدومين الافتراضي محدد بـ <code className="text-emerald-400">https://pay.ehabgm.sbs</code> أو يمسح التاجر رمز الـ QR للاقتران الآلي.</p>
          </div>

          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
            <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center">3</span>
            <h4 className="font-bold text-white">بناء ملف APK (Build Signed APK)</h4>
            <p className="text-slate-400">اضغط Build &gt; Generate Signed APK في أندرويد ستوديو، ويمكن للتاجر تثبيته فوراً على هاتفه.</p>
          </div>
        </div>
      </div>

      {/* Code Viewer with Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 px-6 py-4 gap-4 bg-slate-950/60">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'manifest', label: 'AndroidManifest.xml', icon: FileCode },
              { id: 'receiver', label: 'SmsBroadcastReceiver.kt', icon: Code2 },
              { id: 'api_client', label: 'GatewayApiClient.kt', icon: Cpu },
              { id: 'gradle', label: 'build.gradle.kts', icon: Terminal },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeFile === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFile(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => {
              let code = manifestXml;
              if (activeFile === 'receiver') code = smsReceiverKt;
              if (activeFile === 'api_client') code = apiClientKt;
              if (activeFile === 'gradle') code = buildGradleKts;
              copyCode(activeFile, code);
            }}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
          >
            {copiedKey === activeFile ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>نسخ الملف الحالي</span>
          </button>
        </div>

        <div className="p-6 bg-slate-950 overflow-x-auto max-h-[600px]" dir="ltr">
          <pre className="text-xs text-emerald-400 font-mono leading-relaxed">
            <code>
              {activeFile === 'manifest' && manifestXml}
              {activeFile === 'receiver' && smsReceiverKt}
              {activeFile === 'api_client' && apiClientKt}
              {activeFile === 'gradle' && buildGradleKts}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
};
