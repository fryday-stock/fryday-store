// وضع التجربة: كل البيانات بـ localStorage على هذا الجهاز (المفاتيح تبدي بـ fstore_)
import { LS } from '@/config'
import type { AnyCol, Col, InvoiceImage, Op } from '../types'
import type { Backend } from './types'

const key = (c: AnyCol) => `${LS}db_${c}`
type Row = Record<string, unknown> & { id: string }

export function localBackend(): Backend {
  const read = (c: AnyCol): Row[] => {
    try { return JSON.parse(localStorage.getItem(key(c)) || '[]') } catch { return [] }
  }
  const subs = new Map<string, Set<(rows: unknown[]) => void>>()
  const notify = (c: AnyCol) => subs.get(c)?.forEach(cb => cb(read(c)))
  const write = (c: AnyCol, rows: Row[]) => {
    try { localStorage.setItem(key(c), JSON.stringify(rows)) }
    catch { throw new Error('ذاكرة المتصفح امتلت (وضع التجربة). احذف بيانات التجربة أو اربط Firebase') }
  }
  window.addEventListener('storage', e => {
    const c = (e.key || '').replace(`${LS}db_`, '') as AnyCol
    if (e.key?.startsWith(`${LS}db_`)) notify(c)
  })
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10)

  const apply = (ops: Op[]) => {
    const touched = new Map<AnyCol, Row[]>()
    const get = (c: AnyCol) => { if (!touched.has(c)) touched.set(c, read(c)); return touched.get(c)! }
    for (const o of ops) {
      const rows = get(o.col)
      if (o.type === 'set') {
        const i = rows.findIndex(r => r.id === o.id), row = { ...o.data, id: o.id }
        if (i >= 0) rows[i] = row; else rows.push(row)
      } else {
        const i = rows.findIndex(r => r.id === o.id)
        if (i < 0) throw new Error(`ما لكيت السجل ${o.col}/${o.id}`)
        rows[i] = { ...rows[i], ...o.data }
      }
    }
    // كل العمليات تنكتب سوية أو لا (مثل batch بـ Firestore)
    const backup = new Map([...touched.keys()].map(c => [c, localStorage.getItem(key(c))]))
    try { for (const [c, rows] of touched) write(c, rows) }
    catch (e) { for (const [c, v] of backup) { if (v == null) localStorage.removeItem(key(c)); else localStorage.setItem(key(c), v) } throw e }
    for (const c of touched.keys()) notify(c)
  }

  return {
    mode: 'local',
    authed: () => true,
    async signIn() {},
    async signOut() {},
    watch(c: Col, cb) {
      if (!subs.has(c)) subs.set(c, new Set())
      subs.get(c)!.add(cb)
      queueMicrotask(() => cb(read(c)))
      return () => { subs.get(c)?.delete(cb) }
    },
    async add(c, data) { const id = uid(); apply([{ type: 'set', col: c, id, data }]); return id },
    async update(c, id, patch) { apply([{ type: 'update', col: c, id, data: patch }]) },
    async remove(c, id) { write(c, read(c).filter(r => r.id !== id)); notify(c) },
    async batch(ops) { apply(ops) },
    newId: uid,
    async images(invoiceId) {
      return (read('invoiceImages') as unknown as InvoiceImage[]).filter(x => x.invoiceId === invoiceId && !x.deleted).sort((a, b) => a.ts - b.ts)
    },
    onPending() { return () => {} },
  }
}
