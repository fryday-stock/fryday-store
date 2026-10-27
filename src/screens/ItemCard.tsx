// بطاقة المادة: الرصيد بكل مخزن + آخر أسعار الشراء + كل الحركات والرصيد بعد كل حركة
import { ArrowRight, Download, History, MapPin, ShoppingCart } from 'lucide-react'
import { Btn, Card, CardTitle, Empty, GRAD, GradHead, Money, Num, StatusTag, Sub, TypeTag, When } from '@/components/app/kit'
import { run } from '@/components/app/dialogs'
import { Shell } from '@/components/app/Shell'
import { CONFIG } from '@/config'
import { avgCosts, balAt, balances, detailed, grpOf, isZero, itemById, moveEffects, moveWhere, packOf } from '@/lib/calc'
import { TYPES } from '@/lib/constants'
import { exportSheet } from '@/lib/excel'
import { dt, fmt, money, r3, today } from '@/lib/format'
import { back } from '@/lib/router'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

export function ItemCard({ id }: { id: string }) {
  const s = useStore(x => x)
  const it = itemById(s, id)
  if (!it) return <Shell active="stock" title="بطاقة مادة"><Card><Empty>المادة غير موجودة</Empty></Card></Shell>
  const bal = balances(s.moves), avg = avgCosts(s.moves).get(it.id) || 0
  const per = s.locations.map(l => [l, balAt(bal, it.id, l.id)] as const)
    .filter(([l, v]) => !isZero(v) || (l.active !== false && s.moves.some(m => m.itemId === it.id && (m.toLoc === l.id || m.fromLoc === l.id))))
  const total = per.reduce((a, [, v]) => a + v, 0)
  let run_ = 0
  const rows = s.moves.filter(m => m.itemId === it.id).map(m => {
    const eff = moveEffects(m), inQ = eff.filter(e => e[1] > 0).reduce((a, e) => a + e[1], 0), outQ = -eff.filter(e => e[1] < 0).reduce((a, e) => a + e[1], 0)
    run_ += inQ - outQ
    return { m, inQ, outQ, bal: run_ }
  })
  const buys = s.moves.filter(m => m.itemId === it.id && (m.type === 'in' || m.type === 'opening')).slice(-8).reverse()
  const last = buys[0]

  const exportX = () => run(() => exportSheet({
    file: `بطاقة_مادة_${it.name}_${today()}.xlsx`, title: `${CONFIG.title} — بطاقة مادة: ${it.name}`,
    sub: `الرصيد الكلي: ${fmt(total)} ${it.baseUnit}   |   ${per.map(([l, v]) => `${l.name}: ${fmt(v)}`).join('   |   ')}   |   متوسط الكلفة: ${money(avg)}   |   بتاريخ: ${dt(Date.now())}`,
    headers: ['التاريخ', 'النوع', 'المكان', 'داخل', 'طالع', 'الرصيد بعدها', 'الوحدة', 'المورد / السبب', 'الموظف', 'الكلفة'],
    rows: rows.map(r => [dt(r.m.ts), TYPES[r.m.type]?.label, moveWhere(s, r.m), r.inQ ? r3(r.inQ) : '', r.outQ ? r3(r.outQ) : '', r3(r.bal), it.baseUnit, [r.m.supplierName, r.m.reason, r.m.ref].filter(Boolean).join(' — '), r.m.staffName, r.m.cost || '']),
    qty: [3, 4, 5], money: [9],
  }))

  return (
    <Shell active="stock" title={it.name} subtitle={`${grpOf(it)} — الوحدة الأساسية: ${it.baseUnit}${it.bigUnit ? ` — ${it.bigUnit} = ${fmt(packOf(it))} ${it.baseUnit}` : ''}${Number(it.minQty) ? ` — حد الأمان: ${fmt(it.minQty)}` : ''}`}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Btn tone="outline" onClick={() => back('/stock')}><ArrowRight />رجوع</Btn>
          <StatusTag it={it} q={total} />
          <Btn className="ms-auto" onClick={exportX}><Download />تصدير</Btn>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className={cn('rounded-[22px] p-5 text-white shadow-md', GRAD)}>
            <div className="text-sm text-white/85">الرصيد الكلي</div>
            <div className="mt-1 text-3xl font-semibold"><Num v={total} /> <small className="text-base">{it.baseUnit}</small></div>
            {detailed(it, total) && <div className="mt-1 text-sm text-white/85">{detailed(it, total)}</div>}
          </div>
          <div className="rounded-[22px] border p-5"><div className="text-sm text-muted-foreground">متوسط الكلفة / {it.baseUnit}</div><div className="mt-1 text-2xl font-semibold text-primary"><Money v={avg} /></div><Sub>القيمة: <Money v={Math.max(total, 0) * avg} unit /></Sub></div>
          <div className="rounded-[22px] border p-5"><div className="text-sm text-muted-foreground">آخر سعر شراء</div><div className="mt-1 text-2xl font-semibold text-primary">{last ? <Money v={last.invPrice ?? last.price} /> : '—'}</div>
            <Sub>{last ? `لكل ${last.unit} — ${last.supplierName || (last.type === 'opening' ? 'رصيد افتتاحي' : 'وارد')}` : ''}</Sub></div>
        </div>

        <Card>
          <CardTitle icon={MapPin}>الرصيد بكل مخزن</CardTitle>
          {per.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{per.map(([l, v]) => (
            <div key={l.id} className="rounded-[18px] border p-4"><b className="block">{l.name}</b>
              <span className={cn('text-lg font-semibold', v < -0.0005 ? 'text-destructive' : 'text-primary')}><Num v={v} /> <small className="text-sm font-normal text-muted-foreground">{it.baseUnit}</small></span>
              {detailed(it, v) && <Sub>{detailed(it, v)}</Sub>}</div>))}</div> : <Empty>ما اكو رصيد</Empty>}
        </Card>

        <Card>
          <CardTitle icon={ShoppingCart}>آخر أسعار الشراء</CardTitle>
          {buys.length ? <>
            <GradHead cols="1fr 1.4fr 1fr 1fr 1fr"><span>التاريخ</span><span>المورد / الوصل</span><span className="text-center">الكمية</span><span className="text-center">سعر الوحدة</span><span className="text-center">الكلفة بعد التوزيع</span></GradHead>
            <div className="mt-2 divide-y rounded-xl border">{buys.map(m => (
              <div key={m.id} className="grid grid-cols-2 gap-2 px-4 py-3 md:grid-cols-[1fr_1.4fr_1fr_1fr_1fr] md:items-center">
                <When ts={m.ts} />
                <div className="text-end md:text-start"><b>{m.supplierName || (m.type === 'opening' ? 'رصيد افتتاحي' : 'وارد')}</b><Sub>{m.ref ? 'وصل ' + m.ref : ''}</Sub></div>
                <div className="md:text-center"><Num v={m.qty} /> {m.unit}</div>
                <div className="text-end md:text-center"><Money v={m.invPrice ?? m.price} /></div>
                <div className="col-span-2 text-sm text-muted-foreground md:col-span-1 md:text-center md:text-base md:text-foreground"><span className="md:hidden">الكلفة: </span><Money v={m.cost} /></div>
              </div>))}</div>
          </> : <Empty>ما اكو مشتريات</Empty>}
        </Card>

        <Card>
          <CardTitle icon={History}>الحركات والرصيد بعد كل حركة</CardTitle>
          {rows.length ? <>
            <GradHead cols="1fr 1.5fr 1.3fr 0.8fr 0.8fr 1fr"><span>الوقت</span><span>النوع</span><span>المكان</span><span className="text-center">داخل</span><span className="text-center">طالع</span><span className="text-center">الرصيد بعدها</span></GradHead>
            <div className="mt-2 divide-y rounded-xl border">{rows.slice().reverse().map(r => (
              <div key={r.m.id} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 px-4 py-3 md:grid-cols-[1fr_1.5fr_1.3fr_0.8fr_0.8fr_1fr] md:items-center">
                <When ts={r.m.ts} />
                <div className="text-end md:text-start"><TypeTag t={r.m.type} /><Sub>{[r.m.supplierName, r.m.reason, r.m.staffName].filter(Boolean).join(' — ')}</Sub></div>
                <div className="text-sm text-muted-foreground md:text-base md:text-foreground">{moveWhere(s, r.m)}</div>
                <div className="text-end md:text-center">
                  <span className="md:hidden">{r.inQ ? <span className="text-success">+<Num v={r.inQ} /></span> : <span className="text-mv-out">−<Num v={r.outQ} /></span>} · الرصيد <b><Num v={r.bal} /></b></span>
                  <span className="hidden text-success md:inline">{r.inQ ? <Num v={r.inQ} /> : ''}</span>
                </div>
                <div className="hidden text-center text-mv-out md:block">{r.outQ ? <Num v={r.outQ} /> : ''}</div>
                <div className={cn('hidden text-center font-bold md:block', r.bal < -0.0005 && 'text-destructive')}><Num v={r.bal} /></div>
              </div>))}</div>
          </> : <Empty>ما اكو حركات</Empty>}
        </Card>
      </div>
    </Shell>
  )
}
