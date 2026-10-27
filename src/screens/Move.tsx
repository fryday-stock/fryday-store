// حركة جديدة: صرف، نقل، تالف، مرتجع، رصيد افتتاحي (للمدير). الوارد يصير بفاتورة المشتريات فقط
import { Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { ItemPicker } from '@/components/app/ItemPicker'
import { Btn, Card, Field, GRAD, MV_ICON } from '@/components/app/kit'
import { SaveBtn, confirmBox, openDialog, run } from '@/components/app/dialogs'
import { Shell } from '@/components/app/Shell'
import { editMove, moveCalc, saveMove, validateMove, type MoveDraft } from '@/lib/actions'
import { activeLocs, balAt, balances, detailed, itemById, mName, unitsOf } from '@/lib/calc'
import { OUT_REASONS, TYPES, WASTE_REASONS, needFrom, needPrice, needTo } from '@/lib/constants'
import { dtx, fmt, money } from '@/lib/format'
import { usePersist } from '@/lib/persist'
import { nav } from '@/lib/router'
import { getState, isAdmin, useStore } from '@/lib/store'
import type { Move, MoveType } from '@/lib/types'
import { cn } from '@/lib/utils'

const blank = (type: MoveType, keep?: Partial<MoveDraft>): MoveDraft => ({ type, itemId: '', unit: '', qty: '', price: '', fromLoc: keep?.fromLoc || '', toLoc: keep?.toLoc || '', reason: '', note: '', ref: '' })
const reasonsOf = (t: MoveType) => (t === 'out' ? OUT_REASONS : t === 'waste' ? WASTE_REASONS : null)

/** حقول الحركة (مشتركة بين الإضافة والتعديل) */
function MoveFields({ d, set, lockItem }: { d: MoveDraft; set: (p: Partial<MoveDraft>) => void; lockItem?: boolean }) {
  const s = useStore(x => x)
  const locs = activeLocs(s)
  const it = itemById(s, d.itemId)
  const { factor, qty, baseQty, cost } = moveCalc(d)
  const reasons = reasonsOf(d.type)
  const have = it && d.fromLoc ? balAt(balances(s.moves), it.id, d.fromLoc) : 0
  const short = it && d.fromLoc && baseQty > have + 0.0005
  // المكان الوحيد يتعبّى تلقائياً
  useEffect(() => { if (locs.length === 1) set({ fromLoc: d.fromLoc || locs[0].id, toLoc: d.toLoc || locs[0].id }) }, [locs.length]) // eslint-disable-line react-hooks/exhaustive-deps
  const LocSel = ({ v, k }: { v: string; k: 'fromLoc' | 'toLoc' }) => (
    <NativeSelect value={v} onChange={e => set({ [k]: e.target.value })} aria-invalid={!v || undefined}>
      <NativeSelectOption value="">— اختر —</NativeSelectOption>
      {locs.map(l => <NativeSelectOption key={l.id} value={l.id}>{l.name}</NativeSelectOption>)}
    </NativeSelect>
  )
  return (
    <div className="space-y-4">
      <Field label="المادة" req group>
        {lockItem ? <div className="flex h-12 items-center rounded-md border bg-secondary px-3 font-semibold">{it?.name || mName(s, d as unknown as Move)}</div>
          : <ItemPicker value={d.itemId} onChange={id => { const x = itemById(s, id); set({ itemId: id, unit: x?.baseUnit || '' }) }} autoFocus={!d.itemId} />}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="الوحدة" req>
          <NativeSelect value={d.unit} onChange={e => set({ unit: e.target.value })} disabled={!it}>
            {unitsOf(it).map(u => <NativeSelectOption key={u} value={u}>{u}{u === it?.bigUnit ? ` (${fmt(it.pack)} ${it.baseUnit})` : ''}</NativeSelectOption>)}
          </NativeSelect>
        </Field>
        <Field label="الكمية" req hint={it && factor > 1 && qty ? `= ${fmt(baseQty)} ${it.baseUnit}` : undefined}>
          <Input className="num" inputMode="decimal" value={d.qty} onChange={e => set({ qty: e.target.value })} placeholder="0" />
        </Field>
      </div>
      {(needFrom(d.type) || needTo(d.type)) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {needFrom(d.type) && <Field label={d.type === 'transfer' ? 'من مكان' : 'المكان'} req hintTone={short ? 'bad' : 'ok'}
            hint={it && d.fromLoc ? `المتوفر هنا: ${fmt(have)} ${it.baseUnit}${detailed(it, have) ? ` (${detailed(it, have)})` : ''}${short ? ' — الكمية أكثر من المتوفر' : ''}` : undefined}>
            <LocSel v={d.fromLoc} k="fromLoc" /></Field>}
          {needTo(d.type) && <Field label={d.type === 'transfer' ? 'إلى مكان' : 'يدخل إلى'} req><LocSel v={d.toLoc} k="toLoc" /></Field>}
        </div>
      )}
      {needPrice(d.type) && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="سعر الوحدة المختارة (د.ع)" req hint={qty && cost ? `الإجمالي: ${money(cost)} د.ع${factor > 1 ? ` — كلفة ${it?.baseUnit}: ${fmt(cost / baseQty, 2)}` : ''}` : undefined}>
            <Input className="num" inputMode="decimal" value={d.price} onChange={e => set({ price: e.target.value })} placeholder="0" />
          </Field>
          <Field label="ملاحظة / مصدر"><Input value={d.ref} onChange={e => set({ ref: e.target.value })} /></Field>
        </div>
      )}
      {reasons && (
        <Field label="السبب" req group>
          <div className="flex flex-wrap gap-2" role="radiogroup">
            {reasons.map(r => <button key={r} type="button" role="radio" aria-checked={d.reason === r} onClick={() => set({ reason: r })}
              className={cn('min-h-12 rounded-xl px-4 text-sm font-semibold', d.reason === r ? cn(GRAD, 'text-white') : 'border bg-card text-muted-foreground')}>{r}</button>)}
          </div>
        </Field>
      )}
      <Field label="ملاحظة"><Input value={d.note} onChange={e => set({ note: e.target.value })} /></Field>
    </div>
  )
}

export function MoveForm({ type }: { type?: string }) {
  const admin = useStore(s => isAdmin(s)), user = useStore(s => s.user)!
  const types: MoveType[] = ['out', 'transfer', 'waste', 'return', ...(admin ? ['opening' as const] : [])]
  const t: MoveType = types.includes(type as MoveType) ? (type as MoveType) : type === 'in' ? 'in' : 'out'
  const [d, setD] = usePersist<MoveDraft>('move.draft', () => blank(t))
  useEffect(() => { if (t === 'in') nav('/purchases/new', true) }, [t])
  useEffect(() => { if (d.type !== t) setD(p => ({ ...blank(t, p), itemId: p.itemId, unit: p.unit, qty: p.qty })) }, [t]) // eslint-disable-line react-hooks/exhaustive-deps
  const set = (p: Partial<MoveDraft>) => setD(x => ({ ...x, ...p }))

  const save = async () => {
    try { validateMove(d) } catch (e) { return void toast.error((e as Error).message) }
    if (needFrom(d.type)) {
      const { it, baseQty } = moveCalc(d), have = balAt(balances(getState().moves), d.itemId, d.fromLoc)
      if (baseQty > have + 0.0005 && !(await confirmBox(<>المتوفر بالدفتر <b>{fmt(have)} {it!.baseUnit}</b> فقط، وانت تسحب <b>{fmt(baseQty)}</b>. متأكد؟</>, 'نعم، سجّل'))) return
    }
    const r = await run(() => saveMove(d), x => `✔ تسجّل ${TYPES[x.type].label}: ${fmt(x.qty)} ${x.unit} ${x.itemName}`)
    if (r) setD(blank(d.type, d))
  }
  return (
    <Shell active="move" title="حركة جديدة" subtitle="الموظف والوقت يتسجلون تلقائياً">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          <a href="#/purchases/new" className="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl border bg-card text-sm font-semibold text-muted-foreground"><MvIc t="in" />وارد</a>
          {types.map(k => (
            <a key={k} href={`#/move/${k}`} aria-current={k === d.type ? 'page' : undefined}
              className={cn('flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-sm font-semibold', k === d.type ? cn(GRAD, 'text-white shadow') : 'border bg-card text-muted-foreground')}>
              <MvIc t={k} />{TYPES[k].short}</a>
          ))}
        </div>
        <Card>
          <MoveFields d={d} set={set} />
          <p className="mt-4 text-sm text-muted-foreground">الموظف: <b className="text-foreground">{user.name}</b> — الوقت يتسجل تلقائياً</p>
          <SaveBtn size="lg" className="mt-4 w-full" onClick={save}><Save />تأكيد {TYPES[d.type].label}</SaveBtn>
        </Card>
      </div>
    </Shell>
  )
}
const MvIc = ({ t }: { t: MoveType }) => { const I = MV_ICON[t]; return <I className="size-5" /> }

/** نافذة تعديل حركة (من السجل) */
export function editMoveDialog(m: Move) {
  const s = getState(), it = itemById(s, m.itemId)
  if (!it) return toast.error('المادة محذوفة من البطاقة')
  openDialog<boolean>({
    title: `تعديل حركة ${TYPES[m.type].label}`,
    desc: <>{mName(s, m)} — سجّلها {m.staffName} بتاريخ {dtx(m.ts)}. نوع الحركة والمادة ما يتغيرن؛ إذا غلط احذف الحركة وسجّل وحدة جديدة.</>,
    body: done => <EditBody m={m} done={done} />,
  })
}
function EditBody({ m, done }: { m: Move; done: (v?: boolean) => void }) {
  const [d, setD] = useState<MoveDraft & { why: string }>(() => ({ type: m.type, itemId: m.itemId, unit: m.unit, qty: String(m.qty), price: m.price ? String(m.price) : '', fromLoc: m.fromLoc, toLoc: m.toLoc, reason: m.reason, note: m.note, ref: m.ref, why: '' }))
  const set = (p: Partial<MoveDraft & { why: string }>) => setD(x => ({ ...x, ...p }))
  return <>
    <MoveFields d={d} set={set} lockItem />
    <Field label="سبب التعديل" req><Input value={d.why} onChange={e => set({ why: e.target.value })} placeholder="مثلاً: الكمية انكتبت غلط" /></Field>
    <DialogFooter>
      <SaveBtn onClick={async () => { if (await run(() => editMove(m, d, d.why).then(() => true), '✔ انعدلت الحركة وانسجل التعديل')) done(true) }}><Save />حفظ التعديل</SaveBtn>
      <Btn tone="outline" onClick={() => done()}>إلغاء</Btn>
    </DialogFooter>
  </>
}
