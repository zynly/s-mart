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
import { ConfirmDialog } from '@/Components/common/ConfirmDialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/Components/ui/dropdown-menu'

type BrandRow = { id: number; name: string; is_active: boolean }

export default function Index({ tab, brands }: { tab: string; brands: BrandRow[] }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<BrandRow | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<BrandRow | null>(null)
  const form = useForm({ name: '', is_active: true as boolean })

  function openCreate() {
    setEditing(null)
    form.setData({ name: '', is_active: true })
    setSheetOpen(true)
  }

  function openEdit(brand: BrandRow) {
    setEditing(brand)
    form.setData({ name: brand.name, is_active: brand.is_active })
    setSheetOpen(true)
  }

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    if (editing) {
      form.put(route('admin.brands.update', editing.id), { onSuccess: () => setSheetOpen(false) })
    } else {
      form.post(route('admin.brands.store'), { onSuccess: () => setSheetOpen(false) })
    }
  }

  const columns: ColumnDef<BrandRow>[] = [
    { accessorKey: 'name', header: 'Nama Brand' },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <Badge className={row.original.is_active ? 'bg-success text-white' : 'bg-muted text-content-muted'}>
          {row.original.is_active ? 'Aktif' : 'Nonaktif'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Aksi</div>,
      cell: ({ row }) => (
        <div className="text-right">
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
                onClick={() => setDeactivateTarget(row.original)}
              >
                Nonaktifkan
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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

      <ConfirmDialog
        open={deactivateTarget !== null}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        title={`Nonaktifkan Brand "${deactivateTarget?.name ?? ''}"?`}
        description="Brand yang dinonaktifkan tidak akan muncul pada pilihan produk baru."
        variant="destructive"
        confirmLabel="Ya, Nonaktifkan"
        onConfirm={() => {
          if (deactivateTarget) {
            router.delete(route('admin.brands.destroy', deactivateTarget.id), {
              preserveScroll: true,
              onSuccess: () => setDeactivateTarget(null),
            })
          }
        }}
      />

      <AppSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={editing ? 'Ubah Brand' : 'Tambah Brand'}
        size="sm"
        footer={<Button type="submit" form="brand-form" disabled={form.processing}>Simpan</Button>}
      >
        <form id="brand-form" onSubmit={submit} className="flex flex-col gap-4 px-4">
          <div className="space-y-1.5">
            <Label htmlFor="b-name">Nama</Label>
            <Input id="b-name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
            {form.errors.name && <p className="text-sm text-danger">{form.errors.name}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Switch id="b-active" checked={form.data.is_active} onCheckedChange={(c) => form.setData('is_active', c)} />
            <Label htmlFor="b-active" className="font-normal">Aktif</Label>
          </div>
        </form>
      </AppSheet>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
