// المشتريات: فاتورة جديدة/تعديل، الفواتير، عرض فاتورة (ويا الصور)، الموردين وكشف الحساب
import { ArrowDownToLine, ArrowRight, Boxes, Camera, Eye, ImageIcon, List, Pencil, Plus, ReceiptText, Save, Trash2, Users, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { ItemPicker } from '@/components/app/ItemPicker'
import { PickButtons, Thumbs, Viewer } from '@/components/app/Images'
import { Btn, Card, CardTitle, Empty, Field, GRAD, GradHead, Money, Num, Pills, Seg, Sub, Tile, When } from '@/components/app/kit'
import { SaveBtn, askWhy, confirmBox, run } from '@/components/app/dialogs'
import { Shell, logo } from '@/components/app/Shell'
import { addInvoiceImages, deleteInvoice, deleteInvoiceImage, saveInvoice, type PendingImage } from '@/lib/actions'
import { activeLocs, activeSups, factorOf, invCalc, itemById, lastBuy, liveInv, locName, packOf, supById, supName, unitsOf, type InvDraft } from '@/lib/calc'
import { PAY_MODES, PAY_MODES_SHORT } from '@/lib/constants'
import { dayEndTs, dayStartTs, fmt, ltr, money, monthStart, parseNum, today } from '@/lib/format'
import { setP, usePersist } from '@/lib/persist'
import { back, nav } from '@/lib/router'
import { backend, canEdit, getState, useStore } from '@/lib/store'
import type { Invoice, InvoiceImage, PayMode } from '@/lib/types'
import { cn } from '@/lib/utils'
import { SupplierStatement, Suppliers, supplierForm } from './Suppliers'

const TABS = [{ k: 'new', t: 'فاتورة جديدة', icon: Plus }, { k: 'list', t: 'الفواتير', icon: List }, { k: 'sups', t: 'الموردين', icon: Users }] as const
type Tab = (typeof TABS)[number]['k']

export function Purchases({ r }: { r: string[] }) {
  const sub = r[1] || 'new'
  if (sub === 'sup' && r[2]) return <SupplierStatement id={r[2]} />
  if (sub === 'view' && r[2]) return <InvoiceView id={r[2]} />
  const editing = sub === 'edit' ? r[2] : ''
  const tab: Tab = editing ? 'new' : (['new', 'list', 'sups'].includes(sub) ? sub : 'new') as Tab
  return (
    <Shell active="purchases" title={editing ? 'تعديل فاتورة' : tab === 'new' ? 'فاتورة مشتريات' : tab === 'list' ? 'الفواتير' : 'الموردين'} subtitle={tab === 'new' ? 'الوارد يتسجل بالمخزن عن طريق الفاتورة' : tab === 'list' ? 'كل فواتير المشتريات' : 'الحسابات والديون'}>
      <div className="space-y-5">
        <Pills items={TABS.map(t => ({ ...t, t: t.k === 'new' && editing ? 'تعديل فاتورة' : t.t }))} value={tab}
          onChange={async k => { if (editing && !(await confirmBox('تترك تعديل الفاتورة بدون حفظ؟', 'نعم'))) return; nav('/purchases/' + k) }} />
        {tab === 'new' && <InvForm key={editing || 'new'} editId={editing} />}
        {tab === 'list' && <InvList />}
        {tab === 'sups' && <Suppliers />}
      </div>
    </Shell>
  )
}

/* ───────── فاتورة جديدة / تعديل ───────── */
const newLine = () => ({ itemId: '', unit: '', qty: '', price: '' })
const newInv = (locId = ''): InvDraft => {
  const locs = activeLocs(getState())
  return { supplierId: '', ref: '', date: today(), locId: locs.length === 1 ? locs[0].id : locId, note: '', lines: [newLine()], transport: '', loading: '', discount: '', payMode: 'credit', paid: '' }
}
const fromInvoice = (v: Invoice): InvDraft => ({
  id: v.id, supplierId: v.supplierId, ref: v.ref || '', date: v.date, locId: v.locId, note: v.note || '',
  lines: (v.lines || []).map(l => ({ moveId: l.moveId, itemId: l.itemId, unit: l.unit, qty: String(l.qty), price: String(l.price) })),
  transport: v.transport ? String(v.transport) : '', loading: v.loading ? String(v.loading) : '', discount: v.discount ? String(v.discount) : '',
  payMode: v.payMode || 'credit', paid: v.payMode === 'partial' ? String(v.paid) : '',
})

function InvForm({ editId }: { editId: string }) {
  const s = useStore(x => x)
  const old = editId ? s.invoices.find(x => x.id === editId) : undefined
  const key = editId ? `inv.edit.${editId}` : 'inv.draft'
  const [inv, setInv] = usePersist<InvDraft>(key, () => (old ? fromInvoice(old) : newInv()))
  const [imgs, setImgs] = usePersist<PendingImage[]>(key + '.img', [])
  const [view, setView] = useState<number | null>(null)
  useEffect(() => { if (editId && (!old || old.deleted || !canEdit())) nav('/purchases/list', true) }, [editId, old])
  const sups = activeSups(s)
  if (old && !sups.some(x => x.id === old.supplierId) && supById(s, old.supplierId)) sups.push(supById(s, old.supplierId)!)
  const locs = activeLocs(s)
  const c = invCalc(s, inv, parseNum)
  const set = (p: Partial<InvDraft>) => setInv(x => ({ ...x, ...p }))
  const setLine = (i: number, p: Partial<InvDraft['lines'][number]>) => setInv(x => ({ ...x, lines: x.lines.map((l, n) => (n === i ? { ...l, ...p } : l)) }))

  const save = async () => {
    let why = ''
    if (old) { why = await askWhy({ title: 'سبب تعديل الفاتورة', ph: 'مثلاً: السعر انكتب غلط' }); if (!why) return }
    const r = await run(() => saveInvoice(inv, imgs, why), x => old ? '✔ انعدلت الفاتورة وانسجل التعديل' : `✔ انحفظت الفاتورة: ${x.lines} مادة — ${money(x.total)} د.ع`)
    if (!r) return
    setImgs([])
    if (old) { setP(key, undefined); nav(`/purchases/view/${old.id}`, true) }
    else setInv(newInv(inv.locId))
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        {old && <p className="rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">تعديل فاتورة {supName(s, old)}{old.ref ? ` — وصل ${old.ref}` : ''}. التعديل ينسجل بسجل التعديلات وحركات الوارد تتحدّث وياه.</p>}
        <Card>
          <CardTitle icon={ReceiptText}>رأس الفاتورة</CardTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="المورد" req group>
              <div className="flex gap-2">
                <NativeSelect value={inv.supplierId} onChange={e => set({ supplierId: e.target.value })} aria-label="المورد">
                  <NativeSelectOption value="">— اختر —</NativeSelectOption>{sups.map(x => <NativeSelectOption key={x.id} value={x.id}>{x.name}</NativeSelectOption>)}
                </NativeSelect>
                <Btn tone="soft" size="icon" aria-label="مورد جديد" onClick={async () => { const id = await supplierForm(); if (id) set({ supplierId: id }) }}><Plus /></Btn>
              </div>
            </Field>
            <Field label="رقم الوصل"><Input value={inv.ref} onChange={e => set({ ref: e.target.value })} /></Field>
            <Field label="التاريخ" req><Input type="date" max={today()} value={inv.date} onChange={e => set({ date: e.target.value })} /></Field>
            <Field label="المخزن" req>
              <NativeSelect value={inv.locId} onChange={e => set({ locId: e.target.value })} aria-label="المخزن">
                <NativeSelectOption value="">— اختر —</NativeSelectOption>{locs.map(l => <NativeSelectOption key={l.id} value={l.id}>{l.name}</NativeSelectOption>)}
              </NativeSelect>
            </Field>
            <Field label="ملاحظة" className="sm:col-span-2"><Input value={inv.note} onChange={e => set({ note: e.target.value })} /></Field>
          </div>
        </Card>

        <Card>
          <CardTitle icon={Boxes}>المواد</CardTitle>
          <div className="space-y-3">
            {inv.lines.map((l, i) => {
              const it = itemById(s, l.itemId), cl = c.lines[i]
              return (
                <div key={i} className="space-y-3 rounded-xl border bg-muted/30 p-3">
                  <div className="flex items-start gap-2">
                    <span className={cn('grid size-12 shrink-0 place-items-center rounded-xl font-bold text-white', GRAD)}>{i + 1}</span>
                    <div className="min-w-0 flex-1"><ItemPicker value={l.itemId} onChange={id => {
                      const x = itemById(s, id)
                      const unit = x?.bigUnit && packOf(x) > 1 ? x.bigUnit : x?.baseUnit || ''
                      const last = id ? lastBuy(s.moves, id, unit) : 0
                      setLine(i, { itemId: id, unit, price: l.price || (last ? String(last) : '') })
                    }} /></div>
                    <Btn tone="ghost" size="icon" aria-label="حذف السطر" className="text-destructive" disabled={inv.lines.length < 2}
                      onClick={() => setInv(x => ({ ...x, lines: x.lines.filter((_, n) => n !== i) }))}><Trash2 /></Btn>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Field label="الوحدة"><NativeSelect value={l.unit} disabled={!it} onChange={e => setLine(i, { unit: e.target.value })} className="bg-card">
                      {unitsOf(it).map(u => <NativeSelectOption key={u} value={u}>{u}{u === it?.bigUnit ? ` (${fmt(it.pack)})` : ''}</NativeSelectOption>)}</NativeSelect></Field>
                    <Field label="الكمية" req hint={it && factorOf(it, l.unit) > 1 && cl.qty > 0 ? `= ${fmt(cl.baseQty)} ${it.baseUnit}` : undefined}>
                      <Input className="num bg-card" inputMode="decimal" value={l.qty} onChange={e => setLine(i, { qty: e.target.value })} placeholder="0" /></Field>
                    <Field label="سعر الوحدة" req><Input className="num bg-card" inputMode="decimal" value={l.price} onChange={e => setLine(i, { price: e.target.value })} placeholder="0" /></Field>
                    <Field label="الإجمالي" hint={cl.share ? <>بعد التوزيع: <Money v={cl.cost} /></> : undefined}>
                      <div className="flex h-12 items-center text-lg font-semibold text-primary">{cl.total ? <Money v={cl.total} /> : '—'}</div></Field>
                  </div>
                </div>
              )
            })}
          </div>
          <button type="button" onClick={() => setInv(x => ({ ...x, lines: [...x.lines, newLine()] }))} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-accent/50 font-semibold text-primary hover:bg-secondary"><Plus className="size-5" />سطر جديد</button>
        </Card>

        <Card>
          <CardTitle icon={Camera} extra={<PickButtons onAdd={a => setImgs(x => [...x, ...a])} />}>صور الفاتورة</CardTitle>
          {old && (old.imageCount || 0) > 0 && <p className="mb-2 text-sm text-muted-foreground">بالفاتورة {old.imageCount} صورة محفوظة (تنعرض من صفحة الفاتورة). الصور اللي تضيفها هنا تنضاف وياها.</p>}
          <Thumbs images={imgs.map((x, n) => ({ ...x, key: String(n), pending: true }))} onOpen={setView} onRemove={n => setImgs(x => x.filter((_, k) => k !== n))} />
          <p className="mt-2 text-sm text-muted-foreground">الصورة تنضغط تلقائياً لحوالي <bdi dir="ltr">250 KB</bdi> قبل الحفظ.</p>
          {view != null && <Viewer images={imgs.map(x => x.data)} index={view} onClose={() => setView(null)} title="صور الفاتورة" />}
        </Card>
      </div>

      <div className="space-y-5">
        <Card>
          <CardTitle icon={Wallet}>مبالغ إضافية وخصم</CardTitle>
          <div className="grid grid-cols-3 gap-2">
            <Field label="نقل"><Input className="num" inputMode="decimal" value={inv.transport} onChange={e => set({ transport: e.target.value })} placeholder="0" /></Field>
            <Field label="تحميل"><Input className="num" inputMode="decimal" value={inv.loading} onChange={e => set({ loading: e.target.value })} placeholder="0" /></Field>
            <Field label="خصم"><Input className="num" inputMode="decimal" value={inv.discount} onChange={e => set({ discount: e.target.value })} placeholder="0" /></Field>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">النقل والتحميل والخصم يتوزعن على كلفة المواد بنسبة قيمة كل سطر.</p>
          <h3 className="mt-5 mb-2 font-semibold">طريقة الدفع</h3>
          <Seg items={(Object.keys(PAY_MODES_SHORT) as PayMode[]).map(k => ({ k, t: PAY_MODES_SHORT[k] }))} value={inv.payMode} onChange={k => set({ payMode: k })} />
          {inv.payMode === 'partial' && <Field label="المبلغ المدفوع" req className="mt-3"><Input className="num" inputMode="decimal" value={inv.paid} onChange={e => set({ paid: e.target.value })} /></Field>}
        </Card>
        <TotalsCard c={c} payMode={inv.payMode} />
        <SaveBtn size="lg" className="w-full" onClick={save}>{old ? <Save /> : <ArrowDownToLine />}{old ? 'حفظ تعديل الفاتورة' : 'حفظ الفاتورة'}</SaveBtn>
        {old && <Btn tone="outline" className="w-full" onClick={() => { setP(key, undefined); setImgs([]); nav(`/purchases/view/${old.id}`) }}>إلغاء التعديل</Btn>}
      </div>
    </div>
  )
}

function TotalsCard({ c, payMode }: { c: { subtotal: number; transport: number; loading: number; discount: number; total: number; paid: number; due: number }; payMode: PayMode }) {
  return (
    <div className={cn('rounded-[22px] p-5 text-white shadow-md', GRAD)}>
      <div className="mb-2 flex items-start justify-between"><span className="text-[15px]">الإجمالي النهائي</span><img src={logo} alt="" className="size-11 rounded-xl bg-white p-1" /></div>
      <div className="flex items-baseline gap-2"><Money v={c.total} className="text-4xl font-semibold" /><span className="text-white/85">د.ع</span></div>
      <div className="mt-4 space-y-1.5 text-sm text-white/90">
        <div className="flex justify-between"><span>مجموع المواد</span><Money v={c.subtotal} /></div>
        {c.transport ? <div className="flex justify-between"><span>نقل</span><span>+ <Money v={c.transport} /></span></div> : null}
        {c.loading ? <div className="flex justify-between"><span>تحميل</span><span>+ <Money v={c.loading} /></span></div> : null}
        {c.discount ? <div className="flex justify-between"><span>خصم</span><span>− <Money v={c.discount} /></span></div> : null}
        <div className="flex justify-between"><span>{PAY_MODES[payMode]} — المدفوع</span><Money v={c.paid} /></div>
      </div>
      <div className="mt-3 flex justify-between rounded-xl bg-white px-4 py-2.5 font-semibold text-primary"><span>المتبقي بذمتي</span><Money v={c.due} /></div>
    </div>
  )
}

/* ───────── قائمة الفواتير ───────── */
const payState = (v: Invoice): [string, string] => (v.paid >= v.total ? ['مدفوعة', 'bg-success-soft text-success'] : v.paid > 0 ? ['جزئي', 'bg-warning-soft text-warning'] : ['آجل', 'bg-danger-soft text-destructive'])

function InvList() {
  const s = useStore(x => x)
  const [f, setF] = usePersist('inv.f', () => ({ from: monthStart(), to: today(), sup: '' }))
  const list = liveInv(s).filter(v => v.ts >= dayStartTs(f.from) && v.ts <= dayEndTs(f.to) && (!f.sup || v.supplierId === f.sup)).sort((a, b) => b.ts - a.ts)
  const sum = (k: 'total' | 'paid') => list.reduce((a, v) => a + (Number(v[k]) || 0), 0)
  return (
    <div className="space-y-5">
      <Card>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <label className="text-sm">من<Input type="date" value={f.from} onChange={e => setF(x => ({ ...x, from: e.target.value }))} /></label>
          <label className="text-sm">إلى<Input type="date" value={f.to} onChange={e => setF(x => ({ ...x, to: e.target.value }))} /></label>
          <label className="col-span-2 text-sm sm:col-span-1">المورد<NativeSelect value={f.sup} onChange={e => setF(x => ({ ...x, sup: e.target.value }))}><NativeSelectOption value="">الكل</NativeSelectOption>{s.suppliers.map(x => <NativeSelectOption key={x.id} value={x.id}>{x.name}</NativeSelectOption>)}</NativeSelect></label>
        </div>
      </Card>
      {list.length > 0 && <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="الفواتير">{list.length}</Tile><Tile label="الإجمالي" grad><Money v={sum('total')} unit /></Tile>
        <Tile label="المدفوع"><Money v={sum('paid')} unit /></Tile><Tile label="المتبقي منها"><Money v={sum('total') - sum('paid')} unit /></Tile>
      </div>}
      <Card>
        {list.length ? <>
          <GradHead cols="0.9fr 1.6fr 1fr 0.6fr 1fr 1fr 1fr 0.8fr 1.3fr"><span>التاريخ</span><span>المورد / الوصل</span><span>المخزن</span><span className="text-center">المواد</span><span className="text-center">الإجمالي</span><span className="text-center">المدفوع</span><span className="text-center">المتبقي</span><span>الحالة</span><span /></GradHead>
          <div className="mt-2 divide-y rounded-xl border">
            {list.map(v => {
              const st = payState(v)
              return (
                <div key={v.id} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 px-4 py-3 md:grid-cols-[0.9fr_1.6fr_1fr_0.6fr_1fr_1fr_1fr_0.8fr_1.3fr] md:items-center">
                  <div className="hidden md:block"><When ts={v.ts} /></div>
                  <div className="min-w-0"><b>{supName(s, v)}</b>{v.editCount ? <span className="ms-2 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning">معدّلة</span> : null}
                    <Sub>{[v.ref && 'وصل ' + v.ref, <span key="d" className="md:hidden">{ltr(v.date)}</span>].filter(Boolean).map((x, i) => <span key={i}>{i > 0 && ' · '}{x}</span>)}</Sub></div>
                  <div className="hidden text-sm md:block">{locName(s, v.locId)}</div>
                  <div className="hidden text-center md:block">{(v.lines || []).length}{v.imageCount ? <span className="ms-1 inline-flex items-center text-accent" title="بيها صور"><ImageIcon className="size-4" /></span> : null}</div>
                  <div className="text-end md:text-center"><b><Money v={v.total} /></b><Sub className="md:hidden"><span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', st[1])}>{st[0]}</span></Sub></div>
                  <div className="hidden text-center md:block"><Money v={v.paid} /></div>
                  <div className={cn('hidden text-center md:block', v.total - v.paid > 0.5 && 'font-semibold text-destructive')}><Money v={v.total - v.paid} /></div>
                  <div className="hidden md:block"><span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', st[1])}>{st[0]}</span></div>
                  <div className="col-span-2 flex justify-end gap-1 md:col-span-1"><InvActions v={v} /></div>
                </div>
              )
            })}
          </div>
        </> : <Empty icon={ReceiptText}>ما اكو فواتير بهذي الفترة</Empty>}
      </Card>
    </div>
  )
}

export function InvActions({ v, compact }: { v: Invoice; compact?: boolean }) {
  const edit = useStore(s => canEdit(s))
  return <>
    <Btn tone="ghost" onClick={() => nav(`/purchases/view/${v.id}`)}><Eye />{!compact && 'عرض'}</Btn>
    {edit && <Btn tone="ghost" size="icon" aria-label="تعديل" onClick={() => nav(`/purchases/edit/${v.id}`)}><Pencil /></Btn>}
    {edit && <Btn tone="ghost" size="icon" aria-label="حذف" className="text-destructive" onClick={() => deleteInvoiceFlow(v)}><Trash2 /></Btn>}
  </>
}
export async function deleteInvoiceFlow(v: Invoice) {
  const why = await askWhy({ title: 'حذف فاتورة', label: 'سبب الحذف', ph: 'مثلاً: انسجلت مرتين', ok: 'حذف', danger: true,
    info: <p className="text-[15px]"><b>{v.supplierName}</b>{v.ref ? ` — وصل ${v.ref}` : ''} — {money(v.total)} د.ع<br /><span className="text-sm text-muted-foreground">{ltr(v.date)} — {(v.lines || []).length} مادة — سجّلها {v.staffName}. الفاتورة وكل حركات الوارد مالتها تنشال من الأرصدة وكشف الحساب، وتروح لخانة «المحذوفات» باسمك.</span></p> })
  if (why && await run(() => deleteInvoice(v, why).then(() => true), 'انحذفت الفاتورة وانسجلت بالمحذوفات')) if (location.hash.includes(v.id)) nav('/purchases/list', true)
}

/* ───────── عرض فاتورة ───────── */
export function useInvoiceImages(id: string, count = 0) {
  const [imgs, setImgs] = useState<InvoiceImage[] | null>(null)
  const [n, setN] = useState(0)
  useEffect(() => { let ok = true; setImgs(null); backend().images(id).then(x => { if (ok) setImgs(x) }).catch(e => { console.error(e); if (ok) setImgs([]) }); return () => { ok = false } }, [id, n, count])
  return { imgs, reload: () => setN(x => x + 1) }
}

export function InvoiceView({ id }: { id: string }) {
  const s = useStore(x => x)
  const v = s.invoices.find(x => x.id === id)
  const { imgs, reload } = useInvoiceImages(id, v?.imageCount)
  const [view, setView] = useState<number | null>(null)
  const edit = canEdit(s)
  if (!v) return <Shell active="purchases" title="فاتورة"><Card><Empty>الفاتورة غير موجودة</Empty></Card></Shell>
  const addImgs = async (a: PendingImage[]) => { if (await run(() => addInvoiceImages(v, a).then(() => true), `✔ انضافت ${a.length} صورة`)) reload() }
  const delImg = async (n: number) => {
    const im = imgs![n]
    const why = await askWhy({ title: 'حذف صورة الفاتورة', label: 'سبب الحذف', ph: 'مثلاً: صورة غلط', ok: 'حذف', danger: true })
    if (why && await run(() => deleteInvoiceImage(v, im, why).then(() => true), 'انحذفت الصورة وانسجلت بالمحذوفات')) reload()
  }
  return (
    <Shell active="purchases" title={`فاتورة ${supName(s, v)}`} subtitle={`${v.ref ? 'وصل ' + v.ref + ' — ' : ''}${ltr(v.date)} — ${locName(s, v.locId)} — سجّلها ${v.staffName}`}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Btn tone="outline" onClick={() => back('/purchases/list')}><ArrowRight />رجوع</Btn>
          {v.deleted && <span className="rounded-full bg-danger-soft px-3 py-1 text-sm font-semibold text-destructive">محذوفة</span>}
          {v.editCount ? <span className="rounded-full bg-warning-soft px-3 py-1 text-sm font-semibold text-warning">معدّلة {v.editCount} مرة</span> : null}
          <span className="ms-auto" />
          <Btn tone="soft" onClick={() => nav(`/purchases/sup/${v.supplierId}`)}><Wallet />كشف حساب المورد</Btn>
          {edit && !v.deleted && <><Btn onClick={() => { setP(`inv.edit.${v.id}`, undefined); nav(`/purchases/edit/${v.id}`) }}><Pencil />تعديل</Btn><Btn tone="danger" onClick={() => deleteInvoiceFlow(v)}><Trash2 />حذف</Btn></>}
        </div>
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <Card>
              <CardTitle icon={Boxes}>المواد</CardTitle>
              <GradHead cols="2fr 1fr 1fr 1fr"><span>المادة</span><span className="text-center">الكمية</span><span className="text-center">السعر</span><span className="text-center">الإجمالي</span></GradHead>
              <div className="mt-2 divide-y rounded-xl border">
                {(v.lines || []).map(l => (
                  <div key={l.moveId} className="grid grid-cols-[1fr_auto] gap-x-3 px-4 py-3 md:grid-cols-[2fr_1fr_1fr_1fr] md:items-center">
                    <div><b>{itemById(s, l.itemId)?.name || l.itemName}</b>{l.share ? <Sub>كلفة بعد التوزيع: <Money v={l.cost} /></Sub> : null}<Sub className="md:hidden"><Num v={l.qty} /> {l.unit} × <Money v={l.price} /></Sub></div>
                    <div className="hidden text-center md:block"><Num v={l.qty} /> {l.unit}</div>
                    <div className="hidden text-center md:block"><Money v={l.price} /></div>
                    <div className="text-end font-semibold md:text-center"><Money v={l.total} /></div>
                  </div>
                ))}
              </div>
              {v.note && <p className="mt-3 text-sm text-muted-foreground">ملاحظة: {v.note}</p>}
            </Card>
            <Card>
              <CardTitle icon={Camera} extra={!v.deleted && <PickButtons onAdd={addImgs} />}>صور الفاتورة</CardTitle>
              <Thumbs loading={imgs === null} images={(imgs || []).map(x => ({ data: x.data, bytes: x.bytes, key: x.id }))} onOpen={setView} onRemove={edit && !v.deleted ? delImg : undefined} />
              {view != null && imgs && <Viewer images={imgs.map(x => x.data)} index={view} onClose={() => setView(null)} title={`فاتورة ${supName(s, v)}`} />}
            </Card>
          </div>
          <TotalsCard c={{ ...v, due: v.total - v.paid }} payMode={v.payMode} />
        </div>
      </div>
    </Shell>
  )
}

