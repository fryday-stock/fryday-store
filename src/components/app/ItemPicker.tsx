// اختيار مادة بالبحث (يتحمّل الهمزات والتاء المربوطة) + يبيّن الرصيد
import { Search, X } from 'lucide-react'
import { useId, useMemo, useRef, useState } from 'react'
import { activeItems, balances, grpOf, totalsByItem } from '@/lib/calc'
import { fmt, normKey } from '@/lib/format'
import { isAdmin, useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

export function ItemPicker({ value, onChange, autoFocus, invalid }: { value: string; onChange: (id: string) => void; autoFocus?: boolean; invalid?: boolean }) {
  const s = useStore(x => x)
  const items = useMemo(() => activeItems(s), [s.items]) // eslint-disable-line react-hooks/exhaustive-deps
  const tot = totalsByItem(balances(s.moves))
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [hl, setHl] = useState(0)
  const ref = useRef<HTMLInputElement>(null)
  const lid = useId()
  const it = s.items.find(i => i.id === value)
  const k = normKey(q)
  // ترتيب: يبدي بالاسم ← الاسم يحتوي ← المجموعة
  const rank = (i: (typeof items)[number]) => { const n = normKey(i.name); return n.startsWith(k) ? 0 : n.includes(k) ? 1 : normKey(i.group).includes(k) ? 2 : 9 }
  const res = !k ? items.slice(0, 40) : items.map(i => [i, rank(i)] as const).filter(x => x[1] < 9).sort((a, b) => a[1] - b[1]).map(x => x[0]).slice(0, 40)

  if (it) return (
    <div className="flex h-12 items-center gap-2 rounded-md border bg-secondary ps-3">
      <span className="min-w-0 flex-1 truncate font-semibold">{it.name} <span className="text-sm font-normal text-muted-foreground">({[it.baseUnit, it.bigUnit].filter(Boolean).join(' / ')})</span></span>
      <button type="button" aria-label="تغيير المادة" className="grid size-12 place-items-center text-muted-foreground hover:text-foreground" onClick={() => { onChange(''); setQ(''); setTimeout(() => ref.current?.focus()) }}><X className="size-5" /></button>
    </div>
  )
  const choose = (id: string) => { onChange(id); setQ(''); setOpen(false) }
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
      <input ref={ref} autoFocus={autoFocus} value={q} placeholder="اكتب اسم المادة…" aria-label="المادة" autoComplete="off" role="combobox" aria-expanded={open} aria-controls={lid} aria-invalid={invalid || undefined}
        className="h-12 w-full rounded-md border border-input bg-card ps-10 pe-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive"
        onChange={e => { setQ(e.target.value); setHl(0); setOpen(true) }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') { setHl(h => Math.min(h + 1, res.length - 1)); e.preventDefault() }
          if (e.key === 'ArrowUp') { setHl(h => Math.max(h - 1, 0)); e.preventDefault() }
          if (e.key === 'Enter' && res[hl]) { choose(res[hl].id); e.preventDefault() }
          if (e.key === 'Escape') setOpen(false)
        }} />
      {open && (
        <div id={lid} role="listbox" className="absolute inset-x-0 top-full z-40 mt-1 max-h-72 overflow-y-auto rounded-xl border bg-popover p-1 shadow-lg">
          {res.length ? res.map((x, n) => (
            <div key={x.id} role="option" aria-selected={n === hl} onMouseDown={e => { e.preventDefault(); choose(x.id) }} onMouseEnter={() => setHl(n)}
              className={cn('flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-3', n === hl && 'bg-secondary')}>
              <span className="min-w-0 flex-1"><span className="block truncate font-medium">{x.name}</span><span className="block text-xs text-muted-foreground">{grpOf(x)}</span></span>
              <span className="num text-sm text-muted-foreground" dir="ltr">{fmt(tot.get(x.id) || 0)}</span><span className="text-sm text-muted-foreground">{x.baseUnit}</span>
            </div>
          )) : <div className="px-3 py-3 text-muted-foreground">ما اكو مادة بهذا الاسم{isAdmin(s) ? ' — أضفها من الإدارة' : ''}</div>}
        </div>
      )}
    </div>
  )
}
