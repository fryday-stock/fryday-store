// التعديلات والحذف: كل تعديل أو حذف — منو، متى، شنو كان وشنو صار، والسبب
import { ImageIcon, ReceiptText, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { Card, Empty, Money, Num, Pills, Sub, TypeTag, When } from '@/components/app/kit'
import { Shell } from '@/components/app/Shell'
import { AUD_FIELDS, audVal } from '@/lib/actions'
import { locName } from '@/lib/calc'
import { PAY_METHODS } from '@/lib/constants'
import { dayEndTs, dayStartTs, dtx, monthStart, today } from '@/lib/format'
import { usePersist } from '@/lib/persist'
import { useStore } from '@/lib/store'
import type { Audit, MoveType, PayMethod } from '@/lib/types'

function What({ x }: { x: Audit }) {
  const I = x.kind === 'invoice' ? ReceiptText : x.kind === 'image' ? ImageIcon : Wallet
  if (!x.kind) return <span><TypeTag t={x.moveType as MoveType} /> — <b>{x.itemName}</b></span>
  return <span><span className="inline-flex items-center gap-1 text-sm font-semibold text-primary"><I className="size-4" />{x.kind === 'invoice' ? 'فاتورة مشتريات' : x.kind === 'image' ? 'صورة فاتورة' : 'تسديد'}</span> — <b>{x.supplierName}</b>{x.ref ? <Sub>وصل {x.ref}</Sub> : null}</span>
}

export function AuditScreen() {
  const s = useStore(x => x)
  const [a, setA] = usePersist('aud.f', () => ({ tab: 'edit' as 'edit' | 'delete', from: monthStart(), to: today() }))
  const inRange = (x: Audit) => x.ts >= dayStartTs(a.from) && x.ts <= dayEndTs(a.to)
  const edits = s.audit.filter(x => x.action === 'edit' && inRange(x)).sort((p, q) => q.ts - p.ts)
  const dels = s.audit.filter(x => x.action === 'delete' && inRange(x)).sort((p, q) => q.ts - p.ts)
  const list = a.tab === 'edit' ? edits : dels

  const detail = (x: Audit): ReactNode => {
    if (x.action === 'edit') return <>
      {(x.summary || []).map((t, i) => <div key={i}>{t}</div>)}
      {(x.changed || []).map(k => <div key={k}>{AUD_FIELDS[k]}: <span className="text-destructive line-through">{audVal(k, x.before?.[k])}</span> ← <b>{audVal(k, x.after?.[k])}</b></div>)}
    </>
    const b = (x.before || {}) as Record<string, unknown>
    if (x.kind === 'invoice') return <><Money v={Number(b.total)} unit /> — {locName(s, String(b.locId))} — {((b.lines as unknown[]) || []).length} مادة</>
    if (x.kind === 'payment') return <><Money v={Number(b.amount)} unit /> {PAY_METHODS[b.method as PayMethod] || ''}</>
    if (x.kind === 'image') return <>صورة {Math.round(Number(b.bytes) / 1024)}KB</>
    const where = x.moveType === 'transfer' ? `${locName(s, String(b.fromLoc))} ← ${locName(s, String(b.toLoc))}` : locName(s, String(b.toLoc || b.fromLoc))
    return <><Num v={Number(b.qty)} /> {String(b.unit)} — {where}</>
  }

  return (
    <Shell active="audit" title="التعديلات والحذف" subtitle="ما ينمسح شي بدون ما ينسجل هنا">
      <div className="space-y-5">
        <div className="flex flex-wrap items-end gap-3">
          <Pills items={[{ k: 'edit', t: `التعديلات (${edits.length})` }, { k: 'delete', t: `المحذوفات (${dels.length})` }]} value={a.tab} onChange={tab => setA(x => ({ ...x, tab }))} />
          <div className="ms-auto grid grid-cols-2 gap-2">
            <label className="text-sm">من<Input type="date" value={a.from} onChange={e => setA(x => ({ ...x, from: e.target.value }))} /></label>
            <label className="text-sm">إلى<Input type="date" value={a.to} onChange={e => setA(x => ({ ...x, to: e.target.value }))} /></label>
          </div>
        </div>
        <Card>
          {list.length ? (
            <div className="divide-y rounded-xl border">
              {list.map(x => (
                <div key={x.id} className="grid gap-2 px-4 py-3 md:grid-cols-[0.8fr_0.8fr_1.6fr_2fr_1.3fr_1fr] md:items-start md:gap-3">
                  <div className="flex items-center justify-between md:block"><When ts={x.ts} /><b className="md:hidden">{x.by}</b></div>
                  <b className="hidden md:block">{x.by}</b>
                  <What x={x} />
                  <div className="text-sm">{detail(x)}</div>
                  <div className="rounded-lg bg-secondary px-3 py-2 text-sm"><span className="text-muted-foreground">السبب: </span>{x.why}</div>
                  <div className="text-sm text-muted-foreground">سجّلها أصلاً: {x.moveStaff}<br /><span className="num">{x.moveTs ? dtx(x.moveTs) : ''}</span></div>
                </div>
              ))}
            </div>
          ) : <Empty>ما اكو {a.tab === 'edit' ? 'تعديلات' : 'محذوفات'} بهذي الفترة</Empty>}
        </Card>
      </div>
    </Shell>
  )
}
