import { useMemo, useState, type ReactElement } from 'react'
import { router } from '@inertiajs/react'
import type { ColumnDef } from '@tanstack/react-table'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { PageTabs } from '@/Components/common/PageTabs'
import { DataTable } from '@/Components/common/DataTable'
import { Badge } from '@/Components/ui/badge'
import { Input } from '@/Components/ui/input'
import { Button } from '@/Components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import { formatDateTime } from '@/Lib/date'
import type { Paginated } from '@/Types'

type LogRow = {
  id: number
  log_name: string
  description: string
  causer: { id: number; name: string; username: string } | null
  properties: Record<string, unknown>
  created_at: string
}

function humanizeKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

type ActivityLogsIndexProps = {
  tab: string
  logs: Paginated<LogRow>
  logNames: string[]
  filters: { log_name?: string; causer_id?: string; date_from?: string; date_to?: string }
}

export default function Index({ tab, logs, logNames, filters }: ActivityLogsIndexProps) {
  const [logName, setLogName] = useState(filters.log_name ?? '')
  const [dateFrom, setDateFrom] = useState(filters.date_from ?? '')
  const [dateTo, setDateTo] = useState(filters.date_to ?? '')
  const [detailTarget, setDetailTarget] = useState<LogRow | null>(null)

  // Gap G-08: `properties` sudah dikirim backend (tinggal dirender) —
  // untuk event create/update/delete model, Spatie Activitylog
  // menyimpannya sebagai { attributes: {...nilai baru...}, old: {...nilai
  // lama...} } (hanya field yang berubah, lihat logOnlyDirty()). Untuk
  // log non-model (mis. percobaan otorisasi PIN), `properties` berupa
  // metadata datar (ip, user_agent, permission, dst.) tanpa attributes/old.
  const detailDiff = useMemo(() => {
    if (!detailTarget) return null
    const props = detailTarget.properties ?? {}
    const attributes = (props.attributes as Record<string, unknown> | undefined) ?? null
    const old = (props.old as Record<string, unknown> | undefined) ?? null

    if (attributes || old) {
      const keys = Array.from(new Set([...Object.keys(attributes ?? {}), ...Object.keys(old ?? {})]))
      return {
        kind: 'diff' as const,
        rows: keys.map((key) => ({ key, before: old?.[key], after: attributes?.[key] })),
      }
    }

    const metaEntries = Object.entries(props).filter(([key]) => key !== 'attributes' && key !== 'old')
    return { kind: 'meta' as const, rows: metaEntries }
  }, [detailTarget])

  function applyFilter() {
    router.get(
      route('admin.activity-logs.index'),
      { log_name: logName, date_from: dateFrom, date_to: dateTo },
      { preserveState: true, replace: true },
    )
  }

  const columns: ColumnDef<LogRow, unknown>[] = [
    {
      accessorKey: 'created_at',
      header: 'Waktu',
      cell: ({ row }) => <span className="font-mono text-xs">{formatDateTime(row.original.created_at)}</span>,
    },
    {
      id: 'causer',
      header: 'Pengguna',
      cell: ({ row }) => row.original.causer?.name ?? <span className="text-content-muted">Sistem</span>,
    },
    {
      accessorKey: 'log_name',
      header: 'Modul',
      cell: ({ row }) => <Badge variant="outline">{row.original.log_name}</Badge>,
    },
    { accessorKey: 'description', header: 'Aksi' },
    {
      id: 'detail',
      header: '',
      cell: ({ row }) => (
        <Button size="sm" variant="outline" onClick={() => setDetailTarget(row.original)}>
          Lihat Detail
        </Button>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Log Aktivitas"
        subtitle="Audit trail seluruh aksi penting di sistem"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Log Aktivitas' }]}
      />
      <PageTabs current={tab} tabs={[
        { key: 'users', label: 'Pengguna', href: route('admin.users.index'), permission: 'user.view' },
        { key: 'roles', label: 'Role & Izin', href: route('admin.roles.index'), permission: 'role.view' },
        { key: 'activity-logs', label: 'Log Aktivitas', href: route('admin.activity-logs.index'), permission: 'setting.view' },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Select value={logName || 'all'} onValueChange={(v) => setLogName(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Semua modul" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua modul</SelectItem>
            {logNames.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
        <Button variant="outline" onClick={applyFilter}>
          Terapkan
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={logs.data}
        getRowId={(row) => String(row.id)}
        emptyTitle="Belum ada aktivitas"
        pagination={{
          page: logs.current_page,
          perPage: logs.per_page,
          total: logs.total,
          onPageChange: (page) =>
            router.get(
              route('admin.activity-logs.index'),
              { log_name: logName, date_from: dateFrom, date_to: dateTo, page },
              { preserveState: true },
            ),
        }}
      />

      <Dialog open={detailTarget !== null} onOpenChange={(open) => !open && setDetailTarget(null)}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Log Aktivitas</DialogTitle>
          </DialogHeader>
          {detailTarget && (
            <div className="flex flex-col gap-4 text-sm">
              <div className="grid grid-cols-2 gap-3 rounded-md border border-border p-3">
                <div><span className="text-content-muted">Waktu: </span>{formatDateTime(detailTarget.created_at)}</div>
                <div><span className="text-content-muted">Pengguna: </span>{detailTarget.causer?.name ?? 'Sistem'}</div>
                <div><span className="text-content-muted">Modul: </span>{detailTarget.log_name}</div>
                <div><span className="text-content-muted">Aksi: </span>{detailTarget.description}</div>
              </div>

              {detailDiff && detailDiff.rows.length === 0 && (
                <p className="text-content-muted">Tidak ada detail tambahan untuk aktivitas ini.</p>
              )}

              {detailDiff?.kind === 'diff' && detailDiff.rows.length > 0 && (
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-bg">
                      <tr>
                        <th className="p-2 text-left font-medium">Field</th>
                        <th className="p-2 text-left font-medium">Sebelum</th>
                        <th className="p-2 text-left font-medium">Sesudah</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailDiff.rows.map((r) => (
                        <tr key={r.key} className="border-t border-border">
                          <td className="p-2 font-medium">{humanizeKey(r.key)}</td>
                          <td className="p-2 text-content-muted">{formatCellValue(r.before)}</td>
                          <td className="p-2">{formatCellValue(r.after)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {detailDiff?.kind === 'meta' && detailDiff.rows.length > 0 && (
                <div className="flex flex-col gap-1 rounded-md border border-border p-3">
                  {detailDiff.rows.map(([key, value]) => (
                    <div key={key}>
                      <span className="text-content-muted">{humanizeKey(key)}: </span>
                      {formatCellValue(value)}
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-content-muted">Nilai sensitif (password, PIN, token, secret, credential) selalu disamarkan.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
