// الإدارة (للمدير فقط): المواد، المخازن، الموظفين، الموردين، الاستيراد، النظام
import { Boxes, DatabaseBackup, Download, FileSpreadsheet, MapPin, Pencil, Plus, Save, Settings2, ShieldOff, Trash2, Upload, Users, UserCog } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { Btn, Card, CardTitle, Empty, Field, GradHead, Money, Num, Pills, Sub, Tile } from '@/components/app/kit'
import { SaveBtn, confirmBox, openDialog, run } from '@/components/app/dialogs'
import { Shell } from '@/components/app/Shell'
import { CONFIG, LS } from '@/config'
import { allGroups, balances, isZero, locOrder } from '@/lib/calc'
import { NOGRP, UNITS } from '@/lib/constants'
import { downloadBlob } from '@/lib/excel'
import { dtx, hashPin, normKey, normTxt, parseNum, today } from '@/lib/format'
import { downloadTemplate, planImport, type ImportPlan } from '@/lib/importer'
import { nav } from '@/lib/router'
import { backend, getState, logout, useStore } from '@/lib/store'
import type { Item, Location, Staff } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Suppliers } from './Suppliers'

const TABS = [
  { k: 'items', t: 'المواد', icon: Boxes }, { k: 'locations', t: 'المخازن', icon: MapPin }, { k: 'staff', t: 'الموظفين', icon: UserCog },
  { k: 'suppliers', t: 'الموردين', icon: Users }, { k: 'import', t: 'الاستيراد', icon: FileSpreadsheet }, { k: 'system', t: 'النظام', icon: Settings2 },
] as const

export function Admin({ tab }: { tab: string }) {
  const t = TABS.some(x => x.k === tab) ? tab : 'items'
  return (
    <Shell active="admin" title="الإدارة" subtitle="للمدير فقط">
      <div className="space-y-5">
        <Pills items={TABS.map(x => ({ ...x }))} value={t} onChange={k => nav('/admin/' + k)} />
        {t === 'items' && <ItemsTab />}
        {t === 'locations' && <LocsTab />}
        {t === 'staff' && <StaffTab />}
        {t === 'suppliers' && <Suppliers />}
        {t === 'import' && <ImportTab />}
        {t === 'system' && <SystemTab />}
      </div>
    </Shell>
  )
}
const used = (field: 'itemId' | 'fromLoc' | 'toLoc', id: string) => getState().allMoves.some(m => m[field] === id)
const Inactive = ({ on, t = 'موقوف' }: { on: boolean; t?: string }) => (on ? <span className="ms-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{t}</span> : null)

/* ───────── المواد ───────── */
function ItemsTab() {
  const s = useStore(x => x)
  const [q, setQ] = useState('')
  const k = normKey(q)
  const list = s.items.slice().sort((a, b) => Number(a.active === false) - Number(b.active === false) || (a.group || 'ي').localeCompare(b.group || 'ي', 'ar') || a.name.localeCompare(b.name, 'ar'))
    .filter(i => !k || normKey(i.name).includes(k) || normKey(i.group).includes(k))
  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input type="search" className="sm:max-w-xs" placeholder="بحث" value={q} onChange={e => setQ(e.target.value)} />
        <span className="text-sm text-muted-foreground">{list.length} مادة</span>
        <Btn className="ms-auto" onClick={() => itemForm()}><Plus />مادة جديدة</Btn>
      </div>
      {list.length ? <>
        <GradHead cols="2fr 1fr 1fr 0.8fr 0.8fr 56px"><span>المادة / المجموعة</span><span>الوحدة الأساسية</span><span>الوحدة الكبيرة</span><span className="text-center">التعبئة</span><span className="text-center">حد الأمان</span><span /></GradHead>
        <div className="mt-2 divide-y rounded-xl border">{list.map(i => (
          <div key={i.id} className={cn('grid grid-cols-[1fr_auto] items-center gap-x-3 px-4 py-2 md:grid-cols-[2fr_1fr_1fr_0.8fr_0.8fr_56px]', i.active === false && 'opacity-55')}>
            <div><b>{i.name}</b><Inactive on={i.active === false} t="موقوفة" /><Sub>{i.group || NOGRP}<span className="md:hidden"> · {i.baseUnit}{i.bigUnit ? ` · ${i.bigUnit} = ${i.pack}` : ''}</span></Sub></div>
            <div className="hidden md:block">{i.baseUnit}</div><div className="hidden md:block">{i.bigUnit || '—'}</div>
            <div className="hidden text-center md:block">{i.bigUnit ? <Num v={i.pack} /> : '—'}</div><div className="hidden text-center md:block">{Number(i.minQty) ? <Num v={i.minQty} /> : '—'}</div>
            <Btn tone="ghost" size="icon" aria-label={`تعديل ${i.name}`} onClick={() => itemForm(i)}><Pencil /></Btn>
          </div>))}</div>
      </> : <Empty icon={Boxes}>ما اكو مواد. ابدي بإضافة أول مادة، أو استورد من إكسل.</Empty>}
    </Card>
  )
}
function itemForm(it?: Item) { openDialog({ title: it ? 'تعديل مادة' : 'مادة جديدة', body: done => <ItemForm it={it} done={done} /> }) }
function ItemForm({ it, done }: { it?: Item; done: (v?: unknown) => void }) {
  const [d, setD] = useState({ name: it?.name || '', group: it?.group || '', baseUnit: it?.baseUnit || '', bigUnit: it?.bigUnit || '', pack: it?.pack ? String(it.pack) : '', minQty: it?.minQty ? String(it.minQty) : '' })
  const set = (p: Partial<typeof d>) => setD(x => ({ ...x, ...p }))
  const hasMoves = !!it && used('itemId', it.id)
  const save = async () => {
    const s = getState(), name = normTxt(d.name), baseUnit = normTxt(d.baseUnit), bigUnit = normTxt(d.bigUnit), pack = parseNum(d.pack), minQty = parseNum(d.minQty)
    if (!name || !baseUnit) return toast.error('الاسم والوحدة الأساسية مطلوبة')
    if (s.items.some(x => normKey(x.name) === normKey(name) && x.id !== it?.id)) return toast.error('اكو مادة بنفس الاسم')
    if (bigUnit && !(pack > 1)) return toast.error('اكتب التعبئة (أكبر من 1) للوحدة الكبيرة')
    if (bigUnit && bigUnit === baseUnit) return toast.error('الوحدة الكبيرة لازم تختلف عن الأساسية')
    const doc = { name, group: normTxt(d.group), baseUnit, bigUnit, pack: bigUnit ? pack : 0, minQty }
    if (await run(() => (it ? backend().update('items', it.id, doc) : backend().add('items', { ...doc, active: true, created: Date.now() })).then(() => true), '✔ انحفظت المادة')) done()
  }
  const toggle = async () => {
    if (!it) return
    if (it.active === false) await run(() => backend().update('items', it.id, { active: true }), '✔ رجعت المادة')
    else if (hasMoves) await run(() => backend().update('items', it.id, { active: false }), '✔ انوقفت المادة')
    else { if (!(await confirmBox(<>حذف <b>{it.name}</b> نهائياً؟</>, 'حذف', true))) return; await run(() => backend().remove('items', it.id), '✔ انحذفت') }
    done()
  }
  return <>
    <datalist id="units">{UNITS.map(u => <option key={u} value={u} />)}</datalist>
    <datalist id="groups">{allGroups(getState()).filter(g => g !== NOGRP).map(g => <option key={g} value={g} />)}</datalist>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="اسم المادة" req><Input data-autofocus value={d.name} onChange={e => set({ name: e.target.value })} /></Field>
      <Field label="المجموعة"><Input list="groups" value={d.group} onChange={e => set({ group: e.target.value })} placeholder="منظفات، سفري، ألبان…" /></Field>
      <Field label="الوحدة الأساسية" req hint="اللي تصرف وتجرد بيها"><Input list="units" value={d.baseUnit} onChange={e => set({ baseUnit: e.target.value })} placeholder="قطعة، كغم…" /></Field>
      <Field label="حد الأمان (بالأساسية)"><Input className="num" inputMode="decimal" value={d.minQty} onChange={e => set({ minQty: e.target.value })} /></Field>
      <Field label="الوحدة الكبيرة (اختياري)"><Input list="units" value={d.bigUnit} onChange={e => set({ bigUnit: e.target.value })} placeholder="كرتون، صندوق…" /></Field>
      <Field label="التعبئة" hint="كم وحدة أساسية بالكبيرة"><Input className="num" inputMode="decimal" value={d.pack} onChange={e => set({ pack: e.target.value })} /></Field>
    </div>
    {hasMoves && <p className="text-sm text-warning">انتبه: تغيير الوحدة أو التعبئة ما يغيّر الحركات المسجلة سابقاً.</p>}
    <DialogFooter>
      <SaveBtn onClick={save}><Save />حفظ</SaveBtn><Btn tone="outline" onClick={() => done()}>إلغاء</Btn>
      {it && <Btn tone="outline" className="sm:ms-auto" onClick={toggle}>{it.active === false ? 'إعادة تفعيل' : hasMoves ? 'إيقاف' : <><Trash2 />حذف</>}</Btn>}
    </DialogFooter>
  </>
}

/* ───────── المخازن ───────── */
function LocsTab() {
  const s = useStore(x => x)
  const list = s.locations.slice().sort(locOrder)
  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center gap-3"><span className="text-sm text-muted-foreground">مثلاً: المخزن الرئيسي، البراد، الفريزر، رف المطبخ</span><Btn className="ms-auto" onClick={() => locForm()}><Plus />مكان جديد</Btn></div>
      {list.length ? <div className="divide-y rounded-xl border">{list.map(l => (
        <div key={l.id} className={cn('flex items-center gap-3 px-4 py-2', l.active === false && 'opacity-55')}>
          <MapPin className="size-5 text-accent" /><b className="flex-1">{l.name}<Inactive on={l.active === false} /></b><span className="text-sm text-muted-foreground">الترتيب {l.order ?? 0}</span>
          <Btn tone="ghost" size="icon" aria-label={`تعديل ${l.name}`} onClick={() => locForm(l)}><Pencil /></Btn>
        </div>))}</div> : <Empty icon={MapPin}>ما اكو أماكن. أضف أول مكان خزن.</Empty>}
    </Card>
  )
}
function locForm(l?: Location) { openDialog({ title: l ? 'تعديل مكان' : 'مكان خزن جديد', body: done => <LocForm l={l} done={done} /> }) }
function LocForm({ l, done }: { l?: Location; done: (v?: unknown) => void }) {
  const [d, setD] = useState({ name: l?.name || '', order: String(l?.order ?? getState().locations.length + 1) })
  const hasMoves = !!l && (used('fromLoc', l.id) || used('toLoc', l.id))
  const save = async () => {
    const name = normTxt(d.name), order = parseNum(d.order)
    if (!name) return toast.error('اكتب اسم المكان')
    if (getState().locations.some(x => normKey(x.name) === normKey(name) && x.id !== l?.id)) return toast.error('اكو مكان بنفس الاسم')
    if (await run(() => (l ? backend().update('locations', l.id, { name, order }) : backend().add('locations', { name, order, active: true })).then(() => true), '✔ انحفظ المكان')) done()
  }
  const toggle = async () => {
    if (!l) return
    if (l.active === false) await run(() => backend().update('locations', l.id, { active: true }), '✔ رجع المكان')
    else if (hasMoves) {
      const left = [...balances(getState().moves)].filter(([k, v]) => k.endsWith('|' + l.id) && !isZero(v)).length
      if (left && !(await confirmBox(`بهذا المكان ${left} مادة بيها رصيد. انقلها أولاً. توقفه رغم ذلك؟`, 'إيقاف', true))) return
      await run(() => backend().update('locations', l.id, { active: false }), '✔ انوقف المكان')
    } else { if (!(await confirmBox(<>حذف <b>{l.name}</b>؟</>, 'حذف', true))) return; await run(() => backend().remove('locations', l.id), '✔ انحذف') }
    done()
  }
  return <>
    <Field label="اسم المكان" req><Input data-autofocus value={d.name} onChange={e => setD({ ...d, name: e.target.value })} /></Field>
    <Field label="الترتيب بالقوائم"><Input className="num" inputMode="numeric" value={d.order} onChange={e => setD({ ...d, order: e.target.value })} /></Field>
    <DialogFooter>
      <SaveBtn onClick={save}><Save />حفظ</SaveBtn><Btn tone="outline" onClick={() => done()}>إلغاء</Btn>
      {l && <Btn tone="outline" className="sm:ms-auto" onClick={toggle}>{l.active === false ? 'إعادة تفعيل' : hasMoves ? 'إيقاف' : <><Trash2 />حذف</>}</Btn>}
    </DialogFooter>
  </>
}

/* ───────── الموظفين ───────── */
function StaffTab() {
  const s = useStore(x => x)
  const list = s.staff.slice().sort((a, b) => a.name.localeCompare(b.name, 'ar'))
  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <p className="flex-1 text-sm text-muted-foreground">الموظف يشوف كل شي (الكلف، الجرد، التقارير، التعديلات) عدا شاشة الإدارة. التعديل والحذف للمدير وللموظف اللي عنده صلاحية «يعدّل ويحذف».</p>
        <Btn onClick={() => staffForm()}><Plus />موظف</Btn>
      </div>
      <div className="divide-y rounded-xl border">{list.map(x => (
        <div key={x.id} className={cn('flex flex-wrap items-center gap-3 px-4 py-2', x.active === false && 'opacity-55')}>
          <span className="grid size-11 place-items-center rounded-full bg-secondary font-bold text-primary">{x.name.charAt(0)}</span>
          <div className="min-w-0 flex-1"><b>{x.name}</b><Inactive on={x.active === false} />
            <Sub>{x.role === 'admin' ? 'مدير' : x.canEdit ? 'موظف — يعدّل ويحذف' : 'موظف'} · {s.moves.filter(m => m.staffId === x.id).length} حركة</Sub></div>
          <Btn tone="ghost" size="icon" aria-label={`تعديل ${x.name}`} onClick={() => staffForm(x)}><Pencil /></Btn>
        </div>))}</div>
    </Card>
  )
}
function staffForm(x?: Staff) { openDialog({ title: x ? 'تعديل موظف' : 'موظف جديد', body: done => <StaffForm x={x} done={done} /> }) }
function StaffForm({ x, done }: { x?: Staff; done: (v?: unknown) => void }) {
  const me = getState().user!
  const [d, setD] = useState({ name: x?.name || '', pin: '', role: x?.role || 'staff', canEdit: !!x?.canEdit })
  const admins = getState().staff.filter(y => y.role === 'admin' && y.active !== false)
  const save = async () => {
    const name = normTxt(d.name), pin = d.pin.trim()
    if (!name) return toast.error('اكتب الاسم')
    if (getState().staff.some(y => normKey(y.name) === normKey(name) && y.id !== x?.id)) return toast.error('اكو موظف بنفس الاسم')
    if ((!x || pin) && !/^\d{4,6}$/.test(pin)) return toast.error('الرمز من 4 إلى 6 أرقام')
    if (x && x.role === 'admin' && d.role !== 'admin' && admins.length <= 1) return toast.error('لازم يبقى مدير واحد على الأقل')
    if (x && x.name !== name && !pin) return toast.error('عند تغيير الاسم اكتب رمز جديد')
    const doc: Record<string, unknown> = { name, role: d.role, canEdit: d.role === 'admin' || d.canEdit }
    if (pin) doc.pinHash = await hashPin(name, pin)
    if (await run(() => (x ? backend().update('staff', x.id, doc) : backend().add('staff', { ...doc, active: true, created: Date.now() })).then(() => true), '✔ انحفظ')) done()
  }
  const toggle = async () => {
    if (!x) return
    if (x.active !== false && x.role === 'admin' && admins.length <= 1) return toast.error('لازم يبقى مدير واحد على الأقل')
    if (await run(() => backend().update('staff', x.id, { active: x.active === false }).then(() => true), '✔ تم')) done()
  }
  return <>
    <Field label="الاسم" req><Input data-autofocus value={d.name} onChange={e => setD({ ...d, name: e.target.value })} /></Field>
    <div className="grid grid-cols-2 gap-3">
      <Field label={x ? 'رمز جديد (اتركه فارغ إذا ما تغيّره)' : 'الرمز السري'} req={!x}><Input type="password" inputMode="numeric" maxLength={6} dir="ltr" className="text-center tracking-[0.4em]" value={d.pin} onChange={e => setD({ ...d, pin: e.target.value.replace(/\D/g, '') })} /></Field>
      <Field label="الصلاحية"><NativeSelect value={d.role} onChange={e => setD({ ...d, role: e.target.value as Staff['role'] })}><NativeSelectOption value="staff">موظف</NativeSelectOption><NativeSelectOption value="admin">مدير</NativeSelectOption></NativeSelect></Field>
    </div>
    {d.role !== 'admin' && <label className="flex min-h-12 items-center gap-3 rounded-xl border px-4"><Switch checked={d.canEdit} onCheckedChange={v => setD({ ...d, canEdit: v })} /><span>يسمح له بتعديل وحذف الحركات والفواتير والتسديدات</span></label>}
    <DialogFooter>
      <SaveBtn onClick={save}><Save />حفظ</SaveBtn><Btn tone="outline" onClick={() => done()}>إلغاء</Btn>
      {x && x.id !== me.id && <Btn tone="outline" className="sm:ms-auto" onClick={toggle}>{x.active === false ? 'إعادة تفعيل' : 'إيقاف'}</Btn>}
    </DialogFooter>
  </>
}

/* ───────── الاستيراد ───────── */
function ImportTab() {
  const ref = useRef<HTMLInputElement>(null)
  const pick = async (f: File) => { const plan = await run(() => planImport(f)); if (plan) openDialog({ title: 'مراجعة الاستيراد', desc: plan.file, wide: true, body: done => <ImportReview plan={plan} done={done} /> }) }
  return (
    <Card>
      <CardTitle icon={FileSpreadsheet}>استيراد من إكسل</CardTitle>
      <p className="text-muted-foreground">ترفع ملف إكسل بيه المواد وأرصدتها (حسب القالب)، والنظام يضيف المخازن والمواد والأرصدة الافتتاحية مرة وحدة. المواد الموجودة مسبقاً بنفس الاسم ما تتكرر. قبل الحفظ تطلعلك شاشة مراجعة بالأخطاء والتكرار.</p>
      <div className="mt-3 rounded-xl bg-secondary p-4 text-sm"><b>أعمدة القالب:</b> المخزن، المجموعة، اسم المادة، الوحدة الأساسية، الوحدة الكبيرة، التعبئة، الرصيد (بالأساسية)، سعر الوحدة الأساسية، حد الأمان.</div>
      <input ref={ref} type="file" accept=".xlsx,.xls,.csv" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) pick(f) }} />
      <div className="mt-4 flex flex-wrap gap-2"><Btn onClick={() => ref.current?.click()}><Upload />اختيار ملف الإكسل</Btn><Btn tone="soft" onClick={() => run(downloadTemplate)}><Download />تنزيل القالب</Btn></div>
    </Card>
  )
}
function ImportReview({ plan, done }: { plan: ImportPlan; done: (v?: unknown) => void }) {
  const empty = !plan.newItems.length && !plan.rows.length && !plan.newLocs.length
  return <>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Tile label="مخازن جديدة">{plan.newLocs.length}</Tile><Tile label="مواد جديدة">{plan.newItems.length}</Tile>
      <Tile label="أرصدة افتتاحية">{plan.rows.length}</Tile><Tile label="قيمتها" grad><Money v={plan.totalVal} unit /></Tile>
    </div>
    {plan.newLocs.length > 0 && <p className="text-sm"><b>المخازن الجديدة:</b> {plan.newLocs.map(l => l.name).join('، ')}</p>}
    {plan.already > 0 && <p className="rounded-xl bg-danger-soft p-3 text-sm text-destructive">⚠ {plan.already} رصيد من هذا الملف مسجّل سابقاً كرصيد افتتاحي بنفس المخزن. إذا تستورد، راح يتكرر وينضاعف. الغالب انت مستورد هذا الملف قبل.</p>}
    {plan.dups > 0 && <p className="rounded-xl bg-warning-soft p-3 text-sm text-warning">{plan.dups} مادة مكررة بنفس المخزن، راح تنجمع أرصدتها.</p>}
    {plan.errs.length ? <div className="rounded-xl bg-danger-soft p-3 text-sm"><b className="text-destructive">{plan.errs.length} سطر فيه مشكلة وراح يتجاوزه:</b><div className="mt-2 max-h-40 overflow-auto">{plan.errs.map((e, i) => <div key={i}>{e}</div>)}</div></div>
      : <p className="text-sm font-semibold text-success">✔ ما اكو أخطاء بالملف</p>}
    <DialogFooter>
      <SaveBtn onClick={async () => { if (await run(() => backend().batch(plan.ops()).then(() => true), `✔ انضاف ${plan.newItems.length} مادة و${plan.rows.length} رصيد`)) done() }}><Upload />استيراد</SaveBtn>
      <Btn tone="outline" onClick={() => done()}>إلغاء</Btn>
      {empty && <span className="self-center text-sm text-muted-foreground">ما اكو شي جديد للاستيراد</span>}
    </DialogFooter>
  </>
}

/* ───────── النظام ───────── */
function SystemTab() {
  const [last, setLast] = useState(() => localStorage.getItem(LS + 'last_backup'))
  const [withImages, setWithImages] = useState(false)
  const local = backend().mode === 'local'
  const backup = () => run(async () => {
    const s = getState()
    const data: Record<string, unknown> = { exportedAt: new Date().toISOString(), title: CONFIG.title, items: s.items, locations: s.locations, staff: s.staff.map(({ pinHash: _p, ...x }) => x), moves: s.allMoves, stocktakes: s.stocktakes, audit: s.audit, suppliers: s.suppliers, invoices: s.invoices, payments: s.payments }
    if (withImages) data.invoiceImages = (await Promise.all(s.invoices.filter(v => (v.imageCount || 0) > 0).map(v => backend().images(v.id)))).flat()
    downloadBlob(`نسخة_احتياطية_${today()}.json`, new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }))
    localStorage.setItem(LS + 'last_backup', String(Date.now())); setLast(String(Date.now()))
  }, '✔ نزلت النسخة الاحتياطية')
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardTitle icon={DatabaseBackup}>النسخة الاحتياطية</CardTitle>
        <p className="text-muted-foreground">ينزّل ملف JSON بيه كل البيانات: المواد، المخازن، الموظفين (بدون الرموز)، كل الحركات، الجرودات، الموردين والفواتير والتسديدات، وسجل التعديلات. يُنصح كل أسبوع أو كل شهر.</p>
        <p className="mt-2 text-sm">آخر نسخة من هذا الجهاز: <b>{last ? dtx(Number(last)) : 'ما اكو'}</b></p>
        <label className="mt-3 flex min-h-12 items-center gap-3 rounded-xl border px-4"><Switch checked={withImages} onCheckedChange={setWithImages} /><span>ويا صور الفواتير (الملف يصير أكبر)</span></label>
        <Btn className="mt-3" onClick={backup}><Download />تنزيل نسخة احتياطية</Btn>
      </Card>
      <Card>
        <CardTitle icon={ShieldOff}>هذا الجهاز</CardTitle>
        {local ? <>
          <p className="text-muted-foreground">النظام يشتغل بـ <b>وضع تجربة</b>: كل البيانات محفوظة بمتصفح هذا الجهاز فقط. لما تنضاف إعدادات Firebase بملف config.ts يصير يشتغل على السيرفر.</p>
          <Btn tone="danger" className="mt-3" onClick={async () => {
            if (!(await confirmBox('مسح كل بيانات التجربة من هذا الجهاز؟ ما تكدر ترجعها.', 'مسح', true))) return
            Object.keys(localStorage).filter(k => k.startsWith(LS)).forEach(k => localStorage.removeItem(k)); location.reload()
          }}><Trash2 />مسح بيانات التجربة</Btn>
        </> : <>
          <p className="text-muted-foreground">إلغاء التفعيل يخلي هذا الجهاز يحتاج كلمة سر المطعم مرة ثانية. استخدمه إذا الجهاز راح يطلع من المطعم أو ضاع.</p>
          <Btn tone="danger" className="mt-3" onClick={async () => {
            if (!(await confirmBox('إلغاء تفعيل هذا الجهاز؟ راح يحتاج كلمة سر المطعم حتى يشتغل مرة ثانية.', 'إلغاء التفعيل', true))) return
            logout(); await backend().signOut(); location.reload()
          }}><ShieldOff />إلغاء تفعيل هذا الجهاز</Btn>
        </>}
      </Card>
    </div>
  )
}
