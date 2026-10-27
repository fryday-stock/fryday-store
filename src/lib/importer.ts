// الاستيراد من إكسل: نفس قالب النظام القديم + عمود المجموعة. يتعرّف على الأعمدة بالاسم
import { exportSheet, loadXLSX } from './excel'
import { normKey, normTxt, r3, toNum } from './format'
import { backend, getState } from './store'
import type { Op } from './types'

const IMP_COLS: Record<string, string[]> = {
  loc: ['المخزن', 'مكان الخزن', 'المكان'], name: ['اسم المادة', 'المادة'], group: ['المجموعة', 'المجموعه', 'التصنيف'],
  base: ['الوحدة الأساسية', 'الوحدة الاساسية', 'الوحدة'], big: ['الوحدة الكبيرة'], pack: ['التعبئة'], qty: ['الرصيد'],
  price: ['سعر الوحدة الأساسية', 'سعر الوحدة الاساسية', 'السعر', 'سعر القطعة'], min: ['حد الأمان', 'حد الامان'],
}
export const TEMPLATE_HEADERS = ['المخزن', 'المجموعة', 'اسم المادة', 'الوحدة الأساسية', 'الوحدة الكبيرة', 'التعبئة', 'الرصيد (بالأساسية)', 'سعر الوحدة الأساسية', 'حد الأمان']

export function downloadTemplate() {
  return exportSheet({
    file: 'قالب_استيراد_المواد.xlsx', title: 'قالب استيراد المواد — املأ من السطر الخامس', sub: 'الرصيد بالوحدة الأساسية. الوحدة الكبيرة والتعبئة اختيارية. إذا اكو رصيد لازم يكون اكو مخزن وسعر.',
    headers: TEMPLATE_HEADERS,
    rows: [['المخزن الرئيسي', 'خضروات', 'طماطة', 'كغم', 'صندوق', 10, 40, 1250, 20], ['الفريزر', 'لحوم ودواجن', 'صدر دجاج', 'كغم', 'كرتون', 15, 60, 6500, 30], ['المخزن الرئيسي', 'سفري', 'علب سفري كبيرة', 'قطعة', 'كرتون', 250, 1000, 140, 500]],
    qty: [5, 6, 8], money: [7],
  })
}

export interface ImportPlan {
  file: string
  errs: string[]
  newLocs: { id: string; name: string; order: number; active: boolean }[]
  newItems: { id: string; name: string; group: string; baseUnit: string; bigUnit: string; pack: number; minQty: number; active: boolean; created: number }[]
  rows: { ik: string; lk: string; qty: number; price: number; line: number }[]
  dups: number
  already: number
  totalVal: number
  ops: () => Op[]
}

export async function planImport(file: File): Promise<ImportPlan> {
  const X = await loadXLSX(), s = getState(), B = backend()
  const wb = X.read(await file.arrayBuffer(), { type: 'array' })
  const sh = wb.Sheets[wb.SheetNames.find(n => normTxt(n) === 'المواد') || wb.SheetNames[0]]
  const grid = X.utils.sheet_to_json<unknown[]>(sh, { header: 1, defval: '', raw: true })
  let hr = -1, map: Record<string, number> = {}
  for (let r = 0; r < Math.min(grid.length, 15); r++) {
    const row = (grid[r] || []).map(normKey), m: Record<string, number> = {}
    for (const [k, names] of Object.entries(IMP_COLS)) { const i = row.findIndex(c => names.some(n => c.startsWith(normKey(n)))); if (i >= 0) m[k] = i }
    if (m.name != null && m.base != null) { hr = r; map = m; break }
  }
  if (hr < 0) throw new Error('ما لكيت عمود «اسم المادة» و«الوحدة الأساسية» بالملف')
  const errs: string[] = [], rows: ImportPlan['rows'] = []
  const itemsByKey = new Map(s.items.map(i => [normKey(i.name), i]))
  const locsByKey = new Map(s.locations.map(l => [normKey(l.name), l]))
  const newItems = new Map<string, ImportPlan['newItems'][number]>(), newLocs = new Map<string, ImportPlan['newLocs'][number]>()
  for (let r = hr + 1; r < grid.length; r++) {
    const g = (k: string) => (map[k] == null ? '' : (grid[r] || [])[map[k]])
    const name = normTxt(g('name')); if (!name) continue
    const line = r + 1, grp = normTxt(g('group')), loc = normTxt(g('loc')), base = normTxt(g('base')), big = normTxt(g('big'))
    const pack = toNum(g('pack')), qty = toNum(g('qty')) ?? 0, price = toNum(g('price')) ?? 0, min = toNum(g('min')) ?? 0
    if (!base) { errs.push(`سطر ${line}: «${name}» بدون وحدة أساسية`); continue }
    if (big && !(Number(pack) > 1)) { errs.push(`سطر ${line}: «${name}» بيه وحدة كبيرة بدون تعبئة صحيحة`); continue }
    if ([pack, qty, price, min].some(Number.isNaN) || qty < 0 || price < 0) { errs.push(`سطر ${line}: «${name}» بيه رقم غير صحيح`); continue }
    if (qty > 0 && !loc) { errs.push(`سطر ${line}: «${name}» بيه رصيد بدون مخزن`); continue }
    if (qty > 0 && !(price > 0)) { errs.push(`سطر ${line}: «${name}» بيه رصيد بدون سعر`); continue }
    const ik = normKey(name), ex = itemsByKey.get(ik) || newItems.get(ik)
    if (ex && ex.baseUnit !== base) { errs.push(`سطر ${line}: «${name}» مكتوبة بوحدة «${base}» وبمكان ثاني «${ex.baseUnit}»`); continue }
    if (!ex) newItems.set(ik, { id: B.newId(), name, group: grp, baseUnit: base, bigUnit: big, pack: big ? Number(pack) : 0, minQty: min, active: true, created: Date.now() })
    if (loc && !locsByKey.get(normKey(loc)) && !newLocs.get(normKey(loc))) newLocs.set(normKey(loc), { id: B.newId(), name: loc, order: s.locations.length + newLocs.size + 1, active: true })
    if (qty > 0) rows.push({ ik, lk: normKey(loc), qty, price, line })
  }
  const dupBal = new Map<string, number>(); rows.forEach(x => { const k = x.ik + '|' + x.lk; dupBal.set(k, (dupBal.get(k) || 0) + 1) })
  const already = rows.filter(x => { const it = itemsByKey.get(x.ik), lc = locsByKey.get(x.lk); return it && lc && s.moves.some(m => m.type === 'opening' && m.itemId === it.id && m.toLoc === lc.id) }).length
  return {
    file: file.name, errs, newLocs: [...newLocs.values()], newItems: [...newItems.values()], rows,
    dups: [...dupBal.values()].filter(n => n > 1).length, already, totalVal: rows.reduce((a, x) => a + x.qty * x.price, 0),
    ops: () => {
      const u = getState().user!, ts = Date.now(), ops: Op[] = []
      for (const { id, ...d } of newLocs.values()) ops.push({ type: 'set', col: 'locations', id, data: d })
      for (const { id, ...d } of newItems.values()) ops.push({ type: 'set', col: 'items', id, data: d })
      for (const x of rows) {
        const it = itemsByKey.get(x.ik) || newItems.get(x.ik)!, lc = locsByKey.get(x.lk) || newLocs.get(x.lk)!
        ops.push({ type: 'set', col: 'moves', id: B.newId(), data: {
          ts, type: 'opening', itemId: it.id, itemName: it.name, unit: it.baseUnit, qty: r3(x.qty), factor: 1, baseQty: r3(x.qty), baseUnit: it.baseUnit,
          price: x.price, cost: Math.round(x.qty * x.price), fromLoc: '', toLoc: lc.id, reason: '', ref: '', note: 'استيراد من إكسل', staffId: u.id, staffName: u.name,
        } })
      }
      return ops
    },
  }
}
