// الجرد الفعلي: وحدة كبيرة مقفلة + أساسية مفتوحة. الفرق ينسجل «تسوية جرد» والرصيد يصير مطابق للواقع
import { ClipboardCheck, History, Save, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Btn, Card, CardTitle, Empty, GRAD, GradHead, Money, Num, Pills, Sub, When } from '@/components/app/kit'
import { SaveBtn, confirmBox, run } from '@/components/app/dialogs'
import { Shell } from '@/components/app/Shell'
import { activeItems, activeLocs, avgCosts, balAt, balances, grpOf, itemAtLoc, locName, packOf } from '@/lib/calc'
import { fmt, normKey, parseNum, r3 } from '@/lib/format'
import { usePersist } from '@/lib/persist'
import { backend, getState, useStore } from '@/lib/store'
import type { Op } from '@/lib/types'
import { cn } from '@/lib/utils'

type Counts = Record<string, { big?: string; small?: string }>

export function Count() {
  const s = useStore(x => x)
  const locs = activeLocs(s)
  const [st, setSt] = usePersist('count', () => ({ loc: '', counts: {} as Counts, q: '' }))
  const L = locs.some(l => l.id === st.loc) ? st.loc : locs[0]?.id || ''
  const bal = balances(s.moves), avg = avgCosts(s.moves)
  const k = normKey(st.q)
  const items = activeItems(s).filter(it => itemAtLoc(s, bal, it.id, L)).filter(it => !k || normKey(it.name).includes(k) || normKey(it.group).includes(k))
  const lines = Object.entries(st.counts).map(([id, c]) => {
    const it = s.items.find(i => i.id === id)
    if (!it || ((c.big ?? '') === '' && (c.small ?? '') === '')) return null
    const counted = r3(parseNum(c.big) * packOf(it) + parseNum(c.small)), book = r3(balAt(bal, id, L)), v = r3(counted - book)
    return { it, counted, book, v, value: v * (avg.get(id) || 0) }
  }).filter(Boolean) as { it: (typeof s.items)[number]; counted: number; book: number; v: number; value: number }[]
  const byId = new Map(lines.map(l => [l.it.id, l]))
  const short = lines.filter(l => l.v < 0).reduce((a, l) => a + l.value, 0), over = lines.filter(l => l.v > 0).reduce((a, l) => a + l.value, 0)
  const past = s.stocktakes.slice().sort((a, b) => b.ts - a.ts).slice(0, 10)
  const upd = (id: string, key: 'big' | 'small', v: string) => setSt(x => {
    const c = { ...x.counts[id], [key]: v }, counts = { ...x.counts, [id]: c }
    if (!c.big && !c.small) delete counts[id]
    return { ...x, loc: L, counts }
  })

  const save = async () => {
    if (!lines.length) return void toast.error('ما كتبت أي عدد')
    const diffs = lines.filter(l => Math.abs(l.v) > 0.0005)
    if (!(await confirmBox(<>حفظ جرد <b>{locName(s, L)}</b>: {lines.length} مادة، {diffs.length} بيها فرق. الفروقات راح تتسجل كتسوية.</>, 'حفظ'))) return
    const u = getState().user!, ts = Date.now(), B = backend()
    const ops: Op[] = diffs.map(l => ({ type: 'set', col: 'moves', id: B.newId(), data: {
      ts, type: 'adjust', itemId: l.it.id, itemName: l.it.name, unit: l.it.baseUnit, qty: l.v, factor: 1, baseQty: l.v, baseUnit: l.it.baseUnit,
      price: 0, cost: 0, fromLoc: '', toLoc: L, reason: l.v < 0 ? 'عجز بالجرد' : 'زيادة بالجرد', ref: '', note: `دفتري ${fmt(l.book)} / فعلي ${fmt(l.counted)}`, staffId: u.id, staffName: u.name,
    } }))
    ops.push({ type: 'set', col: 'stocktakes', id: B.newId(), data: {
      ts, locId: L, staffId: u.id, staffName: u.name, counted: lines.length, diffs: diffs.length,
      shortValue: Math.round(diffs.filter(l => l.v < 0).reduce((a, l) => a + l.value, 0)), overValue: Math.round(diffs.filter(l => l.v > 0).reduce((a, l) => a + l.value, 0)),
      lines: lines.map(l => ({ itemId: l.it.id, itemName: l.it.name, book: l.book, counted: l.counted, variance: l.v, value: Math.round(l.value) })),
    } })
    if (await run(() => B.batch(ops).then(() => true), '✔ انحفظ الجرد وتعدلت الأرصدة')) setSt(x => ({ ...x, counts: {} }))
  }

  return (
    <Shell active="count" title="الجرد الفعلي" subtitle="اكتب العدد الموجود فعلاً، والنظام يسوّي التسوية">
      <div className="space-y-5">
        {!locs.length ? <Card><Empty>أضف أماكن الخزن أولاً من الإدارة.</Empty></Card> : <>
          <Pills items={locs.map(l => ({ k: l.id, t: l.name }))} value={L} onChange={async id => {
            if (Object.keys(st.counts).length && !(await confirmBox('عندك أرقام جرد ما محفوظة. تتركها؟', 'نعم'))) return
            setSt({ loc: id, counts: {}, q: '' })
          }} />
          <Card>
            <CardTitle icon={ClipboardCheck} extra={<div className="relative w-full sm:w-64"><Search className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" /><Input type="search" className="ps-10" placeholder="بحث" value={st.q} onChange={e => setSt(x => ({ ...x, q: e.target.value }))} /></div>}>جرد {locName(s, L)}</CardTitle>
            <p className="mb-4 text-sm text-muted-foreground">المواد اللي تتركها فارغة ما تنجرد. للمواد اللي إلها وحدة كبيرة: اكتب الكراتين المقفلة بالخانة الأولى، والمفتوح بالوحدة الأساسية بالخانة الثانية.</p>
            {items.length ? <>
              <GradHead cols="1.6fr 0.9fr 1.3fr 1.3fr 0.8fr 0.8fr 0.9fr"><span>المادة</span><span className="text-center">الدفتري</span><span>وحدة كبيرة</span><span>وحدة أساسية</span><span className="text-center">الفعلي</span><span className="text-center">الفرق</span><span className="text-center">قيمة الفرق</span></GradHead>
              <div className="mt-2 divide-y rounded-xl border">
                {items.map(it => {
                  const c = st.counts[it.id] || {}, l = byId.get(it.id), p = packOf(it)
                  return (
                    <div key={it.id} className={cn('grid grid-cols-2 gap-x-3 gap-y-2 px-4 py-3 md:grid-cols-[1.6fr_0.9fr_1.3fr_1.3fr_0.8fr_0.8fr_0.9fr] md:items-center', l && 'bg-secondary/60')}>
                      <div className="min-w-0"><b>{it.name}</b><Sub>{grpOf(it)}</Sub></div>
                      <div className="text-end md:text-center"><span className="text-sm text-muted-foreground md:hidden">الدفتري: </span><Num v={balAt(bal, it.id, L)} /> <span className="text-sm text-muted-foreground">{it.baseUnit}</span></div>
                      {p > 1 ? <label className="flex items-center gap-2"><Input className="num" inputMode="decimal" value={c.big ?? ''} onChange={e => upd(it.id, 'big', e.target.value)} placeholder="0" aria-label={`${it.name} ${it.bigUnit}`} /><span className="shrink-0 text-sm text-muted-foreground">{it.bigUnit} ({fmt(p)})</span></label> : <span className="hidden text-center text-muted-foreground md:block">—</span>}
                      <label className={cn('flex items-center gap-2', p <= 1 && 'col-span-2 md:col-span-1')}><Input className="num" inputMode="decimal" value={c.small ?? ''} onChange={e => upd(it.id, 'small', e.target.value)} placeholder="0" aria-label={`${it.name} ${it.baseUnit}`} /><span className="shrink-0 text-sm text-muted-foreground">{it.baseUnit}</span></label>
                      <div className="text-sm md:text-center md:text-base">{l && <><span className="text-muted-foreground md:hidden">الفعلي: </span><Num v={l.counted} /></>}</div>
                      <div className={cn('text-end font-semibold md:text-center', l && l.v < 0 && 'text-destructive', l && l.v > 0 && 'text-success')}>{l && <><span className="text-sm font-normal text-muted-foreground md:hidden">الفرق: </span><Num v={l.v} plus /></>}</div>
                      <div className={cn('col-span-2 text-end text-sm md:col-span-1 md:text-center', l && l.v < 0 && 'text-destructive')}>{l && l.v ? <Money v={l.value} /> : ''}</div>
                    </div>
                  )
                })}
              </div>
            </> : <Empty>ما اكو مواد بهذا المكان{st.q ? ' بهذا البحث' : ' بعد'}.</Empty>}
          </Card>
          <div className={cn('sticky bottom-20 z-10 flex flex-wrap items-center gap-3 rounded-[18px] p-3 text-white shadow-lg lg:bottom-4', GRAD)}>
            <span className="flex-1 text-sm">{lines.length ? <>مجرود: <b>{lines.length}</b> — بيها فرق: <b>{lines.filter(l => l.v).length}</b> — عجز: <b><Money v={short} /></b> — زيادة: <b><Money v={over} /></b> د.ع</> : 'اكتب الأعداد وبعدين احفظ'}</span>
            {lines.length > 0 && <Btn tone="outline" className="border-white/50 bg-white/10 text-white hover:bg-white/20" onClick={() => setSt(x => ({ ...x, counts: {} }))}>تفريغ</Btn>}
            <SaveBtn tone="outline" className="border-0 bg-white text-primary hover:bg-white/90" onClick={save}><Save />حفظ الجرد وتسوية الأرصدة</SaveBtn>
          </div>
        </>}
        <Card>
          <CardTitle icon={History}>جرودات سابقة</CardTitle>
          {past.length ? <>
            <GradHead cols="1fr 1.2fr 0.8fr 0.8fr 1fr 1fr 1fr"><span>التاريخ</span><span>المكان</span><span className="text-center">مجرودة</span><span className="text-center">بيها فرق</span><span className="text-center">قيمة العجز</span><span className="text-center">قيمة الزيادة</span><span>بواسطة</span></GradHead>
            <div className="mt-2 divide-y rounded-xl border">{past.map(x => (
              <div key={x.id} className="grid grid-cols-2 gap-x-3 px-4 py-3 md:grid-cols-[1fr_1.2fr_0.8fr_0.8fr_1fr_1fr_1fr] md:items-center">
                <When ts={x.ts} /><div className="text-end md:text-start"><b>{locName(s, x.locId)}</b><Sub className="md:hidden">{x.staffName}</Sub></div>
                <div className="text-sm md:text-center md:text-base"><span className="md:hidden">مجرودة: </span>{x.counted}</div>
                <div className="text-end text-sm md:text-center md:text-base"><span className="md:hidden">بيها فرق: </span>{x.diffs}</div>
                <div className="text-sm text-destructive md:text-center md:text-base"><span className="md:hidden">عجز: </span><Money v={x.shortValue} /></div>
                <div className="text-end text-sm text-success md:text-center md:text-base"><span className="md:hidden">زيادة: </span><Money v={x.overValue} /></div>
                <div className="hidden text-sm md:block">{x.staffName}</div>
              </div>))}</div>
          </> : <Empty>ما اكو جرد سابق</Empty>}
        </Card>
      </div>
    </Shell>
  )
}
