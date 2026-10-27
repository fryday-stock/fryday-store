// تصدير إكسل منسّق RTL (xlsx-js-style) — المكتبة تنحمّل بس عند الحاجة
type Row = (string | number | null | undefined)[] | { group: string }
export interface SheetSpec {
  file: string
  title: string
  sub?: string
  headers: string[]
  rows: Row[]
  qty?: number[]
  money?: number[]
  totals?: { label: string; cols: number[] }
}

export const loadXLSX = () => import('xlsx-js-style').then(m => (m as unknown as { default?: typeof m }).default ?? m)

const C = { navy: '1F3B73', blue: '2F6BC9', sky: 'E3F2FC', zebra: 'F5F9FE', line: 'D5DEEA', sub: '5B6B7A', total: 'D9EEFB', totalTop: '0BA5E9' }

export async function exportSheet(o: SheetSpec) {
  const X = await loadXLSX()
  const nC = o.headers.length, enc = X.utils.encode_cell
  const line = { style: 'thin', color: { rgb: C.line } }, border = { top: line, bottom: line, left: line, right: line }
  const font = (x: Record<string, unknown> = {}) => ({ name: 'Arial', sz: 11, ...x })
  const aoa: (string | number)[][] = [[o.title], [o.sub || ''], [], o.headers]
  const kinds = ['title', 'sub', 'blank', 'head']
  for (const r of o.rows) {
    if (Array.isArray(r)) { aoa.push(r.map(v => v ?? '')); kinds.push('row') }
    else { aoa.push([r.group, ...Array(nC - 1).fill('')]); kinds.push('group') }
  }
  const first = 4, last = aoa.length - 1
  if (o.totals) { const t: string[] = Array(nC).fill(''); t[0] = o.totals.label; aoa.push(t); kinds.push('total') }
  const ws = X.utils.aoa_to_sheet(aoa)
  const merges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: nC - 1 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: nC - 1 } }]
  kinds.forEach((k, r) => { if (k === 'group') merges.push({ s: { r, c: 0 }, e: { r, c: nC - 1 } }) })
  ws['!merges'] = merges
  const qty = new Set(o.qty || []), mon = new Set(o.money || [])
  kinds.forEach((k, r) => {
    for (let c = 0; c < nC; c++) {
      const a = enc({ r, c })
      if (!ws[a]) ws[a] = { t: 's', v: '' }
      const cell = ws[a]
      const al = { vertical: 'center', horizontal: qty.has(c) || mon.has(c) ? 'center' : 'right', readingOrder: 2, wrapText: k === 'sub' }
      if (k === 'title') cell.s = { font: font({ sz: 16, bold: true, color: { rgb: C.navy } }), alignment: { horizontal: 'right', readingOrder: 2 } }
      else if (k === 'sub') cell.s = { font: font({ sz: 10, color: { rgb: C.sub } }), alignment: { horizontal: 'right', readingOrder: 2 } }
      else if (k === 'head') cell.s = { font: font({ bold: true, color: { rgb: 'FFFFFF' } }), fill: { fgColor: { rgb: C.blue } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true, readingOrder: 2 }, border }
      else if (k === 'group') cell.s = { font: font({ bold: true, color: { rgb: C.navy } }), fill: { fgColor: { rgb: C.sky } }, alignment: { horizontal: 'right', readingOrder: 2 }, border }
      else if (k === 'row') {
        cell.s = { font: font(), alignment: al, border, ...(r % 2 ? {} : { fill: { fgColor: { rgb: C.zebra } } }) }
        if (cell.t === 'n') cell.z = mon.has(c) ? '#,##0' : '#,##0.###'
      } else if (k === 'total') {
        if (o.totals!.cols.includes(c)) { const col = X.utils.encode_col(c); ws[a] = { t: 'n', f: `SUM(${col}${first + 1}:${col}${last + 1})`, z: '#,##0' } }
        ws[a].s = { font: font({ bold: true, color: { rgb: C.navy } }), fill: { fgColor: { rgb: C.total } }, alignment: { ...al, horizontal: o.totals!.cols.includes(c) ? 'center' : 'right' }, border: { ...border, top: { style: 'medium', color: { rgb: C.totalTop } } } }
      }
    }
  })
  ws['!cols'] = o.headers.map((h, c) => {
    let w = String(h).length
    aoa.slice(4).forEach((row, i) => { if (kinds[i + 4] === 'row') w = Math.max(w, String(row[c] ?? '').length) })
    return { wch: Math.min(Math.max(w + 3, 9), 42) }
  })
  ws['!rows'] = [{ hpt: 26 }, { hpt: 18 }, { hpt: 6 }, { hpt: 30 }]
  const wb = X.utils.book_new()
  wb.Workbook = { Views: [{ RTL: true }] } as typeof wb.Workbook
  X.utils.book_append_sheet(wb, ws, 'البيانات')
  X.writeFile(wb, safeName(o.file))
}

export const safeName = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '_')

export function downloadBlob(name: string, blob: Blob) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = safeName(name)
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 3000)
}
