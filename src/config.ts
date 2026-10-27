// إعدادات الموقع
// ─────────────────────────────────────────────
// إعدادات Firebase تنكتب هنا (المرحلة الثالثة). مفاتيح Firebase للويب مو سرّية
// (الحماية بالقواعد firestore.rules وبحساب الجهاز)، فعادي تنحط بالمستودع العام.
// إذا apiKey فارغ يشتغل «وضع تجربة» والبيانات تنحفظ على هذا الجهاز فقط.

export const CONFIG = {
  title: 'مخزن مطعم فرايدي',
  shortTitle: 'مخزن فرايدي',

  // إيميل حساب المطعم اللي ينسوّى بـ Firebase ← Authentication ← Users
  deviceEmail: 'device@fryday.iq',

  firebase: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  },
}

/** بادئة كل مفاتيح localStorage حتى ما تتداخل ويا النظام القديم (inv_) على نفس الدومين */
export const LS = 'fstore_'
