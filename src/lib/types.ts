// نموذج البيانات (نفس مجموعات Firestore)
export type MoveType = 'opening' | 'in' | 'out' | 'transfer' | 'waste' | 'return' | 'adjust'
export type Role = 'admin' | 'staff'
export type PayMode = 'paid' | 'credit' | 'partial'
export type PayMethod = 'cash' | 'transfer'

export interface Doc { id: string }

export interface EditMeta {
  lastAuditId?: string
  editCount?: number
  editedBy?: string
  editedAt?: number
  deleted?: boolean
  deletedBy?: string
  deletedAt?: number
}

export interface Item extends Doc {
  name: string
  group: string
  baseUnit: string
  bigUnit: string
  pack: number
  minQty: number
  active: boolean
  created?: number
}

export interface Location extends Doc { name: string; order: number; active: boolean }

export interface Staff extends Doc {
  name: string
  role: Role
  pinHash: string
  canEdit: boolean
  active: boolean
  created?: number
}

export interface Move extends Doc, EditMeta {
  ts: number
  type: MoveType
  itemId: string
  itemName: string
  unit: string
  qty: number
  factor: number
  baseQty: number
  baseUnit: string
  price: number
  cost: number
  fromLoc: string
  toLoc: string
  reason: string
  ref: string
  note: string
  staffId: string
  staffName: string
  // حركات الفاتورة
  invoiceId?: string
  supplierId?: string
  supplierName?: string
  invPrice?: number
  extra?: number
}

export interface Supplier extends Doc { name: string; phone: string; note: string; active: boolean; created?: number }

export interface InvLine {
  moveId: string
  itemId: string
  itemName: string
  unit: string
  qty: number
  factor: number
  baseQty: number
  baseUnit: string
  price: number
  total: number
  share: number
  cost: number
}

export interface Invoice extends Doc, EditMeta {
  ts: number
  date: string
  supplierId: string
  supplierName: string
  ref: string
  locId: string
  note: string
  lines: InvLine[]
  subtotal: number
  transport: number
  loading: number
  discount: number
  total: number
  payMode: PayMode
  paid: number
  moveIds: string[]
  imageCount?: number
  staffId: string
  staffName: string
}

/** صورة فاتورة: وثيقة منفصلة بمجموعة invoiceImages (مو داخل الفاتورة) */
export interface InvoiceImage extends Doc, EditMeta {
  ts: number
  invoiceId: string
  supplierId: string
  data: string // data:image/jpeg;base64,...
  w: number
  h: number
  bytes: number
  staffId: string
  staffName: string
}

export interface Payment extends Doc, EditMeta {
  ts: number
  date: string
  supplierId: string
  supplierName: string
  amount: number
  method: PayMethod
  note: string
  staffId: string
  staffName: string
}

export interface Audit extends Doc {
  ts: number
  action: 'edit' | 'delete'
  kind?: 'invoice' | 'payment' | 'image'
  moveId?: string
  moveType?: MoveType
  itemId?: string
  itemName?: string
  invoiceId?: string
  paymentId?: string
  imageId?: string
  supplierName?: string
  ref?: string
  moveTs: number
  moveStaff: string
  by: string
  byId: string
  why: string
  changed?: string[]
  summary?: string[]
  before?: Record<string, unknown>
  after?: Record<string, unknown>
}

export interface Stocktake extends Doc {
  ts: number
  locId: string
  staffId: string
  staffName: string
  counted: number
  diffs: number
  shortValue: number
  overValue: number
  lines: { itemId: string; itemName: string; book: number; counted: number; variance: number; value: number }[]
}

export interface DB {
  items: Item[]
  locations: Location[]
  staff: Staff[]
  moves: Move[]
  stocktakes: Stocktake[]
  audit: Audit[]
  suppliers: Supplier[]
  invoices: Invoice[]
  payments: Payment[]
}
export type Col = keyof DB
export type AnyCol = Col | 'invoiceImages'
// المجموعات اللي تنراقب وتنحمّل كاملة. الصور ما تنحمّل إلا عند فتح الفاتورة
export const COLS: Col[] = ['items', 'locations', 'staff', 'moves', 'stocktakes', 'audit', 'suppliers', 'invoices', 'payments']

export type Op =
  | { type: 'set'; col: AnyCol; id: string; data: Record<string, unknown> }
  | { type: 'update'; col: AnyCol; id: string; data: Record<string, unknown> }
