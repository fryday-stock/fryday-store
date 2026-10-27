// تصديرات جاهزة تستخدمها أكثر من شاشة
import { CONFIG } from '@/config'
import { locName, mName } from './calc'
import { TYPES } from './constants'
import { exportSheet } from './excel'
import { dt, today } from './format'
import { getState } from './store'
import type { Move } from './types'

export function exportMoves(list: Move[], label: string, sub = '') {
  const s = getState()
  return exportSheet({
    file: `${label}_${today()}.xlsx`, title: `${CONFIG.title} — ${label}`, sub: `${sub ? sub + '   |   ' : ''}${list.length} حركة   |   بتاريخ ${dt(Date.now())}`,
    headers: ['التاريخ', 'النوع', 'المادة', 'الكمية', 'الوحدة', 'بالوحدة الأساسية', 'الوحدة الأساسية', 'من', 'إلى', 'سعر الوحدة', 'الكلفة', 'المورد / السبب', 'الوصل', 'ملاحظة', 'الموظف'],
    rows: list.map(m => [dt(m.ts), TYPES[m.type]?.label, mName(s, m), m.qty, m.unit, m.baseQty, m.baseUnit, m.fromLoc ? locName(s, m.fromLoc) : '', m.toLoc ? locName(s, m.toLoc) : '', m.price || '', m.cost || '', m.supplierName || m.reason, m.ref, m.note, m.staffName]),
    qty: [3, 5], money: [9, 10], totals: { label: 'المجموع', cols: [10] },
  })
}
