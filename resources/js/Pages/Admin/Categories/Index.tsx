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
import { Textarea } from '@/Components/ui/textarea'
import { Badge } from '@/Components/ui/badge'
import { Switch } from '@/Components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { AppSheet } from '@/Components/common/AppSheet'
import { ConfirmDialog } from '@/Components/common/ConfirmDialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/Components/ui/dropdown-menu'

type CategoryRow = {
  id: number
  code?: string
  name: string
  parent_id: number | null
  parent_name?: string | null
  description?: string | null
  is_active: boolean
}

export default function Index({ tab, categories }: { tab: string; categories: CategoryRow[] }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<CategoryRow | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<CategoryRow | null>(null)
  const form = useForm({ code: '', name: '', parent_id: '' as string, description: '', is_active: true as boolean })

  function openCreate() {
    setEditing(null)
    form.setData({ code: '', name: '', parent_id: '', description: '', is_active: true })
    setSheetOpen(true)
  }

  function openEdit(category: CategoryRow) {
    setEditing(category)
    form.setData({
      code: category.code ?? '',
      name: category.name,
      parent_id: category.parent_id ? String(category.parent_id) : '',
      description: category.description ?? '',
      is_active: category.is_active,
    })
    setSheetOpen(true)
  }

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    if (editing) {
      form.put(route('admin.categories.update', editing.id), { onSuccess: () => setSheetOpen(false) })
    } else {
      form.post(route('admin.categories.store'), { onSuccess: () => setSheetOpen(false) })
    }
  }

  const columns: ColumnDef<CategoryRow>[] = [
    { accessorKey: 'name', header: 'Nama Kategori' },
    {
      accessorKey: 'parent_name',
      header: 'Induk',
      cell: ({ row }) => row.original.parent_name ?? '—',
    },
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
        title="Kategori"
        subtitle="Kategori produk (mendukung sub-kategori 1 tingkat)"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Kategori' }]}
        actions={<Button onClick={openCreate}>Tambah Kategori</Button>}
      />
      <PageTabs current={tab} tabs={[
        { key: 'products', label: 'Produk', href: route('admin.products.index'), permission: 'product.view' },
        { key: 'categories', label: 'Kategori', href: route('admin.categories.index'), permission: 'category.view' },
        { key: 'brands', label: 'Brand', href: route('admin.brands.index'), permission: 'brand.view' },
        { key: 'units', label: 'Satuan', href: route('admin.units.index'), permission: 'unit.view' },
      ]} />

      <DataTable columns={columns} data={categories} getRowId={(row) => String(row.id)} />

      <ConfirmDialog
        open={deactivateTarget !== null}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        title={`Nonaktifkan Kategori "${deactivateTarget?.name ?? ''}"?`}
        description="Kategori yang dinonaktifkan tidak akan bisa dipilih untuk produk baru."
        variant="destructive"
        confirmLabel="Ya, Nonaktifkan"
        onConfirm={() => {
          if (deactivateTarget) {
            router.delete(route('admin.categories.destroy', deactivateTarget.id), {
              preserveScroll: true,
              onSuccess: () => setDeactivateTarget(null),
            })
          }
        }}
      />

      <AppSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={editing ? 'Ubah Kategori' : 'Tambah Kategori'}
        size="sm"
        footer={<Button type="submit" form="category-form" disabled={form.processing}>Simpan</Button>}
      >
        <form id="category-form" onSubmit={submit} className="flex flex-col gap-4 px-4">
          <div className="space-y-1.5">
            <Label htmlFor="c-code">Kode</Label>
            <Input id="c-code" value={form.data.code} onChange={(e) => form.setData('code', e.target.value)} />
            {form.errors.code && <p className="text-sm text-danger">{form.errors.code}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-name">Nama</Label>
            <Input id="c-name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
            {form.errors.name && <p className="text-sm text-danger">{form.errors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Induk (opsional)</Label>
            <Select value={form.data.parent_id || 'none'} onValueChange={(v) => form.setData('parent_id', v === 'none' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Tanpa induk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Tanpa induk</SelectItem>
                {categories
                  .filter((c) => c.id !== editing?.id && c.parent_id === null)
                  .map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-desc">Deskripsi</Label>
            <Textarea id="c-desc" value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="c-active" checked={form.data.is_active} onCheckedChange={(c) => form.setData('is_active', c)} />
            <Label htmlFor="c-active" className="font-normal">Aktif</Label>
          </div>
        </form>
      </AppSheet>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
