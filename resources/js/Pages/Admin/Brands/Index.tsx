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

type BrandRow = { id: number; name: string; is_active: boolean }

export default function Index({ tab, brands }: { tab: string; brands: BrandRow[] }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<BrandRow | null>(null)
  const form = useForm({ name: '', is_active: true as boolean })

  function openCreate() {
    setEditing(null)
    form.reset()
    form.clearErrors()
    setSheetOpen(true)
  }

  function openEdit(row: BrandRow) {
    setEditing(row)
    form.setData({ name: row.name, is_active: row.is_active })
    form.clearErrors()
    setSheetOpen(true)
  }

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    const options = { preserveScroll: true as const, onSuccess: () => setSheetOpen(false) }
    if (editing) {
      form.put(route('admin.brands.update', editing.id), options)
    } else {
      form.post(route('admin.brands.store'), options)
    }
  }

  const columns: ColumnDef<BrandRow, unknown>[] = [
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
              onClick={() => router.delete(route('admin.brands.destroy', row.original.id), { preserveScroll: true })}
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
        title="Brand"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Brand' }]}
        actions={<Button onClick={openCreate}>Tambah Brand</Button>}
      />
      <PageTabs current={tab} tabs={[
        { key: 'products', label: 'Produk', href: route('admin.products.index'), permission: 'product.view' },
        { key: 'categories', label: 'Kategori', href: route('admin.categories.index'), permission: 'category.view' },
        { key: 'brands', label: 'Brand', href: route('admin.brands.index'), permission: 'brand.view' },
        { key: 'units', label: 'Satuan', href: route('admin.units.index'), permission: 'unit.view' },
      ]} />

      <DataTable columns={columns} data={brands} getRowId={(row) => String(row.id)} />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? 'Ubah Brand' : 'Tambah Brand'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={submit} className="flex flex-col gap-4 px-4">
            <div className="space-y-1.5">
              <Label htmlFor="b-name">Nama</Label>
              <Input id="b-name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
              {form.errors.name && <p className="text-sm text-danger">{form.errors.name}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Switch id="b-active" checked={form.data.is_active} onCheckedChange={(c) => form.setData('is_active', c)} />
              <Label htmlFor="b-active" className="font-normal">Aktif</Label>
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
