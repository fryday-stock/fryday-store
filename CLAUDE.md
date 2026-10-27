# مخزن مطعم فرايدي — ملاحظات المشروع (للمطوّر و Claude)

نظام مخزن جديد لمطعم **FryDay (فرايدي)** بالنجف، مبني من الصفر. اللغة: عربي (لهجة عراقية بالمحادثة)، الواجهة كلها عربي RTL.

- الرابط: https://fryday-stock.github.io/fryday-store/
- المستودع: `fryday-stock/fryday-store` (عام). النشر تلقائي بـ GitHub Actions من فرع `main`.
- النظام القديم: `fryday-stock/fryday-stock.github.io` (مرجع فقط — **ما ينعدّل أبداً**). منطقه انتقل لهنا بنفس القرارات.
- قاعدة البيانات: Firebase (مشروع جديد) — Firestore + Authentication. بدون Firebase Storage (يحتاج خطة مدفوعة).

## التقنيات
- React 19 + Vite + TypeScript + Tailwind v4 + قطع shadcn/ui (`src/components/ui`) + قطع Magic UI (`src/components/magicui`: العداد، الظهور التدريجي، الدائرة).
- قطع 21st.dev تنضاف بأمر shadcn العادي: `npx shadcn add https://21st.dev/r/<author>/<component>` (بدون مفتاح API وبدون MCP، **ولا ينحط أي مفتاح بالمستودع**). `components.json` بيه registry `@21st`.
  - ملاحظة: بالجلسة الأولى كان `21st.dev` و`ui.shadcn.com` محجوبين بشبكة بيئة Claude، فالقطع انسحبت من مستودعات أصحابها على GitHub (shadcn-ui/ui و magicuidesign/magicui — نفس القطع المنشورة بـ 21st.dev) وانعدّلت لـ RTL و 48px.
- سكل التصميم: `.claude/skills/ui-ux-pro-max` (nextlevelbuilder/ui-ux-pro-max-skill، MIT). يُستخدم بكل قرار تصميم:
  `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain <style|color|typography|ux>`
- `xlsx-js-style` للاستيراد والتصدير المنسّق (ينحمّل بس عند الحاجة)، `vite-plugin-pwa` للـ PWA، `firebase` (modular SDK).

## الأوامر
```bash
npm install
npm run dev          # وضع تجربة (إذا config.ts فارغ)
npm run lint         # oxlint
npx tsc -p tsconfig.app.json --noEmit   # فحص الأنواع (tsc -b يستخدم كاش)
npm run build        # dist/ (tsc + vite + service worker)
VITE_FIREBASE_EMULATOR=127.0.0.1 npm run dev   # تشغيل على محاكي Firebase (firestore:8085, auth:9099, project demo-fryday)
```

## التصميم (أسلوب «د» — اختاره صاحب المشروع)
- مستوحى من نموذج **Borcelle Digital Wallet** اللي دزّه صاحب المشروع + فكرة دوائر السعة من الخيار «ب».
- قائمة جانبية رمادية غامقة `#262626` (على اليمين)، الصفحة الفعّالة شريط سماوي `#0ba5e9` بعرض القائمة.
- شريط علوي بتدرّج أزرق (`GRAD` بـ `kit.tsx`: من `#0ba5e9` لـ `#3a6cc6`) بيه العنوان والبحث والمستخدم.
- بطاقات بيضة بحواف ناعمة، رؤوس الجداول شريط بالتدرّج، الأزرار الرئيسية بالتدرّج.
- خط **Readex Pro** (محلي من @fontsource حتى يشتغل بدون إنترنت).
- كل الألوان متغيرات بـ `src/index.css` (`:root`) وتنربط بـ Tailwind بـ `@theme inline`. ألوان أنواع الحركات `--mv-*`.
- كل زر وحقل **48px على الأقل** (`h-12` / `size-12`). الموبايل والتابلت: شريط سفلي (الرئيسية، الأرصدة، زر «حركة» بالنص، المشتريات، المزيد).
- RTL: استخدم `ps/pe/ms/me/start/end` مو `pl/pr/left/right`. الأرقام والتواريخ داخل نص عربي تنعزل بـ `<bdi dir="ltr">` أو `ltr()`/`dtx()` من `format.ts`.
- صور المعاينة القديمة للأساليب الأربعة: `docs/design/`.

## هيكل الكود
| المسار | الدور |
|---|---|
| `src/config.ts` | اسم المطعم + إيميل حساب الأجهزة + إعدادات Firebase. **إذا `apiKey` فارغ = وضع تجربة**. بادئة localStorage `LS = 'fstore_'` |
| `src/lib/types.ts` | نموذج البيانات (نفس مجموعات Firestore) |
| `src/lib/backend/` | `local.ts` (وضع تجربة، localStorage) و `firebase.ts` (Firestore بكاش محلي persistentLocalCache) — نفس الواجهة `Backend` |
| `src/lib/store.ts` | الحالة العامة (useSyncExternalStore) + المستخدم + الصلاحيات `isAdmin()` `canEdit()` |
| `src/lib/calc.ts` | كل الحسابات: الأرصدة من الحركات، متوسط الكلفة، الحالة، جاهزية المخزن، كشف المورد، حساب الفاتورة |
| `src/lib/actions.ts` | كل عمليات الكتابة (حركات، فواتير، صور، تسديدات) — التعديل والحذف دائماً batch ويا `audit` |
| `src/lib/importer.ts` / `excel.ts` / `exports.ts` | الاستيراد من إكسل، التصدير المنسّق RTL |
| `src/lib/image.ts` | ضغط الصورة بالمتصفح لحوالي 250KB (JPEG، بحث ثنائي على الجودة + تصغير) |
| `src/lib/router.ts` | تنقّل بالـ hash (`#/stock/item/<id>`) حتى زر الرجوع يشتغل |
| `src/lib/persist.ts` | حالة واجهة تبقى بين الشاشات (فلاتر، مسودة الفاتورة/الحركة) |
| `src/components/app/` | `Shell` (الإطار)، `kit` (القطع المشتركة)، `dialogs` (نوافذ بأمر + `run()` + `askWhy()`)، `ItemPicker`، `Images` (كاميرا/معرض + عارض بالتكبير) |
| `src/screens/` | الشاشات |
| `firestore.rules` | قواعد الحماية (تنلصق يدوياً بـ Firebase Console) |
| `.github/workflows/deploy.yml` | البناء والنشر على GitHub Pages |
| `docs/FIREBASE.md` | خطوات إعداد Firebase لصاحب المشروع |

## الحماية (3 طبقات — مثل القديم)
1. **تفعيل الجهاز:** Firebase Auth بإيميل/باسورد لحساب واحد `device@fryday.iq`. كل جهاز يكتب كلمة سر المطعم مرة وحدة.
2. **الموظف:** اسم + رمز 4–6 أرقام، مخزّن SHA-256 (`pinHash` = sha256('fstore|' + الاسم + '|' + الرمز)). الدور `admin` أو `staff` + `canEdit`.
3. **القواعد:** فقط `request.auth.token.email == 'device@fryday.iq'`. الحركات والفواتير والتسديدات وصور الفواتير ما تنمسح أبداً؛ أي تحديث لازم يجي وياه سجل جديد بـ `audit` بنفس الـ batch (`lastAuditId` + `existsAfter`)، والسجل لازم بيه `why`. `audit` و`stocktakes` إضافة فقط. الموظفين والموردين ما ينمسحون (إيقاف).

### الصلاحيات (قرار صاحب المشروع)
- **الموظف يشوف كل شي يشوفه المدير** (الكلف، القيم، الجرد، التقارير، التعديلات والحذف، المشتريات).
- **للمدير فقط:** شاشة الإدارة (المواد، المخازن، الموظفين، الموردين، الاستيراد، النظام) + «رصيد افتتاحي».
- **التعديل والحذف:** للمدير وللموظف اللي عنده `canEdit`.
- الصلاحيات مفروضة بالواجهة؛ القواعد تضمن الجهاز والسجل وعدم المسح.

## نموذج البيانات (Firestore)
- `items`: `name, group, baseUnit, bigUnit, pack, minQty, active`
- `locations`: `name, order, active`
- `staff`: `name, role, pinHash, canEdit, active`
- `moves`: `ts, type, itemId, itemName, unit, qty, factor, baseQty, baseUnit, price, cost, fromLoc, toLoc, reason, ref, note, staffId, staffName` (+ لحركات الفاتورة: `invoiceId, supplierId, supplierName, invPrice, extra`) + عند التعديل/الحذف: `lastAuditId, editCount, editedBy, editedAt, deleted, deletedBy, deletedAt`
  - الأنواع: `opening` افتتاحي، `in` وارد (من الفاتورة فقط)، `out` صرف، `transfer` نقل، `waste` تالف، `return` مرتجع، `adjust` تسوية جرد (baseQty موقّع).
  - الأرصدة تنحسب من الحركات (`balances()`)، ما اكو رصيد مخزّن. متوسط الكلفة = Σ كلفة (in + opening) ÷ Σ baseQty.
- `suppliers`: `name, phone, note, active`
- `invoices`: `ts, date, supplierId, supplierName, ref, locId, note, lines[], subtotal, transport, loading, discount, total, payMode (paid|credit|partial), paid, moveIds, imageCount, staffId, staffName` + حقول التعديل/الحذف
  - كل سطر = حركة `in`. النقل + التحميل − الخصم تتوزع على الأسطر بنسبة قيمة كل سطر (`share`)، و`cost` = الإجمالي + الحصة.
  - حركات الفاتورة تتعدل/تنحذف من الفاتورة نفسها (batch: audit + الفاتورة + الحركات).
- `invoiceImages` (**جديد**): `ts, invoiceId, supplierId, data (data:image/jpeg;base64), w, h, bytes, staffId, staffName` — كل صورة وثيقة منفصلة (~250KB، القواعد ترفض فوق 700KB نص). ما تنحمّل ويا البيانات؛ تنجاب بـ `backend().images(invoiceId)` لما تنفتح الفاتورة أو كشف المورد. الحذف = `deleted` ويا audit (`kind: 'image'`).
- `payments`: `ts, date, supplierId, supplierName, amount, method (cash|transfer), note, staffId, staffName`
  - المتبقي بذمتي = Σ(total − paid) − Σ التسديدات (`supDue()`).
- `audit`: `ts, action (edit|delete), kind? (invoice|payment|image), moveId…, why, changed, summary, before, after, by, byId, moveTs, moveStaff`
- `stocktakes`: ملخص الجرد + `lines`

## الشاشات
الرئيسية (قيمة المخزون، صحة المخزون، آخر الحركات، جاهزية أماكن الخزن بدوائر، تحتاج طلب) · حركة جديدة · المشتريات (فاتورة جديدة/تعديل + صور، الفواتير، عرض فاتورة، الموردين ← كشف حساب + تسديد + صور) · الأرصدة (مجموعات، بحث بالمادة والمجموعة، فلتر المخزن، ملخص الكمية والقيمة) ← بطاقة المادة (الرصيد بعد كل حركة) · السجل · الجرد (كبيرة مقفلة + أساسية مفتوحة) · التقارير (شهري، لكل المخازن أو لمخزن واحد) · التعديلات والحذف · الإدارة*.

«جاهزية المخزن» بالدوائر = نسبة المواد اللي إلها رصيد بالمكان ورصيدها الكلي فوق حد الأمان (`locReadiness()`). ما اكو سعة مخزّنة لكل مكان.

## الاستيراد والتصدير
- القالب: المخزن، المجموعة، اسم المادة، الوحدة الأساسية، الوحدة الكبيرة، التعبئة، الرصيد (بالأساسية)، سعر الوحدة الأساسية، حد الأمان. شاشة مراجعة قبل الحفظ (أخطاء، تكرار، استيراد سابق). زر «تنزيل القالب».
- التصدير xlsx منسّق RTL (عنوان، رؤوس زرقاء، أسطر مجموعات، سطر مجموع SUM). النسخة الاحتياطية JSON (اختياري ويا الصور).

## بدون إنترنت
- Firestore بكاش محلي: القراءة والكتابة تشتغل بدون إنترنت وترتفع بعدين. العلامة بالشريط العلوي: متصل / غير متصل / بانتظار المزامنة.
- Service worker (vite-plugin-pwa) يخزن ملفات الموقع حتى يفتح بدون إنترنت، وينضاف للشاشة الرئيسية (manifest RTL).
- التفعيل أول مرة يحتاج إنترنت.

## الاختبار
- قبل ما تراوي صاحب المشروع أي شي: جرّب كل ميزة. بالجلسة الأولى انكتبت اختبارات Playwright (وضع التجربة: 58 فحص؛ على محاكي Firebase: 19 فحص؛ قواعد Firestore على المحاكي: 31 فحص) — كانت بمجلد مؤقت، تنعاد كتابتها عند الحاجة بنفس الفكرة.
- Chromium و Playwright منصّبين بالبيئة (`require('playwright')`).

## قرارات صاحب المشروع
- يفضّل خطوات واضحة وحدة وحدة، وصراحة بالرأي، وتقليل الخيارات.
- الموقعين على نفس الدومين: كل مفاتيح localStorage تبدي بـ `fstore_` (القديم يستخدم `inv_`).
- الوارد بفاتورة المشتريات فقط.
- التصفير يتم من Firebase Console (حذف collections عدا `staff`)، مو من الموقع.

## أفكار مطروحة
- سعة حقيقية لكل مخزن (حالياً الدوائر = نسبة المواد الكافية).
- ربط الموظف بمخزن معيّن.
- فرض الصلاحيات بالقواعد نفسها (Custom claims أو حساب لكل موظف).
- استبدال اللوغو بالملف الأصلي (الحالي 256px).
