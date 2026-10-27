// الخيار د: ألوان وترتيب نموذج Borcelle + دوائر السعة من الخيار ب (معاينة فقط)
import {
  ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, BadgeCheck, Boxes, Camera, ChartColumn, ChevronDown, ChevronLeft,
  ClipboardCheck, Clock, Download, FolderOpen, Headset, History, Home, ImagePlus, LogOut, MapPin, Menu, Plus, Printer,
  ReceiptText, Search, Settings2, ShoppingCart, Trash2, TriangleAlert, Undo2, Wallet,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { AnimatedCircularProgressBar } from '@/components/magicui/animated-circular-progress-bar'
import { BlurFade } from '@/components/magicui/blur-fade'
import { NumberTicker } from '@/components/magicui/number-ticker'
import { cn } from '@/lib/utils'
import { INV_LINES, ITEMS, LOCS, MOVES, TYPE_LABEL, detailed, money, qtyFmt, status } from './mock'
import type { Screen } from './Preview'

const logo = `${import.meta.env.BASE_URL}logo.png`
const GRAD = 'bg-gradient-to-l from-brand-from to-brand-to' // RTL: يبدي فاتح من اليمين
const NAV_MAIN = [
  { k: 'home', t: 'الرئيسية', i: Home }, { k: 'move', t: 'حركة جديدة', i: Plus }, { k: 'invoice', t: 'المشتريات', i: ShoppingCart },
  { k: 'stock', t: 'الأرصدة', i: Boxes }, { k: 'log', t: 'السجل', i: ReceiptText },
]
const NAV_MORE = [{ k: 'count', t: 'الجرد', i: ClipboardCheck }, { k: 'rep', t: 'التقارير', i: ChartColumn }, { k: 'aud', t: 'التعديلات والحذف', i: History }]
const NAV_END = [{ k: 'adm', t: 'الإدارة', i: Settings2 }, { k: 'help', t: 'المساعدة', i: Headset }, { k: 'out', t: 'تسجيل خروج', i: LogOut }]
const CAP = [78, 42, 91, 30] // نسبة امتلاء كل مخزن (وهمي)
const mvText: Record<string, string> = { in: 'text-mv-in', out: 'text-mv-out', transfer: 'text-mv-transfer', waste: 'text-mv-waste', return: 'text-mv-return' }
const mvIcon: Record<string, typeof Home> = { in: ArrowDownToLine, out: ArrowUpFromLine, transfer: ArrowLeftRight, waste: Trash2, return: Undo2 }
const value = ITEMS.reduce((a, it) => a + Math.max(it.qty, 0) * it.avg, 0)
const low = ITEMS.filter(it => status(it)[0] !== 'ok')
const okPct = Math.round((ITEMS.length - low.length) / ITEMS.length * 100)
const Num = ({ children, className }: { children: ReactNode; className?: string }) => <bdi dir="ltr" className={cn('num', className)}>{children}</bdi>

function StatusTag({ it }: { it: (typeof ITEMS)[number] }) {
  const [k, t] = status(it)
  if (k === 'ok') return <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary"><BadgeCheck className="size-4" />{t}</span>
  return <span className={cn('text-sm font-medium', k === 'low' ? 'text-warning' : 'text-destructive')}>{t}</span>
}
function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('rounded-[var(--radius)] border bg-card p-5', className)}>{children}</section>
}
function GradBtn({ children, className }: { children: ReactNode; className?: string }) {
  return <button className={cn('inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 font-semibold text-white shadow-sm transition hover:brightness-105', GRAD, className)}>{children}</button>
}
const capColor = (p: number) => (p >= 90 ? '#dc2626' : p >= 70 ? '#0ba5e9' : '#3a6cc6')

/* ───────── Shell ───────── */
function Shell({ screen, children }: { screen: Screen; children: ReactNode }) {
  const on = (k: string) => k === screen
  const title = screen === 'home' ? 'أهلاً بعودتك، أحمد' : screen === 'stock' ? 'الأرصدة' : 'فاتورة مشتريات'
  const subtitle = screen === 'home' ? 'خلّينا نشوف حالة المخزن اليوم بالتفصيل' : screen === 'stock' ? 'كل المواد حسب المجموعة والمخزن' : 'تسجيل الوارد من المورد'
  const Item = ({ n }: { n: { k: string; t: string; i: typeof Home } }) => (
    <button className={cn('flex min-h-12 w-full items-center gap-3.5 px-8 text-start text-[17px] transition-colors',
      on(n.k) ? 'bg-accent font-semibold text-white' : 'hover:bg-sidebar-accent hover:text-white')}><n.i className="size-6" />{n.t}</button>
  )
  return (
    <div className="min-h-dvh lg:flex">
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-[245px] flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex h-[135px] items-center gap-3 px-8">
          <img src={logo} alt="" className="size-14 rounded-full bg-white p-0.5" />
          <div><div className="font-heading text-lg leading-tight font-bold text-accent">مخزن فرايدي</div><div className="text-sm text-white/85">نظام المخزن</div></div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_MAIN.map(n => <Item key={n.k} n={n} />)}
          <hr className="mx-8 my-3 border-white/10" />
          {NAV_MORE.map(n => <Item key={n.k} n={n} />)}
          <hr className="mx-8 my-3 border-white/10" />
          {NAV_END.map(n => <Item key={n.k} n={n} />)}
        </nav>
        <div className="h-6" />
      </aside>

      <div className="min-w-0 flex-1 lg:ps-[245px]">
        <header className={cn('relative overflow-hidden text-white', GRAD)}>
          <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-4 py-4 lg:h-[135px] lg:px-10">
            <img src={logo} alt="" className="size-12 rounded-full bg-white p-0.5 lg:hidden" />
            <div className="min-w-0">
              <h1 className="font-heading text-xl font-bold lg:text-[28px]">{title}</h1>
              <p className="hidden text-sm text-white/90 sm:block">{subtitle}</p>
            </div>
            <div className="ms-auto hidden items-center gap-2 md:flex">
              <input className="h-12 w-64 rounded-full bg-white px-5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" placeholder="ابحث هنا…" />
              <button aria-label="بحث" className="grid size-12 place-items-center rounded-full border-2 border-white/80"><Search className="size-5" /></button>
            </div>
            <div className="ms-auto flex items-center gap-3 md:ms-6">
              <div className="hidden text-end sm:block"><div className="font-bold">أحمد</div><div className="text-sm text-white/85">مدير · <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-300" />متصل</span></div></div>
              <span className="grid size-12 place-items-center rounded-full bg-white text-lg font-bold text-primary ring-4 ring-white/25 lg:size-14">أ</span>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 pt-6 pb-32 lg:px-10 lg:pb-10">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 bg-sidebar text-sidebar-foreground lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto grid max-w-xl grid-cols-5 items-end">
          {[NAV_MAIN[0], NAV_MAIN[3], NAV_MAIN[1], NAV_MAIN[2], { k: 'more', t: 'المزيد', i: Menu }].map(n => n.k === 'move' ? (
            <button key={n.k} className="flex flex-col items-center gap-1 pb-2">
              <span className={cn('-mt-6 grid size-14 place-items-center rounded-2xl text-white shadow-lg ring-4 ring-background', GRAD)}><Plus className="size-7" /></span>
              <span className="text-[11px]">حركة</span>
            </button>
          ) : (
            <button key={n.k} className={cn('flex min-h-16 flex-col items-center justify-center gap-1 text-[11px]', on(n.k) ? 'border-t-[3px] border-accent bg-white/5 font-semibold text-white' : 'border-t-[3px] border-transparent')}>
              <n.i className="size-6" />{n.t}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

/* ───────── Home ───────── */
function HomeD() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* بطاقة القيمة والسعة (مثل "My Account & Balance") */}
        <BlurFade><Card className="space-y-4">
          <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">المخزون والسعة</h2><span className="text-2xl leading-none tracking-widest text-muted-foreground">•••</span></div>
          <div className={cn('relative overflow-hidden rounded-[22px] p-5 text-white shadow-md', GRAD)}>
            <div className="flex items-start justify-between"><span className="text-[15px]">قيمة المخزون الكلية</span><img src={logo} alt="" className="size-12 rounded-xl bg-white p-1" /></div>
            <div className="mt-3 flex items-baseline gap-2"><NumberTicker value={value} className="num text-[42px] leading-none font-semibold text-white" /><span className="text-lg text-white/85">د.ع</span></div>
            <div className="mt-6 flex items-end justify-between text-sm"><span><span className="block tracking-widest">● ● ● ●</span>{ITEMS.length} مادة · {LOCS.length} مخازن</span><span className="text-white/85">تشرين الأول 2026</span></div>
          </div>
          {/* من الخيار ب: صحة المخزون كدائرة */}
          <div className="flex items-center gap-4 rounded-[18px] border p-4">
            <AnimatedCircularProgressBar value={okPct} suffix="%" gaugePrimaryColor="#0ba5e9" gaugeSecondaryColor="#e6eef8" className="size-24 shrink-0 text-lg text-primary" />
            <div className="min-w-0">
              <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">صحة المخزون</span><span className="rounded-full bg-accent px-2.5 py-0.5 text-xs text-white">جيدة</span></div>
              <div className="mt-1 text-lg font-bold text-primary">{ITEMS.length - low.length} من {ITEMS.length} كافية</div>
              <div className="text-sm text-muted-foreground"><b className="text-warning">{low.length}</b> مواد تحتاج طلب</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <GradBtn className="min-h-14 text-lg"><Plus className="size-6" />حركة</GradBtn>
            <GradBtn className="min-h-14 text-lg"><ReceiptText className="size-6" />فاتورة</GradBtn>
          </div>
        </Card></BlurFade>

        {/* آخر الحركات (مثل "Transaction") */}
        <BlurFade delay={0.06}><Card className="flex h-full flex-col">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="text-xl font-semibold">آخر الحركات</h2><div className="text-sm text-muted-foreground">ترتيب حسب <span className="font-medium text-primary">الأحدث ▾</span></div></div>
            <div className="flex gap-2"><GradBtn><Printer className="size-5" />طباعة</GradBtn><GradBtn><Download className="size-5" />تصدير</GradBtn></div>
          </div>
          <div className={cn('hidden grid-cols-[1.6fr_1fr_1fr_0.9fr] rounded-xl px-5 py-3 font-semibold text-white sm:grid', GRAD)}>
            <span>المادة</span><span className="text-center">الوقت</span><span className="text-center">الكمية</span><span className="text-end">النوع</span>
          </div>
          <div className="mt-2 flex-1 rounded-xl border px-5">
            {MOVES.map((m, i) => {
              const I = mvIcon[m.type]
              return (
                <div key={i} className="grid grid-cols-[1fr_auto] items-center gap-x-3 border-b py-3 last:border-0 sm:grid-cols-[1.6fr_1fr_1fr_0.9fr]">
                  <div className="min-w-0"><b className="block truncate">{m.item}</b><span className="block truncate text-sm text-muted-foreground">{m.where} · {m.staff}</span></div>
                  <div className="hidden text-center sm:block"><div>اليوم</div><div className="num text-sm text-muted-foreground">{m.time}</div></div>
                  <div className="text-end sm:text-center"><div className="num font-semibold">{m.qty}</div><div className="text-sm text-muted-foreground">{m.note || '—'}</div></div>
                  <div className={cn('col-span-2 mt-1 inline-flex items-center gap-1 text-sm font-semibold sm:col-span-1 sm:mt-0 sm:justify-end', mvText[m.type])}><I className="size-4" />{TYPE_LABEL[m.type]}</div>
                </div>
              )
            })}
            <button className="flex min-h-12 w-full flex-col items-center justify-center py-2 font-semibold text-primary">عرض كل الحركات<ChevronDown className="size-5" /></button>
          </div>
        </Card></BlurFade>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* أماكن الخزن: دوائر تحميل (من الخيار ب) */}
        <Card>
          <div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 text-xl font-semibold"><MapPin className="size-5 text-accent" />سعة أماكن الخزن</h2><span className="text-sm text-muted-foreground">نسبة الامتلاء</span></div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {LOCS.map((l, i) => (
              <button key={l} className="flex flex-col items-center gap-2 rounded-[18px] border p-4 transition hover:border-accent">
                <AnimatedCircularProgressBar value={CAP[i]} suffix="%" gaugePrimaryColor={capColor(CAP[i])} gaugeSecondaryColor="#eef2f7" className="size-24 text-lg text-foreground" />
                <b className="text-center">{l}</b>
                <span className="text-sm text-muted-foreground">{[9, 5, 4, 3][i]} مادة</span>
                {CAP[i] >= 90 && <span className="rounded-full bg-danger-soft px-2.5 py-0.5 text-xs font-semibold text-destructive">شبه ممتلئ</span>}
              </button>
            ))}
          </div>
        </Card>
        <Card>
          <div className="mb-2 flex items-center justify-between"><h2 className="flex items-center gap-2 text-xl font-semibold"><TriangleAlert className="size-5 text-warning" />تحتاج طلب</h2><span className="rounded-full bg-accent px-3 py-0.5 text-sm text-white">{low.length}</span></div>
          {low.map(it => {
            const pct = Math.min(100, Math.round(it.qty / it.min * 100))
            return (
              <div key={it.name} className="border-b py-3 last:border-0">
                <div className="flex items-baseline justify-between"><b>{it.name}</b><span className="text-sm"><Num className="font-semibold">{qtyFmt(it.qty)}</Num> / <Num>{qtyFmt(it.min)}</Num> {it.unit}</span></div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted"><div className={cn('h-full rounded-full', pct === 0 ? 'bg-destructive' : GRAD)} style={{ width: `${Math.max(pct, 3)}%` }} /></div>
              </div>
            )
          })}
        </Card>
      </div>
    </div>
  )
}

/* ───────── Stock ───────── */
function StockD() {
  const groups = [...new Set(ITEMS.map(i => i.group))]
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-[1fr_14rem_auto]">
        <div className="relative"><Search className="absolute start-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" /><Input className="rounded-full ps-11" placeholder="بحث باسم المادة أو المجموعة…" /></div>
        <NativeSelect className="rounded-full"><NativeSelectOption>كل المجموعات</NativeSelectOption>{groups.map(g => <NativeSelectOption key={g}>{g}</NativeSelectOption>)}</NativeSelect>
        <GradBtn><Download className="size-5" />تصدير إكسل</GradBtn>
      </div>
      {/* المخازن كبطاقات بشريط تحميل */}
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        <button className={cn('min-h-12 shrink-0 rounded-[18px] px-5 py-3 text-start text-white', GRAD)}><b className="block">كل الأماكن</b><span className="text-sm text-white/85">{ITEMS.length} مادة</span></button>
        {LOCS.map((l, i) => (
          <button key={l} className="w-40 shrink-0 rounded-[18px] border bg-card px-4 py-3 text-start">
            <div className="flex items-baseline justify-between"><b>{l}</b><Num className="text-sm font-semibold" >{CAP[i]}%</Num></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${CAP[i]}%`, background: capColor(CAP[i]) }} /></div>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className={cn('rounded-[18px] p-4 text-white', GRAD)}><div className="text-sm text-white/85">القيمة</div><div className="num mt-1 text-2xl font-semibold">{money(value)} <small className="text-sm">د.ع</small></div></div>
        <div className="rounded-[18px] border p-4"><div className="text-sm text-muted-foreground">النتائج</div><div className="mt-1 text-2xl font-semibold text-primary">{ITEMS.length} مادة</div></div>
        <div className="col-span-2 rounded-[18px] border p-4 sm:col-span-1"><div className="text-sm text-muted-foreground">الكمية</div><div className="num mt-1 font-semibold">318.5 كغم · 1,690 قطعة · 70 لتر</div></div>
      </div>

      <Card className="hidden md:block">
        <div className={cn('grid grid-cols-[1.6fr_1fr_1.6fr_0.8fr_1fr_1fr] rounded-xl px-5 py-3 font-semibold text-white', GRAD)}>
          <span>المادة</span><span className="text-center">الرصيد</span><span>التوزيع</span><span className="text-center">حد الأمان</span><span className="text-center">القيمة</span><span className="text-end">الحالة</span>
        </div>
        <div className="mt-2 rounded-xl border">
          {groups.map(g => {
            const rows = ITEMS.filter(i => i.group === g)
            return (
              <div key={g}>
                <div className="flex items-center gap-2 border-b bg-secondary px-5 py-2.5 font-semibold text-primary"><FolderOpen className="size-4" />{g}<span className="text-sm font-normal text-muted-foreground">— {rows.length} مادة — <Num>{money(rows.reduce((a, r) => a + r.qty * r.avg, 0))}</Num> د.ع</span></div>
                {rows.map(it => (
                  <div key={it.name} className="grid grid-cols-[1.6fr_1fr_1.6fr_0.8fr_1fr_1fr] items-center border-b px-5 py-2.5 last:border-0">
                    <div><button className="min-h-10 text-start font-semibold hover:text-primary">{it.name}</button>{detailed(it) && <div className="-mt-1 text-sm text-muted-foreground">{detailed(it)}</div>}</div>
                    <div className="text-center"><Num className="font-semibold">{qtyFmt(it.qty)}</Num> <span className="text-sm text-muted-foreground">{it.unit}</span></div>
                    <div className="text-sm text-muted-foreground">{it.locs.map(([l, v]) => `${l}: ${qtyFmt(v)}`).join(' · ') || '—'}</div>
                    <div className="text-center"><Num>{qtyFmt(it.min)}</Num></div>
                    <div className="text-center"><Num>{money(it.qty * it.avg)}</Num></div>
                    <div className="text-end"><StatusTag it={it} /></div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </Card>

      <div className="space-y-4 md:hidden">
        {groups.slice(0, 4).map(g => (
          <div key={g}>
            <div className={cn('mb-2 flex items-center gap-2 rounded-xl px-4 py-2.5 font-semibold text-white', GRAD)}><FolderOpen className="size-4" />{g}</div>
            <div className="divide-y rounded-[18px] border">
              {ITEMS.filter(i => i.group === g).map(it => (
                <button key={it.name} className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-start">
                  <div className="min-w-0 flex-1"><b className="block">{it.name}</b><span className="text-sm text-muted-foreground">{detailed(it) || it.locs.map(l => l[0]).join('، ') || '—'}</span></div>
                  <div className="text-end"><div><Num className="font-semibold">{qtyFmt(it.qty)}</Num> <span className="text-sm text-muted-foreground">{it.unit}</span></div><StatusTag it={it} /></div>
                  <ChevronLeft className="size-5 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ───────── Invoice ───────── */
function InvoiceD() {
  const sub = INV_LINES.reduce((a, l) => a + l.qty * l.price, 0)
  const transport = 15000, discount = 5000, total = sub + transport - discount, paid = 300000
  const L = ({ children, req }: { children: ReactNode; req?: boolean }) => <label className="mb-1.5 block text-sm font-medium">{children}{req && <span className="text-destructive"> *</span>}</label>
  const H = ({ icon: I, children, extra }: { icon: typeof Home; children: ReactNode; extra?: ReactNode }) => (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-xl font-semibold"><I className="size-5 text-accent" />{children}</h2>{extra}</div>
  )
  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto">
        {['فاتورة جديدة', 'الفواتير', 'الموردين'].map((t, i) => (
          <button key={t} className={cn('min-h-12 shrink-0 rounded-xl px-5 font-semibold', i === 0 ? cn(GRAD, 'text-white') : 'border text-muted-foreground')}>{t}</button>))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card>
            <H icon={ReceiptText}>رأس الفاتورة</H>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><L req>المورد</L><NativeSelect><NativeSelectOption>شركة الريان للمواد الغذائية</NativeSelectOption></NativeSelect></div>
              <div><L>رقم الوصل</L><Input defaultValue="4471" dir="ltr" className="text-end" /></div>
              <div><L req>التاريخ</L><Input type="date" defaultValue="2026-10-27" /></div>
              <div><L req>المخزن</L><NativeSelect><NativeSelectOption>الفريزر</NativeSelectOption></NativeSelect></div>
            </div>
          </Card>
          <Card>
            <H icon={Boxes}>المواد</H>
            <div className={cn('hidden grid-cols-[2fr_1fr_1fr_1.2fr_1fr_48px] gap-3 rounded-xl px-4 py-3 font-semibold text-white sm:grid', GRAD)}>
              <span>المادة</span><span>الوحدة</span><span>الكمية</span><span>سعر الوحدة</span><span>الإجمالي</span><span />
            </div>
            <div className="mt-2 space-y-2">
              {INV_LINES.map((l, i) => (
                <div key={i} className="grid grid-cols-2 gap-3 rounded-xl border p-3 sm:grid-cols-[2fr_1fr_1fr_1.2fr_1fr_48px] sm:items-center">
                  <div className="col-span-2 sm:col-span-1"><span className="mb-1 block text-sm text-muted-foreground sm:hidden">المادة</span><div className="flex h-12 items-center rounded-md border bg-secondary px-3 font-semibold">{l.item}</div></div>
                  <div><span className="mb-1 block text-sm text-muted-foreground sm:hidden">الوحدة</span><NativeSelect><NativeSelectOption>{l.unit}</NativeSelectOption></NativeSelect></div>
                  <div><span className="mb-1 block text-sm text-muted-foreground sm:hidden">الكمية</span><Input className="num" defaultValue={l.qty} inputMode="decimal" /></div>
                  <div><span className="mb-1 block text-sm text-muted-foreground sm:hidden">سعر الوحدة</span><Input className="num" defaultValue={money(l.price)} inputMode="decimal" /></div>
                  <div><span className="mb-1 block text-sm text-muted-foreground sm:hidden">الإجمالي</span><div className="num flex h-12 items-center font-semibold text-primary">{money(l.qty * l.price)}</div></div>
                  <button aria-label="حذف السطر" className="grid size-12 place-items-center rounded-xl text-destructive hover:bg-danger-soft max-sm:col-start-2 max-sm:justify-self-end"><Trash2 className="size-5" /></button>
                </div>
              ))}
            </div>
            <button className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-accent/50 font-semibold text-primary"><Plus className="size-5" />سطر جديد</button>
          </Card>
          <Card>
            <H icon={Camera} extra={<div className="flex gap-2"><GradBtn><Camera className="size-5" />الكاميرا</GradBtn><GradBtn><ImagePlus className="size-5" />المعرض</GradBtn></div>}>صور الفاتورة</H>
            <div className="flex gap-3 overflow-x-auto">
              {[238, 214].map(kb => (
                <div key={kb} className="relative grid h-28 w-24 shrink-0 place-items-center rounded-xl border bg-secondary"><ReceiptText className="size-10 text-primary/40" />
                  <span className="num absolute bottom-1 start-1 rounded bg-black/55 px-1.5 text-[10px] text-white">{kb}KB</span></div>))}
              <button aria-label="إضافة صورة" className="grid h-28 w-24 shrink-0 place-items-center rounded-xl border-2 border-dashed text-muted-foreground"><Plus className="size-6" /></button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">الصورة تنضغط تلقائياً لحوالي 250KB قبل الحفظ.</p>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <H icon={Wallet}>مبالغ إضافية وخصم</H>
            <div className="grid grid-cols-3 gap-2">{[['نقل', '15,000'], ['تحميل', ''], ['خصم', '5,000']].map(([l, v]) => <div key={l}><L>{l}</L><Input className="num" defaultValue={v} placeholder="0" /></div>)}</div>
            <p className="mt-2 text-sm text-muted-foreground">تتوزع على كلفة المواد بنسبة قيمة كل سطر.</p>
            <h3 className="mt-5 mb-2 font-semibold">طريقة الدفع</h3>
            <div className="grid grid-cols-3 gap-2">
              {['كامل', 'آجل', 'جزئي'].map((t, i) => <button key={t} className={cn('min-h-12 rounded-xl font-semibold', i === 2 ? cn(GRAD, 'text-white') : 'border text-muted-foreground')}>{t}</button>)}
            </div>
            <div className="mt-3"><L req>المبلغ المدفوع</L><Input className="num" defaultValue="300,000" /></div>
          </Card>
          <div className={cn('rounded-[22px] p-5 text-white shadow-md', GRAD)}>
            <div className="mb-2 flex items-start justify-between"><span className="text-[15px]">الإجمالي النهائي</span><img src={logo} alt="" className="size-11 rounded-xl bg-white p-1" /></div>
            <div className="flex items-baseline gap-2"><Num className="text-4xl font-semibold">{money(total)}</Num><span className="text-white/85">د.ع</span></div>
            <div className="mt-4 space-y-1.5 text-sm">
              {[['مجموع المواد', money(sub)], ['نقل', `+ ${money(transport)}`], ['خصم', `− ${money(discount)}`], ['المدفوع', money(paid)]].map(([l, v]) => (
                <div key={l} className="flex justify-between text-white/90"><span>{l}</span><Num>{v}</Num></div>))}
            </div>
            <div className="mt-3 flex justify-between rounded-xl bg-white px-4 py-2.5 font-semibold text-primary"><span className="flex items-center gap-1.5"><Clock className="size-4" />المتبقي بذمتي</span><Num>{money(total - paid)}</Num></div>
          </div>
          <GradBtn className="min-h-14 w-full text-lg"><ArrowDownToLine className="size-6" />حفظ الفاتورة</GradBtn>
        </div>
      </div>
    </div>
  )
}

export function PreviewD({ screen }: { screen: Screen }) {
  return <Shell screen={screen}>{screen === 'home' ? <HomeD /> : screen === 'stock' ? <StockD /> : <InvoiceD />}</Shell>
}
