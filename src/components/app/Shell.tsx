// الإطار: قائمة جانبية رمادية + شريط علوي بالتدرّج + شريط سفلي للموبايل
import {
  Boxes, ChartColumn, ClipboardCheck, History, Home, LogOut, Menu, Plus, ReceiptText, Search, Settings2, ShoppingCart, type LucideIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { CONFIG } from '@/config'
import { setP } from '@/lib/persist'
import { nav } from '@/lib/router'
import { backend, isAdmin, logout, useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { GRAD } from './kit'

export const logo = `${import.meta.env.BASE_URL}logo.png`
type NavItem = { k: string; t: string; i: LucideIcon; to: string; admin?: boolean }
export const NAV: NavItem[][] = [
  [
    { k: 'home', t: 'الرئيسية', i: Home, to: '/home' },
    { k: 'move', t: 'حركة جديدة', i: Plus, to: '/move/out' },
    { k: 'purchases', t: 'المشتريات', i: ShoppingCart, to: '/purchases/new' },
    { k: 'stock', t: 'الأرصدة', i: Boxes, to: '/stock' },
    { k: 'log', t: 'السجل', i: ReceiptText, to: '/log' },
  ],
  [
    { k: 'count', t: 'الجرد', i: ClipboardCheck, to: '/count' },
    { k: 'reports', t: 'التقارير', i: ChartColumn, to: '/reports' },
    { k: 'audit', t: 'التعديلات والحذف', i: History, to: '/audit' },
  ],
  [{ k: 'admin', t: 'الإدارة', i: Settings2, to: '/admin/items', admin: true }],
]

export function NetBadge({ light }: { light?: boolean }) {
  const online = useStore(s => s.online), pending = useStore(s => s.pending)
  const local = backend().mode === 'local'
  if (local) return <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', light ? 'bg-white/20 text-white' : 'bg-warning-soft text-warning')}>وضع تجربة</span>
  return (
    <span role="status" className={cn('inline-flex items-center gap-1.5 text-sm', light ? 'text-white/90' : online ? 'text-success' : 'text-destructive')}>
      <span className={cn('size-2 rounded-full', online ? 'bg-emerald-300' : 'bg-red-400', !light && (online ? 'bg-success' : 'bg-destructive'))} />
      {online ? (pending ? 'متصل · يرفع…' : 'متصل') : pending ? 'غير متصل · بانتظار المزامنة' : 'غير متصل'}
    </span>
  )
}

export function Shell({ active, title, subtitle, children, actions }: { active: string; title: ReactNode; subtitle?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  const user = useStore(s => s.user)!
  const admin = useStore(s => isAdmin(s))
  const [more, setMore] = useState(false)
  const [q, setQ] = useState('')
  const groups = NAV.map(g => g.filter(n => !n.admin || admin)).filter(g => g.length)
  const role = user.role === 'admin' ? 'مدير' : user.canEdit ? 'موظف (يعدّل)' : 'موظف'
  const search = () => { setP('stock.q', q.trim()); setP('stock.loc', 'all'); setP('stock.group', ''); setQ(''); nav('/stock') }
  const doLogout = () => { logout(); nav('/home', true) }

  const Item = ({ n, onClick }: { n: NavItem; onClick?: () => void }) => (
    <a href={'#' + n.to} onClick={onClick} aria-current={active === n.k ? 'page' : undefined}
      className={cn('flex min-h-12 w-full items-center gap-3.5 px-7 text-start text-[16px] transition-colors',
        active === n.k ? 'bg-accent font-semibold text-white' : 'hover:bg-sidebar-accent hover:text-white')}><n.i className="size-6 shrink-0" />{n.t}</a>
  )

  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-[245px] flex-col overflow-y-auto bg-sidebar text-sidebar-foreground lg:flex">
        <a href="#/home" className="flex h-[120px] shrink-0 items-center gap-3 px-7">
          <img src={logo} alt="" className="size-14 rounded-full bg-white p-0.5" />
          <div><div className="font-heading text-lg leading-tight font-bold text-accent">{CONFIG.shortTitle}</div><div className="text-sm text-white/85">نظام المخزن</div></div>
        </a>
        <nav className="flex flex-1 flex-col gap-1" aria-label="القائمة">
          {groups.map((g, i) => <div key={i} className="flex flex-col gap-1">{i > 0 && <hr className="mx-7 my-3 border-white/10" />}{g.map(n => <Item key={n.k} n={n} />)}</div>)}
          <hr className="mx-7 my-3 border-white/10" />
          <button onClick={doLogout} className="flex min-h-12 w-full items-center gap-3.5 px-7 text-start text-[16px] hover:bg-sidebar-accent hover:text-white"><LogOut className="size-6" />تسجيل خروج</button>
        </nav>
        <div className="h-6 shrink-0" />
      </aside>

      <div className="lg:ps-[245px]">
        <header className={cn('text-white', GRAD)}>
          <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 lg:min-h-[120px] lg:gap-4 lg:px-10">
            <a href="#/home" className="shrink-0 lg:hidden"><img src={logo} alt="الرئيسية" className="size-12 rounded-full bg-white p-0.5" /></a>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-heading text-xl font-bold lg:text-[28px]">{title}</h1>
              {subtitle && <p className="hidden truncate text-sm text-white/90 sm:block">{subtitle}</p>}
            </div>
            <form className="hidden items-center gap-2 xl:flex" onSubmit={e => { e.preventDefault(); search() }} role="search">
              <input value={q} onChange={e => setQ(e.target.value)} aria-label="بحث عن مادة" className="h-12 w-60 rounded-full bg-white px-5 text-foreground placeholder:text-muted-foreground focus:outline-none" placeholder="ابحث عن مادة…" />
              <button aria-label="بحث" className="grid size-12 place-items-center rounded-full border-2 border-white/80 hover:bg-white/10"><Search className="size-5" /></button>
            </form>
            {actions}
            <div className="flex items-center gap-3">
              <div className="hidden text-end sm:block"><div className="font-bold">{user.name}</div><div className="flex items-center justify-end gap-1 text-sm text-white/85">{role} · <NetBadge light /></div></div>
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-lg font-bold text-primary ring-4 ring-white/25" aria-hidden>{(user.name || '؟').trim().charAt(0)}</span>
            </div>
          </div>
          <div className="flex items-center justify-between bg-black/10 px-4 py-1.5 text-xs sm:hidden"><span>{user.name} · {role}</span><NetBadge light /></div>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 pt-5 pb-32 lg:px-10 lg:pt-7 lg:pb-12">{children}</main>
      </div>

      {/* الموبايل والتابلت */}
      <nav aria-label="القائمة" className="fixed inset-x-0 bottom-0 z-30 bg-sidebar text-sidebar-foreground print:hidden lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto grid max-w-xl grid-cols-5 items-end">
          {[NAV[0][0], NAV[0][3], NAV[0][1], NAV[0][2]].map(n => n.k === 'move' ? (
            <a key={n.k} href={'#' + n.to} className="flex flex-col items-center gap-1 pb-2" aria-label="حركة جديدة">
              <span className={cn('-mt-6 grid size-14 place-items-center rounded-2xl text-white shadow-lg ring-4 ring-background', GRAD)}><Plus className="size-7" /></span>
              <span className={cn('text-[11px]', active === 'move' && 'font-semibold text-white')}>حركة</span>
            </a>
          ) : (
            <a key={n.k} href={'#' + n.to} aria-current={active === n.k ? 'page' : undefined}
              className={cn('flex min-h-16 flex-col items-center justify-center gap-1 border-t-[3px] text-[11px]', active === n.k ? 'border-accent bg-white/5 font-semibold text-white' : 'border-transparent')}>
              <n.i className="size-6" />{n.t}
            </a>
          ))}
          <button onClick={() => setMore(true)} className={cn('flex min-h-16 flex-col items-center justify-center gap-1 border-t-[3px] text-[11px]', ['log', 'count', 'reports', 'audit', 'admin'].includes(active) ? 'border-accent bg-white/5 font-semibold text-white' : 'border-transparent')}>
            <Menu className="size-6" />المزيد
          </button>
        </div>
      </nav>
      <Sheet open={more} onOpenChange={setMore}>
        <SheetContent side="bottom" className="rounded-t-3xl border-0 bg-sidebar pb-[max(1rem,env(safe-area-inset-bottom))] text-sidebar-foreground">
          <SheetHeader><SheetTitle className="text-white">القائمة</SheetTitle><SheetDescription className="sr-only">باقي الشاشات</SheetDescription></SheetHeader>
          <div className="flex flex-col gap-1 pb-2">
            {groups.flat().filter(n => !['home', 'stock', 'move', 'purchases'].includes(n.k)).map(n => <Item key={n.k} n={n} onClick={() => setMore(false)} />)}
            <button onClick={() => { setMore(false); doLogout() }} className="flex min-h-12 items-center gap-3.5 px-7 text-[16px] hover:bg-sidebar-accent"><LogOut className="size-6" />تسجيل خروج</button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
