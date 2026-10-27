// الأرصدة: مقسّمة حسب المجموعة + بحث + فلتر المخزن + ملخص الكمية والقيمة
import { ChevronLeft, Download, FolderOpen, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Bar, Btn, Card, Empty, GRAD, Money, Num, StatusTag, Tile } from '@/components/app/kit'
import { run } from '@/components/app/dialogs'
import { Shell } from '@/components/app/Shell'
import { CONFIG } from '@/config'
import { activeItems, activeLocs, allGroups, avgCosts, balAt, balances, detailed, grpOf, isZero, itemAtLoc, locName, locReadiness, totalsByItem } from '@/lib/calc'
import { NOGRP } from '@/lib/constants'
import { exportSheet } from '@/lib/excel'
import { dt, fmt, normKey, r3, today } from '@/lib/format'
import { usePersist } from '@/lib/persist'
import { useStore } from '@/lib/store'
import type { Item } from '@/lib/types'
import { cn } from '@/lib/utils'

const COLS = '1.7fr 1fr 1.7fr 0.8fr 1fr 1fr'

export function Stock() {
  const s = useStore(x => x)
  const [q, setQ] = usePersist('stock.q', '')
  const [G, setG] = usePersist('stock.group', '')
  const [L0, setL] = usePersist('stock.loc', 'all')
  const bal = balances(s.moves), tot = totalsByItem(bal), avg = avgCosts(s.moves)
  const locs = activeLocs(s), groups = allGroups(s)
  const L = L0 !== 'all' && !locs.some(l => l.id === L0) ? 'all' : L0
  const k = normKey(q)

  let rows = activeItems(s).map(it => ({ it, g: grpOf(it), qty: L === 'all' ? (tot.get(it.id) || 0) : balAt(bal, it.id, L), val: 0 }))
  if (L !== 'all') rows = rows.filter(r => itemAtLoc(s, bal, r.it.id, L))
  if (G && groups.includes(G)) rows = rows.filter(r => r.g === G)
  if (k) rows = rows.filter(r => normKey(r.it.name).includes(k) || normKey(r.g).includes(k))
  rows.forEach(r => (r.val = Math.max(r.qty, 0) * (avg.get(r.it.id) || 0)))
  rows.sort((a, b) => Number(a.g === NOGRP) - Number(b.g === NOGRP) || a.g.localeCompare(b.g, 'ar') || a.it.name.localeCompare(b.it.name, 'ar'))
  const byUnit = new Map<string, number>(); rows.forEach(r => byUnit.set(r.it.baseUnit, (byUnit.get(r.it.baseUnit) || 0) + r.qty))
  const totVal = rows.reduce((a, r) => a + r.val, 0)
  const per = (it: Item) => locs.map(l => [l.name, balAt(bal, it.id, l.id)] as const).filter(x => !isZero(x[1]))
  const sections: { g: string; rows: typeof rows }[] = []
  for (const r of rows) { const last = sections[sections.length - 1]; if (last?.g === r.g) last.rows.push(r); else sections.push({ g: r.g, rows: [r] }) }
  const tag = (it: Item, qty: number) => L === 'all' ? <StatusTag it={it} q={qty} />
    : <span className={cn('text-sm font-medium', qty < -0.0005 ? 'text-destructive' : isZero(qty) ? 'text-muted-foreground' : 'text-primary')}>{qty < -0.0005 ? 'رصيد سالب' : isZero(qty) ? 'فارغ' : 'متوفر'}</span>

  const exportX = () => run(async () => {
    const out: ((string | number)[] | { group: string })[] = []
    let lg = ''
    for (const r of rows) {
      if (r.g !== lg) { lg = r.g; out.push({ group: r.g }) }
      out.push([r.it.name, r3(r.qty), r.it.baseUnit, detailed(r.it, r.qty), Math.round(avg.get(r.it.id) || 0), Math.round(r.val)])
    }
    await exportSheet({
      file: `أرصدة_${L === 'all' ? 'كل_المخازن' : locName(s, L)}_${today()}.xlsx`, title: `${CONFIG.title} — الأرصدة`,
      sub: [`المخزن: ${L === 'all' ? 'كل المخازن' : locName(s, L)}`, G ? `المجموعة: ${G}` : '', q.trim() ? `البحث: ${q.trim()}` : '', `بتاريخ: ${dt(Date.now())}`].filter(Boolean).join('   |   '),
      headers: ['المادة', 'الرصيد', 'الوحدة', 'مفصّل', 'متوسط الكلفة (د.ع)', 'القيمة (د.ع)'],
      rows: out, qty: [1], money: [4, 5], totals: { label: 'المجموع', cols: [5] },
    })
  })

  return (
    <Shell active="stock" title="الأرصدة" subtitle="كل المواد حسب المجموعة والمخزن">
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_14rem_auto]">
          <div className="relative"><Search className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" className="rounded-full ps-11" placeholder="بحث باسم المادة أو المجموعة…" value={q} onChange={e => setQ(e.target.value)} aria-label="بحث" /></div>
          <NativeSelect className="rounded-full" value={G} onChange={e => setG(e.target.value)} aria-label="المجموعة">
            <NativeSelectOption value="">كل المجموعات</NativeSelectOption>{groups.map(g => <NativeSelectOption key={g} value={g}>{g}</NativeSelectOption>)}
          </NativeSelect>
          <Btn onClick={exportX} disabled={!rows.length}><Download />تصدير إكسل</Btn>
        </div>

        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1" role="tablist" aria-label="المخزن">
          <button role="tab" aria-selected={L === 'all'} onClick={() => setL('all')} className={cn('min-h-12 shrink-0 rounded-[18px] px-5 py-3 text-start', L === 'all' ? cn(GRAD, 'text-white shadow') : 'border bg-card')}>
            <b className="block">كل الأماكن</b><span className={cn('text-sm', L === 'all' ? 'text-white/85' : 'text-muted-foreground')}>{activeItems(s).length} مادة</span></button>
          {locs.map(l => {
            const r = locReadiness(s, bal, l.id), on = L === l.id
            return (
              <button key={l.id} role="tab" aria-selected={on} onClick={() => setL(l.id)} className={cn('w-52 shrink-0 rounded-[18px] px-4 py-3 text-start', on ? cn(GRAD, 'text-white shadow') : 'border bg-card')}>
                <div className="flex items-baseline justify-between gap-2"><b className="truncate">{l.name}</b><bdi dir="ltr" className="num text-sm font-semibold">{r.pct}%</bdi></div>
                <Bar className={cn('mt-2 h-2', on && 'bg-white/30')} pct={r.pct} color={on ? '#fff' : r.pct < 50 ? '#dc2626' : undefined} />
                <span className={cn('mt-1 block text-xs', on ? 'text-white/85' : 'text-muted-foreground')}>{r.have} مادة متوفرة</span>
              </button>
            )
          })}
        </div>

        {rows.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Tile label="القيمة" grad><Money v={totVal} unit /></Tile>
            <Tile label="النتائج">{rows.length} مادة</Tile>
            <Tile label="الكمية" className="col-span-2 sm:col-span-1"><span className="text-base font-semibold text-foreground">{[...byUnit].map(([u, v]) => <span key={u} className="me-2 inline-block whitespace-nowrap"><Num v={v} /> {u}</span>)}</span></Tile>
          </div>
        )}

        {!rows.length ? <Card><Empty>ما اكو مواد {q ? 'بهذا البحث' : G ? 'بهذي المجموعة' : L !== 'all' ? 'بهذا المكان' : 'بعد'}</Empty></Card> : <>
          <Card className="hidden md:block">
            <div className={cn('grid gap-3 rounded-xl px-5 py-3 font-semibold text-white', GRAD)} style={{ gridTemplateColumns: L === 'all' ? COLS : '1.7fr 1fr 1fr 1fr' }}>
              <span>المادة</span><span className="text-center">الرصيد</span>{L === 'all' && <><span>التوزيع على الأماكن</span><span className="text-center">حد الأمان</span></>}<span className="text-center">القيمة (د.ع)</span><span className="text-end">الحالة</span>
            </div>
            <div className="mt-2 rounded-xl border">
              {sections.map(sec => (
                <div key={sec.g}>
                  <div className="flex items-center gap-2 border-b bg-secondary px-5 py-2.5 font-semibold text-primary"><FolderOpen className="size-4" />{sec.g}
                    <span className="text-sm font-normal text-muted-foreground">— {sec.rows.length} مادة — القيمة <Money v={sec.rows.reduce((a, r) => a + r.val, 0)} /> د.ع</span></div>
                  {sec.rows.map(({ it, qty, val }) => (
                    <div key={it.id} className="grid items-center gap-3 border-b px-5 py-2 last:border-0 hover:bg-muted/50" style={{ gridTemplateColumns: L === 'all' ? COLS : '1.7fr 1fr 1fr 1fr' }}>
                      <div className="min-w-0"><a href={`#/stock/item/${it.id}`} className="inline-flex min-h-10 items-center font-semibold hover:text-primary hover:underline">{it.name}</a>
                        {detailed(it, qty) && <span className="-mt-1 block text-sm text-muted-foreground">{detailed(it, qty)}</span>}</div>
                      <div className="text-center"><Num v={qty} className={cn('font-semibold', qty < -0.0005 && 'text-destructive')} /> <span className="text-sm text-muted-foreground">{it.baseUnit}</span></div>
                      {L === 'all' && <>
                        <div className="text-sm text-muted-foreground">{per(it).map(([n, v]) => `${n}: ${fmt(v)}`).join(' · ') || '—'}</div>
                        <div className="text-center">{Number(it.minQty) ? <Num v={it.minQty} /> : '—'}</div>
                      </>}
                      <div className="text-center"><Money v={val} /></div>
                      <div className="text-end">{tag(it, qty)}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-4 md:hidden">
            {sections.map(sec => (
              <div key={sec.g}>
                <div className={cn('mb-2 flex items-center gap-2 rounded-xl px-4 py-2.5 font-semibold text-white', GRAD)}><FolderOpen className="size-4" />{sec.g}<span className="ms-auto text-sm font-normal text-white/85"><Money v={sec.rows.reduce((a, r) => a + r.val, 0)} /> د.ع</span></div>
                <div className="divide-y rounded-[18px] border bg-card">
                  {sec.rows.map(({ it, qty }) => (
                    <a key={it.id} href={`#/stock/item/${it.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1"><b className="block">{it.name}</b><span className="block truncate text-sm text-muted-foreground">{detailed(it, qty) || per(it).map(x => x[0]).join('، ') || '—'}</span></div>
                      <div className="text-end"><div className="whitespace-nowrap"><Num v={qty} className={cn('font-semibold', qty < -0.0005 && 'text-destructive')} /> <span className="text-sm text-muted-foreground">{it.baseUnit}</span></div>{tag(it, qty)}</div>
                      <ChevronLeft className="size-5 shrink-0 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>}
      </div>
    </Shell>
  )
}
