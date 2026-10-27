// صور الفواتير: أزرار الكاميرا والمعرض + مصغّرات + عارض بالتكبير (أصابع، عجلة الماوس، أزرار)
import { Camera, ImagePlus, Loader2, Minus, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState, type PointerEvent as RPE } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { PendingImage } from '@/lib/actions'
import { compressImage } from '@/lib/image'
import { cn } from '@/lib/utils'
import { Btn } from './kit'

export function PickButtons({ onAdd, busy }: { onAdd: (imgs: PendingImage[]) => void; busy?: boolean }) {
  const cam = useRef<HTMLInputElement>(null), gal = useRef<HTMLInputElement>(null)
  const [working, setWorking] = useState(0)
  const handle = async (files: FileList | null) => {
    if (!files?.length) return
    const list = [...files].filter(f => f.type.startsWith('image/'))
    setWorking(list.length)
    const out: PendingImage[] = []
    for (const f of list) {
      try { out.push(await compressImage(f)) } catch (e) { toast.error('تعذّر قراءة صورة: ' + (e as Error).message) }
      setWorking(n => n - 1)
    }
    if (out.length) onAdd(out)
  }
  return (
    <div className="flex gap-2">
      <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={e => { handle(e.target.files); e.target.value = '' }} />
      <input ref={gal} type="file" accept="image/*" multiple hidden onChange={e => { handle(e.target.files); e.target.value = '' }} />
      <Btn tone="soft" onClick={() => cam.current?.click()} disabled={busy || working > 0}><Camera />الكاميرا</Btn>
      <Btn tone="soft" onClick={() => gal.current?.click()} disabled={busy || working > 0}>{working > 0 ? <Loader2 className="animate-spin" /> : <ImagePlus />}{working > 0 ? 'جاري الضغط…' : 'المعرض'}</Btn>
    </div>
  )
}

export function Thumbs({ images, onOpen, onRemove, loading }: { images: { data: string; bytes: number; key: string; pending?: boolean }[]; onOpen: (i: number) => void; onRemove?: (i: number) => void; loading?: boolean }) {
  if (loading) return <div className="flex h-28 items-center gap-2 text-muted-foreground"><Loader2 className="size-5 animate-spin" />جاري تحميل الصور…</div>
  if (!images.length) return <p className="text-sm text-muted-foreground">ما اكو صور. صوّر الوصل بالكاميرا أو اختاره من المعرض.</p>
  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {images.map((im, i) => (
        <div key={im.key} className="relative shrink-0">
          <button type="button" onClick={() => onOpen(i)} aria-label={`فتح الصورة ${i + 1}`} className="block h-28 w-24 overflow-hidden rounded-xl border bg-secondary">
            <img src={im.data} alt="" className="size-full object-cover" loading="lazy" />
          </button>
          <span className="num pointer-events-none absolute start-1 bottom-1 rounded bg-black/60 px-1.5 text-[10px] text-white">{Math.round(im.bytes / 1024)}KB{im.pending ? ' · جديدة' : ''}</span>
          {onRemove && <button type="button" onClick={() => onRemove(i)} aria-label="شيل الصورة" className="absolute -end-3 -top-3 grid size-12 place-items-center rounded-full border-4 border-card bg-destructive text-white shadow"><Trash2 className="size-4" /></button>}
        </div>
      ))}
    </div>
  )
}

/** عارض بالتكبير */
export function Viewer({ images, index, onClose, title }: { images: string[]; index: number; onClose: () => void; title?: string }) {
  const [i, setI] = useState(index)
  const [z, setZ] = useState({ s: 1, x: 0, y: 0 })
  const pts = useRef(new Map<number, { x: number; y: number }>())
  const start = useRef<{ d: number; s: number; x: number; y: number; px: number; py: number } | null>(null)
  useEffect(() => setZ({ s: 1, x: 0, y: 0 }), [i])
  const zoom = (f: number) => setZ(p => { const s = Math.min(6, Math.max(1, p.s * f)); return s === 1 ? { s, x: 0, y: 0 } : { ...p, s } })
  const down = (e: RPE) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const p = [...pts.current.values()]
    start.current = { d: p.length > 1 ? Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) : 0, s: z.s, x: z.x, y: z.y, px: e.clientX, py: e.clientY }
  }
  const move = (e: RPE) => {
    if (!pts.current.has(e.pointerId) || !start.current) return
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const p = [...pts.current.values()], st = start.current
    if (p.length > 1 && st.d) { const d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); setZ(o => ({ ...o, s: Math.min(6, Math.max(1, st.s * d / st.d)) })) }
    else if (z.s > 1) setZ(o => ({ ...o, x: st.x + e.clientX - st.px, y: st.y + e.clientY - st.py }))
  }
  const up = (e: RPE) => { pts.current.delete(e.pointerId); start.current = null; if (z.s <= 1.02) setZ({ s: 1, x: 0, y: 0 }) }
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent showCloseButton={false} className="flex h-[100dvh] max-h-none w-screen max-w-none flex-col gap-0 rounded-none border-0 bg-black p-0 text-white sm:max-w-none">
        <DialogTitle className="sr-only">{title || 'صورة الفاتورة'}</DialogTitle><DialogDescription className="sr-only">قرّب بإصبعين أو بالأزرار</DialogDescription>
        <div className="flex items-center gap-2 bg-black/80 p-2">
          <button onClick={onClose} aria-label="إغلاق" className="grid size-12 place-items-center rounded-full hover:bg-white/10"><X className="size-6" /></button>
          <span className="flex-1 truncate text-sm">{title} — {i + 1} / {images.length}</span>
          <button onClick={() => zoom(1 / 1.5)} aria-label="تصغير" className="grid size-12 place-items-center rounded-full hover:bg-white/10"><Minus className="size-6" /></button>
          <span className="num w-12 text-center text-sm">{Math.round(z.s * 100)}%</span>
          <button onClick={() => zoom(1.5)} aria-label="تكبير" className="grid size-12 place-items-center rounded-full hover:bg-white/10"><Plus className="size-6" /></button>
          <button onClick={() => setZ({ s: 1, x: 0, y: 0 })} aria-label="إرجاع" className="grid size-12 place-items-center rounded-full hover:bg-white/10"><RotateCcw className="size-5" /></button>
        </div>
        <div className="relative flex-1 touch-none overflow-hidden" style={{ height: 'calc(100dvh - 64px - 72px)' }}
          onWheel={e => zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15)} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
          onDoubleClick={() => setZ(p => (p.s > 1 ? { s: 1, x: 0, y: 0 } : { s: 2.5, x: 0, y: 0 }))}>
          <img src={images[i]} alt={`صورة ${i + 1}`} draggable={false} className="absolute inset-0 m-auto max-h-full max-w-full select-none"
            style={{ transform: `translate(${z.x}px, ${z.y}px) scale(${z.s})`, transition: start.current ? 'none' : 'transform .15s' }} />
        </div>
        {images.length > 1 && (
          <div className="flex justify-center gap-2 overflow-x-auto bg-black/80 p-2">
            {images.map((src, n) => <button key={n} onClick={() => setI(n)} aria-label={`صورة ${n + 1}`} className={cn('size-14 shrink-0 overflow-hidden rounded-lg border-2', n === i ? 'border-accent' : 'border-transparent opacity-60')}><img src={src} alt="" className="size-full object-cover" /></button>)}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
