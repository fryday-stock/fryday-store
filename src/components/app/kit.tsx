// قطع الواجهة المشتركة بأسلوب «د» (ألوان نموذج Borcelle)
import { BadgeCheck, Inbox, type LucideIcon } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Flag, Scale, Trash2, Undo2 } from 'lucide-react'
import { status } from '@/lib/calc'
import { TYPES } from '@/lib/constants'
import { fmt, money } from '@/lib/format'
import type { Item, MoveType } from '@/lib/types'
import { cn } from '@/lib/utils'

/** التدرّج الأزرق (RTL: يبدي فاتح من اليمين) */
export const GRAD = 'bg-gradient-to-l from-brand-from to-brand-to'

export function Card({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return <section id={id} className={cn('rounded-[var(--radius)] border bg-card p-4 sm:p-5', className)}>{children}</section>
}
export function CardTitle({ icon: I, children, extra, className }: { icon?: LucideIcon; children: ReactNode; extra?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-4 flex flex-wrap items-center justify-between gap-2', className)}>
      <h2 className="flex items-center gap-2 text-lg font-semibold sm:text-xl">{I && <I className="size-5 text-accent" />}{children}</h2>
      {extra}
    </div>
  )
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'grad' | 'outline' | 'ghost' | 'danger' | 'soft'; size?: 'md' | 'lg' | 'icon' }
export function Btn({ tone = 'grad', size = 'md', className, children, type = 'button', ...p }: BtnProps) {
  return (
    <button type={type} {...p} className={cn(
      'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap transition outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-5 [&_svg]:shrink-0',
      size === 'md' && 'min-h-12 px-5', size === 'lg' && 'min-h-14 px-6 text-lg [&_svg]:size-6', size === 'icon' && 'size-12',
      tone === 'grad' && cn(GRAD, 'text-white shadow-sm hover:brightness-105 active:brightness-95'),
      tone === 'outline' && 'border bg-card text-foreground hover:bg-secondary',
      tone === 'ghost' && 'text-primary hover:bg-secondary',
      tone === 'soft' && 'bg-secondary text-primary hover:bg-secondary/70',
      tone === 'danger' && 'bg-destructive text-white hover:brightness-110',
      className)}>{children}</button>
  )
}

/** حقل بعنوان. group = يحتوي أزرار (ما يصير label حتى ما تختلط أسماء الأزرار) */
export function Field({ label, req, hint, hintTone, children, className, group }: { label: ReactNode; req?: boolean; hint?: ReactNode; hintTone?: 'bad' | 'ok'; children: ReactNode; className?: string; group?: boolean }) {
  const T = group ? 'div' : 'label'
  return (
    <T className={cn('block min-w-0', className)} {...(group ? { role: 'group', 'aria-label': typeof label === 'string' ? label : undefined } : {})}>
      <span className="mb-1.5 block text-sm font-medium">{label}{req && <span className="text-destructive"> *</span>}</span>
      {children}
      {hint && <span className={cn('mt-1 block text-sm', hintTone === 'bad' ? 'text-destructive' : hintTone === 'ok' ? 'text-success' : 'text-muted-foreground')}>{hint}</span>}
    </T>
  )
}

export const Num = ({ v, plus, d = 3, className }: { v: number; plus?: boolean; d?: number; className?: string }) =>
  <bdi dir="ltr" className={cn('num', className)}>{plus && v > 0 ? '+' : ''}{fmt(v, d)}</bdi>
export const Money = ({ v, className, unit }: { v: number; className?: string; unit?: boolean }) =>
  <span className={cn('whitespace-nowrap', className)}><bdi dir="ltr" className="num">{money(v)}</bdi>{unit && <small className="ms-1 text-[0.8em] font-normal opacity-80">د.ع</small>}</span>

export function StatusTag({ it, q }: { it: Item; q: number }) {
  const [k, t] = status(it, q)
  if (k === 'ok') return <span className="inline-flex items-center gap-1 text-sm font-semibold whitespace-nowrap text-primary"><BadgeCheck className="size-4" />{t}</span>
  return <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', k === 'low' ? 'bg-warning-soft text-warning' : 'bg-danger-soft text-destructive')}>{t}</span>
}

export const MV_ICON: Record<MoveType, LucideIcon> = { in: ArrowDownToLine, out: ArrowUpFromLine, transfer: ArrowLeftRight, waste: Trash2, return: Undo2, opening: Flag, adjust: Scale }
export const MV_TEXT: Record<MoveType, string> = { in: 'text-mv-in', out: 'text-mv-out', transfer: 'text-mv-transfer', waste: 'text-mv-waste', return: 'text-mv-return', opening: 'text-mv-opening', adjust: 'text-mv-adjust' }
export const MV_BG: Record<MoveType, string> = { in: 'bg-mv-in', out: 'bg-mv-out', transfer: 'bg-mv-transfer', waste: 'bg-mv-waste', return: 'bg-mv-return', opening: 'bg-mv-opening', adjust: 'bg-mv-adjust' }
export function TypeTag({ t, short }: { t: MoveType; short?: boolean }) {
  const I = MV_ICON[t]
  return <span className={cn('inline-flex items-center gap-1 text-sm font-semibold whitespace-nowrap', MV_TEXT[t])}><I className="size-4" />{short ? TYPES[t]?.short : TYPES[t]?.label}</span>
}

/** تبويبات على شكل أزرار (الفعّال بالتدرّج) */
export function Pills<K extends string>({ items, value, onChange, className }: { items: { k: K; t: ReactNode; icon?: LucideIcon }[]; value: K; onChange: (k: K) => void; className?: string }) {
  return (
    <div className={cn('-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0', className)} role="tablist">
      {items.map(({ k, t, icon: I }) => (
        <button key={k} role="tab" aria-selected={value === k} onClick={() => onChange(k)}
          className={cn('inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl px-5 font-semibold transition', value === k ? cn(GRAD, 'text-white shadow-sm') : 'border bg-card text-muted-foreground hover:text-foreground')}>
          {I && <I className="size-5" />}{t}
        </button>
      ))}
    </div>
  )
}

/** اختيار من 2-4 خيارات (مثل طريقة الدفع) */
export function Seg<K extends string>({ items, value, onChange, className }: { items: { k: K; t: ReactNode }[]; value: K; onChange: (k: K) => void; className?: string }) {
  return (
    <div className={cn('grid gap-2', className)} style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }} role="radiogroup">
      {items.map(({ k, t }) => (
        <button key={k} type="button" role="radio" aria-checked={value === k} onClick={() => onChange(k)}
          className={cn('min-h-12 rounded-xl px-2 font-semibold transition', value === k ? cn(GRAD, 'text-white shadow-sm') : 'border bg-card text-muted-foreground hover:text-foreground')}>{t}</button>
      ))}
    </div>
  )
}

export function Empty({ children, icon: I = Inbox }: { children: ReactNode; icon?: LucideIcon }) {
  return <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground"><I className="size-10 opacity-50" /><div>{children}</div></div>
}

/** شريط رأس جدول بالتدرّج */
export function GradHead({ cols, children }: { cols: string; children: ReactNode }) {
  return <div className={cn('hidden gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white md:grid', GRAD)} style={{ gridTemplateColumns: cols }}>{children}</div>
}

export function Tile({ label, children, grad, className }: { label: ReactNode; children: ReactNode; grad?: boolean; className?: string }) {
  return (
    <div className={cn('min-w-0 rounded-[18px] p-4', grad ? cn(GRAD, 'text-white') : 'border bg-card', className)}>
      <div className={cn('text-sm', grad ? 'text-white/85' : 'text-muted-foreground')}>{label}</div>
      <div className={cn('mt-1 text-lg font-semibold sm:text-xl', !grad && 'text-primary')}>{children}</div>
    </div>
  )
}

export function Bar({ pct, color, className }: { pct: number; color?: string; className?: string }) {
  return (
    <div className={cn('h-2.5 overflow-hidden rounded-full bg-muted', className)}>
      <div className={cn('h-full rounded-full transition-[width] duration-700', !color && GRAD)} style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
    </div>
  )
}

export const Sub = ({ children, className }: { children: ReactNode; className?: string }) =>
  children ? <span className={cn('block text-sm text-muted-foreground', className)}>{children}</span> : null

/** عمود الوقت: الساعة فوق والتاريخ جوه */
export function When({ ts }: { ts: number }) {
  const d = new Date(ts), p = (n: number) => String(n).padStart(2, '0')
  return <span className="block whitespace-nowrap"><b className="num block font-medium">{p(d.getHours())}:{p(d.getMinutes())}</b><span className="num block text-xs text-muted-foreground">{d.getFullYear()}-{p(d.getMonth() + 1)}-{p(d.getDate())}</span></span>
}
