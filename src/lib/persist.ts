// حالة واجهة تبقى بين الشاشات (فلاتر، تبويبات، مسودّات) طول ما الصفحة مفتوحة
import { useCallback, useSyncExternalStore } from 'react'

const mem = new Map<string, unknown>()
const subs = new Map<string, Set<() => void>>()

export function getP<T>(key: string, init: T): T { return (mem.get(key) ?? init) as T }
export function setP<T>(key: string, v: T) { mem.set(key, v); subs.get(key)?.forEach(f => f()) }

export function usePersist<T>(key: string, init: T | (() => T)): [T, (v: T | ((p: T) => T)) => void] {
  const ensure = () => { if (mem.get(key) === undefined) mem.set(key, typeof init === 'function' ? (init as () => T)() : init); return mem.get(key) as T }
  ensure()
  const v = useSyncExternalStore(cb => {
    if (!subs.has(key)) subs.set(key, new Set())
    subs.get(key)!.add(cb)
    return () => subs.get(key)!.delete(cb)
  }, ensure)
  const set = useCallback((n: T | ((p: T) => T)) => setP(key, typeof n === 'function' ? (n as (p: T) => T)(mem.get(key) as T) : n), [key])
  return [v, set]
}
