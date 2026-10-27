# ربط النظام بـ Firebase — خطوة بخطوة

كل شي مجاني (خطة Spark). ما نحتاج Firebase Storage لأن الصور تنحفظ داخل Firestore.

## 1) إنشاء المشروع
1. ادخل https://console.firebase.google.com بحساب Gmail.
2. **Create a project** ← اكتب اسم (مثلاً `fryday-store`) ← Continue.
3. Google Analytics: **Off** ← **Create project** ← Continue.

## 2) قاعدة البيانات (Firestore)
1. من القائمة: **Build ← Firestore Database ← Create database**.
2. Edition: **Standard**. Location: اختر قريب، مثلاً `europe-west3 (Frankfurt)` ← Next.
3. اختر **Start in production mode** ← **Create**.
4. افتح تبويب **Rules**، امسح كل الموجود، والصق محتوى ملف `firestore.rules` من المستودع ← **Publish**.

## 3) حساب المطعم (تفعيل الأجهزة)
1. من القائمة: **Build ← Authentication ← Get started**.
2. تبويب **Sign-in method** ← **Email/Password** ← فعّل **Enable** (الأول فقط) ← **Save**.
3. تأكد إن **Anonymous** مطفي.
4. تبويب **Users** ← **Add user**:
   - Email: `device@fryday.iq`
   - Password: كلمة سر قوية (هذي «كلمة سر المطعم» اللي تفعّل بيها كل جهاز). احفظها بمكان آمن.
5. (مستحسن) تبويب **Settings ← User actions**: طفّي **Enable create (sign-up)** حتى محد يكدر يسوي حساب جديد.

## 4) إعدادات الويب
1. اضغط ⚙️ **Project settings** ← بالأسفل **Your apps** ← أيقونة الويب `</>`.
2. App nickname: `fryday-store` ← **Register app** (لا تأشّر Hosting).
3. ينطيك كود بيه `const firebaseConfig = { apiKey: ..., authDomain: ..., projectId: ..., storageBucket: ..., messagingSenderId: ..., appId: ... }`.
4. **انسخ القيم الست ودزّها لـ Claude** (أو حطها بملف `src/config.ts` بخانة `firebase`).
   - هذي القيم مو سرّية؛ عادي تنحط بالمستودع العام. الحماية بالقواعد وبكلمة سر المطعم.

## 5) الدومين المسموح
1. **Authentication ← Settings ← Authorized domains** ← **Add domain** ← `fryday-stock.github.io`.

## 6) النشر (GitHub Pages)
1. بالمستودع `fryday-stock/fryday-store`: **Settings ← Pages** ← Source: **GitHub Actions**.
2. بعد دمج الشغل بفرع `main` يبني وينشر تلقائياً. الرابط: https://fryday-stock.github.io/fryday-store/

## 7) أول تشغيل
1. افتح الرابط ← فعّل الجهاز بكلمة سر المطعم ← أنشئ حساب المدير (اسم + رمز).
2. **الإدارة ← الاستيراد**: نزّل القالب أو ارفع ملف الإكسل القديم ← راجع ← استيراد.
3. **الإدارة ← الموظفين**: أضف كل موظف برمز خاص، وأشّر «يعدّل ويحذف» للي تريده.
4. على التابلت والموبايل: افتح الرابط بكروم ← ⋮ ← **Add to Home screen / تثبيت التطبيق**. بالآيفون: Safari ← مشاركة ← **إضافة إلى الشاشة الرئيسية**.

## ملاحظات
- أي جهاز جديد يحتاج كلمة سر المطعم مرة وحدة، والتفعيل يحتاج إنترنت. بعدها يشتغل حتى لو انقطع الإنترنت ويرفع أول ما يرجع.
- لإلغاء تفعيل جهاز ضاع: غيّر كلمة سر `device@fryday.iq` من Authentication ← Users، وفعّل باقي الأجهزة من جديد.
- النسخة الاحتياطية: **الإدارة ← النظام ← تنزيل نسخة احتياطية** كل أسبوع.
- حدود الخطة المجانية (يومياً): 50 ألف قراءة و20 ألف كتابة و1GB تخزين — تكفي مطعم واحد بسهولة. كل صورة ~250KB، يعني 1GB ≈ 4000 صورة.
