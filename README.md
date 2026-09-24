# EHABGM Pay - بوابة تأكيد مدفوعات المحافظ الإلكترونية المصرية

بوابة دفع وتأكيد معاملات متعددة التجار (Multi-Merchant Payment Confirmation Gateway) مخصصة للمحافظ الإلكترونية المصرية (**فودافون كاش - Vodafone Cash**، و**إنستاباي - InstaPay**، وأورنچ كاش، وإي آند كاش)، معمارية سحابية مصممة للعمل كـ Serverless على Vercel مع قاعدة بيانات PostgreSQL (Neon / Supabase) وDrizzle ORM.

---

## المميزات الرئيسية (Core Features)

1. **إدارة متعددة التجار (Multi-Merchant)**:
   - تسجيل التجار، إدارة المحافظ، وإصدار مفاتيح الربط البرمجي (`pk_live_...` و `sk_live_...`).
   - تشفير وحفظ هاش الـ Secret Key فقط (`SHA-256`) لحماية البيانات الحساسة.
2. **اقتران الأجهزة السريع (Device Pairing)**:
   - توليد كود اقتران لمرة واحدة (نص + رمز QR) صالح لمدة 10 دقائق.
   - استدعاء `POST /api/device/pair` لإرجاع `deviceId` و `deviceSecret`.
3. **تخصيص القروش الفريدة (Dynamic Piaster Allocation)**:
   - عند إنشاء دفعة عبر `POST /api/v1/payments`، يتم تخصيص قروش عشوائية غير مستخدمة لأي عملية معلقة أخرى لنفس التاجر (مثال: طلب بقيمة 150 ج.م يصبح 150.07 ج.م).
4. **صفحة الدفع المستضافة (Hosted Checkout `/c/:id`)**:
   - واجهة مستخدم عربية RTL أنيقة، تعرض رقم المحفظة، المبلغ بالمليم، مؤقت عد تنازلي (30 دقيقة)، فحص حي مستمر، مع إمكانية التحقق اليدوي بواسطة العميل عبر رقم العملية.
5. **استقبال رسائل SMS بتوقيع مشفر (HMAC-SHA256)**:
   - توثيق مشدد عبر ترويسات `X-Device-Id` و `X-Timestamp` و `X-Signature`.
   - رفض التوقيتات الأقدم من 5 دقائق لحماية النظام من هجمات إعادة الإرسال (Replay Attacks).
   - فرض قيد الفرادة `UNIQUE(transaction_id)` لمنع تكرار العمليات.
   - مطابقة فورية عبر (التاجر + المبلغ المطابق تماماً + حالة الانتظار).
   - تحويل العمليات الغامضة أو غير المتطابقة لطابور المراجعة اليدوية (`Review Queue`).
6. **إشعارات الويب هوك (Signed Webhooks with Exponential Backoff)**:
   - إرسال إشعار فوري لموقع التاجر موقعاً بـ HMAC مع جدولة إعادة المحاولة والتأخير الأسي وتوثيق كامل لكل محاولة.
7. **لوحة تحكم التاجر والإدارة (Dashboard & Admin Panel)**:
   - متابعة المدفوعات، سجل رسائل SMS الواردة، إدارة الأجهزة، طابور المراجعة اليدوية، وسجل التدقيق الشامل.
8. **محاكي هاتف مدمج (Interactive SMS Simulator)**:
   - إمكانية اختبار ربط الهاتف وإرسال رسائل SMS واقعية بتوقيع HMAC حقيقي ومطابقتها فورياً من داخل واجهة التطبيق.

---

## عقود الواجهات البرمجية (API Contracts)

### 1. اقتران الجهاز (Device Pairing)
```http
POST /api/device/pair
Content-Type: application/json

{
  "pairingCode": "ABCD-1234",
  "deviceName": "Samsung Galaxy A15"
}
```
**الرد (200 OK):**
```json
{
  "deviceId": "dev-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "deviceSecret": "sec_dev_3f8b9a12c4d5e6f7a8b9c0d1e2f3a4b5",
  "message": "تم اقتران الجهاز بنجاح"
}
```

---

### 2. استقبال وتأكيد رسالة SMS من الهاتف
```http
POST /api/device/sms
Content-Type: application/json
X-Device-Id: <device uuid>
X-Timestamp: <unix seconds>
X-Signature: hex(HMAC_SHA256(deviceSecret, timestamp + "." + rawBody))

{
  "sender": "VF-Cash",
  "rawText": "تم استلام مبلغ 150.07 جنيه من 01012345678 في 2026-09-24 14:30:00 رقم العملية 1234567890",
  "amount": 150.07,
  "counterpartyPhone": "01012345678",
  "transactionId": "1234567890",
  "receivedAt": "2026-09-24T14:30:00Z"
}
```
**الردود المحتملة:**
- `200 {"status":"matched", "paymentId":"pay-xxx"}`
- `200 {"status":"duplicate", "message":"عملية مكررة"}`
- `200 {"status":"unmatched", "reason":"needs_review"}`
- `401 توقيع/وقت غلط (Invalid signature or timestamp)`

---

### 3. إنشاء دفعة جديدة لموقع التاجر
```http
POST /api/v1/payments
Authorization: Bearer sk_live_xxxxxxxxxxxxxxxxxxxxxxxx
Content-Type: application/json

{
  "amount": 150.00,
  "orderRef": "ORD-10928",
  "webhookUrl": "https://mystore.com/api/webhooks/ehabgm",
  "customerPhone": "01012345678"
}
```
**الرد (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "pay-xxxxxxxxxxxx",
    "orderRef": "ORD-10928",
    "baseAmount": 150.00,
    "payableAmount": 150.07,
    "piasters": 7,
    "currency": "EGP",
    "status": "pending",
    "checkoutUrl": "https://pay.ehabgm.sbs/c/pay-xxxxxxxxxxxx",
    "expiresAt": "2026-09-24T15:00:00.000Z"
  }
}
```

---

## خطوات النشر على Vercel و Neon / Supabase

### 1. إعداد قاعدة بيانات PostgreSQL
- افتح حساباً على [Neon.tech](https://neon.tech) أو [Supabase.com](https://supabase.com).
- أنشئ مشروع قاعدة بيانات جديد وانسخ رابط الاتصال `DATABASE_URL`.

### 2. تهيئة المتغيرات البيئية (Environment Variables)
في إعدادات مشروعك على Vercel، أضف المتغيرات التالية:
```env
DATABASE_URL="postgresql://user:pass@ep-sample.neon.tech/neondb?sslmode=require"
CRON_SECRET="your_custom_secure_cron_secret"
APP_URL="https://pay.ehabgm.sbs"
NODE_ENV="production"
```

### 3. دفع المخطط (Schema Migration)
قم بتشغيل أمر ترحيل الجداول عبر Drizzle:
```bash
npm run db:push
```

### 4. النشر على Vercel
- اربط مستودع GitHub بحساب Vercel.
- سيتعرف Vercel تلقائياً على ملف `vercel.json` لتشغيل دوال `/api/*` كـ Serverless Routes بالإضافة إلى تفعيل الـ Cron Job `/api/cron/expire-payments` كل 5 دقائق لإلغاء الدفعات المنتهية.

---

## ربط هاتف الأندرويد وإعادة توجيه الرسائل (SMS Forwarder Setup)

يمكن استخدام أي تطبيق توجيه رسائل مجاني أو مدفوع مثل **SMS Forwarder** أو **Tasker** أو **Webhook Forwarder**:

1. افتح لوحة تحكم التاجر، واضغط على **"الأجهزة والربط"** -> **"ربط جهاز جديد"**.
2. سيظهر رمز QR وكود اقتران (مثال: `ABCD-1234`).
3. أدخل الكود في التطبيق أو استدعِ `/api/device/pair` للحصول على `deviceId` و `deviceSecret`.
4. في التطبيق، قم بضبط مرشح الرسائل (Filter) على:
   - مرسل فودافون كاش: `VF-Cash` أو `Vodafone`
   - مرسل إنستاباي: `InstaPay` أو `IPN`
5. عنوان الطلب (Endpoint):
   `https://pay.ehabgm.sbs/api/device/sms`
6. حساب التوقيع (في Tasker بواسطة Javascriptlet):
   ```javascript
   const timestamp = Math.floor(Date.now() / 1000);
   const rawBody = JSON.stringify({
     sender: %SMSRF,
     rawText: %SMSRB,
     amount: parsedAmount,
     counterpartyPhone: parsedPhone,
     transactionId: parsedTxnId,
     receivedAt: new Date().toISOString()
   });
   const signature = CryptoJS.HmacSHA256(timestamp + "." + rawBody, deviceSecret).toString(CryptoJS.enc.Hex);
   ```
7. قم بإرسال الترويسات المطلوبة: `X-Device-Id`, `X-Timestamp`, `X-Signature`.
