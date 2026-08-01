import { useState, type ReactElement } from 'react'
import { router } from '@inertiajs/react'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { DataTable } from '@/Components/common/DataTable'
import { Money } from '@/Components/common/Money'
import { Button } from '@/Components/ui/button'
import { Label } from '@/Components/ui/label'
import { Input } from '@/Components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { DateRangePicker } from '@/Components/common/DateRangePicker'
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
    case 'signed_number': {
      const n = Number(value)
      return <span className={`tabular-nums ${n < 0 ? 'text-danger' : n > 0 ? 'text-success' : ''}`}>{n > 0 ? '+' : ''}{value}</span>
    }
    case 'date':
      return new Date(String(value)).toLocaleDateString('id-ID')
    case 'datetime':
      return new Date(String(value)).toLocaleString('id-ID')
    default:
      return String(value)
  }
}

function humanizeKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
}

export default function Show({ reportKey, title, filterDefs, columns, rows, summary, filters, outlets, products }: ReportsShowProps) {
  const [form, setForm] = useState<Record<string, string>>(filters)
  const [exporting, setExporting] = useState(false)

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
        headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': xsrfToken() },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.message ?? 'Gagal mengekspor laporan.')
        return
      }

      if (data.status === 'ready') {
        window.open(data.downloadUrl, '_blank')
        toast.success(`Ekspor selesai (${data.rowCount} baris).`)
      } else if (data.status === 'queued') {
        toast.success(data.message)
      }
    } catch {
      toast.error('Gagal mengekspor laporan.')
    } finally {
      setExporting(false)
    }
  }

  const columnDefs: ColumnDef<ReportRow, unknown>[] = columns.map((col) => ({
    id: col.key,
    header: col.label,
    cell: ({ row }) => formatValue(row.original[col.key] ?? null, col.type),
  }))

  const summaryEntries = Object.entries(summary).filter(([, v]) => typeof v !== 'object' || v === null)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={title}
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Laporan', href: route('admin.reports.index') }, { label: title }]}
        actions={<Button onClick={exportExcel} disabled={exporting}>{exporting ? 'Mengekspor…' : 'Ekspor Excel'}</Button>}
      />

      <div className="flex flex-wrap items-end gap-3">
        {hasDateRange && (
          <div className="space-y-1.5">
            <Label>Rentang Tanggal</Label>
            <DateRangePicker
              value={form.date_from || form.date_to ? { from: form.date_from ? new Date(form.date_from) : undefined, to: form.date_to ? new Date(form.date_to) : undefined } : undefined}
              onChange={(range) => setForm((prev) => ({ ...prev, date_from: range?.from ? range.from.toISOString().slice(0, 10) : '', date_to: range?.to ? range.to.toISOString().slice(0, 10) : '' }))}
            />
          </div>
        )}

        {otherFilters.map((f) => {
          if (f.type === 'outlet') {
            return (
              <div key={f.key} className="space-y-1.5">
                <Label>{f.label}</Label>
                <Select value={form[f.key] || 'all'} onValueChange={(v) => setForm((prev) => ({ ...prev, [f.key]: v === 'all' ? '' : v }))}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Semua outlet" /></SelectTrigger>
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
              <div key={f.key} className="space-y-1.5">
                <Label>{f.label}</Label>
                <Select value={form[f.key] || ''} onValueChange={(v) => setForm((prev) => ({ ...prev, [f.key]: v }))}>
                  <SelectTrigger className="w-64"><SelectValue placeholder="Pilih produk" /></SelectTrigger>
                  <SelectContent>
                    {products.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.sku} — {p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )
          }

          if (f.type === 'number') {
            return (
              <div key={f.key} className="space-y-1.5">
                <Label>{f.label}</Label>
                <Input type="number" className="w-40" value={form[f.key] ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))} />
              </div>
            )
          }

          return null
        })}

        <Button variant="outline" onClick={applyFilters}>Terapkan Filter</Button>
      </div>

      {summaryEntries.length > 0 && (
        <div className="flex flex-wrap gap-4 rounded-md bg-bg p-3 text-sm">
          {summaryEntries.map(([key, value]) => (
            <div key={key}>
              <span className="text-content-muted">{humanizeKey(key)}: </span>
              <span className="font-mono font-semibold tabular-nums">{typeof value === 'number' ? new Intl.NumberFormat('id-ID').format(value) : String(value)}</span>
            </div>
          ))}
        </div>
      )}

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
  )
}

Show.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
