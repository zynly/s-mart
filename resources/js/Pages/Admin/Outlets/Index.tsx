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

type OutletRow = {
  id: number
  code: string
  name: string
  address: string | null
  phone: string | null
  is_main: boolean
  is_active: boolean
}

const emptyForm = { code: '', name: '', address: '', phone: '', is_main: false as boolean, is_active: true as boolean }

export default function Index({ tab, outlets }: { tab: string; outlets: OutletRow[] }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<OutletRow | null>(null)
  const form = useForm(emptyForm)

  function openCreate() {
    setEditing(null)
    form.reset()
    form.clearErrors()
    setSheetOpen(true)
  }

  function openEdit(row: OutletRow) {
    setEditing(row)
    form.setData({
      code: row.code,
      name: row.name,
      address: row.address ?? '',
      phone: row.phone ?? '',
      is_main: row.is_main,
      is_active: row.is_active,
    })
    form.clearErrors()
    setSheetOpen(true)
  }

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    const options = { preserveScroll: true as const, onSuccess: () => setSheetOpen(false) }
    if (editing) {
      form.put(route('admin.outlets.update', editing.id), options)
    } else {
      form.post(route('admin.outlets.store'), options)
    }
  }

  const columns: ColumnDef<OutletRow, unknown>[] = [
    { accessorKey: 'code', header: 'Kode' },
    { accessorKey: 'name', header: 'Nama' },
    { accessorKey: 'address', header: 'Alamat', cell: ({ row }) => row.original.address ?? '—' },
    {
      id: 'main',
      header: 'Utama',
      cell: ({ row }) => (row.original.is_main ? <Badge className="bg-gold text-navy-900">Utama</Badge> : '—'),
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
              disabled={!row.original.is_active || row.original.is_main}
              onClick={() => router.delete(route('admin.outlets.destroy', row.original.id), { preserveScroll: true })}
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
        title="Outlet"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Outlet' }]}
        actions={<Button onClick={openCreate}>Tambah Outlet</Button>}
      />
      <PageTabs current={tab} tabs={[
        { key: 'suppliers', label: 'Supplier', href: route('admin.suppliers.index'), permission: 'supplier.view' },
        { key: 'outlets', label: 'Outlet', href: route('admin.outlets.index'), permission: 'setting.view' },
        { key: 'payment-methods', label: 'Metode Bayar', href: route('admin.payment-methods.index'), permission: 'setting.view' },
      ]} />

      <DataTable columns={columns} data={outlets} getRowId={(row) => String(row.id)} />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? 'Ubah Outlet' : 'Tambah Outlet'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={submit} className="flex flex-col gap-4 px-4">
            <div className="space-y-1.5">
              <Label htmlFor="o-code">Kode</Label>
              <Input id="o-code" value={form.data.code} onChange={(e) => form.setData('code', e.target.value)} />
              {form.errors.code && <p className="text-sm text-danger">{form.errors.code}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="o-name">Nama</Label>
              <Input id="o-name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
              {form.errors.name && <p className="text-sm text-danger">{form.errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="o-address">Alamat</Label>
              <Input id="o-address" value={form.data.address} onChange={(e) => form.setData('address', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="o-phone">Telepon</Label>
              <Input id="o-phone" value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="o-main" checked={form.data.is_main} onCheckedChange={(c) => form.setData('is_main', c)} />
              <Label htmlFor="o-main" className="font-normal">Outlet Utama</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="o-active" checked={form.data.is_active} onCheckedChange={(c) => form.setData('is_active', c)} />
              <Label htmlFor="o-active" className="font-normal">Aktif</Label>
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
