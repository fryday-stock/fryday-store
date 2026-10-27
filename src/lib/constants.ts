import type { MoveType, PayMethod, PayMode } from './types'

export const TYPES: Record<MoveType, { label: string; short: string }> = {
  in: { label: 'وارد', short: 'وارد' },
  out: { label: 'صرف', short: 'صرف' },
  transfer: { label: 'نقل', short: 'نقل' },
  waste: { label: 'تالف', short: 'تالف' },
  return: { label: 'مرتجع للمورد', short: 'مرتجع' },
  opening: { label: 'رصيد افتتاحي', short: 'افتتاحي' },
  adjust: { label: 'تسوية جرد', short: 'تسوية' },
}
export const OUT_REASONS = ['صرف للمطبخ', 'صرف للصالة / البار', 'ضيافة', 'استخدام شخصي (موظفين)', 'أخرى']
export const WASTE_REASONS = ['منتهي الصلاحية', 'تلف / خراب', 'سقوط / كسر', 'خطأ تحضير', 'أخرى']
export const UNITS = ['كغم', 'غم', 'لتر', 'مل', 'قطعة', 'حبة', 'بطل', 'علبة', 'كرتون', 'صندوق', 'كيس', 'شدة', 'ربطة', 'دبة', 'قنينة', 'طبق', 'درزن', 'باكيت', 'رول', 'سطل']
export const PAY_MODES: Record<PayMode, string> = { paid: 'مدفوعة بالكامل', credit: 'آجل', partial: 'دفع جزئي' }
export const PAY_MODES_SHORT: Record<PayMode, string> = { paid: 'كامل', credit: 'آجل', partial: 'جزئي' }
export const PAY_METHODS: Record<PayMethod, string> = { cash: 'كاش', transfer: 'تحويل' }
export const NOGRP = 'بدون مجموعة'
export const needFrom = (t: MoveType) => ['out', 'transfer', 'waste', 'return'].includes(t)
export const needTo = (t: MoveType) => ['in', 'transfer', 'opening'].includes(t)
export const needPrice = (t: MoveType) => ['in', 'opening'].includes(t)
export const needReason = (t: MoveType) => ['out', 'waste'].includes(t)
