// الحالة العامة: البيانات (تنقرى من الـ backend بشكل حي) + المستخدم الحالي
import { useSyncExternalStore } from 'react'
import { LS } from '@/config'
import type { Backend } from './backend/types'
import { COLS, type Col, type DB, type Move, type Staff } from './types'

export interface State extends DB {
  allMoves: Move[] // كل الحركات (حتى المحذوفة) — للتعديل والسجل
  loaded: boolean
  user: Staff | null
  online: boolean
  pending: boolean
  denied: boolean // القواعد رفضت الجهاز
}

const empty = (): State => ({
  items: [], locations: [], staff: [], moves: [], allMoves: [], stocktakes: [], audit: [], suppliers: [], invoices: [], payments: [],
  loaded: false, user: null, online: navigator.onLine, pending: false, denied: false,
})

let S: State = empty()
let B: Backend
const subs = new Set<() => void>()
const emit = () => subs.forEach(f => f())
const set = (patch: Partial<State>) => { S = { ...S, ...patch }; emit() }

export const getState = () => S
export const backend = () => B
export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(cb => { subs.add(cb); return () => subs.delete(cb) }, () => sel(S))
}

const SESSION = `${LS}session`
let unsubs: (() => void)[] = []

export function init(b: Backend) {
  B = b
  window.addEventListener('online', () => set({ online: true }))
  window.addEventListener('offline', () => set({ online: false }))
  b.onPending(p => set({ pending: p }))
}

export function startData() {
  stopData()
  S = { ...empty(), online: navigator.onLine }
  const loaded = new Set<Col>()
  const saved = localStorage.getItem(SESSION)
  unsubs = COLS.map(c => B.watch(c, rows => {
    const patch: Partial<State> = {}
    if (c === 'moves') {
      const all = (rows as Move[]).slice().sort((a, b) => a.ts - b.ts)
      patch.allMoves = all
      patch.moves = all.filter(m => !m.deleted)
    } else (patch as Record<string, unknown>)[c] = rows
    if (c === 'staff') {
      const staff = rows as Staff[]
      const id = S.user?.id || saved
      const u = id ? staff.find(s => s.id === id && s.active !== false) : undefined
      patch.user = u || null
      if (!u) localStorage.removeItem(SESSION)
    }
    loaded.add(c)
    if (loaded.size === COLS.length) patch.loaded = true
    set(patch)
  }, e => {
    console.error(c, e)
    if (e.code === 'permission-denied') { stopData(); set({ denied: true }) }
  }))
}
export function stopData() { unsubs.forEach(u => u()); unsubs = [] }

export function login(u: Staff) { localStorage.setItem(SESSION, u.id); set({ user: u }) }
export function logout() { localStorage.removeItem(SESSION); set({ user: null }) }

// صلاحيات
export const isAdmin = (s: State = S) => s.user?.role === 'admin'
export const canEdit = (s: State = S) => isAdmin(s) || s.user?.canEdit === true
