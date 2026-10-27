// الموردين + كشف الحساب (مثل كشف البنك) + التسديدات
import { ArrowRight, Boxes, Download, ImageIcon, Pencil, Phone, Plus, Save, Trash2, Users, Wallet } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Viewer } from '@/components/app/Images'
import { Btn, Card, CardTitle, Empty, Field, GRAD, GradHead, Money, Num, Seg, Sub, Tile, When } from '@/components/app/kit'
import { SaveBtn, askWhy, openDialog, run } from '@/components/app/dialogs'
import { Shell } from '@/components/app/Shell'
import { CONFIG } from '@/config'
import { deletePayment, savePayment } from '@/lib/actions'
import { supById, supDue, supItems, supLedger } from '@/lib/calc'
import { PAY_METHODS } from '@/lib/constants'
import { exportSheet } from '@/lib/excel'
import { dayEndTs, dayStartTs, dt, dtx, ltr, money, monthStart, normKey, normTxt, r3, today } from '@/lib/format'
import { usePersist } from '@/lib/persist'
import { back, nav } from '@/lib/router'
import { backend, canEdit, getState, useStore } from '@/lib/store'
import type { InvoiceImage, Invoice, PayMethod, Payment, Supplier } from '@/lib/types'
import { cn } from '@/lib/utils'
import { InvActions } from './Purchases'

export function Suppliers() {
  const s = useStore(x => x)
  const edit = canEdit(s)
  const list = s.suppliers.slice().sort((a, b) => Number(a.active === false) - Number(b.active === false) || a.name.localeCompare(b.name, 'ar'))
  const dues = new Map(list.map(x => [x.id, supDue(s, x.id)]))
  const owing = [...dues.values()].filter(v => v > 0.5)
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-[1fr_1fr_1.4fr_auto] md:items-stretch">
        <Tile label="الموردين">{list.filter(x => x.active !== false).length}</Tile>
        <Tile label="عليهم ديون">{owing.length}</Tile>
        <Tile label="مجموع الديون بذمتي" grad className="col-span-2 md:col-span-1"><Money v={owing.reduce((a, v) => a + v, 0)} unit /></Tile>
        <Btn className="col-span-2 h-full md:col-span-1" onClick={() => supplierForm()}><Plus />مورد جديد</Btn>
      </div>
      <Card>
        {list.length ? <>
          <GradHead cols="1.6fr 1.6fr 1fr 1.5fr"><span>المورد</span><span>ملاحظات</span><span className="text-center">المتبقي بذمتي</span><span /></GradHead>
          <div className="mt-2 divide-y rounded-xl border">
            {list.map(x => {
              const d = dues.get(x.id) || 0
              return (
                <div key={x.id} className={cn('grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 px-4 py-3 md:grid-cols-[1.6fr_1.6fr_1fr_1.5fr]', x.active === false && 'opacity-55')}>
                  <div className="min-w-0"><b>{x.name}</b>{x.active === false && <span className="ms-2 rounded-full bg-muted px-2 py-0.5 text-xs">موقوف</span>}
                    {x.phone && <a href={`tel:${x.phone}`} dir="ltr" className="flex items-center justify-end gap-1 text-sm text-primary"><Phone className="size-3.5" />{x.phone}</a>}</div>
                  <div className="hidden text-sm text-muted-foreground md:block">{x.note}</div>
                  <div className={cn('text-end md:text-center', d > 0.5 && 'font-bold text-destructive')}><Money v={d} /></div>
                  <div className="col-span-2 flex justify-end gap-1 md:col-span-1">
                    <Btn tone="soft" onClick={() => nav(`/purchases/sup/${x.id}`)}><Wallet />كشف حساب</Btn>
                    {edit && <Btn tone="ghost" size="icon" aria-label="تعديل" onClick={() => supplierForm(x)}><Pencil /></Btn>}
                  </div>
                </div>
              )
            })}
          </div>
        </> : <Empty icon={Users}>ما اكو موردين. أضف أول مورد.</Empty>}
      </Card>
    </div>
  )
}

/** إضافة أو تعديل مورد. يرجّع رقم المورد */
export function supplierForm(x?: Supplier) {
  if (x && !canEdit()) return Promise.resolve(undefined)
  return openDialog<string>({ title: x ? 'تعديل مورد' : 'مورد جديد', body: done => <SupForm x={x} done={done} /> })
}
function SupForm({ x, done }: { x?: Supplier; done: (id?: string) => void }) {
  const [d, setD] = useState({ name: x?.name || '', phone: x?.phone || '', note: x?.note || '' })
  const save = async () => {
    const name = normTxt(d.name), s = getState()
    if (!name) return toast.error('اكتب اسم المورد')
    if (s.suppliers.some(y => normKey(y.name) === normKey(name) && y.id !== x?.id)) return toast.error('اكو مورد بنفس الاسم')
    const doc = { name, phone: normTxt(d.phone), note: normTxt(d.note) }
    const id = await run(async () => { if (x) { await backend().update('suppliers', x.id, doc); return x.id } return backend().add('suppliers', { ...doc, active: true, created: Date.now() }) }, '✔ انحفظ المورد')
    if (id) done(id)
  }
  return <>
    <Field label="الاسم" req><Input data-autofocus value={d.name} onChange={e => setD({ ...d, name: e.target.value })} /></Field>
    <Field label="الهاتف"><Input dir="ltr" inputMode="tel" value={d.phone} onChange={e => setD({ ...d, phone: e.target.value })} /></Field>
    <Field label="ملاحظات"><Input value={d.note} onChange={e => setD({ ...d, note: e.target.value })} /></Field>
    <DialogFooter>
      <SaveBtn onClick={save}><Save />حفظ</SaveBtn><Btn tone="outline" onClick={() => done()}>إلغاء</Btn>
      {x && <Btn tone="outline" className="sm:ms-auto" onClick={async () => { if (await run(() => backend().update('suppliers', x.id, { active: x.active === false }).then(() => true), '✔ تم')) done(x.id) }}>{x.active === false ? 'إعادة تفعيل' : 'إيقاف'}</Btn>}
    </DialogFooter>
  </>
}

/* ───────── التسديد ───────── */
export function paymentForm(sup: Supplier, p?: Payment) {
  if (p && !canEdit()) return
  openDialog<boolean>({ title: `${p ? 'تعديل تسديد' : 'تسديد'} — ${sup.name}`, desc: <>المتبقي بذمتك حالياً: <b>{money(supDue(getState(), sup.id))} د.ع</b>. التسديد ينحسب على حساب المورد كله.</>, body: done => <PayForm sup={sup} p={p} done={done} /> })
}
function PayForm({ sup, p, done }: { sup: Supplier; p?: Payment; done: (v?: boolean) => void }) {
  const [d, setD] = useState({ amount: p ? String(p.amount) : '', date: p?.date || today(), method: (p?.method || 'cash') as PayMethod, note: p?.note || '', why: '' })
  return <>
    <div className="grid grid-cols-2 gap-3">
      <Field label="المبلغ" req><Input data-autofocus className="num" inputMode="decimal" value={d.amount} onChange={e => setD({ ...d, amount: e.target.value })} /></Field>
      <Field label="التاريخ" req><Input type="date" max={today()} value={d.date} onChange={e => setD({ ...d, date: e.target.value })} /></Field>
    </div>
    <Field label="طريقة الدفع" group><Seg items={(Object.keys(PAY_METHODS) as PayMethod[]).map(k => ({ k, t: PAY_METHODS[k] }))} value={d.method} onChange={method => setD({ ...d, method })} /></Field>
    <Field label="ملاحظة"><Input value={d.note} onChange={e => setD({ ...d, note: e.target.value })} /></Field>
    {p && <Field label="سبب التعديل" req><Input value={d.why} onChange={e => setD({ ...d, why: e.target.value })} placeholder="مثلاً: المبلغ انكتب غلط" /></Field>}
    <DialogFooter>
      <SaveBtn onClick={async () => { if (await run(() => savePayment(sup.id, d, p, d.why).then(() => true), p ? '✔ انعدل التسديد وانسجل التعديل' : `✔ انسجل تسديد ${money(d.amount)} د.ع`)) done(true) }}><Save />{p ? 'حفظ التعديل' : 'تسجيل التسديد'}</SaveBtn>
      <Btn tone="outline" onClick={() => done()}>إلغاء</Btn>
    </DialogFooter>
  </>
}
async function deletePaymentFlow(p: Payment) {
  const why = await askWhy({ title: 'حذف تسديد', label: 'سبب الحذف', ph: 'مثلاً: انسجل مرتين', ok: 'حذف', danger: true,
    info: <p><b>{p.supplierName}</b> — {money(p.amount)} د.ع {PAY_METHODS[p.method]}<br /><span className="text-sm text-muted-foreground">{ltr(p.date)} — سجّلها {p.staffName}</span></p> })
  if (why) await run(() => deletePayment(p, why), 'انحذف التسديد وانسجل بالمحذوفات')
}

/* ───────── كشف الحساب ───────── */
export function SupplierStatement({ id }: { id: string }) {
  const s = useStore(x => x)
  const sup = supById(s, id)
  const [f, setF] = usePersist('sup.f', () => ({ from: monthStart(), to: today() }))
  const [view, setView] = useState<{ imgs: InvoiceImage[]; v: Invoice } | null>(null)
  if (!sup) return <Shell active="purchases" title="كشف حساب"><Card><Empty>المورد غير موجود</Empty></Card></Shell>
  const edit = canEdit(s)
  const t0 = dayStartTs(f.from), t1 = dayEndTs(f.to)
  const all = supLedger(s, sup.id), before = all.filter(r => r.ts < t0), rows = all.filter(r => r.ts >= t0 && r.ts <= t1)
  const open = before.length ? before[before.length - 1].bal : 0, due = supDue(s, sup.id)
  const items = supItems(s, sup.id, t0, t1)
  const sumD = rows.reduce((a, r) => a + r.debit, 0), sumC = rows.reduce((a, r) => a + r.credit, 0)
  const openImages = async (v: Invoice) => {
    const imgs = await run(() => backend().images(v.id))
    if (imgs?.length) setView({ imgs, v }); else if (imgs) toast.info('ما اكو صور بهذي الفاتورة')
  }
  const exportX = () => run(() => exportSheet({
    file: `كشف_حساب_${sup.name}_${f.from}_${f.to}.xlsx`, title: `${CONFIG.title} — كشف حساب ${sup.name}`,
    sub: `من ${f.from} إلى ${f.to}   |   رصيد سابق: ${money(open)}   |   المتبقي بذمتي الآن: ${money(due)} د.ع`,
    headers: ['التاريخ', 'البيان', 'رقم الوصل', 'فواتير (علي)', 'تسديدات (دفعت)', 'الرصيد'],
    rows: [['', 'رصيد سابق', '', '', '', Math.round(open)], ...rows.map(r => [dt(r.ts), r.text, r.ref, r.debit ? Math.round(r.debit) : '', r.credit ? Math.round(r.credit) : '', Math.round(r.bal)])],
    money: [3, 4, 5], totals: { label: 'المجموع', cols: [3, 4] },
  }))
  const exportItems = () => run(() => exportSheet({
    file: `مشتريات_${sup.name}_${f.from}_${f.to}.xlsx`, title: `${CONFIG.title} — المواد المشتراة من ${sup.name}`, sub: `من ${f.from} إلى ${f.to}`,
    headers: ['المادة', 'الكمية', 'الوحدة', 'المبلغ (د.ع)', 'آخر سعر', 'لكل'],
    rows: items.map(x => [x.name, r3(x.qty), x.unit, Math.round(x.amount), x.last, x.lastUnit]), qty: [1], money: [3, 4], totals: { label: 'المجموع', cols: [3] },
  }))
  return (
    <Shell active="purchases" title={sup.name} subtitle="كشف الحساب — مثل كشف البنك">
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Btn tone="outline" onClick={() => back('/purchases/sups')}><ArrowRight />رجوع</Btn>
          <span className="ms-auto" />
          <Btn onClick={() => paymentForm(sup)}><Wallet />تسديد</Btn>
        </div>
        <div className="grid gap-3 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div className={cn('rounded-[22px] p-5 text-white shadow-md', GRAD)}>
            <div className="text-sm text-white/85">المتبقي بذمتي</div>
            <div className="mt-1 text-3xl font-semibold"><Money v={due} unit /></div>
            <div className="mt-3 text-sm text-white/85">{sup.phone ? <a href={`tel:${sup.phone}`} dir="ltr" className="underline">{sup.phone}</a> : 'بدون هاتف'}{sup.note ? ` · ${sup.note}` : ''}</div>
          </div>
          <Tile label="فواتير الفترة"><Money v={sumD} /></Tile>
          <Tile label="المدفوع بالفترة"><Money v={sumC} /></Tile>
          <Tile label="رصيد قبل الفترة"><Money v={open} /></Tile>
        </div>
        <Card>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:flex sm:items-end">
            <label className="text-sm">من<Input type="date" value={f.from} onChange={e => setF(x => ({ ...x, from: e.target.value }))} /></label>
            <label className="text-sm">إلى<Input type="date" value={f.to} onChange={e => setF(x => ({ ...x, to: e.target.value }))} /></label>
            <Btn className="col-span-2 sm:ms-auto" onClick={exportX}><Download />تصدير الكشف</Btn>
          </div>
          <CardTitle icon={Wallet}>كشف الحساب</CardTitle>
          <GradHead cols="0.9fr 2fr 1fr 1fr 1fr 1.3fr"><span>التاريخ</span><span>البيان</span><span className="text-center">فواتير (علي)</span><span className="text-center">تسديدات (دفعت)</span><span className="text-center">الرصيد</span><span /></GradHead>
          <div className="mt-2 divide-y rounded-xl border">
            <div className="flex items-center justify-between bg-secondary px-4 py-3 font-semibold text-primary"><span>رصيد سابق <span className="text-sm font-normal text-muted-foreground">— قبل {f.from}</span></span><Money v={open} /></div>
            {rows.map((r, n) => (
              <div key={n} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 px-4 py-3 md:grid-cols-[0.9fr_2fr_1fr_1fr_1fr_1.3fr] md:items-center">
                <div className="hidden md:block"><When ts={r.ts} /></div>
                <div className="min-w-0"><b className={r.kind === 'inv' ? 'text-mv-in' : r.kind === 'pay' ? 'text-primary' : ''}>{r.text}</b>
                  {(r.kind === 'inv' && r.inv?.editCount) || (r.kind === 'pay' && r.pay?.editCount) ? <span className="ms-2 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning">معدّلة</span> : null}
                  <Sub>{r.ref ? 'وصل ' + r.ref : r.pay ? 'سجّلها ' + r.pay.staffName : ''}<span className="md:hidden"> · {dtx(r.ts)}</span></Sub></div>
                <div className="text-end md:hidden">{r.debit ? <span className="font-semibold">+<Money v={r.debit} /></span> : <span className="font-semibold text-success">−<Money v={r.credit} /></span>}<Sub>الرصيد <Money v={r.bal} /></Sub></div>
                <div className="hidden text-center md:block">{r.debit ? <Money v={r.debit} /> : ''}</div>
                <div className="hidden text-center text-success md:block">{r.credit ? <Money v={r.credit} /> : ''}</div>
                <div className="hidden text-center font-bold md:block"><Money v={r.bal} /></div>
                <div className="col-span-2 flex justify-end gap-1 md:col-span-1">
                  {r.kind === 'inv' && r.inv && <>{(r.inv.imageCount || 0) > 0 && <Btn tone="ghost" size="icon" aria-label="صور الفاتورة" onClick={() => openImages(r.inv!)}><ImageIcon /></Btn>}<InvActions v={r.inv} compact /></>}
                  {r.kind === 'pay' && r.pay && edit && <>
                    <Btn tone="ghost" size="icon" aria-label="تعديل التسديد" onClick={() => paymentForm(sup, r.pay)}><Pencil /></Btn>
                    <Btn tone="ghost" size="icon" aria-label="حذف التسديد" className="text-destructive" onClick={() => deletePaymentFlow(r.pay!)}><Trash2 /></Btn>
                  </>}
                </div>
              </div>
            ))}
            {!rows.length && <Empty>ما اكو حركات بهذي الفترة</Empty>}
          </div>
        </Card>
        <Card>
          <CardTitle icon={Boxes} extra={items.length > 0 && <Btn tone="soft" onClick={exportItems}><Download />تصدير المواد</Btn>}>المواد المشتراة بالفترة</CardTitle>
          {items.length ? <>
            <GradHead cols="2fr 1fr 1fr 1fr"><span>المادة</span><span className="text-center">الكمية</span><span className="text-center">المبلغ</span><span className="text-center">آخر سعر</span></GradHead>
            <div className="mt-2 divide-y rounded-xl border">{items.map(x => (
              <div key={x.name} className="grid grid-cols-[1fr_auto] gap-x-3 px-4 py-3 md:grid-cols-[2fr_1fr_1fr_1fr] md:items-center">
                <div><b>{x.name}</b><Sub className="md:hidden"><Num v={x.qty} /> {x.unit} · آخر سعر <Money v={x.last} /> لكل {x.lastUnit}</Sub></div>
                <div className="hidden text-center md:block"><Num v={x.qty} /> {x.unit}</div>
                <div className="text-end font-semibold md:text-center"><Money v={x.amount} /></div>
                <div className="hidden text-center md:block"><Money v={x.last} /><Sub>لكل {x.lastUnit}</Sub></div>
              </div>))}</div>
          </> : <Empty>ما اكو مشتريات بهذي الفترة</Empty>}
        </Card>
      </div>
      {view && <Viewer images={view.imgs.map(x => x.data)} index={0} onClose={() => setView(null)} title={`فاتورة ${view.v.supplierName}${view.v.ref ? ' — وصل ' + view.v.ref : ''}`} />}
    </Shell>
  )
}
