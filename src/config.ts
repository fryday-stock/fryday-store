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
    apiKey: 'AIzaSyAtl68701X8p9IGWb5HHOYUvuN1U2H1Ti0',
    authDomain: 'fryday-store.firebaseapp.com',
    projectId: 'fryday-store',
    storageBucket: 'fryday-store.firebasestorage.app',
    messagingSenderId: '1079606124304',
    appId: '1:1079606124304:web:fcb7a56e91ffd471b80f95',
  },
}

/** بادئة كل مفاتيح localStorage حتى ما تتداخل ويا النظام القديم (inv_) على نفس الدومين */
export const LS = 'fstore_'
