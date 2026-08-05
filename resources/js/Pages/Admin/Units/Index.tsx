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
import { AppSheet } from '@/Components/common/AppSheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/Components/ui/dropdown-menu'

type UnitRow = { id: number; code: string; name: string; is_active: boolean }

export default function Index({ tab, units }: { tab: string; units: UnitRow[] }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<UnitRow | null>(null)
  const form = useForm({ code: '', name: '', is_active: true as boolean })

  function openCreate() {
    setEditing(null)
    form.reset()
    form.clearErrors()
    setSheetOpen(true)
  }

  function openEdit(row: UnitRow) {
    setEditing(row)
    form.setData({ code: row.code, name: row.name, is_active: row.is_active })
    form.clearErrors()
    setSheetOpen(true)
  }

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    const options = { preserveScroll: true as const, onSuccess: () => setSheetOpen(false) }
    if (editing) {
      form.put(route('admin.units.update', editing.id), options)
    } else {
      form.post(route('admin.units.store'), options)
    }
  }

  const columns: ColumnDef<UnitRow, unknown>[] = [
    { accessorKey: 'code', header: 'Kode' },
    { accessorKey: 'name', header: 'Nama' },
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
              onClick={() => router.delete(route('admin.units.destroy', row.original.id), { preserveScroll: true })}
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
        title="Satuan"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Satuan' }]}
        actions={<Button onClick={openCreate}>Tambah Satuan</Button>}
      />
      <PageTabs current={tab} tabs={[
        { key: 'products', label: 'Produk', href: route('admin.products.index'), permission: 'product.view' },
        { key: 'categories', label: 'Kategori', href: route('admin.categories.index'), permission: 'category.view' },
        { key: 'brands', label: 'Brand', href: route('admin.brands.index'), permission: 'brand.view' },
        { key: 'units', label: 'Satuan', href: route('admin.units.index'), permission: 'unit.view' },
      ]} />

      <DataTable columns={columns} data={units} getRowId={(row) => String(row.id)} />

      <AppSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={editing ? 'Ubah Satuan' : 'Tambah Satuan'}
        size="sm"
        footer={<Button type="submit" form="unit-form" disabled={form.processing}>Simpan</Button>}
      >
        <form id="unit-form" onSubmit={submit} className="flex flex-col gap-4 px-4">
          <div className="space-y-1.5">
            <Label htmlFor="u-code">Kode</Label>
            <Input id="u-code" value={form.data.code} onChange={(e) => form.setData('code', e.target.value)} />
            {form.errors.code && <p className="text-sm text-danger">{form.errors.code}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u-name">Nama</Label>
            <Input id="u-name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
            {form.errors.name && <p className="text-sm text-danger">{form.errors.name}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Switch id="u-active" checked={form.data.is_active} onCheckedChange={(c) => form.setData('is_active', c)} />
            <Label htmlFor="u-active" className="font-normal">Aktif</Label>
          </div>
        </form>
      </AppSheet>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
