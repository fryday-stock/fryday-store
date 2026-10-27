// سجل الحركات: فلترة بالتاريخ والنوع والموظف والمادة + تعديل وحذف بسبب إجباري
import { Download, Pencil, ReceiptText, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Btn, Card, Empty, GradHead, Num, Sub, TypeTag, When } from '@/components/app/kit'
import { askWhy, run } from '@/components/app/dialogs'
import { Shell } from '@/components/app/Shell'
import { deleteMove } from '@/lib/actions'
import { mName, moveWhere } from '@/lib/calc'
import { TYPES } from '@/lib/constants'
import { exportMoves } from '@/lib/exports'
import { dayEndTs, dayStartTs, dtx, fmt, money, monthStart, normKey, today } from '@/lib/format'
import { usePersist } from '@/lib/persist'
import { nav } from '@/lib/router'
import { canEdit, getState, useStore } from '@/lib/store'
import type { Move, MoveType } from '@/lib/types'
import { cn } from '@/lib/utils'
import { editMoveDialog } from './Move'

export async function deleteMoveFlow(m: Move) {
  if (m.invoiceId) return nav(`/purchases/view/${m.invoiceId}`)
  const why = await askWhy({ title: 'حذف حركة', label: 'سبب الحذف', ph: 'مثلاً: انسجلت مرتين', ok: 'حذف', danger: true,
    info: <p className="text-[15px]"><b>{TYPES[m.type].label}</b> — {mName(getState(), m)} {fmt(m.qty)} {m.unit}<br /><span className="text-sm text-muted-foreground">سجّلها {m.staffName} بتاريخ {dtx(m.ts)}. الحركة تنشال من الأرصدة والسجل، وتروح لخانة «المحذوفات» باسمك.</span></p> })
  if (why) await run(() => deleteMove(m, why), 'انحذفت الحركة وانسجلت بالمحذوفات')
}

const COLS = '0.9fr 1.1fr 1.5fr 1fr 1.3fr 1.5fr 0.9fr 1.1fr'
export function MovesTable({ list, actions }: { list: Move[]; actions: boolean }) {
  const s = useStore(x => x)
  if (!list.length) return <Empty>ما اكو حركات</Empty>
  return <>
    <GradHead cols={actions ? COLS : COLS.split(' ').slice(0, -1).join(' ')}><span>الوقت</span><span>النوع</span><span>المادة / الموظف</span><span className="text-center">الكمية</span><span>المكان</span><span>السبب / ملاحظة</span><span className="text-center">الكلفة</span>{actions && <span />}</GradHead>
    <div className="mt-2 divide-y rounded-xl border">
      {list.map(m => (
        <div key={m.id} className={cn('grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 px-4 py-3 md:grid-cols-(--cols) md:items-center', m.deleted && 'opacity-55 line-through')} style={{ '--cols': actions ? COLS : COLS.split(' ').slice(0, -1).join(' ') } as React.CSSProperties}>
            <div className="hidden md:block"><When ts={m.ts} /></div>
            <div className="hidden md:block"><TypeTag t={m.type} short /></div>
            <div className="min-w-0"><b>{mName(s, m)}</b>{m.editCount ? <span className="ms-2 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning">معدّلة</span> : null}
              <Sub><span className="md:hidden"><TypeTag t={m.type} short /> · </span>{m.staffName}<span className="md:hidden"> · {dtx(m.ts)}</span></Sub></div>
            <div className="text-end md:text-center"><b><Num v={m.qty} plus={m.type === 'adjust'} /> {m.unit}</b>{m.factor > 1 && <Sub><Num v={m.baseQty} /> {m.baseUnit}</Sub>}</div>
            <div className="col-span-2 text-sm md:col-span-1">{moveWhere(s, m)}</div>
            <div className="col-span-2 text-sm text-muted-foreground md:col-span-1">{[m.supplierName, m.reason, m.ref, m.note].filter(Boolean).join(' — ')}</div>
            <div className="hidden text-center md:block">{m.cost ? money(m.cost) : ''}</div>
            {actions && <div className="col-span-2 flex justify-end gap-1 md:col-span-1">
              {m.invoiceId ? <Btn tone="ghost" onClick={() => nav(`/purchases/view/${m.invoiceId}`)}><ReceiptText />الفاتورة</Btn> : <>
                {m.type !== 'adjust' && <Btn tone="ghost" size="icon" aria-label="تعديل" onClick={() => editMoveDialog(m)}><Pencil /></Btn>}
                <Btn tone="ghost" size="icon" aria-label="حذف" className="text-destructive" onClick={() => deleteMoveFlow(m)}><Trash2 /></Btn>
              </>}
            </div>}
        </div>
      ))}
    </div>
  </>
}

export function LogScreen() {
  const s = useStore(x => x)
  const [f, setF] = usePersist('log.f', () => ({ from: monthStart(), to: today(), type: '' as MoveType | '', staff: '', q: '' }))
  const set = (p: Partial<typeof f>) => setF(x => ({ ...x, ...p }))
  const k = normKey(f.q)
  const list = s.moves.filter(m => m.ts >= dayStartTs(f.from) && m.ts <= dayEndTs(f.to) && (!f.type || m.type === f.type) && (!f.staff || m.staffId === f.staff) && (!k || normKey(mName(s, m)).includes(k))).reverse()
  return (
    <Shell active="log" title="سجل الحركات" subtitle="كل حركة: منو سجّلها، ومتى، وليش">
      <div className="space-y-5">
        <Card>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_1.4fr_auto] md:items-end">
            <label className="text-sm">من<Input type="date" value={f.from} onChange={e => set({ from: e.target.value })} /></label>
            <label className="text-sm">إلى<Input type="date" value={f.to} onChange={e => set({ to: e.target.value })} /></label>
            <label className="text-sm">النوع<NativeSelect value={f.type} onChange={e => set({ type: e.target.value as MoveType })}><NativeSelectOption value="">الكل</NativeSelectOption>{Object.entries(TYPES).map(([k, t]) => <NativeSelectOption key={k} value={k}>{t.label}</NativeSelectOption>)}</NativeSelect></label>
            <label className="text-sm">الموظف<NativeSelect value={f.staff} onChange={e => set({ staff: e.target.value })}><NativeSelectOption value="">الكل</NativeSelectOption>{s.staff.map(x => <NativeSelectOption key={x.id} value={x.id}>{x.name}</NativeSelectOption>)}</NativeSelect></label>
            <label className="col-span-2 text-sm md:col-span-1">المادة<Input type="search" value={f.q} onChange={e => set({ q: e.target.value })} placeholder="بحث" /></label>
            <Btn className="col-span-2 md:col-span-1" onClick={() => run(() => exportMoves(list, 'سجل الحركات', `من ${f.from} إلى ${f.to}`))} disabled={!list.length}><Download />تصدير</Btn>
          </div>
        </Card>
        <Card>
          <div className="mb-3 text-sm text-muted-foreground">{list.length} حركة</div>
          <MovesTable list={list.slice(0, 400)} actions={canEdit(s)} />
          {list.length > 400 && <p className="mt-3 text-sm text-muted-foreground">يظهر أول 400 حركة — ضيّق التاريخ أو صدّر الملف.</p>}
        </Card>
      </div>
    </Shell>
  )
}
