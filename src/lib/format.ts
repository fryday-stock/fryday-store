// تنسيق الأرقام والتواريخ (أرقام إنكليزية مثل النظام القديم)
export const r3 = (n: unknown) => Math.round((Number(n) || 0) * 1000) / 1000
export const fmt = (n: unknown, d = 3) => (Math.round((Number(n) || 0) * 10 ** d) / 10 ** d).toLocaleString('en-US', { maximumFractionDigits: d })
export const money = (n: unknown) => Math.round(Number(n) || 0).toLocaleString('en-US')
export const pad = (n: number) => String(n).padStart(2, '0')
export function today() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
export const monthStart = () => today().slice(0, 8) + '01'
export const dayStartTs = (s: string) => new Date(s + 'T00:00:00').getTime()
export const dayEndTs = (s: string) => new Date(s + 'T23:59:59.999').getTime()
export const dateOf = (ts: number) => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
export const timeOf = (ts: number) => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}` }
export const dt = (ts: number) => `${dateOf(ts)} ${timeOf(ts)}`
/** تاريخ (YYYY-MM-DD) ← ts: اليوم = الوقت الحالي، غير يوم = الظهر */
export const dateTs = (d: string) => (d === today() ? Date.now() : new Date(d + 'T12:00:00').getTime())
export const dayLabel = (ts: number) => {
  const d = dateOf(ts), t = today()
  if (d === t) return 'اليوم'
  const y = new Date(); y.setDate(y.getDate() - 1)
  if (d === dateOf(y.getTime())) return 'أمس'
  return d
}
export const longDay = () => new Date().toLocaleDateString('ar-IQ-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' })

// نصوص
export const normTxt = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim()
export const normKey = (v: unknown) => normTxt(v).replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase()
export const toNum = (v: unknown): number | null => {
  if (v === '' || v == null) return null
  const n = Number(String(v).replace(/[,\s]/g, '').replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))))
  return Number.isFinite(n) ? n : NaN
}
/** يقبل أرقام عربية وفواصل بالحقول */
export const parseNum = (v: unknown) => { const n = toNum(v); return n == null || Number.isNaN(n) ? 0 : n }

export async function hashPin(staffName: string, pin: string) {
  const s = 'fstore|' + staffName + '|' + pin
  if (crypto?.subtle) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('')
  }
  return 'p:' + s
}
/** عزل نص LTR (تواريخ، أرقام) داخل نص عربي حتى ما ينقلب ترتيبه */
export const ltr = (s: unknown) => '⁦' + String(s ?? '') + '⁩'
export const dtx = (ts: number) => ltr(dt(ts))
