// تنقّل بسيط بالـ hash (#/stock/item/id) حتى زر الرجوع بالمتصفح والموبايل يشتغل
import { useSyncExternalStore } from 'react'

const read = () => (location.hash.replace(/^#/, '') || '/home').split('?')[0]
let path = read()
const subs = new Set<() => void>()
window.addEventListener('hashchange', () => { path = read(); subs.forEach(f => f()); window.scrollTo(0, 0) })

export function useRoute() {
  const p = useSyncExternalStore(cb => { subs.add(cb); return () => subs.delete(cb) }, () => path)
  return p.split('/').filter(Boolean)
}
export function nav(to: string, replace = false) {
  const h = '#' + to
  if (replace) history.replaceState(null, '', h); else if (location.hash !== h) location.hash = h
  if (replace) { path = read(); subs.forEach(f => f()) }
}
export const back = (fallback: string) => (history.length > 1 ? history.back() : nav(fallback))
