import type { AnyCol, Col, InvoiceImage, Op } from '../types'

export interface Backend {
  mode: 'local' | 'firebase'
  authed(): boolean
  signIn(email: string, pass: string): Promise<void>
  signOut(): Promise<void>
  watch(col: Col, cb: (rows: unknown[]) => void, onErr?: (e: { code?: string; message: string }) => void): () => void
  add(col: AnyCol, data: Record<string, unknown>): Promise<string>
  update(col: AnyCol, id: string, patch: Record<string, unknown>): Promise<void>
  remove(col: AnyCol, id: string): Promise<void>
  batch(ops: Op[]): Promise<void>
  newId(): string
  /** صور فاتورة وحدة (تنجاب عند الحاجة فقط) */
  images(invoiceId: string): Promise<InvoiceImage[]>
  /** هل اكو كتابات ما ترفعت بعد (بدون إنترنت) */
  onPending(cb: (pending: boolean) => void): () => void
}
