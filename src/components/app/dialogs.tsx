// نوافذ منبثقة تنفتح بأمر (بدون ما كل شاشة تحتاج state خاص)
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { UserError } from '@/lib/actions'
import { cn } from '@/lib/utils'
import { Btn, Field } from './kit'

type Entry = { id: number; title: ReactNode; desc?: ReactNode; wide?: boolean; body: (done: (v: unknown) => void) => ReactNode; resolve: (v: unknown) => void }
let stack: Entry[] = []
let seq = 0
const subs = new Set<() => void>()
const emit = () => subs.forEach(f => f())

export function openDialog<T>(o: { title: ReactNode; desc?: ReactNode; wide?: boolean; body: (done: (v: T | undefined) => void) => ReactNode }): Promise<T | undefined> {
  return new Promise(resolve => {
    stack = [...stack, { ...o, id: ++seq, body: o.body as Entry['body'], resolve: resolve as (v: unknown) => void }]
    emit()
  })
}
const closeTop = (id: number, v?: unknown) => {
  const e = stack.find(x => x.id === id)
  stack = stack.filter(x => x.id !== id); emit()
  e?.resolve(v)
}

export function DialogHost() {
  const list = useSyncExternalStore(cb => { subs.add(cb); return () => subs.delete(cb) }, () => stack)
  return <>{list.map(e => (
    <Dialog key={e.id} open onOpenChange={o => !o && closeTop(e.id)}>
      <DialogContent className={cn(e.wide && 'sm:max-w-3xl')} onOpenAutoFocus={ev => { const t = (ev.currentTarget as HTMLElement)?.querySelector('[data-autofocus]') as HTMLElement | null; if (t) { ev.preventDefault(); t.focus() } }}>
        <DialogHeader><DialogTitle className="text-xl">{e.title}</DialogTitle>{e.desc ? <DialogDescription>{e.desc}</DialogDescription> : <DialogDescription className="sr-only">نافذة</DialogDescription>}</DialogHeader>
        {e.body(v => closeTop(e.id, v))}
      </DialogContent>
    </Dialog>
  ))}</>
}

/** يشغّل عملية ويطلع رسالة الخطأ بشكل مفهوم */
export async function run<T>(fn: () => Promise<T>, okMsg?: string | ((r: T) => string)): Promise<T | undefined> {
  try {
    const r = await fn()
    if (okMsg) toast.success(typeof okMsg === 'function' ? okMsg(r) : okMsg)
    return r
  } catch (e) {
    if (!(e instanceof UserError)) console.error(e)
    toast.error(e instanceof UserError ? e.message : 'ما انحفظت: ' + ((e as Error).message || e))
    return undefined
  }
}

/** زر حفظ يتعطّل وقت الحفظ */
export function SaveBtn({ onClick, children, tone = 'grad', size = 'md', className }: { onClick: () => Promise<unknown>; children: ReactNode; tone?: 'grad' | 'danger' | 'outline'; size?: 'md' | 'lg'; className?: string }) {
  const [busy, setBusy] = useState(false)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  return <Btn tone={tone} size={size} className={className} disabled={busy} onClick={async () => { setBusy(true); try { await onClick() } finally { if (alive.current) setBusy(false) } }}>{children}</Btn>
}

export function confirmBox(text: ReactNode, okLabel = 'تأكيد', danger = false) {
  return openDialog<boolean>({
    title: 'تأكيد',
    body: done => <>
      <div className="text-[15px] leading-relaxed">{text}</div>
      <DialogFooter><Btn tone={danger ? 'danger' : 'grad'} onClick={() => done(true)} data-autofocus>{okLabel}</Btn><Btn tone="outline" onClick={() => done(false)}>إلغاء</Btn></DialogFooter>
    </>,
  }).then(v => v === true)
}

function WhyForm({ label, ph, ok, danger, info, done }: { label: string; ph: string; ok: string; danger?: boolean; info?: ReactNode; done: (v: string | undefined) => void }) {
  const [v, setV] = useState('')
  const submit = () => { if (!v.trim()) return toast.error('اكتب السبب'); done(v.trim()) }
  return <>
    {info}
    <Field label={label} req><Input data-autofocus value={v} onChange={e => setV(e.target.value)} placeholder={ph} onKeyDown={e => e.key === 'Enter' && submit()} /></Field>
    <DialogFooter><Btn tone={danger ? 'danger' : 'grad'} onClick={submit}>{ok}</Btn><Btn tone="outline" onClick={() => done(undefined)}>إلغاء</Btn></DialogFooter>
  </>
}
/** يطلب سبب إجباري (للتعديل والحذف) */
export function askWhy(o: { title: string; label?: string; ph?: string; ok?: string; danger?: boolean; info?: ReactNode }) {
  return openDialog<string>({
    title: o.title,
    body: done => <WhyForm label={o.label || 'السبب'} ph={o.ph || 'مثلاً: انكتب غلط'} ok={o.ok || 'متابعة'} danger={o.danger} info={o.info} done={done} />,
  }).then(v => v || '')
}
