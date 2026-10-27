// بيانات وهمية لمعاينة التصاميم فقط (المرحلة الأولى)
export type MockItem = { name: string; group: string; unit: string; big?: string; pack?: number; qty: number; min: number; avg: number; locs: [string, number][] }

export const LOCS = ['المخزن الرئيسي', 'البراد', 'الفريزر', 'رف المطبخ']

export const ITEMS: MockItem[] = [
  { name: 'طماطة', group: 'خضروات', unit: 'كغم', big: 'صندوق', pack: 10, qty: 38, min: 20, avg: 1250, locs: [['البراد', 38]] },
  { name: 'بصل', group: 'خضروات', unit: 'كغم', big: 'كيس', pack: 20, qty: 12, min: 15, avg: 900, locs: [['المخزن الرئيسي', 12]] },
  { name: 'خس', group: 'خضروات', unit: 'حبة', qty: 0, min: 10, avg: 750, locs: [] },
  { name: 'بطاطا مجمدة', group: 'مجمدات', unit: 'كغم', big: 'كرتون', pack: 10, qty: 145, min: 50, avg: 2400, locs: [['الفريزر', 120], ['رف المطبخ', 25]] },
  { name: 'صدر دجاج', group: 'لحوم ودواجن', unit: 'كغم', big: 'كرتون', pack: 15, qty: 64.5, min: 30, avg: 6500, locs: [['الفريزر', 60], ['البراد', 4.5]] },
  { name: 'لحم برگر', group: 'لحوم ودواجن', unit: 'قطعة', big: 'كرتون', pack: 48, qty: 210, min: 96, avg: 1100, locs: [['الفريزر', 210]] },
  { name: 'زيت قلي', group: 'زيوت وصوصات', unit: 'لتر', big: 'دبة', pack: 18, qty: 54, min: 36, avg: 2900, locs: [['المخزن الرئيسي', 54]] },
  { name: 'صوص ثوم', group: 'زيوت وصوصات', unit: 'كغم', big: 'سطل', pack: 5, qty: 7, min: 10, avg: 4200, locs: [['البراد', 7]] },
  { name: 'خبز برگر', group: 'مخبوزات', unit: 'حبة', big: 'كيس', pack: 12, qty: 180, min: 120, avg: 250, locs: [['رف المطبخ', 180]] },
  { name: 'علب سفري كبيرة', group: 'سفري', unit: 'قطعة', big: 'كرتون', pack: 250, qty: 980, min: 500, avg: 140, locs: [['المخزن الرئيسي', 980]] },
  { name: 'أكياس ورق', group: 'سفري', unit: 'قطعة', big: 'شدة', pack: 100, qty: 320, min: 400, avg: 90, locs: [['المخزن الرئيسي', 320]] },
  { name: 'سائل جلي', group: 'منظفات', unit: 'لتر', big: 'دبة', pack: 4, qty: 16, min: 8, avg: 1750, locs: [['المخزن الرئيسي', 16]] },
]

export type MockMove = { time: string; date: string; type: 'in' | 'out' | 'transfer' | 'waste' | 'return'; item: string; qty: string; where: string; staff: string; note?: string }
export const MOVES: MockMove[] = [
  { time: '14:20', date: '2026-10-27', type: 'out', item: 'صدر دجاج', qty: '6 كغم', where: 'الفريزر', staff: 'علي', note: 'صرف للمطبخ' },
  { time: '13:05', date: '2026-10-27', type: 'in', item: 'طماطة', qty: '3 صندوق', where: 'البراد', staff: 'حسين', note: 'علوة الرشيد' },
  { time: '12:40', date: '2026-10-27', type: 'transfer', item: 'بطاطا مجمدة', qty: '2 كرتون', where: 'الفريزر ← رف المطبخ', staff: 'علي' },
  { time: '11:15', date: '2026-10-27', type: 'waste', item: 'خس', qty: '4 حبة', where: 'البراد', staff: 'مرتضى', note: 'تلف / خراب' },
  { time: '10:02', date: '2026-10-27', type: 'out', item: 'زيت قلي', qty: '1 دبة', where: 'المخزن الرئيسي', staff: 'حسين', note: 'صرف للمطبخ' },
  { time: '09:30', date: '2026-10-27', type: 'return', item: 'صوص ثوم', qty: '1 سطل', where: 'البراد', staff: 'علي', note: 'مرتجع' },
]

export const TYPE_LABEL: Record<string, string> = { in: 'وارد', out: 'صرف', transfer: 'نقل', waste: 'تالف', return: 'مرتجع', opening: 'رصيد افتتاحي', adjust: 'تسوية جرد' }

export const INV_LINES = [
  { item: 'صدر دجاج', unit: 'كرتون', qty: 4, price: 95000 },
  { item: 'لحم برگر', unit: 'كرتون', qty: 2, price: 52000 },
  { item: 'زيت قلي', unit: 'دبة', qty: 3, price: 51000 },
]

export const money = (n: number) => Math.round(n).toLocaleString('en-US')
export const qtyFmt = (n: number) => (Math.round(n * 1000) / 1000).toLocaleString('en-US', { maximumFractionDigits: 3 })

export function status(it: MockItem): ['ok' | 'low' | 'out', string] {
  if (it.qty <= 0) return ['out', 'نفذ']
  if (it.qty <= it.min) return ['low', 'دون حد الأمان']
  return ['ok', 'كافٍ']
}

export function detailed(it: MockItem) {
  if (!it.big || !it.pack || it.qty < it.pack) return ''
  const big = Math.floor(it.qty / it.pack), rest = Math.round((it.qty - big * it.pack) * 1000) / 1000
  return `${big} ${it.big}` + (rest ? ` + ${qtyFmt(rest)} ${it.unit}` : '')
}
