import { useState, type ReactElement } from 'react'
import { router } from '@inertiajs/react'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { FileText, FileSpreadsheet, Printer, Download, CheckCircle2, Building2, Filter, Calendar, Package, UserCheck, Store } from 'lucide-react'
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
  sessions?: Ref[]
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

export default function Show({ reportKey, title, filterDefs, columns, rows, summary, filters, outlets, cashiers, products, sessions, canExport }: ReportsShowProps) {
  const [exporting, setExporting] = useState(false)
  const [pdfOpen, setPdfOpen] = useState(false)
  const [excelOpen, setExcelOpen] = useState(false)
  const [pageSize, setPageSize] = useState<'A4' | 'F4'>('A4')
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape')

  const [form, setForm] = useState<Record<string, string>>({
    date_from: filters.date_from ?? '',
    date_to: filters.date_to ?? '',
    outlet_id: filters.outlet_id ?? '',
    cashier_id: filters.cashier_id ?? '',
    session_id: filters.session_id ?? '',
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
                <span>Pratinjau &amp; Ekspor Excel</span>
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

            if (f.type === 'user') {
              return (
                <div key={f.key} className="space-y-1.5 flex-1 min-w-[170px] w-full">
                  <Label className="font-bold text-xs text-navy-900 flex items-center gap-1.5">
                    <UserCheck className="size-3.5 text-navy-600" />
                    <span>{f.label}</span>
                  </Label>
                  <Select value={form[f.key] || 'all'} onValueChange={(v) => setForm((prev) => ({ ...prev, [f.key]: v === 'all' ? '' : v }))}>
                    <SelectTrigger className="w-full h-9 bg-white border-slate-200 font-medium">
                      <SelectValue placeholder="Semua kasir" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua kasir</SelectItem>
                      {cashiers.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )
            }

            if (f.type === 'session') {
              return (
                <div key={f.key} className="space-y-1.5 flex-1 min-w-[240px] w-full">
                  <Label className="font-bold text-xs text-navy-900 flex items-center gap-1.5">
                    <Store className="size-3.5 text-amber-600" />
                    <span>{f.label}</span>
                  </Label>
                  <Select value={form[f.key] || 'all'} onValueChange={(v) => setForm((prev) => ({ ...prev, [f.key]: v === 'all' ? '' : v }))}>
                    <SelectTrigger className="w-full h-9 bg-white border-slate-200 font-medium">
                      <SelectValue placeholder="Semua Sesi Kasir" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Sesi Kasir</SelectItem>
                      {(sessions ?? []).map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
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
                <p className="text-xs text-navy-300">Ukuran &amp; Orientasi: <strong className="text-amber-400 font-mono">{pageSize} ({orientation === 'landscape' ? 'Mendatar / Landscape' : 'Tegak / Portrait'})</strong> — Siap cetak / simpan PDF</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Orientation Selector Buttons */}
              <div className="flex items-center gap-1 rounded-lg bg-navy-900 p-1 border border-navy-800">
                <span className="text-[11px] font-bold text-navy-300 px-2 uppercase tracking-wider">Orientasi:</span>
                <button
                  type="button"
                  onClick={() => setOrientation('landscape')}
                  className={cn(
                    "px-3 py-1 text-xs font-bold rounded-md transition-all",
                    orientation === 'landscape' ? "bg-amber-400 text-navy-950 shadow-xs scale-105" : "text-navy-200 hover:text-white"
                  )}
                >
                  🖼️ Landscape (Mendatar)
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation('portrait')}
                  className={cn(
                    "px-3 py-1 text-xs font-bold rounded-md transition-all",
                    orientation === 'portrait' ? "bg-amber-400 text-navy-950 shadow-xs scale-105" : "text-navy-200 hover:text-white"
                  )}
                >
                  📱 Portrait (Tegak)
                </button>
              </div>

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
                  📄 A4
                </button>
                <button
                  type="button"
                  onClick={() => setPageSize('F4')}
                  className={cn(
                    "px-3 py-1 text-xs font-bold rounded-md transition-all",
                    pageSize === 'F4' ? "bg-amber-400 text-navy-950 shadow-xs scale-105" : "text-navy-200 hover:text-white"
                  )}
                >
                  📜 F4 / Folio
                </button>
              </div>

              <Button onClick={handlePrintPDF} size="sm" className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 shadow-sm">
                <Printer className="size-4 mr-1.5" />
                <span>Cetak PDF</span>
              </Button>
            </div>
          </div>

          {/* Body Preview Area (Scrollable Background) */}
          <div className="flex-1 overflow-y-auto bg-slate-300/80 p-6 flex justify-center">
            {/* Inject dynamic print page style for browser print dialog */}
            <style>{`
              @media print {
                @page {
                  size: ${pageSize === 'F4' ? '215mm 330mm' : 'A4'} ${orientation};
                  margin: 8mm;
                }
              }
            `}</style>

            {/* Printable Document Sheet */}
            <div
              className={cn(
                "print-document-modal w-full bg-white shadow-2xl rounded-none text-slate-900 font-sans flex flex-col justify-between border border-slate-300 transition-all duration-300",
                orientation === 'landscape'
                  ? (pageSize === 'A4' ? "max-w-[1123px] min-h-[794px] p-6" : "max-w-[1247px] min-h-[812px] p-7")
                  : (pageSize === 'A4' ? "max-w-[794px] min-h-[1123px] p-9" : "max-w-[812px] min-h-[1247px] p-10")
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

      {/* MODAL POP-UP 2: PRATINJAU & EKSPOR EXCEL (.XLSX) */}
      <Dialog open={excelOpen} onOpenChange={setExcelOpen}>
        <DialogContent className="sm:max-w-6xl max-w-6xl w-full h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-slate-900/60 backdrop-blur-md border-0 shadow-2xl">
          {/* Header Bar Ribbon Excel */}
          <div className="no-print bg-emerald-900 text-white p-4 px-6 flex flex-wrap items-center justify-between gap-3 border-b border-emerald-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                <FileSpreadsheet className="size-5" />
              </div>
              <div>
                <DialogTitle className="font-bold text-base text-white tracking-wide flex items-center gap-2">
                  <span>Pratinjau Lembar Kerja Excel (.xlsx) — {title}</span>
                </DialogTitle>
                <p className="text-xs text-emerald-200">
                  Total <strong className="text-amber-300 font-mono">{rows.total} Baris Data</strong> • Format Sel: <span className="font-mono">Standard XLSX (#,##0)</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-100 bg-emerald-950/60 font-mono text-xs px-3 py-1">
                Microsoft Excel OpenXML (.xlsx)
              </Badge>

              <Button onClick={exportExcel} disabled={exporting} size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-5 shadow-md">
                <Download className="size-4 mr-1.5 fill-current" />
                <span>{exporting ? 'Mengekspor…' : 'Unduh Berkas XLSX'}</span>
              </Button>
            </div>
          </div>

          {/* Excel Preview Body Canvas */}
          <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-900 p-4 flex flex-col justify-between">
            <div className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 shadow-xl rounded-lg overflow-hidden flex flex-col">
              {/* Formula Bar Mockup */}
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 font-mono">
                <span className="font-bold text-slate-400 select-none">fx</span>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <span className="truncate select-none">{title} - {form.date_from || form.date_to ? `${form.date_from || 'Awal'} s.d. ${form.date_to || 'Hari Ini'}` : 'Semua Data'}</span>
              </div>

              {/* Excel Table Canvas */}
              <div className="overflow-auto max-h-[62vh]">
                <table className="w-full border-collapse text-xs select-none">
                  <thead>
                    {/* Column Alphabet Header Row (A, B, C, D...) */}
                    <tr className="bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[11px] font-bold">
                      <th className="border border-slate-300 dark:border-slate-700 px-2 py-1 text-center w-10 bg-slate-300 dark:bg-slate-700">#</th>
                      {columns.map((_, colIdx) => {
                        const letter = String.fromCharCode(65 + (colIdx % 26))
                        const prefix = colIdx >= 26 ? String.fromCharCode(65 + Math.floor(colIdx / 26) - 1) : ''
                        return (
                          <th key={colIdx} className="border border-slate-300 dark:border-slate-700 px-3 py-1 text-center min-w-[120px]">
                            {prefix}{letter}
                          </th>
                        )
                      })}
                    </tr>

                    {/* Data Heading Row (Styled Navy Blue - Matching ReportExport.php) */}
                    <tr className="bg-navy-950 text-white font-extrabold border-b-2 border-navy-800">
                      <td className="border border-navy-900 px-2 py-2.5 text-center font-mono text-amber-400">1</td>
                      {columns.map((col) => (
                        <td key={col.key} className="border border-navy-900 px-3 py-2.5 text-center uppercase tracking-wider text-[11px]">
                          {col.label}
                        </td>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 font-sans">
                    {rows.data.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length + 1} className="p-8 text-center text-slate-400 italic font-medium">
                          Tidak ada data yang cocok dengan filter yang dipilih.
                        </td>
                      </tr>
                    ) : (
                      rows.data.map((row, idx) => (
                        <tr key={idx} className="hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors">
                          {/* Row Number Column */}
                          <td className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-center font-mono font-bold text-slate-500 dark:text-slate-400 text-[10px]">
                            {idx + 2}
                          </td>
                          {columns.map((col) => {
                            const isMoney = col.type === 'money' || col.type === 'signed_money'
                            const rawVal = row[col.key] ?? null
                            return (
                              <td
                                key={col.key}
                                className={cn(
                                  "border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs",
                                  isMoney ? "text-right font-mono font-semibold text-slate-900 dark:text-white" : "text-center text-slate-700 dark:text-slate-300"
                                )}
                              >
                                {formatValueRaw(rawVal, col.type)}
                              </td>
                            )
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Sheet Tabs Footer Mockup */}
              <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1 rounded-t border-t-2 border-t-emerald-600 font-bold text-emerald-700 dark:text-emerald-400 shadow-2xs">
                    <FileSpreadsheet className="size-3.5" />
                    <span>Sheet1 (Laporan)</span>
                  </div>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">Siap diunduh sebagai berkas .xlsx</span>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 bg-slate-900 border-t border-slate-800 shrink-0 flex items-center justify-between">
            <div className="text-xs text-slate-400">
              Menampilkan pratinjau <strong className="text-white">{rows.data.length}</strong> dari <strong className="text-white">{rows.total}</strong> total baris.
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setExcelOpen(false)} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                Tutup
              </Button>
              <Button onClick={exportExcel} disabled={exporting} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5">
                <Download className="size-4 mr-1.5" />
                <span>{exporting ? 'Mengekspor…' : 'Unduh XLSX'}</span>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

Show.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
