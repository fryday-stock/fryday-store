// كل عمليات الكتابة. أي تعديل أو حذف ينكتب وياه سجل audit بنفس الـ batch
// (القواعد ترفض التحديث بدون lastAuditId جديد موجود فعلاً بـ audit)
import { PAY_METHODS, PAY_MODES, TYPES, needFrom, needPrice, needTo } from './constants'
import { factorOf, invCalc, itemById, locName, mName, supById, type InvDraft } from './calc'
import { dateTs, fmt, money, parseNum, r3, today } from './format'
import { backend, getState } from './store'
import type { Audit, Invoice, InvoiceImage, Move, MoveType, Op, Payment, PayMethod } from './types'

const me = () => { const u = getState().user!; return { staffId: u.id, staffName: u.name } }
const by = () => { const u = getState().user!; return { by: u.name, byId: u.id } }

export class UserError extends Error {}
const fail = (msg: string): never => { throw new UserError(msg) }

/* ───────── الحركات ───────── */
export interface MoveDraft { type: MoveType; itemId: string; unit: string; qty: string; price: string; fromLoc: string; toLoc: string; reason: string; note: string; ref: string }

export function moveCalc(d: Pick<MoveDraft, 'itemId' | 'unit' | 'qty' | 'price'>) {
  const s = getState(), it = itemById(s, d.itemId)
  const factor = factorOf(it, d.unit), qty = parseNum(d.qty)
  return { it, factor, qty, baseQty: r3(qty * factor), cost: parseNum(d.price) * qty }
}

export function validateMove(d: MoveDraft) {
  const { it, qty } = moveCalc(d)
  if (!it) fail('اختر المادة')
  if (!(qty > 0)) fail('اكتب الكمية')
  if (needFrom(d.type) && !d.fromLoc) fail('اختر المكان')
  if (needTo(d.type) && !d.toLoc) fail('اختر المكان اللي تدخل له')
  if (d.type === 'transfer' && d.fromLoc === d.toLoc) fail('مكان النقل لازم يختلف')
  if (needPrice(d.type) && !(parseNum(d.price) > 0)) fail('اكتب السعر')
  if ((d.type === 'out' || d.type === 'waste') && !d.reason) fail('اختر السبب')
}

export async function saveMove(d: MoveDraft) {
  validateMove(d)
  const { it, factor, qty, baseQty, cost } = moveCalc(d)
  const p = needPrice(d.type)
  const doc: Omit<Move, 'id'> = {
    ts: Date.now(), type: d.type, itemId: it!.id, itemName: it!.name, unit: d.unit || it!.baseUnit, qty: r3(qty), factor, baseQty, baseUnit: it!.baseUnit,
    price: p ? parseNum(d.price) : 0, cost: p ? Math.round(cost) : 0,
    fromLoc: needFrom(d.type) ? d.fromLoc : '', toLoc: needTo(d.type) ? d.toLoc : '',
    reason: d.type === 'out' || d.type === 'waste' ? d.reason : '', ref: p ? d.ref.trim() : '', note: d.note.trim(), ...me(),
  }
  await backend().add('moves', doc as unknown as Record<string, unknown>)
  return doc
}

export const AUD_FIELDS: Record<string, string> = { unit: 'الوحدة', qty: 'الكمية', price: 'السعر', fromLoc: 'من مكان', toLoc: 'إلى مكان', reason: 'السبب', note: 'ملاحظة', ref: 'الوصل' }
export const audVal = (k: string, v: unknown) => (k === 'fromLoc' || k === 'toLoc') ? (v ? locName(getState(), String(v)) : '—') : (k === 'qty' || k === 'price') ? fmt(v) : (String(v ?? '') || '—')
const moveSnap = (m: Partial<Move>) => ({ unit: m.unit, qty: m.qty, factor: m.factor, baseQty: m.baseQty, price: m.price || 0, cost: m.cost || 0, fromLoc: m.fromLoc || '', toLoc: m.toLoc || '', reason: m.reason || '', note: m.note || '', ref: m.ref || '' })

export async function editMove(m: Move, d: MoveDraft, why: string) {
  if (!why.trim()) fail('اكتب سبب التعديل')
  validateMove({ ...d, type: m.type, itemId: m.itemId })
  const s = getState(), it = itemById(s, m.itemId)!
  const qty = parseNum(d.qty), factor = factorOf(it, d.unit), p = needPrice(m.type), price = p ? parseNum(d.price) : 0
  const after = {
    unit: d.unit, qty: r3(qty), factor, baseQty: r3(qty * factor), price, cost: p ? Math.round(price * qty) : 0,
    fromLoc: needFrom(m.type) ? d.fromLoc : '', toLoc: needTo(m.type) ? d.toLoc : '',
    reason: m.type === 'out' || m.type === 'waste' ? d.reason : (m.reason || ''), note: d.note.trim(), ref: p ? d.ref.trim() : (m.ref || ''),
  }
  const before = moveSnap(m)
  const changed = Object.keys(AUD_FIELDS).filter(k => String(before[k as keyof typeof before] ?? '') !== String(after[k as keyof typeof after] ?? ''))
  if (!changed.length) fail('ما غيّرت شي')
  const aid = backend().newId()
  await backend().batch([
    { type: 'set', col: 'audit', id: aid, data: { ts: Date.now(), action: 'edit', moveId: m.id, moveType: m.type, itemId: m.itemId, itemName: mName(s, m), moveTs: m.ts, moveStaff: m.staffName, ...by(), why: why.trim(), changed, before, after } },
    { type: 'update', col: 'moves', id: m.id, data: { ...after, lastAuditId: aid, editCount: (m.editCount || 0) + 1, editedBy: getState().user!.name, editedAt: Date.now() } },
  ])
}

export async function deleteMove(m: Move, why: string) {
  if (!why.trim()) fail('اكتب سبب الحذف')
  const s = getState(), aid = backend().newId()
  await backend().batch([
    { type: 'set', col: 'audit', id: aid, data: { ts: Date.now(), action: 'delete', moveId: m.id, moveType: m.type, itemId: m.itemId, itemName: mName(s, m), moveTs: m.ts, moveStaff: m.staffName, ...by(), why: why.trim(), before: moveSnap(m) } },
    { type: 'update', col: 'moves', id: m.id, data: { deleted: true, deletedBy: s.user!.name, deletedAt: Date.now(), lastAuditId: aid } },
  ])
}

/* ───────── فواتير المشتريات ───────── */
export interface PendingImage { data: string; w: number; h: number; bytes: number }

const invSnap = (v: Partial<Invoice>) => ({
  supplierId: v.supplierId, supplierName: v.supplierName, ref: v.ref || '', date: v.date, locId: v.locId, note: v.note || '', transport: v.transport || 0, loading: v.loading || 0, discount: v.discount || 0,
  subtotal: v.subtotal, total: v.total, payMode: v.payMode, paid: v.paid,
  lines: (v.lines || []).map(l => ({ moveId: l.moveId, itemId: l.itemId, itemName: l.itemName, unit: l.unit, qty: l.qty, price: l.price, total: l.total })),
})
type Snap = ReturnType<typeof invSnap>
function invDiff(a: Snap, b: Snap) {
  const s = getState(), out: string[] = []
  const f = (label: string, x: unknown, y: unknown) => { if (String(x ?? '') !== String(y ?? '')) out.push(`${label}: ${x || '—'} ← ${y || '—'}`) }
  f('المورد', a.supplierName, b.supplierName); f('رقم الوصل', a.ref, b.ref); f('التاريخ', a.date, b.date); f('المخزن', locName(s, a.locId!), locName(s, b.locId!)); f('ملاحظة', a.note, b.note)
  f('النقل', money(a.transport), money(b.transport)); f('التحميل', money(a.loading), money(b.loading)); f('الخصم', money(a.discount), money(b.discount))
  f('الدفع', PAY_MODES[a.payMode!], PAY_MODES[b.payMode!]); f('المدفوع', money(a.paid), money(b.paid)); f('الإجمالي', money(a.total), money(b.total))
  const key = (l: Snap['lines'][number]) => l.moveId || l.itemId
  const am = new Map(a.lines.map(l => [key(l), l])), bm = new Map(b.lines.map(l => [key(l), l]))
  for (const [k, l] of am) {
    const n = bm.get(k)
    if (!n) out.push(`شال سطر: ${l.itemName} ${fmt(l.qty)} ${l.unit}`)
    else if (n.itemId !== l.itemId || n.unit !== l.unit || +n.qty !== +l.qty || +n.price !== +l.price) out.push(`${l.itemName}: ${fmt(l.qty)} ${l.unit} × ${money(l.price)} ← ${n.itemName}: ${fmt(n.qty)} ${n.unit} × ${money(n.price)}`)
  }
  for (const [k, l] of bm) if (!am.has(k)) out.push(`ضاف سطر: ${l.itemName} ${fmt(l.qty)} ${l.unit} × ${money(l.price)}`)
  return out
}

export function validateInvoice(inv: InvDraft) {
  const s = getState(), c = invCalc(s, inv, parseNum)
  if (!supById(s, inv.supplierId)) fail('اختر المورد')
  if (!inv.date) fail('اختر التاريخ')
  if (inv.date > today()) fail('التاريخ ما يصير بالمستقبل')
  if (!inv.locId) fail('اختر المخزن')
  const lines = c.lines.filter(l => l.itemId || l.qty || l.price)
  if (!lines.length) fail('أضف مادة وحدة على الأقل')
  lines.forEach((l, n) => {
    if (!l.it) fail(`السطر ${n + 1}: اختر المادة`)
    if (!(l.qty > 0)) fail(`السطر ${n + 1}: اكتب الكمية`)
    if (!(l.price > 0)) fail(`السطر ${n + 1}: اكتب السعر`)
  })
  if ([c.transport, c.loading, c.discount].some(v => v < 0)) fail('المبالغ الإضافية والخصم ما تكون سالبة')
  if (c.total <= 0) fail('الخصم أكبر من قيمة الفاتورة')
  if (inv.payMode === 'partial' && !(parseNum(inv.paid) > 0 && parseNum(inv.paid) < c.total)) fail('المبلغ المدفوع لازم يكون أكثر من صفر وأقل من الإجمالي')
  return { c, lines }
}

export async function saveInvoice(inv: InvDraft, images: PendingImage[], why = '') {
  const s = getState(), B = backend()
  const { c, lines } = validateInvoice(inv)
  const sup = supById(s, inv.supplierId)!
  const old = inv.id ? s.invoices.find(x => x.id === inv.id) : undefined
  if (old && !why.trim()) fail('اكتب سبب التعديل')
  const ts = old && old.date === inv.date ? old.ts : dateTs(inv.date)
  const now = Date.now(), invId = old ? old.id : B.newId(), ops: Op[] = []
  const recLines = lines.map(l => ({
    moveId: l.moveId || B.newId(), itemId: l.it!.id, itemName: l.it!.name, unit: l.unit || l.it!.baseUnit, qty: r3(l.qty), factor: l.factor, baseQty: l.baseQty, baseUnit: l.it!.baseUnit,
    price: l.price, total: Math.round(l.total), share: Math.round(l.share), cost: Math.round(l.cost),
  }))
  const head = {
    ts, date: inv.date, supplierId: sup.id, supplierName: sup.name, ref: inv.ref.trim(), locId: inv.locId, note: inv.note.trim(),
    lines: recLines, subtotal: Math.round(c.subtotal), transport: c.transport, loading: c.loading, discount: c.discount, total: Math.round(c.total), payMode: inv.payMode, paid: Math.round(c.paid),
    imageCount: (old?.imageCount || 0) + images.length,
  }
  const moveDoc = (l: (typeof recLines)[number]) => ({
    ts, type: 'in', itemId: l.itemId, itemName: l.itemName, unit: l.unit, qty: l.qty, factor: l.factor, baseQty: l.baseQty, baseUnit: l.baseUnit,
    price: l.qty ? Math.round(l.cost / l.qty * 100) / 100 : 0, cost: l.cost, fromLoc: '', toLoc: inv.locId, reason: '', ref: head.ref, note: '',
    invoiceId: invId, supplierId: sup.id, supplierName: sup.name, invPrice: l.price, extra: l.share,
  })
  const imgOps = images.map((im): Op => ({ type: 'set', col: 'invoiceImages', id: B.newId(), data: { ts: now, invoiceId: invId, supplierId: sup.id, ...im, ...me() } }))
  if (!old) {
    ops.push({ type: 'set', col: 'invoices', id: invId, data: { ...head, moveIds: recLines.map(l => l.moveId), ...me() } })
    recLines.forEach(l => ops.push({ type: 'set', col: 'moves', id: l.moveId, data: { ...moveDoc(l), ...me() } }))
  } else {
    const before = invSnap(old), after = invSnap({ ...old, ...head } as Invoice), summary = invDiff(before, after)
    if (images.length) summary.push(`ضاف ${images.length} صورة`)
    if (!summary.length) fail('ما غيّرت شي')
    const aid = B.newId(), edit = { lastAuditId: aid, editedBy: s.user!.name, editedAt: now }
    ops.push({ type: 'set', col: 'audit', id: aid, data: { ts: now, action: 'edit', kind: 'invoice', invoiceId: old.id, supplierName: sup.name, ref: head.ref, moveTs: old.ts, moveStaff: old.staffName, ...by(), why: why.trim(), summary, before, after } })
    ops.push({ type: 'update', col: 'invoices', id: old.id, data: { ...head, moveIds: recLines.map(l => l.moveId), ...edit, editCount: (old.editCount || 0) + 1 } })
    const keep = new Set(recLines.map(l => l.moveId))
    for (const id of old.moveIds || []) if (!keep.has(id)) ops.push({ type: 'update', col: 'moves', id, data: { deleted: true, deletedBy: s.user!.name, deletedAt: now, lastAuditId: aid } })
    for (const l of recLines) {
      const prev = s.allMoves.find(m => m.id === l.moveId)
      if (prev) ops.push({ type: 'update', col: 'moves', id: l.moveId, data: { ...moveDoc(l), ...edit, editCount: (prev.editCount || 0) + 1 } })
      else ops.push({ type: 'set', col: 'moves', id: l.moveId, data: { ...moveDoc(l), ...me() } })
    }
  }
  // الصور بـ batch منفصل حتى ما يكبر طلب الفاتورة (حد Firestore 10MB للطلب)
  await B.batch(ops)
  for (let i = 0; i < imgOps.length; i += 8) await B.batch(imgOps.slice(i, i + 8))
  return { total: head.total, lines: recLines.length, id: invId }
}

export async function deleteInvoice(v: Invoice, why: string) {
  if (!why.trim()) fail('اكتب سبب الحذف')
  const s = getState(), B = backend(), aid = B.newId(), now = Date.now()
  const del = { deleted: true, deletedBy: s.user!.name, deletedAt: now, lastAuditId: aid }
  const ops: Op[] = [
    { type: 'set', col: 'audit', id: aid, data: { ts: now, action: 'delete', kind: 'invoice', invoiceId: v.id, supplierName: v.supplierName, ref: v.ref || '', moveTs: v.ts, moveStaff: v.staffName, ...by(), why: why.trim(), before: invSnap(v) } },
    { type: 'update', col: 'invoices', id: v.id, data: del },
  ]
  for (const id of v.moveIds || []) if (s.allMoves.some(m => m.id === id && !m.deleted)) ops.push({ type: 'update', col: 'moves', id, data: del })
  await B.batch(ops)
}

/** إضافة صور لفاتورة محفوظة (بدون تعديل الفاتورة نفسها) */
export async function addInvoiceImages(v: Invoice, images: PendingImage[]) {
  const B = backend(), now = Date.now()
  for (let i = 0; i < images.length; i += 8)
    await B.batch(images.slice(i, i + 8).map(im => ({ type: 'set', col: 'invoiceImages', id: B.newId(), data: { ts: now, invoiceId: v.id, supplierId: v.supplierId, ...im, ...me() } })))
}
/** حذف صورة: تنعلّم محذوفة ويا سجل */
export async function deleteInvoiceImage(v: Invoice, img: InvoiceImage, why: string) {
  if (!why.trim()) fail('اكتب سبب الحذف')
  const s = getState(), B = backend(), aid = B.newId(), now = Date.now()
  await B.batch([
    { type: 'set', col: 'audit', id: aid, data: { ts: now, action: 'delete', kind: 'image', invoiceId: v.id, imageId: img.id, supplierName: v.supplierName, ref: v.ref || '', moveTs: img.ts, moveStaff: img.staffName, ...by(), why: why.trim(), before: { bytes: img.bytes, w: img.w, h: img.h } } },
    { type: 'update', col: 'invoiceImages', id: img.id, data: { deleted: true, deletedBy: s.user!.name, deletedAt: now, lastAuditId: aid } },
  ])
}

/* ───────── التسديدات ───────── */
export async function savePayment(supplierId: string, d: { amount: string; date: string; method: PayMethod; note: string }, p?: Payment, why = '') {
  const s = getState(), B = backend(), sup = supById(s, supplierId)!
  const amount = Math.round(parseNum(d.amount))
  if (!(amount > 0)) fail('اكتب المبلغ')
  if (!d.date || d.date > today()) fail('اختر تاريخ صحيح')
  const doc = { ts: p && p.date === d.date ? p.ts : dateTs(d.date), date: d.date, supplierId: sup.id, supplierName: sup.name, amount, method: d.method, note: d.note.trim() }
  if (!p) return void (await B.add('payments', { ...doc, ...me() }))
  if (!why.trim()) fail('اكتب سبب التعديل')
  const snap = (x: { amount: number; date: string; method: PayMethod; note?: string }) => ({ amount: x.amount, date: x.date, method: x.method, note: x.note || '' })
  const before = snap(p), after = snap(doc)
  const summary = ([['المبلغ', money(before.amount), money(after.amount)], ['التاريخ', before.date, after.date], ['الطريقة', PAY_METHODS[before.method], PAY_METHODS[after.method]], ['ملاحظة', before.note, after.note]] as const)
    .filter(x => String(x[1]) !== String(x[2])).map(x => `${x[0]}: ${x[1] || '—'} ← ${x[2] || '—'}`)
  if (!summary.length) fail('ما غيّرت شي')
  const aid = B.newId(), now = Date.now()
  await B.batch([
    { type: 'set', col: 'audit', id: aid, data: { ts: now, action: 'edit', kind: 'payment', paymentId: p.id, supplierName: sup.name, moveTs: p.ts, moveStaff: p.staffName, ...by(), why: why.trim(), summary, before, after } },
    { type: 'update', col: 'payments', id: p.id, data: { ...doc, lastAuditId: aid, editCount: (p.editCount || 0) + 1, editedBy: s.user!.name, editedAt: now } },
  ])
}
export async function deletePayment(p: Payment, why: string) {
  if (!why.trim()) fail('اكتب سبب الحذف')
  const s = getState(), B = backend(), aid = B.newId(), now = Date.now()
  await B.batch([
    { type: 'set', col: 'audit', id: aid, data: { ts: now, action: 'delete', kind: 'payment', paymentId: p.id, supplierName: p.supplierName, moveTs: p.ts, moveStaff: p.staffName, ...by(), why: why.trim(), before: { amount: p.amount, date: p.date, method: p.method, note: p.note || '' } } },
    { type: 'update', col: 'payments', id: p.id, data: { deleted: true, deletedBy: s.user!.name, deletedAt: now, lastAuditId: aid } },
  ])
}

export const moveLabel = (t: MoveType) => TYPES[t]?.label || t
export type { Audit }
