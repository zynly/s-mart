import { useState, type ReactElement } from 'react'
import { router } from '@inertiajs/react'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { FileText, FileSpreadsheet, Printer, Download, CheckCircle2, Building2, Filter, Calendar, Package } from 'lucide-react'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { DataTable } from '@/Components/common/DataTable'
import { Money } from '@/Components/common/Money'
import { Button } from '@/Components/ui/button'
import { Label } from '@/Components/ui/label'
import { Input } from '@/Components/ui/input'
import { Badge } from '@/Components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog'
import { DateRangePicker } from '@/Components/common/DateRangePicker'
import { formatDate, formatDateTime } from '@/Lib/date'
import { cn } from '@/Lib/utils'
import type { Paginated } from '@/Types'

type FilterDef = { key: string; label: string; type: string }
type ColumnDefinition = { key: string; label: string; type: string; hideWithoutCost?: boolean }
type Ref = { id: number; name: string }
type ProductRef = { id: number; name: string; sku: string }
type ReportRow = Record<string, string | number | null>

type ReportsShowProps = {
  reportKey: string
  title: string
  filterDefs: FilterDef[]
  columns: ColumnDefinition[]
  rows: Paginated<ReportRow>
  summary: Record<string, unknown>
  filters: Record<string, string>
  outlets: Ref[]
  cashiers: Ref[]
  products: ProductRef[]
  canExport: boolean
}

function xsrfToken(): string {
  return decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '')
}

function formatValue(value: string | number | null, type: string) {
  if (value === null || value === undefined || value === '') return '—'

  switch (type) {
    case 'money':
      return <Money amount={Number(value)} size="sm" />
    case 'signed_money':
      return <Money amount={Number(value)} size="sm" showSign />
    case 'number':
      return <span className="tabular-nums">{value}</span>
    case 'date':
      return formatDate(String(value))
    case 'datetime':
      return formatDateTime(String(value))
    default:
      return String(value)
  }
}

function formatValueRaw(value: string | number | null, type: string): string {
  if (value === null || value === undefined || value === '') return '—'
  if (type === 'money' || type === 'signed_money') {
    return 'Rp ' + new Intl.NumberFormat('id-ID').format(Number(value))
  }
  return String(value)
}

function humanizeKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function Show({ reportKey, title, filterDefs, columns, rows, summary, filters, outlets, products, canExport }: ReportsShowProps) {
  const [exporting, setExporting] = useState(false)
  const [pdfOpen, setPdfOpen] = useState(false)
  const [excelOpen, setExcelOpen] = useState(false)
  const [pageSize, setPageSize] = useState<'A4' | 'F4'>('A4')

  const [form, setForm] = useState<Record<string, string>>({
    date_from: filters.date_from ?? '',
    date_to: filters.date_to ?? '',
    outlet_id: filters.outlet_id ?? '',
    cashier_id: filters.cashier_id ?? '',
    product_id: filters.product_id ?? '',
    min_days: filters.min_days ?? '',
  })

  const hasDateRange = filterDefs.some((f) => f.key === 'date_from') && filterDefs.some((f) => f.key === 'date_to')
  const otherFilters = filterDefs.filter((f) => f.key !== 'date_from' && f.key !== 'date_to')

  function applyFilters() {
    router.get(route('admin.reports.show', reportKey), form, { preserveState: true })
  }

  async function exportExcel() {
    setExporting(true)
    try {
      const res = await fetch(route('admin.reports.export', reportKey), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-XSRF-TOKEN': xsrfToken() },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.message ?? 'Gagal mengekspor laporan.')
        return
      }

      if (data.status === 'ready' && data.downloadUrl) {
        toast.success(`Ekspor ${data.rowCount} baris berhasil — mengunduh berkas…`)
        window.location.href = data.downloadUrl
        setExcelOpen(false)
      } else if (data.status === 'queued') {
        toast.info(data.message)
        setExcelOpen(false)
      }
    } catch {
      toast.error('Gagal mengekspor laporan.')
    } finally {
      setExporting(false)
    }
  }

  const columnDefs: ColumnDef<ReportRow, unknown>[] = columns.map((col) => ({
    id: col.key,
    header: () => <div className="text-center font-bold text-navy-950 uppercase text-xs tracking-wider">{col.label}</div>,
    cell: ({ row }) => <div className="text-center font-sans">{formatValue(row.original[col.key] ?? null, col.type)}</div>,
  }))

  const summaryEntries = Object.entries(summary).filter(([, v]) => typeof v !== 'object' || v === null)

  function setPresetDate(type: 'today' | '7days' | 'thisMonth') {
    const now = new Date()
    let fromStr = ''
    let toStr = now.toISOString().slice(0, 10)

    if (type === 'today') {
      fromStr = toStr
    } else if (type === '7days') {
      const from = new Date()
      from.setDate(now.getDate() - 6)
      fromStr = from.toISOString().slice(0, 10)
    } else if (type === 'thisMonth') {
      const from = new Date(now.getFullYear(), now.getMonth(), 1)
      fromStr = from.toISOString().slice(0, 10)
    }

    const newForm = { ...form, date_from: fromStr, date_to: toStr }
    setForm(newForm)
    router.get(route('admin.reports.show', reportKey), newForm, { preserveState: true })
  }

  function handlePrintPDF() {
    window.print()
  }

  const totalFilterCount = (hasDateRange ? 1 : 0) + otherFilters.length + 1

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={title}
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Laporan', href: route('admin.reports.index') }, { label: title }]}
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={() => setPdfOpen(true)} className="bg-red-600 hover:bg-red-700 font-bold text-white shadow-xs">
              <FileText className="size-4 mr-1.5" />
              <span>Pratinjau PDF</span>
            </Button>
            {canExport && (
              <Button onClick={() => setExcelOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 font-bold text-white shadow-xs">
                <FileSpreadsheet className="size-4 mr-1.5" />
                <span>Ekspor Excel (.xlsx)</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Modern Single-Row Filter Panel */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs print:hidden">
        <div className="flex flex-col md:flex-row items-end justify-between gap-3 w-full">
          {hasDateRange && (
            <div className="space-y-1.5 flex-1 min-w-[210px] w-full">
              <Label className="font-bold text-xs text-navy-900 flex items-center gap-1.5">
                <Calendar className="size-3.5 text-navy-600" />
                <span>Rentang Tanggal</span>
              </Label>
              <DateRangePicker
                className="w-full h-9 bg-white border-slate-200 font-medium"
                value={form.date_from || form.date_to ? { from: form.date_from ? new Date(form.date_from) : undefined, to: form.date_to ? new Date(form.date_to) : undefined } : undefined}
                onChange={(range) => setForm((prev) => ({ ...prev, date_from: range?.from ? range.from.toISOString().slice(0, 10) : '', date_to: range?.to ? range.to.toISOString().slice(0, 10) : '' }))}
              />
            </div>
          )}

          {hasDateRange && (
            <div className="space-y-1.5 flex-initial shrink-0">
              <Label className="font-bold text-xs text-navy-900 opacity-0 pointer-events-none hidden sm:block">Shortcut</Label>
              <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-lg h-9 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setPresetDate('today')}
                  className="rounded-md bg-white px-2.5 h-7 text-xs font-bold text-emerald-700 shadow-2xs hover:bg-emerald-50 transition-all flex items-center"
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={() => setPresetDate('7days')}
                  className="rounded-md bg-white px-2.5 h-7 text-xs font-bold text-emerald-700 shadow-2xs hover:bg-emerald-50 transition-all flex items-center"
                >
                  7 Hari
                </button>
                <button
                  type="button"
                  onClick={() => setPresetDate('thisMonth')}
                  className="rounded-md bg-white px-2.5 h-7 text-xs font-bold text-emerald-700 shadow-2xs hover:bg-emerald-50 transition-all flex items-center"
                >
                  Bulan Ini
                </button>
              </div>
            </div>
          )}

          {otherFilters.map((f) => {
            if (f.type === 'outlet') {
              return (
                <div key={f.key} className="space-y-1.5 flex-1 min-w-[170px] w-full">
                  <Label className="font-bold text-xs text-navy-900 flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-navy-600" />
                    <span>{f.label}</span>
                  </Label>
                  <Select value={form[f.key] || 'all'} onValueChange={(v) => setForm((prev) => ({ ...prev, [f.key]: v === 'all' ? '' : v }))}>
                    <SelectTrigger className="w-full h-9 bg-white border-slate-200 font-medium">
                      <SelectValue placeholder="Semua outlet" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua outlet</SelectItem>
                      {outlets.map((o) => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )
            }

            if (f.type === 'product') {
              return (
                <div key={f.key} className="space-y-1.5 flex-1 min-w-[220px] w-full">
                  <Label className="font-bold text-xs text-navy-900 flex items-center gap-1.5">
                    <Package className="size-3.5 text-navy-600" />
                    <span>{f.label}</span>
                  </Label>
                  <Select value={form[f.key] || ''} onValueChange={(v) => setForm((prev) => ({ ...prev, [f.key]: v }))}>
                    <SelectTrigger className="w-full h-9 bg-white border-slate-200 font-medium">
                      <SelectValue placeholder="Pilih produk" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.sku} — {p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )
            }

            if (f.type === 'number') {
              return (
                <div key={f.key} className="space-y-1.5 flex-1 min-w-[150px] w-full">
                  <Label className="font-bold text-xs text-navy-900">{f.label}</Label>
                  <Input type="number" className="w-full h-9 bg-white border-slate-200" value={form[f.key] ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))} />
                </div>
              )
            }

            return null
          })}

          <div className="flex-initial shrink-0 w-full md:w-auto">
            <Button variant="default" onClick={applyFilters} className="w-full md:w-auto h-9 font-bold bg-navy-900 hover:bg-navy-950 text-white shadow-xs px-6">
              <Filter className="size-3.5 mr-1.5" />
              <span>Terapkan Filter</span>
            </Button>
          </div>
        </div>
      </div>

      {summaryEntries.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {summaryEntries.map(([key, value]) => (
            <div key={key} className="flex flex-1 flex-col justify-center rounded-xl border border-slate-200 bg-white p-4 shadow-xs min-w-[130px]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-content-muted">{humanizeKey(key)}</span>
              <span className="mt-1 font-mono text-xl font-extrabold text-navy-950 tabular-nums">
                {typeof value === 'number' ? new Intl.NumberFormat('id-ID').format(value) : String(value)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <DataTable
          columns={columnDefs}
          data={rows.data}
          getRowId={(row) => Object.values(row).join('|')}
          emptyDescription={filterDefs.some((f) => f.type === 'product') && !form.product_id ? 'Pilih produk terlebih dahulu.' : undefined}
          pagination={{
            page: rows.current_page,
            perPage: rows.per_page,
            total: rows.total,
            onPageChange: (page) => router.get(route('admin.reports.show', reportKey), { ...form, page }, { preserveState: true }),
          }}
        />
      </div>

      {/* MODAL POP-UP 1: PRATINJAU DOKUMEN PDF */}
      <Dialog open={pdfOpen} onOpenChange={setPdfOpen}>
        <DialogContent className="sm:max-w-5xl max-w-5xl w-full h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-slate-900/60 backdrop-blur-md border-0 shadow-2xl">
          {/* Header Bar Modal */}
          <div className="no-print bg-navy-950 text-white p-4 px-6 flex flex-wrap items-center justify-between gap-3 border-b border-navy-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-red-600 text-white shadow-xs">
                <FileText className="size-5" />
              </div>
              <div>
                <DialogTitle className="font-bold text-base text-white tracking-wide">
                  Pratinjau Cetak PDF Dokumen Laporan
                </DialogTitle>
                <p className="text-xs text-navy-300">Ukuran Kertas Aktif: <strong className="text-amber-400 font-mono">{pageSize}</strong> — Siap cetak / simpan PDF</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Paper Size Selector Buttons */}
              <div className="flex items-center gap-1 rounded-lg bg-navy-900 p-1 border border-navy-800">
                <span className="text-[11px] font-bold text-navy-300 px-2 uppercase tracking-wider">Kertas:</span>
                <button
                  type="button"
                  onClick={() => setPageSize('A4')}
                  className={cn(
                    "px-3 py-1 text-xs font-bold rounded-md transition-all",
                    pageSize === 'A4' ? "bg-amber-400 text-navy-950 shadow-xs scale-105" : "text-navy-200 hover:text-white"
                  )}
                >
                  📄 A4 (21 x 29.7 cm)
                </button>
                <button
                  type="button"
                  onClick={() => setPageSize('F4')}
                  className={cn(
                    "px-3 py-1 text-xs font-bold rounded-md transition-all",
                    pageSize === 'F4' ? "bg-amber-400 text-navy-950 shadow-xs scale-105" : "text-navy-200 hover:text-white"
                  )}
                >
                  📜 F4 / Folio (21.5 x 33 cm)
                </button>
              </div>

              <Button onClick={handlePrintPDF} size="sm" className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 shadow-sm">
                <Printer className="size-4 mr-1.5" />
                <span>Cetak PDF ({pageSize})</span>
              </Button>
            </div>
          </div>

          {/* Body Preview Area (Scrollable Background) */}
          <div className="flex-1 overflow-y-auto bg-slate-300/80 p-6 flex justify-center">
            {/* Printable Document Sheet */}
            <div
              className={cn(
                "print-document-modal w-full bg-white shadow-2xl rounded-none text-slate-900 font-sans flex flex-col justify-between border border-slate-300 transition-all duration-300",
                pageSize === 'A4' ? "max-w-[794px] min-h-[1123px] p-9" : "max-w-[812px] min-h-[1247px] p-10"
              )}
            >
              <div>
                {/* Kop Surat Header */}
                <div className="flex items-center justify-between pb-4 border-b-2 border-slate-900">
                  <div className="flex items-center gap-4">
                    <img src="/logo/logo2.png" alt="Logo Skillage Mart" className="h-14 w-auto object-contain" />
                    <div>
                      <h1 className="text-xl font-extrabold tracking-wide text-navy-950">SKILLAGE MART</h1>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Sistem Kasir Ritel POS &amp; Manajemen Toko</p>
                      <p className="text-xs text-slate-500">Jl. Skill Village Official No. 88 | Telp: (031) 888-9999</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="font-mono text-[10px] border-slate-400 font-bold uppercase tracking-wider bg-slate-50">DOKUMEN RESMI</Badge>
                    <p className="text-[11px] text-slate-500 mt-1">Waktu: {formatDateTime(new Date().toISOString())}</p>
                  </div>
                </div>

                {/* Judul Laporan */}
                <div className="my-6 text-center">
                  <h2 className="text-lg font-extrabold uppercase text-navy-950 tracking-wider underline underline-offset-4 font-sans">{title}</h2>
                  <p className="text-xs font-semibold text-slate-600 mt-1">
                    {form.date_from || form.date_to ? `Periode: ${form.date_from || 'Awal'} s.d. ${form.date_to || 'Hari Ini'}` : 'Periode: Seluruh Riwayat Data'}
                  </p>
                </div>

                {/* KPI Summary Grid (Dynamic Auto-Layout Stat Cards) */}
                {summaryEntries.length > 0 && (
                  <div className="my-5 flex flex-wrap items-stretch justify-center gap-3">
                    {summaryEntries.map(([key, value]) => {
                      const isMoneyKey = key.includes('omzet') || key.includes('hpp') || key.includes('margin') || key.includes('laba') || key.includes('kas') || key.includes('total') || key.includes('saldo') || key.includes('piutang') || key.includes('hutang')
                      const displayVal = typeof value === 'number' ? (isMoneyKey ? formatValueRaw(value, 'money') : new Intl.NumberFormat('id-ID').format(value)) : String(value)
                      return (
                        <div key={key} className="flex-1 min-w-[130px] rounded-xl border border-slate-300 bg-slate-50/90 p-3.5 text-center shadow-2xs">
                          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{humanizeKey(key)}</p>
                          <p className="font-mono font-black text-sm text-navy-950 mt-1 tabular-nums">
                            {displayVal}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Document Table */}
                <div className="my-4 overflow-x-auto">
                  <table className="w-full border-collapse border border-slate-300 text-xs">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-400 p-2.5 text-center font-bold text-slate-900 uppercase tracking-wider">No.</th>
                        {columns.map((col) => (
                          <th key={col.key} className="border border-slate-400 p-2.5 text-center font-bold text-slate-900 uppercase tracking-wider">
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.data.length === 0 ? (
                        <tr>
                          <td colSpan={columns.length + 1} className="border border-slate-300 p-6 text-center text-slate-500 italic">
                            Tidak ada data untuk periode laporan ini.
                          </td>
                        </tr>
                      ) : (
                        rows.data.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="border border-slate-300 p-2 text-center font-mono font-semibold text-slate-700">{idx + 1}</td>
                            {columns.map((col) => (
                              <td key={col.key} className="border border-slate-300 p-2 text-center font-sans text-slate-800">
                                {formatValueRaw(row[col.key] ?? null, col.type)}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer Signatures */}
              <div className="mt-12 flex items-end justify-between pt-6 border-t border-slate-200 text-xs text-slate-700">
                <div>
                  <p className="font-semibold text-slate-800">Catatan Sistem:</p>
                  <p className="text-[11px] text-slate-500">Dokumen ini digenerate secara resmi oleh Skillage Mart Retail POS System.</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-slate-800 mb-14">Penanggung Jawab / Admin,</p>
                  <p className="font-bold underline text-slate-900">( ______________________ )</p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL POP-UP 2: EKSPOR EXCEL (.XLSX) */}
      <Dialog open={excelOpen} onOpenChange={setExcelOpen}>
        <DialogContent className="sm:max-w-md max-w-md p-6 rounded-2xl bg-white shadow-2xl border">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="flex items-center gap-2 font-bold text-lg text-navy-950">
              <FileSpreadsheet className="size-5 text-emerald-600" />
              <span>Ekspor Berkas Excel (.xlsx)</span>
            </DialogTitle>
          </DialogHeader>

          <div className="my-3 flex flex-col gap-4">
            <div className="flex items-center gap-3.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
              <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-600 text-white shrink-0 shadow-xs">
                <FileSpreadsheet className="size-6" />
              </div>
              <div>
                <p className="font-bold text-base text-navy-950">{title}</p>
                <p className="text-xs text-emerald-800 mt-0.5 flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                  <span>Microsoft Excel Spreadsheet (.xlsx)</span>
                </p>
              </div>
            </div>

            <div className="space-y-1.5 rounded-xl border bg-slate-50 p-3.5 text-xs text-slate-700">
              <p><strong className="text-navy-950">Total Baris:</strong> {rows.total} baris data tersedia</p>
              <p><strong className="text-navy-950">Filter Tanggal:</strong> {form.date_from || form.date_to ? `${form.date_from || 'Awal'} s/d ${form.date_to || 'Hari Ini'}` : 'Semua Data'}</p>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setExcelOpen(false)} className="font-bold border-slate-300">
              Batal
            </Button>
            <Button onClick={exportExcel} disabled={exporting} className="bg-emerald-600 hover:bg-emerald-700 font-bold text-white shadow-xs">
              <Download className="size-4 mr-1.5" />
              <span>{exporting ? 'Mengekspor…' : 'Unduh Berkas XLSX'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

Show.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
