import { useState, type FormEventHandler, type ReactElement } from 'react'
import { router, useForm } from '@inertiajs/react'
import type { ColumnDef } from '@tanstack/react-table'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { PageTabs } from '@/Components/common/PageTabs'
import { DataTable } from '@/Components/common/DataTable'
import { Money } from '@/Components/common/Money'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Badge } from '@/Components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/Components/ui/sheet'
import { formatDate } from '@/Lib/date'
import type { Paginated } from '@/Types'

type Ref = { id: number; name: string }

type SettlementRow = {
  id: number
  reference: string
  period_start: string
  period_end: string
  total_sold: number
  commission_percent: string
  commission_amount: number
  payable_amount: number
  status: string
  supplier: Ref
  outlet: Ref
}

type ConsignmentIndexProps = {
  tab: string
  settlements: Paginated<SettlementRow>
  suppliers: Ref[]
  outlets: Ref[]
}

const STATUS_LABELS: Record<string, string> = { draft: 'Draft', approved: 'Disetujui', paid: 'Lunas' }
const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-slate-500 text-white',
  approved: 'bg-teal text-white',
  paid: 'bg-success text-white',
}

export default function Index({ tab, settlements, suppliers, outlets }: ConsignmentIndexProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const form = useForm({
    supplier_id: '',
    outlet_id: outlets[0] ? String(outlets[0].id) : '',
    period_start: new Date(new Date().setDate(1)).toISOString().slice(0, 10),
    period_end: new Date().toISOString().slice(0, 10),
    commission_percent: 20,
  })

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    form.post(route('admin.consignment.store'), {
      preserveScroll: true,
      onSuccess: () => {
        form.reset()
        setSheetOpen(false)
      },
    })
  }

  const columns: ColumnDef<SettlementRow, unknown>[] = [
    { accessorKey: 'reference', header: 'Referensi' },
    { id: 'supplier', header: 'Supplier', cell: ({ row }) => row.original.supplier.name },
    {
      id: 'period',
      header: 'Periode',
      cell: ({ row }) => `${formatDate(row.original.period_start)} – ${formatDate(row.original.period_end)}`,
    },
    { id: 'sold', header: 'Terjual', cell: ({ row }) => <Money amount={row.original.total_sold} size="sm" /> },
    { id: 'commission', header: 'Komisi', cell: ({ row }) => <Money amount={row.original.commission_amount} size="sm" /> },
    { id: 'payable', header: 'Dibayar ke Supplier', cell: ({ row }) => <Money amount={row.original.payable_amount} /> },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <Badge className={STATUS_BADGE[row.original.status] ?? ''}>{STATUS_LABELS[row.original.status] ?? row.original.status}</Badge>,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        if (row.original.status === 'draft') {
          return (
            <Button size="sm" variant="outline" onClick={() => router.put(route('admin.consignment.approve', row.original.id), {}, { preserveScroll: true })}>
              Setujui
            </Button>
          )
        }
        if (row.original.status === 'approved') {
          return (
            <Button size="sm" variant="outline" onClick={() => router.put(route('admin.consignment.mark-paid', row.original.id), {}, { preserveScroll: true })}>
              Tandai Lunas
            </Button>
          )
        }
        return null
      },
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Konsinyasi"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Konsinyasi' }]}
        actions={<Button onClick={() => setSheetOpen(true)}>Buat Settlement</Button>}
      />
      <PageTabs current={tab} tabs={[
        { key: 'purchase-orders', label: 'Purchase Order', href: route('admin.purchase-orders.index'), permission: 'purchase_order.view' },
        { key: 'purchases', label: 'Pembelian', href: route('admin.purchases.index'), permission: 'purchase.view' },
        { key: 'consignment', label: 'Konsinyasi', href: route('admin.consignment.index'), permission: 'consignment.view' },
      ]} />

      <DataTable columns={columns} data={settlements.data} getRowId={(row) => String(row.id)} emptyDescription="Belum ada settlement konsinyasi." />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Buat Settlement Konsinyasi</SheetTitle>
          </SheetHeader>
          <form onSubmit={submit} className="flex flex-col gap-4 px-4">
            <div className="space-y-1.5">
              <Label>Supplier Konsinyor</Label>
              <Select value={form.data.supplier_id} onValueChange={(v) => form.setData('supplier_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.errors.supplier_id && <p className="text-sm text-danger">{form.errors.supplier_id}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Outlet</Label>
              <Select value={form.data.outlet_id} onValueChange={(v) => form.setData('outlet_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih outlet" />
                </SelectTrigger>
                <SelectContent>
                  {outlets.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Periode Awal</Label>
                <Input type="date" value={form.data.period_start} onChange={(e) => form.setData('period_start', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Periode Akhir</Label>
                <Input type="date" value={form.data.period_end} onChange={(e) => form.setData('period_end', e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Komisi Mart (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={form.data.commission_percent}
                onChange={(e) => form.setData('commission_percent', Number(e.target.value))}
              />
            </div>
            <p className="text-xs text-content-muted">
              Dihitung dari barang konsinyasi supplier ini yang terjual (keluar dari stok) dalam periode, pada harga jual aktif produk saat ini.
            </p>
            <SheetFooter>
              <Button type="submit" disabled={form.processing}>Hitung & Simpan</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
