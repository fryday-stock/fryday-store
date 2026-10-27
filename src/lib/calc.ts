// كل الحسابات: الأرصدة تنحسب من الحركات (ما اكو رصيد مخزّن)
import { NOGRP } from './constants'
import { normTxt, r3 } from './format'
import type { State } from './store'
import type { Invoice, Item, Location, Move, PayMode, Payment } from './types'

const EPS = 0.0005

/** [[locId, deltaBase], ...] */
export function moveEffects(m: Pick<Move, 'type' | 'baseQty' | 'fromLoc' | 'toLoc'>): [string, number][] {
  const q = Number(m.baseQty) || 0
  switch (m.type) {
    case 'in': case 'opening': return [[m.toLoc, q]]
    case 'out': case 'waste': case 'return': return [[m.fromLoc, -q]]
    case 'transfer': return [[m.fromLoc, -q], [m.toLoc, q]]
    case 'adjust': return [[m.toLoc, q]] // موقّع
    default: return []
  }
}

// كاش حسب مصفوفة الحركات (تتغير بس لما تتغير البيانات)
const balCache = new WeakMap<Move[], Map<string, number>>()
export function balances(moves: Move[]) {
  let map = balCache.get(moves)
  if (map) return map
  map = new Map()
  for (const m of moves) for (const [loc, d] of moveEffects(m)) {
    const k = m.itemId + '|' + loc
    map.set(k, (map.get(k) || 0) + d)
  }
  balCache.set(moves, map)
  return map
}
export const balAt = (bal: Map<string, number>, itemId: string, locId: string) => bal.get(itemId + '|' + locId) || 0

const totCache = new WeakMap<Map<string, number>, Map<string, number>>()
export function totalsByItem(bal: Map<string, number>) {
  let t = totCache.get(bal)
  if (t) return t
  t = new Map()
  for (const [k, v] of bal) { const id = k.split('|')[0]; t.set(id, (t.get(id) || 0) + v) }
  totCache.set(bal, t)
  return t
}

const avgCache = new WeakMap<Move[], Map<string, number>>()
/** متوسط الكلفة = مجموع كلفة (وارد + افتتاحي) ÷ مجموع الكمية الأساسية */
export function avgCosts(moves: Move[]) {
  let out = avgCache.get(moves)
  if (out) return out
  const c = new Map<string, { cost: number; q: number }>()
  for (const m of moves) if (m.type === 'in' || m.type === 'opening') {
    const x = c.get(m.itemId) || { cost: 0, q: 0 }
    x.cost += Number(m.cost) || 0; x.q += Number(m.baseQty) || 0
    c.set(m.itemId, x)
  }
  out = new Map()
  for (const [id, x] of c) out.set(id, x.q ? x.cost / x.q : 0)
  avgCache.set(moves, out)
  return out
}

export type StatusKey = 'ok' | 'low' | 'out' | 'neg'
export function status(it: Item, q: number): [StatusKey, string] {
  if (q < -EPS) return ['neg', 'رصيد سالب']
  if (Math.abs(q) < EPS) return ['out', 'نفذ']
  if (Number(it.minQty) > 0 && q <= Number(it.minQty)) return ['low', 'دون حد الأمان']
  return ['ok', 'كافٍ']
}
export const isZero = (q: number) => Math.abs(q) < EPS

export const packOf = (it?: Item | null) => (it?.bigUnit && Number(it.pack) > 0 ? Number(it.pack) : 1)
export const unitsOf = (it?: Item | null) => (it ? [it.baseUnit, ...(it.bigUnit && Number(it.pack) > 0 ? [it.bigUnit] : [])] : [])
export const factorOf = (it: Item | undefined | null, unit: string) => (it && unit && unit === it.bigUnit ? packOf(it) : 1)
/** «3 كرتون + 5 كغم» */
export function detailed(it: Item | undefined, q: number) {
  const p = packOf(it)
  if (!it || p <= 1 || q < p) return ''
  const big = Math.floor(r3(q) / p), rest = r3(q - big * p)
  return `${big.toLocaleString('en-US')} ${it.bigUnit}` + (rest ? ` + ${rest.toLocaleString('en-US', { maximumFractionDigits: 3 })} ${it.baseUnit}` : '')
}

export const grpOf = (it: Item) => normTxt(it.group) || NOGRP
export const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, 'ar')
export const activeItems = (s: State) => s.items.filter(i => i.active !== false).sort(byName)
export const activeLocs = (s: State) => s.locations.filter(l => l.active !== false).sort(locOrder)
export const locOrder = (a: Location, b: Location) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name, 'ar')
export function allGroups(s: State) {
  return [...new Set(activeItems(s).map(grpOf))].sort((a, b) => (a === NOGRP ? 1 : b === NOGRP ? -1 : a.localeCompare(b, 'ar')))
}
export const itemById = (s: State, id: string) => s.items.find(i => i.id === id)
export const locName = (s: State, id: string) => s.locations.find(l => l.id === id)?.name || '—'
export const mName = (s: State, m: Move) => itemById(s, m.itemId)?.name || m.itemName || ''
export const moveWhere = (s: State, m: Pick<Move, 'type' | 'fromLoc' | 'toLoc'>) =>
  m.type === 'transfer' ? `${locName(s, m.fromLoc)} ← ${locName(s, m.toLoc)}` : locName(s, m.toLoc || m.fromLoc)

/** هل للمادة أي علاقة بالمكان (رصيد أو حركات) */
export const itemAtLoc = (s: State, bal: Map<string, number>, itemId: string, locId: string) =>
  !isZero(balAt(bal, itemId, locId)) || s.moves.some(m => m.itemId === itemId && (m.fromLoc === locId || m.toLoc === locId))

/** جاهزية المخزن: نسبة المواد الكافية من المواد الموجودة بيه (للدوائر) */
export function locReadiness(s: State, bal: Map<string, number>, locId: string) {
  const items = activeItems(s).filter(it => itemAtLoc(s, bal, it.id, locId))
  const have = items.filter(it => balAt(bal, it.id, locId) > EPS)
  // كافية = إلها رصيد بهذا المكان، ورصيدها الكلي فوق حد الأمان (حد الأمان للمادة كلها مو لكل مكان)
  const tot = totalsByItem(bal)
  const ok = have.filter(it => status(it, tot.get(it.id) || 0)[0] === 'ok')
  return { total: items.length, have: have.length, ok: ok.length, pct: items.length ? Math.round(ok.length / items.length * 100) : 0 }
}

// آخر سعر شراء للمادة بنفس الوحدة (اقتراح فقط)
export function lastBuy(moves: Move[], itemId: string, unit: string) {
  for (let k = moves.length - 1; k >= 0; k--) {
    const m = moves[k]
    if (m.itemId === itemId && m.type === 'in' && m.unit === unit) return m.invPrice ?? m.price
  }
  return 0
}

/* ───────── المشتريات ───────── */
export const liveInv = (s: State) => s.invoices.filter(x => !x.deleted)
export const livePay = (s: State) => s.payments.filter(x => !x.deleted)
export const supById = (s: State, id: string) => s.suppliers.find(x => x.id === id)
export const supName = (s: State, x: { supplierId: string; supplierName?: string }) => supById(s, x.supplierId)?.name || x.supplierName || '—'
export const activeSups = (s: State) => s.suppliers.filter(x => x.active !== false).sort(byName)

/** المتبقي بذمتي للمورد = Σ(الإجمالي − المدفوع) للفواتير − Σ التسديدات */
export function supDue(s: State, id: string, upTo = Infinity) {
  let due = 0
  for (const v of liveInv(s)) if (v.supplierId === id && v.ts <= upTo) due += (Number(v.total) || 0) - (Number(v.paid) || 0)
  for (const p of livePay(s)) if (p.supplierId === id && p.ts <= upTo) due -= Number(p.amount) || 0
  return due
}

export interface LedgerRow { ts: number; kind: 'inv' | 'paidnow' | 'pay'; ref: string; text: string; debit: number; credit: number; bal: number; inv?: Invoice; pay?: Payment }
export function supLedger(s: State, id: string): LedgerRow[] {
  const PM: Record<string, string> = { cash: 'كاش', transfer: 'تحويل' }
  const rows: LedgerRow[] = []
  for (const v of liveInv(s)) if (v.supplierId === id) {
    rows.push({ ts: v.ts, kind: 'inv', ref: v.ref || '', text: `فاتورة مشتريات — ${(v.lines || []).length} مادة`, debit: Number(v.total) || 0, credit: 0, bal: 0, inv: v })
    if (Number(v.paid) > 0) rows.push({ ts: v.ts, kind: 'paidnow', ref: v.ref || '', text: 'مدفوع عند الاستلام', debit: 0, credit: Number(v.paid), bal: 0, inv: v })
  }
  for (const p of livePay(s)) if (p.supplierId === id)
    rows.push({ ts: p.ts, kind: 'pay', ref: '', text: `تسديد ${PM[p.method] || ''}${p.note ? ' — ' + p.note : ''}`, debit: 0, credit: Number(p.amount) || 0, bal: 0, pay: p })
  rows.sort((a, b) => a.ts - b.ts || Number(a.kind === 'paidnow') - Number(b.kind === 'paidnow'))
  let bal = 0
  rows.forEach(r => { bal += r.debit - r.credit; r.bal = bal })
  return rows
}

export function supItems(s: State, id: string, t0: number, t1: number) {
  const m = new Map<string, { name: string; unit: string; qty: number; amount: number; last: number; lastUnit: string; lastTs: number }>()
  for (const v of liveInv(s)) if (v.supplierId === id && v.ts >= t0 && v.ts <= t1) for (const l of v.lines || []) {
    const it = itemById(s, l.itemId)
    const x = m.get(l.itemId) || { name: it?.name || l.itemName, unit: it?.baseUnit || l.baseUnit, qty: 0, amount: 0, last: 0, lastUnit: '', lastTs: 0 }
    x.qty += Number(l.baseQty) || 0; x.amount += Number(l.total) || 0
    if (v.ts >= x.lastTs) { x.lastTs = v.ts; x.last = l.price; x.lastUnit = l.unit }
    m.set(l.itemId, x)
  }
  return [...m.values()].sort((a, b) => b.amount - a.amount)
}

export interface InvDraftLine { moveId?: string; itemId: string; unit: string; qty: string; price: string }
export interface InvDraft { id?: string; supplierId: string; ref: string; date: string; locId: string; note: string; lines: InvDraftLine[]; transport: string; loading: string; discount: string; payMode: PayMode; paid: string }

/** حساب الفاتورة: المبالغ الإضافية − الخصم تتوزع على الأسطر بنسبة قيمة كل سطر */
export function invCalc(s: State, inv: InvDraft, num: (v: unknown) => number) {
  const lines = inv.lines.map(l => {
    const it = itemById(s, l.itemId), qty = num(l.qty), price = num(l.price)
    const factor = factorOf(it, l.unit)
    return { ...l, it, qty, price, factor, baseQty: r3(qty * factor), total: qty * price, share: 0, cost: 0 }
  })
  const subtotal = lines.reduce((a, l) => a + l.total, 0)
  const transport = num(inv.transport), loading = num(inv.loading), discount = num(inv.discount)
  const net = transport + loading - discount
  lines.forEach(l => { l.share = subtotal > 0 ? net * l.total / subtotal : 0; l.cost = l.total + l.share })
  const total = subtotal + net
  const paid = inv.payMode === 'paid' ? total : inv.payMode === 'credit' ? 0 : Math.min(num(inv.paid), total)
  return { lines, subtotal, transport, loading, discount, total, paid, due: total - paid }
}
