// Firebase: Firestore (مع كاش محلي للشغل بدون إنترنت) + Authentication بحساب المطعم
import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import {
  collection, connectFirestoreEmulator, deleteDoc, doc, getDocs, initializeFirestore, onSnapshot, onSnapshotsInSync, persistentLocalCache,
  persistentMultipleTabManager, query, updateDoc, where, writeBatch, type Firestore,
} from 'firebase/firestore'
import type { InvoiceImage } from '../types'
import type { Backend } from './types'

export async function firebaseBackend(cfg: Record<string, string>, deviceEmail: string, emulator?: string): Promise<Backend> {
  const app = initializeApp(cfg)
  let db: Firestore
  try { db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }) }
  catch { db = initializeFirestore(app, {}) }
  const auth = getAuth(app)
  // للتجربة على جهاز المطوّر فقط (VITE_FIREBASE_EMULATOR=127.0.0.1)
  if (emulator) { connectFirestoreEmulator(db, emulator, 8085); connectAuthEmulator(auth, `http://${emulator}:9099`, { disableWarnings: true }) }
  await new Promise<void>(r => { const un = onAuthStateChanged(auth, () => { un(); r() }) })

  // مراقبة الكتابات اللي بعدها ما ترفعت
  const pendingCols = new Map<string, boolean>()
  const pendSubs = new Set<(p: boolean) => void>()
  const emitPending = () => { const p = [...pendingCols.values()].some(Boolean); pendSubs.forEach(f => f(p)) }

  return {
    mode: 'firebase',
    authed: () => !!auth.currentUser && !auth.currentUser.isAnonymous && auth.currentUser.email === deviceEmail,
    async signIn(email, pass) { await signInWithEmailAndPassword(auth, email, pass) },
    async signOut() { await signOut(auth) },
    watch(c, cb, onErr) {
      return onSnapshot(collection(db, c), { includeMetadataChanges: true }, s => {
        pendingCols.set(c, s.metadata.hasPendingWrites); emitPending()
        cb(s.docs.map(d => ({ ...d.data(), id: d.id })))
      }, e => onErr?.(e))
    },
    async add(c, data) {
      // ما ننتظر تأكيد السيرفر حتى يشتغل بدون إنترنت (الكتابة تنحفظ محلياً وترتفع بعدين)
      const ref = doc(collection(db, c))
      const p = writeBatch(db).set(ref, data).commit()
      if (navigator.onLine) await p; else p.catch(e => console.error(e))
      return ref.id
    },
    async update(c, id, patch) { const p = updateDoc(doc(db, c, id), patch); if (navigator.onLine) await p; else p.catch(console.error) },
    async remove(c, id) { await deleteDoc(doc(db, c, id)) },
    async batch(ops) {
      for (let i = 0; i < ops.length; i += 450) {
        const b = writeBatch(db)
        for (const o of ops.slice(i, i + 450)) { const ref = doc(db, o.col, o.id); if (o.type === 'set') b.set(ref, o.data); else b.update(ref, o.data) }
        const p = b.commit()
        if (navigator.onLine) await p; else p.catch(console.error)
      }
    },
    newId: () => doc(collection(db, 'audit')).id,
    async images(invoiceId) {
      const s = await getDocs(query(collection(db, 'invoiceImages'), where('invoiceId', '==', invoiceId)))
      return s.docs.map(d => ({ ...(d.data() as Omit<InvoiceImage, 'id'>), id: d.id })).filter(x => !x.deleted).sort((a, b) => a.ts - b.ts)
    },
    onPending(cb) {
      pendSubs.add(cb)
      const un = onSnapshotsInSync(db, emitPending)
      return () => { pendSubs.delete(cb); un() }
    },
  }
}
