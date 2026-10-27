import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, ChevronDown, Download, MapPin, Plus, ReceiptText, Trash2, TriangleAlert, Undo2 } from 'lucide-react'
import { AnimatedCircularProgressBar } from '@/components/magicui/animated-circular-progress-bar'
import { BlurFade } from '@/components/magicui/blur-fade'
import { NumberTicker } from '@/components/magicui/number-ticker'
import { Bar, Btn, Card, CardTitle, Empty, GRAD, Num, TypeTag } from '@/components/app/kit'
import { Shell, logo } from '@/components/app/Shell'
import { activeItems, activeLocs, avgCosts, balances, grpOf, locReadiness, mName, moveWhere, status, totalsByItem } from '@/lib/calc'
import { dayLabel, dayStartTs, longDay, timeOf, today } from '@/lib/format'
import { exportMoves } from '@/lib/exports'
import { setP } from '@/lib/persist'
import { nav } from '@/lib/router'
import { isAdmin, useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const ACTIONS = [
  { k: 'in', t: 'وارد', d: 'فاتورة مشتريات', i: ArrowDownToLine, to: '/purchases/new' },
  { k: 'out', t: 'صرف', d: 'للمطبخ أو الأقسام', i: ArrowUpFromLine, to: '/move/out' },
  { k: 'transfer', t: 'نقل', d: 'بين المخازن', i: ArrowLeftRight, to: '/move/transfer' },
  { k: 'waste', t: 'تالف', d: 'منتهي أو خربان', i: Trash2, to: '/move/waste' },
  { k: 'return', t: 'مرتجع', d: 'إرجاع للمورد', i: Undo2, to: '/move/return' },
] as const
const capColor = (p: number) => (p < 50 ? '#dc2626' : p < 80 ? '#0ba5e9' : '#3a6cc6')

export function Home() {
  const s = useStore(x => x)
  const bal = balances(s.moves), tot = totalsByItem(bal), avg = avgCosts(s.moves)
  const items = activeItems(s), locs = activeLocs(s)
  const value = items.reduce((a, it) => a + Math.max(tot.get(it.id) || 0, 0) * (avg.get(it.id) || 0), 0)
  const low = items.filter(it => status(it, tot.get(it.id) || 0)[0] !== 'ok')
  const okPct = items.length ? Math.round((items.length - low.length) / items.length * 100) : 0
  const todayCount = s.moves.filter(m => m.ts >= dayStartTs(today())).length
  const recent = s.moves.slice(-7).reverse()
  const month = new Date().toLocaleDateString('ar-IQ-u-nu-latn', { month: 'long', year: 'numeric' })

  return (
    <Shell active="home" title={`أهلاً بعودتك، ${s.user!.name}`} subtitle={`${longDay()} — خلّينا نشوف حالة المخزن اليوم`}>
      <div className="space-y-6">
        {/* أزرار الحركات السريعة */}
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {ACTIONS.map(a => (
            <a key={a.k} href={'#' + a.to} className="group flex flex-col items-center gap-1.5 rounded-[18px] border bg-card p-2.5 text-center transition hover:border-accent hover:shadow-sm sm:flex-row sm:gap-3 sm:p-4 sm:text-start">
              <span className={cn('grid size-12 shrink-0 place-items-center rounded-xl text-white', GRAD)}><a.i className="size-6" /></span>
              <span className="min-w-0"><b className="block text-[15px] sm:text-[17px]">{a.t}</b><span className="hidden truncate text-sm text-muted-foreground xl:block">{a.d}</span></span>
            </a>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <BlurFade><Card className="space-y-4">
            <CardTitle className="mb-0">المخزون والسعة</CardTitle>
            <div className={cn('relative overflow-hidden rounded-[22px] p-5 text-white shadow-md', GRAD)}>
              <div className="flex items-start justify-between"><span className="text-[15px]">قيمة المخزون الكلية</span><img src={logo} alt="" className="size-12 rounded-xl bg-white p-1" /></div>
              <div className="mt-3 flex items-baseline gap-2"><NumberTicker value={Math.round(value)} className="num text-[38px] leading-none font-semibold text-white sm:text-[42px]" /><span className="text-lg text-white/85">د.ع</span></div>
              <div className="mt-6 flex items-end justify-between text-sm"><span>{items.length} مادة · {locs.length} مخازن</span><span className="text-white/85">{month}</span></div>
            </div>
            <button onClick={() => nav('/stock')} className="flex w-full items-center gap-4 rounded-[18px] border p-4 text-start transition hover:border-accent">
              <AnimatedCircularProgressBar value={okPct} suffix="%" gaugePrimaryColor="#0ba5e9" gaugeSecondaryColor="#e6eef8" className="size-24 shrink-0 text-lg text-primary" />
              <div className="min-w-0">
                <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">صحة المخزون</span>
                  {items.length > 0 && <span className={cn('rounded-full px-2.5 py-0.5 text-xs text-white', okPct >= 80 ? 'bg-accent' : okPct >= 50 ? 'bg-warning' : 'bg-destructive')}>{okPct >= 80 ? 'جيدة' : okPct >= 50 ? 'متوسطة' : 'ضعيفة'}</span>}</div>
                <div className="mt-1 text-lg font-bold text-primary">{items.length - low.length} من {items.length} كافية</div>
                <div className="text-sm text-muted-foreground">تحتاج طلب: <b className="text-warning">{low.length}</b></div>
                <div className="text-sm text-muted-foreground">حركات اليوم: <b className="text-foreground">{todayCount}</b></div>
              </div>
            </button>
            <div className="grid grid-cols-2 gap-3">
              <Btn size="lg" onClick={() => nav('/move/out')}><Plus />حركة</Btn>
              <Btn size="lg" onClick={() => nav('/purchases/new')}><ReceiptText />فاتورة</Btn>
            </div>
          </Card></BlurFade>

          <BlurFade delay={0.05}><Card className="flex h-full flex-col">
            <CardTitle extra={recent.length > 0 && <Btn onClick={() => exportMoves(s.moves.slice().reverse(), 'آخر الحركات')}><Download />تصدير</Btn>}>
              <span>آخر الحركات<span className="block text-sm font-normal text-muted-foreground">ترتيب حسب <span className="font-medium text-primary">الأحدث</span></span></span>
            </CardTitle>
            {recent.length ? <>
              <div className={cn('hidden grid-cols-[1.6fr_1fr_1fr_0.9fr] rounded-xl px-5 py-3 font-semibold text-white sm:grid', GRAD)}>
                <span>المادة</span><span className="text-center">الوقت</span><span className="text-center">الكمية</span><span className="text-end">النوع</span>
              </div>
              <div className="mt-2 flex-1 rounded-xl border px-4 sm:px-5">
                {recent.map(m => (
                  <div key={m.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 border-b py-3 last:border-0 sm:grid-cols-[1.6fr_1fr_1fr_0.9fr]">
                    <div className="min-w-0"><b className="block truncate">{mName(s, m)}</b><span className="block truncate text-sm text-muted-foreground">{moveWhere(s, m)} · {m.staffName}</span></div>
                    <div className="hidden text-center sm:block"><div>{dayLabel(m.ts)}</div><div className="num text-sm text-muted-foreground">{timeOf(m.ts)}</div></div>
                    <div className="text-end sm:text-center"><div className="font-semibold"><Num v={m.qty} plus={m.type === 'adjust'} /> {m.unit}</div><div className="truncate text-sm text-muted-foreground">{m.supplierName || m.reason || '—'}</div></div>
                    <div className="col-span-2 mt-1 sm:col-span-1 sm:mt-0 sm:text-end"><TypeTag t={m.type} short /></div>
                  </div>
                ))}
                <a href="#/log" className="flex min-h-12 w-full flex-col items-center justify-center py-2 font-semibold text-primary">عرض كل الحركات<ChevronDown className="size-5" /></a>
              </div>
            </> : <Empty>ما اكو حركات بعد</Empty>}
          </Card></BlurFade>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card>
            <CardTitle icon={MapPin} extra={<span className="text-sm text-muted-foreground">نسبة المواد الكافية</span>}>جاهزية أماكن الخزن</CardTitle>
            {locs.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                {locs.map(l => {
                  const r = locReadiness(s, bal, l.id)
                  return (
                    <a key={l.id} href="#/stock" onClick={() => setP('stock.loc', l.id)}
                      className="flex flex-col items-center gap-1.5 rounded-[18px] border p-4 text-center transition hover:border-accent">
                      <AnimatedCircularProgressBar value={r.pct} suffix="%" gaugePrimaryColor={capColor(r.pct)} gaugeSecondaryColor="#eef2f7" className="size-24 text-lg text-foreground" />
                      <b>{l.name}</b>
                      <span className="text-sm text-muted-foreground">{r.have} مادة متوفرة</span>
                      {r.total > 0 && r.pct < 50 && <span className="rounded-full bg-danger-soft px-2.5 py-0.5 text-xs font-semibold text-destructive">يحتاج تعبئة</span>}
                    </a>
                  )
                })}
              </div>
            ) : <Empty icon={MapPin}>ما اكو أماكن خزن بعد.{isAdmin(s) && <> <a className="font-semibold text-primary" href="#/admin/locations">أضفها من الإدارة</a></>}</Empty>}
          </Card>
          <Card>
            <CardTitle icon={TriangleAlert} extra={<span className="rounded-full bg-accent px-3 py-0.5 text-sm text-white">{low.length}</span>}>تحتاج طلب</CardTitle>
            {low.length ? low.slice(0, 8).map(it => {
              const q = tot.get(it.id) || 0, min = Number(it.minQty) || 0, pct = min ? Math.round(Math.max(q, 0) / min * 100) : 0
              return (
                <a key={it.id} href={`#/stock/item/${it.id}`} className="block border-b py-3 last:border-0">
                  <div className="flex items-baseline justify-between gap-2"><span className="min-w-0"><b>{it.name}</b> <span className="text-xs text-muted-foreground">{grpOf(it)}</span></span>
                    <span className="text-sm whitespace-nowrap"><Num v={q} className={cn('font-semibold', q <= 0 && 'text-destructive')} /> / <Num v={min} /> {it.baseUnit}</span></div>
                  <Bar className="mt-2" pct={Math.max(pct, 3)} color={q <= 0 ? '#dc2626' : undefined} />
                </a>
              )
            }) : <Empty>كل المواد كافية</Empty>}
            {low.length > 8 && <a href="#/stock" className="mt-2 block text-center font-semibold text-primary">و{low.length - 8} مواد ثانية…</a>}
          </Card>
        </div>
      </div>
    </Shell>
  )
}
