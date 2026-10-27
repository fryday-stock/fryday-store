// ضغط صورة الفاتورة بالمتصفح لحوالي 250KB (JPEG) قبل الحفظ بـ Firestore
import type { PendingImage } from './actions'

export const TARGET_BYTES = 250 * 1024
const MAX_SIDE = 1800

const bytesOf = (dataUrl: string) => Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 3 / 4)

async function loadImage(file: Blob): Promise<{ w: number; h: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void }> {
  if ('createImageBitmap' in window) {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
      return { w: bmp.width, h: bmp.height, draw: (c, w, h) => c.drawImage(bmp, 0, 0, w, h) }
    } catch { /* نجرب الطريقة الثانية */ }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('ملف الصورة غير صالح')); i.src = url })
    return { w: img.naturalWidth, h: img.naturalHeight, draw: (c, w, h) => c.drawImage(img, 0, 0, w, h) }
  } finally { setTimeout(() => URL.revokeObjectURL(url), 1000) }
}

export async function compressImage(file: Blob, target = TARGET_BYTES): Promise<PendingImage> {
  const src = await loadImage(file)
  let scale = Math.min(1, MAX_SIDE / Math.max(src.w, src.h))
  const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d')!
  for (let round = 0; round < 6; round++) {
    const w = Math.max(1, Math.round(src.w * scale)), h = Math.max(1, Math.round(src.h * scale))
    canvas.width = w; canvas.height = h
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h)
    src.draw(ctx, w, h)
    // بحث ثنائي على الجودة
    let lo = 0.35, hi = 0.92, best = ''
    for (let i = 0; i < 7; i++) {
      const q = (lo + hi) / 2, d = canvas.toDataURL('image/jpeg', q)
      if (bytesOf(d) <= target) { best = d; lo = q } else hi = q
    }
    if (best) return { data: best, w, h, bytes: bytesOf(best) }
    scale *= 0.75 // ما وصلت للحجم حتى بأقل جودة: نصغّر الأبعاد
  }
  const d = canvas.toDataURL('image/jpeg', 0.35)
  return { data: d, w: canvas.width, h: canvas.height, bytes: bytesOf(d) }
}
