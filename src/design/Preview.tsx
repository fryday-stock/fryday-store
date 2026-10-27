// معاينة الأساليب الثلاثة (المرحلة الأولى فقط — تنشال بعد الاختيار)
import {
  ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Boxes, Camera, ChartColumn, ChevronLeft, ClipboardCheck,
  Download, FolderOpen, History, Home, ImagePlus, LogOut, MapPin, Menu, Plus, ReceiptText, Search, Settings2,
  ShoppingCart, Trash2, TriangleAlert, Undo2, Wallet, Wifi,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { AnimatedCircularProgressBar } from '@/components/magicui/animated-circular-progress-bar'
import { BlurFade } from '@/components/magicui/blur-fade'
import { BorderBeam } from '@/components/magicui/border-beam'
import { DotPattern } from '@/components/magicui/dot-pattern'
import { MagicCard } from '@/components/magicui/magic-card'
import { NumberTicker } from '@/components/magicui/number-ticker'
import { ShineBorder } from '@/components/magicui/shine-border'
import { cn } from '@/lib/utils'
import { INV_LINES, ITEMS, LOCS, MOVES, TYPE_LABEL, detailed, money, qtyFmt, status } from './mock'

export type Theme = 'a' | 'b' | 'c'
export type Screen = 'home' | 'stock' | 'invoice'

const NAV = [
  { k: 'home', t: 'الرئيسية', i: Home },
  { k: 'move', t: 'حركة جديدة', i: Plus },
  { k: 'invoice', t: 'المشتريات', i: ShoppingCart },
  { k: 'stock', t: 'الأرصدة', i: Boxes },
  { k: 'log', t: 'السجل', i: ReceiptText },
  { k: 'count', t: 'الجرد', i: ClipboardCheck },
  { k: 'rep', t: 'التقارير', i: ChartColumn },
  { k: 'aud', t: 'التعديلات والحذف', i: History },
  { k: 'adm', t: 'الإدارة', i: Settings2 },
]
const ACTIONS = [
  { k: 'in', t: 'وارد', d: 'فاتورة مشتريات', i: ArrowDownToLine },
  { k: 'out', t: 'صرف', d: 'للمطبخ أو الأقسام', i: ArrowUpFromLine },
  { k: 'transfer', t: 'نقل', d: 'بين المخازن', i: ArrowLeftRight },
  { k: 'waste', t: 'تالف', d: 'منتهي أو خربان', i: Trash2 },
  { k: 'return', t: 'مرتجع', d: 'إرجاع للمورد', i: Undo2 },
] as const
const mvText: Record<string, string> = { in: 'text-mv-in', out: 'text-mv-out', transfer: 'text-mv-transfer', waste: 'text-mv-waste', return: 'text-mv-return' }
const mvBg: Record<string, string> = { in: 'bg-mv-in', out: 'bg-mv-out', transfer: 'bg-mv-transfer', waste: 'bg-mv-waste', return: 'bg-mv-return' }
const mvIcon: Record<string, typeof Home> = { in: ArrowDownToLine, out: ArrowUpFromLine, transfer: ArrowLeftRight, waste: Trash2, return: Undo2 }

const value = ITEMS.reduce((a, it) => a + Math.max(it.qty, 0) * it.avg, 0)
const low = ITEMS.filter(it => status(it)[0] !== 'ok')

function StatusBadge({ it }: { it: (typeof ITEMS)[number] }) {
  const [k, t] = status(it)
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
    k === 'ok' && 'bg-success-soft text-success', k === 'low' && 'bg-warning-soft text-warning', k === 'out' && 'bg-danger-soft text-destructive')}>{t}</span>
}
const Num = ({ children, className }: { children: ReactNode; className?: string }) => <bdi dir="ltr" className={cn('num', className)}>{children}</bdi>

function Panel({ children, className, title, icon: Icon, action }: { children: ReactNode; className?: string; title?: string; icon?: typeof Home; action?: ReactNode }) {
  return (
    <section className={cn('relative rounded-xl border bg-card text-card-foreground shadow-card', className)}>
      {title && <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">{Icon && <Icon className="size-5 text-primary" />}{title}</h2>{action}
      </header>}
      <div className={cn(title ? 'px-5 pb-5' : 'p-5')}>{children}</div>
    </section>
  )
}

/* ───────────────────────── Shell ───────────────────────── */
function Shell({ theme, screen, children }: { theme: Theme; screen: Screen; children: ReactNode }) {
  const navOn = (k: string) => (k === screen || (k === 'invoice' && screen === 'invoice'))
  const title = screen === 'home' ? 'الرئيسية' : screen === 'stock' ? 'الأرصدة' : 'فاتورة مشتريات'
  const bottom = [NAV[0], NAV[3], NAV[1], NAV[2], { k: 'more', t: 'المزيد', i: Menu }]
  return (
    <div className="min-h-dvh">
      {/* sidebar (desktop) */}
      {theme !== 'c' && (
        <aside className={cn('fixed inset-y-0 start-0 z-30 hidden flex-col gap-1 overflow-y-auto p-4 lg:flex',
          theme === 'a' ? 'w-64 bg-sidebar text-sidebar-foreground' : 'w-60 border-e bg-sidebar text-sidebar-foreground')}>
          <div className="mb-4 flex items-center gap-3 px-2 py-2">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" className={cn('size-12 rounded-full', theme === 'a' ? 'bg-white p-0.5' : 'ring-2 ring-primary/40')} />
            <div><div className="font-heading text-base font-bold">مخزن مطعم فرايدي</div><div className="text-xs opacity-70">نظام المخزن</div></div>
          </div>
          {NAV.map(n => (
            <button key={n.k} className={cn('flex min-h-12 items-center gap-3 rounded-lg px-3 text-start text-[15px] font-medium transition-colors',
              navOn(n.k) ? (theme === 'a' ? 'bg-white text-primary shadow-sm' : 'bg-sidebar-accent text-primary') : 'opacity-85 hover:bg-sidebar-accent')}>
              <n.i className="size-5" />{n.t}
              {theme === 'b' && navOn(n.k) && <span className="ms-auto h-5 w-1 rounded-full bg-primary" />}
            </button>
          ))}
          <button className="mt-auto flex min-h-12 items-center gap-3 rounded-lg px-3 text-[15px] opacity-80 hover:bg-sidebar-accent"><LogOut className="size-5" />تسجيل خروج</button>
        </aside>
      )}

      <div className={cn(theme === 'a' && 'lg:ps-64', theme === 'b' && 'lg:ps-60')}>
        {/* topbar */}
        {theme === 'c' ? (
          <header className="sticky top-0 z-20 px-4 pt-3 lg:px-8">
            <div className="mx-auto flex max-w-7xl items-center gap-3 rounded-full border bg-card/90 p-2 shadow-card backdrop-blur">
              <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" className="size-12 rounded-full" />
              <div className="font-heading font-bold lg:hidden">{title}</div>
              <nav className="hidden flex-1 items-center gap-1 lg:flex">
                {NAV.slice(0, 8).map(n => (
                  <button key={n.k} className={cn('flex min-h-12 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors',
                    navOn(n.k) ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground')}><n.i className="size-[18px]" />{n.t}</button>
                ))}
              </nav>
              <span className="ms-auto inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1.5 text-xs font-semibold text-success"><Wifi className="size-3.5" />متصل</span>
              <span className="grid size-12 place-items-center rounded-full bg-accent font-bold text-accent-foreground">أ</span>
            </div>
          </header>
        ) : (
          <header className={cn('sticky top-0 z-20 flex items-center gap-3 border-b px-4 backdrop-blur lg:px-8',
            theme === 'a' ? 'h-[72px] bg-background/85' : 'h-16 bg-background/80')}>
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" className="size-11 rounded-full lg:hidden" />
            <div className="min-w-0">
              <div className="font-heading text-lg font-bold">{screen === 'home' && theme === 'a' ? 'مرحباً، أحمد' : title}</div>
              {theme === 'a' && <div className="hidden text-sm text-muted-foreground sm:block">الإثنين 27 تشرين الأول — خلّينا نشوف حالة المخزن اليوم</div>}
            </div>
            {theme === 'b' && <div className="relative ms-6 hidden max-w-md flex-1 md:block"><Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="ps-9" placeholder="ابحث عن مادة، فاتورة، مورد…" /></div>}
            <div className="ms-auto flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1.5 text-xs font-semibold text-success"><span className="size-2 rounded-full bg-success" />متصل</span>
              <div className="hidden text-end sm:block"><div className="text-sm font-semibold">أحمد</div><div className="text-xs text-muted-foreground">مدير</div></div>
              <span className={cn('grid size-12 place-items-center rounded-full font-bold', theme === 'a' ? 'bg-accent text-accent-foreground' : 'bg-primary/15 text-primary')}>أ</span>
            </div>
          </header>
        )}

        <main className="mx-auto max-w-7xl px-4 pt-5 pb-32 lg:px-8 lg:pb-10">{children}</main>
      </div>

      {/* bottom nav (mobile/tablet) */}
      <nav className={cn('fixed z-30 lg:hidden', theme === 'c' ? 'inset-x-3 bottom-3 rounded-full border bg-card/95 shadow-card backdrop-blur' : 'inset-x-0 bottom-0 border-t bg-card/95 backdrop-blur')}
        style={{ paddingBottom: theme === 'c' ? undefined : 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto grid max-w-xl grid-cols-5 items-end px-1 py-1.5">
          {bottom.map(n => n.k === 'move' ? (
            <button key={n.k} className="flex flex-col items-center gap-1">
              <span className={cn('-mt-7 grid size-14 place-items-center text-primary-foreground shadow-lg', theme === 'c' ? 'rounded-full bg-accent text-accent-foreground' : 'rounded-2xl bg-primary', theme === 'b' && 'shadow-primary/30')}><Plus className="size-7" /></span>
              <span className="text-[11px] font-medium text-muted-foreground">حركة</span>
            </button>
          ) : (
            <button key={n.k} className={cn('flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium', navOn(n.k) ? 'text-primary' : 'text-muted-foreground')}>
              <n.i className="size-6" />{n.t}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

/* ───────────────────────── Home ───────────────────────── */
function MovesList({ theme, dense }: { theme: Theme; dense?: boolean }) {
  return (
    <ul className="divide-y">
      {MOVES.map((m, i) => {
        const I = mvIcon[m.type]
        return (
          <li key={i} className={cn('flex items-center gap-3', dense ? 'py-2.5' : 'py-3')}>
            <span className={cn('grid shrink-0 place-items-center text-white', mvBg[m.type], theme === 'c' ? 'size-11 rounded-2xl' : 'size-10 rounded-lg', theme === 'b' && 'bg-transparent ring-1 ring-current', theme === 'b' && mvText[m.type])}><I className="size-5" /></span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2"><b className="truncate">{m.item}</b><span className={cn('text-xs font-semibold', mvText[m.type])}>{TYPE_LABEL[m.type]}</span></div>
              <div className="truncate text-sm text-muted-foreground">{m.where}{m.note ? ` — ${m.note}` : ''} · {m.staff}</div>
            </div>
            <div className="text-end"><div className="num font-semibold">{m.qty}</div><div className="num text-xs text-muted-foreground">{m.time}</div></div>
          </li>
        )
      })}
    </ul>
  )
}

function LowList() {
  return (
    <ul className="divide-y">
      {low.map(it => (
        <li key={it.name} className="flex items-center gap-3 py-2.5">
          <div className="min-w-0 flex-1"><b>{it.name}</b><div className="text-xs text-muted-foreground">{it.group} · حد الأمان {qtyFmt(it.min)}</div></div>
          <div className="num text-sm font-semibold">{qtyFmt(it.qty)} {it.unit}</div>
          <StatusBadge it={it} />
        </li>
      ))}
    </ul>
  )
}

function HomeA() {
  return (
    <div className="space-y-5">
      <BlurFade><div className="grid grid-cols-5 gap-2 sm:gap-3">
        {ACTIONS.map(a => (
          <MagicCard key={a.k} className="cursor-pointer rounded-xl shadow-card" gradientColor="rgba(30,77,58,0.10)" gradientFrom="#1e4d3a" gradientTo="#c2410c">
            <button className="flex w-full flex-col items-center gap-2 p-3 text-center sm:flex-row sm:gap-3 sm:p-4 sm:text-start">
              <span className={cn('grid size-12 shrink-0 place-items-center rounded-xl text-white', mvBg[a.k])}><a.i className="size-6" /></span>
              <span><b className="block text-[17px]">{a.t}</b><span className="hidden text-sm text-muted-foreground sm:inline">{a.d}</span></span>
            </button>
          </MagicCard>
        ))}
      </div></BlurFade>
      <BlurFade delay={0.08}><div className="grid gap-5 lg:grid-cols-[1.1fr_2fr]">
        <div className="relative overflow-hidden rounded-xl bg-primary p-6 text-primary-foreground shadow-card">
          <div className="flex items-center justify-between"><span className="text-sm opacity-85">قيمة المخزون</span><img src={`${import.meta.env.BASE_URL}logo.png`} className="size-12 rounded-full bg-white p-0.5" alt="" /></div>
          <div className="mt-3 flex items-baseline gap-2"><NumberTicker value={value} className="num font-heading text-4xl font-bold text-primary-foreground" /><span className="opacity-80">د.ع</span></div>
          <div className="mt-5 flex gap-4 text-sm opacity-85"><span>{ITEMS.length} مادة</span><span>·</span><span>{LOCS.length} أماكن خزن</span></div>
          <div className="absolute -start-10 -bottom-12 size-40 rounded-full bg-accent/40 blur-2xl" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[{ l: 'عدد المواد', v: ITEMS.length, i: Boxes, c: 'text-primary bg-primary/10' }, { l: 'تحتاج طلب', v: low.length, i: TriangleAlert, c: 'text-accent bg-accent/10' }, { l: 'حركات اليوم', v: 23, i: History, c: 'text-success bg-success-soft' }].map(k => (
            <div key={k.l} className="flex flex-col justify-between gap-3 rounded-xl border bg-card p-4 shadow-card">
              <span className={cn('grid size-12 place-items-center rounded-xl', k.c)}><k.i className="size-6" /></span>
              <div><div className="text-sm text-muted-foreground">{k.l}</div><NumberTicker value={k.v} className="num font-heading text-2xl font-bold" /></div>
            </div>
          ))}
        </div>
      </div></BlurFade>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="أماكن الخزن" icon={MapPin}>
          <div className="grid grid-cols-2 gap-3">{LOCS.map((l, i) => (
            <button key={l} className="flex min-h-16 items-center gap-3 rounded-lg border bg-muted/50 p-3 text-start hover:border-primary/40">
              <MapPin className="size-5 text-accent" /><span><b className="block">{l}</b><span className="text-sm text-muted-foreground">{[9, 5, 4, 3][i]} مادة متوفرة</span></span>
            </button>))}</div>
        </Panel>
        <Panel title="تحتاج طلب" icon={TriangleAlert}><LowList /></Panel>
      </div>
      <Panel title="آخر الحركات" icon={History} action={<Button variant="ghost" size="sm">عرض السجل<ChevronLeft /></Button>}><MovesList theme="a" /></Panel>
    </div>
  )
}

function HomeB() {
  const okPct = Math.round((ITEMS.length - low.length) / ITEMS.length * 100)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {ACTIONS.map(a => (
          <Button key={a.k} variant="outline" className="flex-1 basis-[calc(50%-0.5rem)] justify-start border-border bg-card sm:basis-auto sm:flex-none">
            <a.i className={cn('size-5', mvText[a.k])} />{a.t}
          </Button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="relative overflow-hidden rounded-xl border bg-card p-5 md:col-span-2">
          <DotPattern className="text-primary/20 [mask-image:radial-gradient(260px_circle_at_left,white,transparent)]" />
          <div className="relative flex items-center justify-between">
            <div><div className="text-sm text-muted-foreground">قيمة المخزون الكلية</div>
              <div className="mt-2 flex items-baseline gap-2"><NumberTicker value={value} className="num text-4xl font-semibold tracking-tight text-primary" /><span className="text-muted-foreground">د.ع</span></div>
              <div className="mt-3 flex gap-3 text-sm text-muted-foreground"><span className="num text-success">+4.2%</span> عن الشهر الماضي</div></div>
            <div className="hidden text-end sm:block"><div className="text-xs text-muted-foreground">آخر مزامنة</div><div className="num text-sm">14:22</div></div>
          </div>
          <BorderBeam size={120} duration={8} colorFrom="#34d399" colorTo="#fbbf24" />
        </div>
        <div className="flex items-center gap-4 rounded-xl border bg-card p-5">
          <AnimatedCircularProgressBar value={okPct} gaugePrimaryColor="#34d399" gaugeSecondaryColor="rgba(148,163,184,0.15)" className="size-24 text-xl" />
          <div><div className="text-sm text-muted-foreground">صحة المخزون</div><div className="text-sm">{ITEMS.length - low.length} من {ITEMS.length} كافية</div></div>
        </div>
        <div className="grid grid-rows-2 gap-4">
          <div className="flex items-center justify-between rounded-xl border bg-card px-5"><span className="text-sm text-muted-foreground">تحتاج طلب</span><NumberTicker value={low.length} className="num text-2xl font-semibold text-accent" /></div>
          <div className="flex items-center justify-between rounded-xl border bg-card px-5"><span className="text-sm text-muted-foreground">حركات اليوم</span><NumberTicker value={23} className="num text-2xl font-semibold" /></div>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="آخر الحركات" icon={History} className="shadow-none"><MovesList theme="b" dense /></Panel>
        <div className="space-y-4">
          <Panel title="تحتاج طلب" icon={TriangleAlert} className="shadow-none"><LowList /></Panel>
          <Panel title="أماكن الخزن" icon={MapPin} className="shadow-none">
            <div className="space-y-2">{LOCS.map((l, i) => (
              <div key={l} className="flex items-center gap-3"><span className="w-28 shrink-0 text-sm">{l}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${[78, 42, 64, 30][i]}%` }} /></div>
                <span className="num w-14 text-end text-xs text-muted-foreground">{[9, 5, 4, 3][i]} مادة</span></div>))}</div>
          </Panel>
        </div>
      </div>
    </div>
  )
}

function HomeC() {
  return (
    <div className="grid auto-rows-min grid-cols-2 gap-4 lg:grid-cols-4">
      <BlurFade className="col-span-2 row-span-2">
        <div className="relative h-full min-h-64 overflow-hidden rounded-3xl bg-gradient-to-bl from-primary via-[#6d28d9] to-[#312e81] p-6 text-white shadow-card">
          <div className="flex items-center justify-between"><span className="rounded-full bg-white/15 px-3 py-1 text-sm">قيمة المخزون</span><img src={`${import.meta.env.BASE_URL}logo.png`} className="size-14 rounded-full ring-4 ring-white/20" alt="" /></div>
          <div className="mt-8 flex items-baseline gap-2"><NumberTicker value={value} className="num text-5xl font-bold text-white" /><span className="text-white/80">د.ع</span></div>
          <div className="mt-8 grid grid-cols-3 gap-3">
            {[['المواد', ITEMS.length], ['تحتاج طلب', low.length], ['حركات اليوم', 23]].map(([l, v]) => (
              <div key={l} className="rounded-2xl bg-white/12 p-3 backdrop-blur"><div className="text-xs text-white/75">{l}</div><div className="num text-2xl font-bold">{v}</div></div>))}
          </div>
          <div className="absolute -start-16 -top-16 size-56 rounded-full bg-accent/50 blur-3xl" />
        </div>
      </BlurFade>
      {ACTIONS.slice(0, 4).map((a, i) => (
        <BlurFade key={a.k} delay={0.05 * (i + 1)}>
          <button className="group relative flex h-full min-h-32 w-full flex-col justify-between overflow-hidden rounded-3xl border bg-card p-5 text-start shadow-card transition-transform hover:-translate-y-0.5">
            <span className={cn('grid size-12 place-items-center rounded-2xl text-white', mvBg[a.k])}><a.i className="size-6" /></span>
            <span><b className="block text-lg">{a.t}</b><span className="text-sm text-muted-foreground">{a.d}</span></span>
            {a.k === 'in' && <ShineBorder shineColor={['#4f46e5', '#f97316']} borderWidth={2} />}
          </button>
        </BlurFade>
      ))}
      <div className="col-span-2 rounded-3xl border bg-card p-5 shadow-card">
        <div className="mb-2 flex items-center justify-between"><h2 className="flex items-center gap-2 font-semibold"><TriangleAlert className="size-5 text-accent" />تحتاج طلب</h2><Badge variant="secondary" className="rounded-full">{low.length}</Badge></div>
        <LowList />
      </div>
      <div className="col-span-2 rounded-3xl border bg-card p-5 shadow-card">
        <h2 className="mb-3 flex items-center gap-2 font-semibold"><MapPin className="size-5 text-primary" />أماكن الخزن</h2>
        <div className="grid grid-cols-2 gap-3">{LOCS.map((l, i) => (
          <button key={l} className="min-h-20 rounded-2xl bg-secondary p-4 text-start"><b className="block">{l}</b><span className="text-sm text-muted-foreground">{[9, 5, 4, 3][i]} مادة</span></button>))}</div>
      </div>
      <div className="col-span-2 rounded-3xl border bg-card p-5 shadow-card lg:col-span-4">
        <h2 className="mb-1 flex items-center gap-2 font-semibold"><History className="size-5 text-primary" />آخر الحركات</h2>
        <MovesList theme="c" />
      </div>
    </div>
  )
}

/* ───────────────────────── Stock ───────────────────────── */
function Stock({ theme }: { theme: Theme }) {
  const groups = [...new Set(ITEMS.map(i => i.group))]
  const chipOn = theme === 'c' ? 'bg-primary text-primary-foreground border-primary' : theme === 'b' ? 'bg-primary/15 text-primary border-primary/40' : 'bg-primary text-primary-foreground border-primary'
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold">الأرصدة</h1>
        <Button variant={theme === 'b' ? 'outline' : 'default'}><Download />تصدير إكسل</Button>
      </div>
      <div className={cn('grid gap-3 sm:grid-cols-[1fr_14rem]', theme === 'c' && 'rounded-3xl border bg-card p-3 shadow-card')}>
        <div className="relative flex-1"><Search className="absolute start-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" /><Input className={cn('ps-10', theme !== 'b' && 'bg-card')} placeholder="بحث باسم المادة أو المجموعة…" /></div>
        <NativeSelect className={cn('', theme !== 'b' && 'bg-card')}><NativeSelectOption>كل المجموعات</NativeSelectOption>{groups.map(g => <NativeSelectOption key={g}>{g}</NativeSelectOption>)}</NativeSelect>
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {['كل الأماكن', ...LOCS].map((l, i) => (
          <button key={l} className={cn('min-h-12 shrink-0 rounded-full border bg-card px-5 text-sm font-medium', i === 0 ? chipOn : 'text-muted-foreground')}>{l}</button>))}
      </div>
      <div className={cn('grid grid-cols-3 gap-3', theme === 'b' && 'gap-px overflow-hidden rounded-xl border bg-border')}>
        {[['النتائج', `${ITEMS.length} مادة`], ['الكمية', '318.5 كغم · 1,690 قطعة · 70 لتر'], ['القيمة', `${money(value)} د.ع`]].map(([l, v], i) => (
          <div key={l} className={cn('p-4', theme === 'b' ? 'bg-card' : 'rounded-xl border bg-card shadow-card', theme === 'c' && 'rounded-2xl', i === 1 && 'max-sm:col-span-3 max-sm:order-last')}>
            <div className="text-xs text-muted-foreground">{l}</div><div className={cn('num mt-1 font-semibold', i === 2 && 'text-primary')}>{v}</div></div>))}
      </div>

      {/* desktop table */}
      <div className={cn('hidden overflow-hidden border bg-card shadow-card md:block', theme === 'c' ? 'rounded-3xl' : 'rounded-xl')}>
        <table className="w-full text-sm">
          <thead className={cn('text-muted-foreground', theme === 'b' ? 'bg-muted' : 'bg-muted/60')}>
            <tr className="text-start">{['المادة', 'الرصيد', 'التوزيع على الأماكن', 'حد الأمان', 'القيمة (د.ع)', 'الحالة'].map((h, i) => <th key={h} className={cn('px-4 py-3 text-start font-medium', (i === 1 || i === 3 || i === 4) && 'text-end')}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {groups.map(g => {
              const rows = ITEMS.filter(i => i.group === g)
              return [
                <tr key={g} className={cn(theme === 'b' ? 'bg-background' : 'bg-secondary/60')}>
                  <td colSpan={6} className="px-4 py-2.5"><span className="flex items-center gap-2 font-semibold"><FolderOpen className="size-4 text-primary" />{g}<span className="text-xs font-normal text-muted-foreground">— {rows.length} مادة — القيمة <Num>{money(rows.reduce((a, r) => a + r.qty * r.avg, 0))}</Num> د.ع</span></span></td>
                </tr>,
                ...rows.map(it => (
                  <tr key={it.name} className="border-t hover:bg-muted/40">
                    <td className={cn('px-4', theme === 'b' ? 'py-2.5' : 'py-3')}><button className="min-h-12 text-start font-semibold text-primary hover:underline">{it.name}</button>{detailed(it) && <div className="-mt-2 text-xs text-muted-foreground">{detailed(it)}</div>}</td>
                    <td className="px-4 text-end"><Num className="font-semibold">{qtyFmt(it.qty)}</Num> <span className="text-muted-foreground">{it.unit}</span></td>
                    <td className="px-4 text-xs text-muted-foreground">{it.locs.map(([l, v]) => `${l}: ${qtyFmt(v)}`).join(' · ') || '—'}</td>
                    <td className="px-4 text-end"><Num>{qtyFmt(it.min)}</Num></td>
                    <td className="px-4 text-end"><Num>{money(it.qty * it.avg)}</Num></td>
                    <td className="px-4"><StatusBadge it={it} /></td>
                  </tr>)),
              ]
            })}
          </tbody>
        </table>
      </div>

      {/* mobile cards */}
      <div className="space-y-4 md:hidden">
        {groups.slice(0, 4).map(g => (
          <div key={g}>
            <div className="mb-2 flex items-center gap-2 px-1 text-sm font-semibold"><FolderOpen className="size-4 text-primary" />{g}</div>
            <div className={cn('divide-y overflow-hidden border bg-card shadow-card', theme === 'c' ? 'rounded-3xl' : 'rounded-xl')}>
              {ITEMS.filter(i => i.group === g).map(it => (
                <button key={it.name} className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-start">
                  <div className="min-w-0 flex-1"><b className="block">{it.name}</b><span className="text-xs text-muted-foreground">{detailed(it) || it.locs.map(l => l[0]).join('، ') || '—'}</span></div>
                  <div className="text-end"><div><Num className="font-semibold">{qtyFmt(it.qty)}</Num> <span className="text-xs text-muted-foreground">{it.unit}</span></div><StatusBadge it={it} /></div>
                  <ChevronLeft className="size-5 text-muted-foreground" />
                </button>))}
            </div>
          </div>))}
      </div>
    </div>
  )
}

/* ───────────────────────── Invoice ───────────────────────── */
function Invoice({ theme }: { theme: Theme }) {
  const sub = INV_LINES.reduce((a, l) => a + l.qty * l.price, 0)
  const transport = 15000, discount = 5000, total = sub + transport - discount, paid = 300000
  const box = cn('border bg-card shadow-card', theme === 'c' ? 'rounded-3xl' : 'rounded-xl', theme === 'b' && 'shadow-none')
  const L = ({ children, req }: { children: ReactNode; req?: boolean }) => <label className="mb-1.5 block text-sm font-medium">{children}{req && <span className="text-destructive"> *</span>}</label>
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {['فاتورة جديدة', 'الفواتير', 'الموردين'].map((t, i) => (
          <button key={t} className={cn('min-h-12 rounded-full px-5 text-sm font-semibold', i === 0 ? (theme === 'b' ? 'bg-primary/15 text-primary' : 'bg-primary text-primary-foreground') : 'text-muted-foreground hover:bg-secondary')}>{t}</button>))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className={cn(box, 'p-5')}>
            <h2 className="mb-4 flex items-center gap-2 font-semibold"><ReceiptText className="size-5 text-primary" />رأس الفاتورة</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><L req>المورد</L><NativeSelect><NativeSelectOption>شركة الريان للمواد الغذائية</NativeSelectOption></NativeSelect></div>
              <div><L>رقم الوصل</L><Input defaultValue="4471" dir="ltr" className="text-end" /></div>
              <div><L req>التاريخ</L><Input type="date" defaultValue="2026-10-27" /></div>
              <div><L req>المخزن</L><NativeSelect><NativeSelectOption>الفريزر</NativeSelectOption></NativeSelect></div>
            </div>
          </div>

          <div className={cn(box, 'p-5')}>
            <h2 className="mb-4 flex items-center gap-2 font-semibold"><Boxes className="size-5 text-primary" />المواد</h2>
            <div className="space-y-3">
              {INV_LINES.map((l, i) => (
                <div key={i} className={cn('grid grid-cols-2 gap-3 rounded-lg border p-3 sm:grid-cols-[2fr_1fr_1fr_1.2fr_1fr_auto] sm:items-end', theme === 'c' ? 'rounded-2xl bg-secondary/50' : 'bg-muted/40')}>
                  <div className="col-span-2 sm:col-span-1"><L>المادة</L><div className="flex h-12 items-center rounded-md border bg-card px-3 font-semibold">{l.item}</div></div>
                  <div><L>الوحدة</L><NativeSelect className="bg-card"><NativeSelectOption>{l.unit}</NativeSelectOption></NativeSelect></div>
                  <div><L>الكمية</L><Input className="num bg-card" defaultValue={l.qty} inputMode="decimal" /></div>
                  <div><L>سعر الوحدة</L><Input className="num bg-card" defaultValue={money(l.price)} inputMode="decimal" /></div>
                  <div><L>الإجمالي</L><div className="num flex h-12 items-center font-semibold">{money(l.qty * l.price)}</div></div>
                  <Button variant="ghost" size="icon" aria-label="حذف السطر" className="text-destructive max-sm:col-start-2 max-sm:justify-self-end"><Trash2 /></Button>
                </div>))}
            </div>
            <Button variant="outline" className="mt-3 w-full border-dashed"><Plus />سطر جديد</Button>
          </div>

          <div className={cn(box, 'p-5')}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-semibold"><Camera className="size-5 text-primary" />صور الفاتورة <Badge variant="secondary" className="rounded-full">جديد</Badge></h2>
              <div className="flex gap-2"><Button variant="secondary"><Camera />الكاميرا</Button><Button variant="secondary"><ImagePlus />المعرض</Button></div>
            </div>
            <div className="flex gap-3 overflow-x-auto">
              {[0, 1].map(i => (
                <div key={i} className={cn('relative grid h-28 w-24 shrink-0 place-items-center overflow-hidden border bg-gradient-to-b from-muted to-secondary', theme === 'c' ? 'rounded-2xl' : 'rounded-lg')}>
                  <ReceiptText className="size-10 text-muted-foreground/60" />
                  <span className="num absolute bottom-1 start-1 rounded bg-black/55 px-1.5 text-[10px] text-white">{[238, 214][i]}KB</span>
                </div>))}
              <button className={cn('grid h-28 w-24 shrink-0 place-items-center border-2 border-dashed text-muted-foreground', theme === 'c' ? 'rounded-2xl' : 'rounded-lg')}><Plus className="size-6" /></button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">الصورة تنضغط تلقائياً لحوالي 250KB قبل الحفظ.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className={cn(box, 'p-5')}>
            <h2 className="mb-3 flex items-center gap-2 font-semibold"><Wallet className="size-5 text-primary" />مبالغ إضافية وخصم</h2>
            <div className="grid grid-cols-3 gap-2">
              {[['نقل', '15,000'], ['تحميل', ''], ['خصم', '5,000']].map(([l, v]) => <div key={l}><L>{l}</L><Input className="num" defaultValue={v} placeholder="0" /></div>)}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">تتوزع على كلفة المواد بنسبة قيمة كل سطر.</p>
            <h2 className="mt-5 mb-2 font-semibold">طريقة الدفع</h2>
            <div className={cn('grid grid-cols-3 gap-1 p-1', theme === 'c' ? 'rounded-full bg-secondary' : 'rounded-lg bg-muted')}>
              {['كامل', 'آجل', 'جزئي'].map((t, i) => <button key={t} className={cn('min-h-12 text-sm font-semibold', theme === 'c' ? 'rounded-full' : 'rounded-md', i === 2 ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')}>{t}</button>)}
            </div>
            <div className="mt-3"><L req>المبلغ المدفوع</L><Input className="num" defaultValue="300,000" /></div>
          </div>
          <div className={cn('relative overflow-hidden p-5', theme === 'a' && 'rounded-xl bg-primary text-primary-foreground shadow-card', theme === 'b' && 'rounded-xl border bg-card', theme === 'c' && 'rounded-3xl bg-foreground text-background shadow-card')}>
            <h2 className="mb-3 font-semibold">الإجمالي</h2>
            {[['مجموع المواد', money(sub)], ['نقل', `+ ${money(transport)}`], ['خصم', `− ${money(discount)}`]].map(([l, v]) => (
              <div key={l} className="flex justify-between py-1.5 text-sm opacity-90"><span>{l}</span><Num>{v}</Num></div>))}
            <div className="my-2 border-t border-current/20" />
            <div className="flex items-baseline justify-between py-1"><span className="font-semibold">الإجمالي النهائي</span><span className={cn('num text-2xl font-bold', theme === 'b' && 'text-primary')}><Num>{money(total)}</Num> <small className="text-sm font-normal">د.ع</small></span></div>
            <div className="flex justify-between py-1 text-sm opacity-90"><span>المدفوع</span><Num>{money(paid)}</Num></div>
            <div className={cn('mt-1 flex justify-between rounded-lg px-3 py-2 text-sm font-semibold', theme === 'b' ? 'bg-warning-soft text-warning' : 'bg-white/15')}><span>المتبقي بذمتي</span><Num>{money(total - paid)}</Num></div>
            {theme === 'b' && <BorderBeam size={90} duration={7} colorFrom="#34d399" colorTo="#fbbf24" />}
          </div>
          <Button size="lg" className={cn('w-full', theme === 'a' && 'bg-accent text-accent-foreground hover:bg-accent/90', theme === 'c' && 'rounded-full')}><ArrowDownToLine />حفظ الفاتورة</Button>
        </div>
      </div>
    </div>
  )
}

export function Preview({ theme, screen }: { theme: Theme; screen: Screen }) {
  return (
    <Shell theme={theme} screen={screen}>
      {screen === 'home' && (theme === 'a' ? <HomeA /> : theme === 'b' ? <HomeB /> : <HomeC />)}
      {screen === 'stock' && <Stock theme={theme} />}
      {screen === 'invoice' && <Invoice theme={theme} />}
    </Shell>
  )
}
