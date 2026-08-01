import { useState, type FormEventHandler, type ReactElement } from 'react'
import { router, useForm } from '@inertiajs/react'
import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal } from 'lucide-react'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { PageTabs } from '@/Components/common/PageTabs'
import { DataTable } from '@/Components/common/DataTable'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Badge } from '@/Components/ui/badge'
import { Switch } from '@/Components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/Components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/Components/ui/dropdown-menu'

const TYPES = ['cash', 'card', 'qris', 'ewallet', 'transfer', 'deposit', 'voucher', 'point', 'credit', 'payroll'] as const

type PaymentMethodRow = {
  id: number
  code: string
  name: string
  type: (typeof TYPES)[number]
  mdr_percent: string
  requires_reference: boolean
  allows_change: boolean
  is_active: boolean
}

const emptyForm = {
  code: '', name: '', type: 'cash' as (typeof TYPES)[number], mdr_percent: 0,
  requires_reference: false as boolean, allows_change: false as boolean, sort_order: 0, is_active: true as boolean,
}

export default function Index({ tab, paymentMethods }: { tab: string; paymentMethods: PaymentMethodRow[] }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<PaymentMethodRow | null>(null)
  const form = useForm(emptyForm)

  function openCreate() {
    setEditing(null)
    form.reset()
    form.clearErrors()
    setSheetOpen(true)
  }

  function openEdit(row: PaymentMethodRow) {
    setEditing(row)
    form.setData({
      code: row.code,
      name: row.name,
      type: row.type,
      mdr_percent: Number(row.mdr_percent),
      requires_reference: row.requires_reference,
      allows_change: row.allows_change,
      sort_order: 0,
      is_active: row.is_active,
    })
    form.clearErrors()
    setSheetOpen(true)
  }

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    const options = { preserveScroll: true as const, onSuccess: () => setSheetOpen(false) }
    if (editing) {
      form.put(route('admin.payment-methods.update', editing.id), options)
    } else {
      form.post(route('admin.payment-methods.store'), options)
    }
  }

  const columns: ColumnDef<PaymentMethodRow, unknown>[] = [
    { accessorKey: 'code', header: 'Kode' },
    { accessorKey: 'name', header: 'Nama' },
    { accessorKey: 'type', header: 'Tipe', cell: ({ row }) => <Badge variant="outline">{row.original.type}</Badge> },
    { accessorKey: 'mdr_percent', header: 'MDR (%)' },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (row.original.is_active ? <Badge className="bg-success text-white">Aktif</Badge> : <Badge variant="destructive">Nonaktif</Badge>),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(row.original)}>Ubah</DropdownMenuItem>
            <DropdownMenuItem
              className="text-danger"
              disabled={!row.original.is_active}
              onClick={() => router.delete(route('admin.payment-methods.destroy', row.original.id), { preserveScroll: true })}
            >
              Nonaktifkan
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Metode Pembayaran"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Metode Pembayaran' }]}
        actions={<Button onClick={openCreate}>Tambah Metode</Button>}
      />
      <PageTabs current={tab} tabs={[
        { key: 'suppliers', label: 'Supplier', href: route('admin.suppliers.index'), permission: 'supplier.view' },
        { key: 'outlets', label: 'Outlet', href: route('admin.outlets.index'), permission: 'setting.view' },
        { key: 'payment-methods', label: 'Metode Bayar', href: route('admin.payment-methods.index'), permission: 'setting.view' },
      ]} />

      <DataTable columns={columns} data={paymentMethods} getRowId={(row) => String(row.id)} />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? 'Ubah Metode Bayar' : 'Tambah Metode Bayar'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={submit} className="flex flex-col gap-4 px-4">
            <div className="space-y-1.5">
              <Label htmlFor="pm-code">Kode</Label>
              <Input id="pm-code" value={form.data.code} onChange={(e) => form.setData('code', e.target.value)} />
              {form.errors.code && <p className="text-sm text-danger">{form.errors.code}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pm-name">Nama</Label>
              <Input id="pm-name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
              {form.errors.name && <p className="text-sm text-danger">{form.errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Tipe</Label>
              <Select value={form.data.type} onValueChange={(v) => form.setData('type', v as (typeof TYPES)[number])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pm-mdr">MDR (%)</Label>
              <Input
                id="pm-mdr"
                type="number"
                step="0.01"
                min={0}
                max={100}
                value={form.data.mdr_percent}
                onChange={(e) => form.setData('mdr_percent', Number(e.target.value))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="pm-ref" checked={form.data.requires_reference} onCheckedChange={(c) => form.setData('requires_reference', c)} />
              <Label htmlFor="pm-ref" className="font-normal">Wajib Nomor Referensi</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="pm-change" checked={form.data.allows_change} onCheckedChange={(c) => form.setData('allows_change', c)} />
              <Label htmlFor="pm-change" className="font-normal">Boleh Ada Kembalian</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="pm-active" checked={form.data.is_active} onCheckedChange={(c) => form.setData('is_active', c)} />
              <Label htmlFor="pm-active" className="font-normal">Aktif</Label>
            </div>
            <SheetFooter>
              <Button type="submit" disabled={form.processing}>Simpan</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
