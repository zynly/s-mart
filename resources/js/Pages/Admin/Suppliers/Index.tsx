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
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/Components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/Components/ui/dropdown-menu'

type SupplierRow = {
  id: number
  code: string
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  payment_term_days: number
  is_consignor: boolean
  is_active: boolean
}

const emptyForm = {
  code: '', name: '', contact_person: '', phone: '', email: '', address: '',
  payment_term_days: 0, is_consignor: false as boolean, is_active: true as boolean,
}

export default function Index({ tab, suppliers }: { tab: string; suppliers: SupplierRow[] }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<SupplierRow | null>(null)
  const form = useForm(emptyForm)

  function openCreate() {
    setEditing(null)
    form.reset()
    form.clearErrors()
    setSheetOpen(true)
  }

  function openEdit(row: SupplierRow) {
    setEditing(row)
    form.setData({
      code: row.code,
      name: row.name,
      contact_person: row.contact_person ?? '',
      phone: row.phone ?? '',
      email: row.email ?? '',
      address: row.address ?? '',
      payment_term_days: row.payment_term_days,
      is_consignor: row.is_consignor,
      is_active: row.is_active,
    })
    form.clearErrors()
    setSheetOpen(true)
  }

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    const options = { preserveScroll: true as const, onSuccess: () => setSheetOpen(false) }
    if (editing) {
      form.put(route('admin.suppliers.update', editing.id), options)
    } else {
      form.post(route('admin.suppliers.store'), options)
    }
  }

  const columns: ColumnDef<SupplierRow, unknown>[] = [
    { accessorKey: 'code', header: 'Kode' },
    { accessorKey: 'name', header: 'Nama' },
    { accessorKey: 'contact_person', header: 'Kontak', cell: ({ row }) => row.original.contact_person ?? '—' },
    { accessorKey: 'payment_term_days', header: 'Termin (hari)' },
    {
      id: 'consignor',
      header: 'Konsinyasi',
      cell: ({ row }) => (row.original.is_consignor ? <Badge className="bg-teal text-white">Ya</Badge> : '—'),
    },
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
              onClick={() => router.delete(route('admin.suppliers.destroy', row.original.id), { preserveScroll: true })}
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
        title="Supplier"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Supplier' }]}
        actions={<Button onClick={openCreate}>Tambah Supplier</Button>}
      />
      <PageTabs current={tab} tabs={[
        { key: 'suppliers', label: 'Supplier', href: route('admin.suppliers.index'), permission: 'supplier.view' },
        { key: 'outlets', label: 'Outlet', href: route('admin.outlets.index'), permission: 'setting.view' },
        { key: 'payment-methods', label: 'Metode Bayar', href: route('admin.payment-methods.index'), permission: 'setting.view' },
      ]} />

      <DataTable columns={columns} data={suppliers} getRowId={(row) => String(row.id)} />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? 'Ubah Supplier' : 'Tambah Supplier'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={submit} className="flex flex-col gap-4 px-4">
            <div className="space-y-1.5">
              <Label htmlFor="s-code">Kode</Label>
              <Input id="s-code" value={form.data.code} onChange={(e) => form.setData('code', e.target.value)} />
              {form.errors.code && <p className="text-sm text-danger">{form.errors.code}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-name">Nama</Label>
              <Input id="s-name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
              {form.errors.name && <p className="text-sm text-danger">{form.errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-contact">Kontak Person</Label>
              <Input id="s-contact" value={form.data.contact_person} onChange={(e) => form.setData('contact_person', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-phone">No. HP</Label>
              <Input id="s-phone" value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-email">Email</Label>
              <Input id="s-email" type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-address">Alamat</Label>
              <Input id="s-address" value={form.data.address} onChange={(e) => form.setData('address', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-term">Termin Pembayaran (hari, 0 = tunai)</Label>
              <Input
                id="s-term"
                type="number"
                min={0}
                value={form.data.payment_term_days}
                onChange={(e) => form.setData('payment_term_days', Number(e.target.value))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="s-consignor" checked={form.data.is_consignor} onCheckedChange={(c) => form.setData('is_consignor', c)} />
              <Label htmlFor="s-consignor" className="font-normal">Supplier Konsinyasi</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="s-active" checked={form.data.is_active} onCheckedChange={(c) => form.setData('is_active', c)} />
              <Label htmlFor="s-active" className="font-normal">Aktif</Label>
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
