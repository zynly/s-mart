import { useState, type ReactElement } from 'react'
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
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
