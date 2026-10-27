// تفعيل الجهاز (حساب المطعم) + أول تشغيل (إنشاء المدير) + دخول الموظف
import { KeyRound, LogIn, ShieldCheck } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Btn, Field, GRAD } from '@/components/app/kit'
import { logo } from '@/components/app/Shell'
import { CONFIG } from '@/config'
import { byName } from '@/lib/calc'
import { hashPin } from '@/lib/format'
import { backend, login, startData, useStore } from '@/lib/store'
import type { Staff } from '@/lib/types'
import { cn } from '@/lib/utils'

function Frame({ sub, children }: { sub: ReactNode; children: ReactNode }) {
  return (
    <div className={cn('grid min-h-dvh place-items-center p-4', GRAD)}>
      <div className="w-full max-w-md rounded-[28px] bg-card p-6 shadow-2xl sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={logo} alt="" className="size-24 rounded-full bg-white shadow-md ring-4 ring-secondary" />
          <h1 className="mt-3 font-heading text-2xl font-bold">{CONFIG.title}</h1>
          <p className="mt-1 text-muted-foreground">{sub}</p>
        </div>
        {children}
        {backend().mode === 'local' && <p className="mt-5 rounded-xl bg-warning-soft px-4 py-2.5 text-center text-sm text-warning">وضع تجربة — البيانات تنحفظ على هذا الجهاز فقط</p>}
      </div>
    </div>
  )
}
const PinInput = (p: { value: string; onChange: (v: string) => void; onEnter?: () => void; autoFocus?: boolean; id?: string }) => (
  <Input id={p.id} type="password" inputMode="numeric" autoComplete="off" maxLength={6} autoFocus={p.autoFocus} value={p.value} placeholder="••••"
    onChange={e => p.onChange(e.target.value.replace(/\D/g, ''))} onKeyDown={e => e.key === 'Enter' && p.onEnter?.()}
    className="h-14 text-center text-2xl tracking-[0.5em]" dir="ltr" />
)

export function DeviceScreen({ err }: { err?: string }) {
  const [email, setEmail] = useState(CONFIG.deviceEmail)
  const [pass, setPass] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(err || '')
  const go = async () => {
    if (!email.trim() || !pass) return toast.error('اكتب الإيميل وكلمة السر')
    setBusy(true); setMsg('')
    try { await backend().signIn(email.trim(), pass); startData() }
    catch (x) {
      const code = (x as { code?: string }).code || ''
      setMsg(/invalid|wrong|not-found|credential/i.test(code) ? 'الإيميل أو كلمة السر غير صحيحة' : /network/i.test(code) ? 'ما اكو إنترنت. التفعيل يحتاج اتصال' : 'تعذّر التفعيل: ' + (code || (x as Error).message))
    } finally { setBusy(false) }
  }
  return (
    <Frame sub="هذا الجهاز غير مفعّل. يفعّله المدير مرة وحدة بحساب المطعم.">
      <div className="space-y-4">
        <Field label="إيميل المطعم"><Input dir="ltr" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" /></Field>
        <Field label="كلمة سر المطعم"><Input dir="ltr" type="password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && go()} autoComplete="current-password" autoFocus /></Field>
        <Btn size="lg" className="w-full" onClick={go} disabled={busy}><ShieldCheck />{busy ? 'جاري التفعيل…' : 'تفعيل الجهاز'}</Btn>
        {msg && <p className="text-center text-sm text-destructive" role="alert">{msg}</p>}
      </div>
    </Frame>
  )
}

export function SetupScreen() {
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const go = async () => {
    const n = name.trim()
    if (!n || !/^\d{4,6}$/.test(pin)) return toast.error('اكتب الاسم ورمز من 4 إلى 6 أرقام')
    setBusy(true)
    try {
      const doc = { name: n, role: 'admin', pinHash: await hashPin(n, pin), canEdit: true, active: true, created: Date.now() }
      const id = await backend().add('staff', doc)
      login({ ...(doc as Omit<Staff, 'id'>), id })
      location.hash = '#/admin/locations'
    } catch (e) { toast.error('ما انحفظ: ' + (e as Error).message) } finally { setBusy(false) }
  }
  return (
    <Frame sub="أول تشغيل: أنشئ حساب المدير">
      <div className="space-y-4">
        <Field label="اسم المدير" req><Input value={name} onChange={e => setName(e.target.value)} placeholder="مثلاً: أحمد" autoFocus /></Field>
        <Field label="رمز سري (4 إلى 6 أرقام)" req><PinInput value={pin} onChange={setPin} onEnter={go} /></Field>
        <Btn size="lg" className="w-full" onClick={go} disabled={busy}><KeyRound />إنشاء والدخول</Btn>
        <p className="text-center text-sm text-muted-foreground">بعدها تضيف المخازن والمواد والموظفين من شاشة الإدارة.</p>
      </div>
    </Frame>
  )
}

export function LoginScreen() {
  const staff = useStore(s => s.staff).filter(s => s.active !== false).sort(byName)
  const [pick, setPick] = useState<Staff | null>(null)
  const [pin, setPin] = useState('')
  const go = async () => {
    if (!pick) return toast.error('اختر اسمك أولاً')
    if (await hashPin(pick.name, pin) !== pick.pinHash) { setPin(''); return toast.error('الرمز غير صحيح') }
    login(pick)
    if (!location.hash || location.hash === '#/') location.hash = '#/home'
  }
  return (
    <Frame sub="اختر اسمك واكتب رمزك">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {staff.map(s => (
          <button key={s.id} onClick={() => { setPick(s); setTimeout(() => document.getElementById('pin')?.focus()) }} aria-pressed={pick?.id === s.id}
            className={cn('min-h-14 rounded-xl border px-3 font-semibold transition', pick?.id === s.id ? cn(GRAD, 'border-transparent text-white shadow') : 'bg-card hover:bg-secondary')}>{s.name}</button>
        ))}
      </div>
      <div className="mt-4 space-y-4">
        <PinInput id="pin" value={pin} onChange={setPin} onEnter={go} />
        <Btn size="lg" className="w-full" onClick={go}><LogIn />دخول</Btn>
      </div>
    </Frame>
  )
}

export function Boot({ text }: { text: string }) {
  return <div className={cn('grid min-h-dvh place-items-center text-white', GRAD)}><div className="flex flex-col items-center gap-4"><img src={logo} alt="" className="size-20 animate-pulse rounded-full bg-white" /><p>{text}</p></div></div>
}
