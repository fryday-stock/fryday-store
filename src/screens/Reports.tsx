// التقرير الشهري (لكل المخازن أو لمخزن واحد)
import { Download } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Btn, Card, Empty, GRAD, Money, Num, Sub, Tile } from '@/components/app/kit'
import { run } from '@/components/app/dialogs'
import { Shell } from '@/components/app/Shell'
import { CONFIG } from '@/config'
import { activeItems, activeLocs, avgCosts, grpOf, locName } from '@/lib/calc'
import { exportSheet } from '@/lib/excel'
import { money, r3, today } from '@/lib/format'
import { usePersist } from '@/lib/persist'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const K = ['open', 'in', 'out', 'waste', 'return', 'adjust', 'tin', 'tout', 'close'] as const

export function Reports() {
  const s = useStore(x => x)
  const [f, setF] = usePersist('rep', () => ({ month: today().slice(0, 7), loc: '' }))
  const [y, mo] = f.month.split('-').map(Number)
  const t0 = new Date(y, mo - 1, 1).getTime(), t1 = new Date(y, mo, 1).getTime()
  const avg = avgCosts(s.moves), L = f.loc
  const rows = activeItems(s).map(it => {
    const r = { it, open: 0, in: 0, out: 0, waste: 0, return: 0, adjust: 0, tin: 0, tout: 0, close: 0, inCost: 0, avg: avg.get(it.id) || 0 }
    for (const m of s.moves) {
      if (m.itemId !== it.id) continue
      const q = Number(m.baseQty) || 0
      if (!L && m.type === 'transfer') continue
      // التأثير على المخزن المختار (أو على الكل)
      let d = 0
      if (!L) d = m.type === 'in' || m.type === 'opening' || m.type === 'adjust' ? q : -q
      else {
        if (m.type === 'transfer') d = (m.toLoc === L ? q : 0) - (m.fromLoc === L ? q : 0)
        else if (m.type === 'in' || m.type === 'opening' || m.type === 'adjust') d = m.toLoc === L ? q : 0
        else d = m.fromLoc === L ? -q : 0
        if (!d) continue
      }
      if (m.ts < t0) { r.open += d; continue }
      if (m.ts >= t1) continue
      if (m.type === 'opening' || m.type === 'in') { r.in += q; r.inCost += Number(m.cost) || 0 }
      else if (m.type === 'transfer') { if (d > 0) r.tin += d; else r.tout -= d }
      else if (m.type === 'adjust') r.adjust += q
      else r[m.type] += q
    }
    r.close = r.open + r.in - r.out - r.waste - r.return + r.adjust + r.tin - r.tout
    return r
  }).filter(r => K.some(k => Math.abs(r[k]) > 0.0005))
  const sum = (fn: (r: (typeof rows)[number]) => number) => rows.reduce((a, r) => a + fn(r), 0)
  const purchases = sum(r => r.inCost), consumption = sum(r => r.out * r.avg), waste = sum(r => r.waste * r.avg), adj = sum(r => r.adjust * r.avg), closeVal = sum(r => Math.max(r.close, 0) * r.avg)
  const cols = L ? '1.6fr repeat(9, 0.8fr) 1fr' : '1.6fr repeat(7, 0.8fr) 0.9fr 1fr'
  const head = ['أول المدة', 'الوارد', 'المصروف', 'التالف', 'المرتجع', 'تسوية الجرد', ...(L ? ['نقل داخل', 'نقل خارج'] : []), 'آخر المدة', 'متوسط الكلفة', 'كلفة المصروف']
  const where = L ? locName(s, L) : 'كل المخازن'
  const exportX = () => run(() => exportSheet({
    file: `تقرير_المخزن_${f.month}_${where}.xlsx`, title: `${CONFIG.title} — التقرير الشهري (${where})`,
    sub: `شهر ${f.month}   |   المشتريات: ${money(purchases)}   |   كلفة المصروف: ${money(consumption)}   |   التالف: ${money(waste)}   |   فروقات الجرد: ${money(adj)}`,
    headers: ['المادة', 'الوحدة', ...head.slice(0, -2), 'متوسط الكلفة', 'كلفة المصروف', 'كلفة التالف', 'قيمة آخر المدة'],
    rows: rows.map(r => [r.it.name, r.it.baseUnit, r3(r.open), r3(r.in), r3(r.out), r3(r.waste), r3(r.return), r3(r.adjust), ...(L ? [r3(r.tin), r3(r.tout)] : []), r3(r.close), Math.round(r.avg), Math.round(r.out * r.avg), Math.round(r.waste * r.avg), Math.round(Math.max(r.close, 0) * r.avg)]),
    qty: L ? [2, 3, 4, 5, 6, 7, 8, 9, 10] : [2, 3, 4, 5, 6, 7, 8], money: L ? [11, 12, 13, 14] : [9, 10, 11, 12], totals: { label: 'المجموع', cols: L ? [12, 13, 14] : [10, 11, 12] },
  }))
  return (
    <Shell active="reports" title="التقرير الشهري" subtitle={`${where} — شهر ${f.month}`}>
      <div className="space-y-5">
        <Card>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-end">
            <label className="text-sm">الشهر<Input type="month" value={f.month} onChange={e => setF(x => ({ ...x, month: e.target.value || today().slice(0, 7) }))} /></label>
            <label className="text-sm sm:w-56">المخزن<NativeSelect value={f.loc} onChange={e => setF(x => ({ ...x, loc: e.target.value }))}><NativeSelectOption value="">كل المخازن</NativeSelectOption>{activeLocs(s).map(l => <NativeSelectOption key={l.id} value={l.id}>{l.name}</NativeSelectOption>)}</NativeSelect></label>
            <Btn className="col-span-2 sm:ms-auto" onClick={exportX} disabled={!rows.length}><Download />تصدير</Btn>
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Tile label="المشتريات" grad><Money v={purchases} /></Tile>
          <Tile label="كلفة المصروف"><Money v={consumption} /></Tile>
          <Tile label="خسائر التالف"><span className="text-destructive"><Money v={waste} /></span></Tile>
          <Tile label="فروقات الجرد"><span className={cn(adj < 0 && 'text-destructive')}><Money v={adj} /></span></Tile>
          <Tile label="قيمة المخزون آخر الشهر" className="col-span-2 md:col-span-1"><Money v={closeVal} /></Tile>
        </div>
        <Card>
          {rows.length ? <>
            <div className="overflow-x-auto">
              <div className="min-w-[980px]">
                <div className={cn('grid gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white', GRAD)} style={{ gridTemplateColumns: cols }}><span>المادة</span>{head.map(h => <span key={h} className="text-center">{h}</span>)}</div>
                <div className="mt-2 divide-y rounded-xl border">{rows.map(r => (
                  <div key={r.it.id} className="grid items-center gap-2 px-4 py-2.5 text-sm" style={{ gridTemplateColumns: cols }}>
                    <div><b className="text-base">{r.it.name}</b><Sub>{r.it.baseUnit} — {grpOf(r.it)}</Sub></div>
                    {(['open', 'in', 'out', 'waste', 'return', 'adjust', ...(L ? ['tin', 'tout'] as const : []), 'close'] as const).map(k => <div key={k} className={cn('text-center', k === 'close' && 'font-bold', k === 'adjust' && r.adjust < 0 && 'text-destructive')}><Num v={r[k]} /></div>)}
                    <div className="text-center"><Money v={r.avg} /></div><div className="text-center"><Money v={r.out * r.avg} /></div>
                  </div>))}</div>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{L ? 'بتقرير مخزن واحد، النقل الداخل والطالع ينحسب على المخزن.' : 'النقل بين الأماكن ما يأثر على تقرير كل المخازن لأن المادة باقية بالمخزن.'} متوسط الكلفة = كل كلفة المشتريات ÷ كل الكميات الواردة.</p>
          </> : <Empty>ما اكو حركات بهذا الشهر</Empty>}
        </Card>
      </div>
    </Shell>
  )
}
