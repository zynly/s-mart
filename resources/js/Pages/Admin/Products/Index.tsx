import { useState, useEffect, useRef, type FormEventHandler, type ReactElement } from 'react'
import { Link, router, useForm } from '@inertiajs/react'
import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Plus, Trash2, Star, Eye, Sparkles, Pencil, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import axios from 'axios'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { PageTabs } from '@/Components/common/PageTabs'
import { DataTable } from '@/Components/common/DataTable'
import { StatCard } from '@/Components/common/StatCard'
import { Money } from '@/Components/common/Money'
import { MoneyInput } from '@/Components/common/MoneyInput'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Textarea } from '@/Components/ui/textarea'
import { Badge } from '@/Components/ui/badge'
import { Switch } from '@/Components/ui/switch'
import { Checkbox } from '@/Components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { AppSheet } from '@/Components/common/AppSheet'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/Components/ui/dropdown-menu'
import type { Paginated } from '@/Types'

type Ref = { id: number; name: string }
type UnitRef = { id: number; code: string; name: string }

type ProductRow = {
  id: number
  sku: string
  name: string
  category: Ref | null
  brand: Ref | null
  base_unit: UnitRef
  is_active: boolean
  is_favorite: boolean
  is_visible_public: boolean
  is_expirable?: boolean
  is_consignment?: boolean
  consignment_percent?: number | null
  barcodes: { id: number; barcode: string; is_primary: boolean }[]
  prices: { id: number; price: number; member_price: number | null; outlet_id: number; unit_id: number }[]
  image_url: string | null
}

type ProductsIndexProps = {
  tab: string
  products: Paginated<ProductRow>
  categories: Ref[]
  brands: Ref[]
  units: UnitRef[]
  outlets: Ref[]
  filters: { search?: string; category_id?: string; brand_id?: string; status?: string; is_favorite?: string }
  canViewCost: boolean
  stats: { total: number; active: number; inactive: number; favorite?: number }
}

type BarcodeField = { barcode: string; unit_id: string; is_primary: boolean }

const emptyForm = {
  sku: '',
  name: '',
  category_id: '',
  brand_id: '',
  base_unit_id: '',
  description: '',
  is_expirable: false as boolean,
  is_consignment: false as boolean,
  consignment_percent: '',
  min_stock: 0,
  max_stock: '',
  is_active: true as boolean,
  is_favorite: false as boolean,
  is_visible_public: false as boolean,
  description_public: '',
  barcodes: [] as BarcodeField[],
  price: { outlet_id: '', unit_id: '', price: 0, member_price: null as number | null },
}

export default function Index({ tab, products, categories, brands, units, outlets, filters, canViewCost, stats }: ProductsIndexProps) {
  const [search, setSearch] = useState(filters.search ?? '')
  const [categoryFilter, setCategoryFilter] = useState(filters.category_id ?? '')
  const [activeTab, setActiveTab] = useState('umum')
  const [favoriteFilter, setFavoriteFilter] = useState(filters.is_favorite ?? '')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<ProductRow | null>(null)
  const form = useForm(emptyForm)

  const [priceDialogOpen, setPriceDialogOpen] = useState(false)
  const [priceTarget, setPriceTarget] = useState<ProductRow | null>(null)
  const [scannerTestResult, setScannerTestResult] = useState<{
    code: string
    charCount: number
    suffix: string
    speedMs: number
  } | null>(null)
  const priceForm = useForm({
    outlet_id: '',
    unit_id: '',
    price: 0,
    member_price: null as number | null,
    effective_from: new Date().toISOString().slice(0, 10),
  })

  function toggleFavoriteRow(row: ProductRow) {
    router.put(route('admin.products.toggle-favorite', row.id), {}, { preserveScroll: true })
  }

  function openPriceDialog(row: ProductRow) {
    setPriceTarget(row)
    const current = row.prices[0]
    priceForm.setData({
      outlet_id: current ? String(current.outlet_id) : (outlets[0] ? String(outlets[0].id) : ''),
      unit_id: current ? String(current.unit_id) : String(row.base_unit.id),
      price: current?.price ?? 0,
      member_price: current?.member_price ?? null,
      effective_from: new Date().toISOString().slice(0, 10),
    })
    priceForm.clearErrors()
    setPriceDialogOpen(true)
  }

  const submitPrice: FormEventHandler = (e) => {
    e.preventDefault()
    if (!priceTarget) return
    priceForm.post(route('admin.products.update-price', priceTarget.id), {
      preserveScroll: true,
      onSuccess: () => setPriceDialogOpen(false),
    })
  }

  function applyFilter() {
    router.get(route('admin.products.index'), { search, category_id: categoryFilter }, { preserveState: true, replace: true })
  }

  function generateEan13(): string {
    const base = '899' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0')
    let checksum = 0
    for (let i = 0; i < 11; i++) {
      checksum += parseInt(base[i]) * (i % 2 === 0 ? 1 : 3)
    }
    const checkDigit = (10 - (checksum % 10)) % 10
    return base + checkDigit
  }

  function openCreate() {
    setEditing(null)
    setActiveTab('umum')
    const defaultUnitId = units[0] ? String(units[0].id) : ''
    form.setData({
      ...emptyForm,
      base_unit_id: defaultUnitId,
      barcodes: [{ barcode: '', unit_id: defaultUnitId, is_primary: true }],
    })
    form.clearErrors()
    setSheetOpen(true)
  }

  function openEdit(row: ProductRow) {
    setEditing(row)
    setActiveTab('umum')
    const baseUnitId = String(row.base_unit.id)
    form.setData({
      sku: row.sku,
      name: row.name,
      category_id: row.category ? String(row.category.id) : '',
      brand_id: row.brand ? String(row.brand.id) : '',
      base_unit_id: baseUnitId,
      description: '',
      is_expirable: row.is_expirable ?? false,
      is_consignment: row.is_consignment ?? false,
      consignment_percent: row.consignment_percent !== null && row.consignment_percent !== undefined ? String(row.consignment_percent) : '',
      min_stock: 0,
      max_stock: '',
      is_active: row.is_active,
      is_favorite: row.is_favorite,
      is_visible_public: row.is_visible_public,
      description_public: '',
      barcodes: row.barcodes.length > 0
        ? row.barcodes.map((b) => ({ barcode: b.barcode, unit_id: baseUnitId, is_primary: b.is_primary }))
        : [{ barcode: '', unit_id: baseUnitId, is_primary: true }],
      price: { outlet_id: '', unit_id: '', price: 0, member_price: null },
    })
    form.clearErrors()
    setSheetOpen(true)
  }

  async function verifyBarcodeScan(index: number, rawCode: string) {
    const code = rawCode.trim()
    if (!code) return

    // Check duplicate inside current form data
    const isDuplicateInForm = form.data.barcodes.some((b, i) => i !== index && b.barcode.trim() === code)
    if (isDuplicateInForm) {
      toast.error('Barcode Ganda di Form! ⚠️', {
        description: `Kode "${code}" sudah ada pada baris lain di form ini.`,
        duration: 4000,
      })
      return
    }

    // Check database via checkBarcode endpoint
    try {
      const res = await axios.get<{ valid: boolean; message: string; product?: { name: string; sku: string } }>(
        route('admin.products.check-barcode'),
        {
          params: {
            barcode: code,
            exclude_product_id: editing?.id,
          },
        }
      )

      if (!res.data.valid) {
        toast.error('Barcode Sudah Terdaftar! ⚠️', {
          description: res.data.message,
          duration: 5000,
        })
      } else {
        toast.success('Barcode Berhasil Di-scan! 🎉', {
          description: `Kode "${code}" valid & siap disimpan ke produk.`,
          duration: 3500,
        })
      }
    } catch {
      // Ignore network errors or fallback
    }
  }

  function handleSelectBaseUnit(newUnitId: string) {
    form.setData((prev) => ({
      ...prev,
      base_unit_id: newUnitId,
      barcodes: prev.barcodes.map((b) => ({
        ...b,
        unit_id: newUnitId,
      })),
      price: {
        ...prev.price,
        unit_id: newUnitId,
      },
    }))
  }

  const firstBarcodeRef = useRef<HTMLInputElement>(null)
  const scannerBufferRef = useRef('')
  const lastKeyTimeRef = useRef(0)
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const processScannedBarcode = (code: string) => {
    const scannedCode = code.trim()
    if (!scannedCode || scannedCode.length < 3) return

    setActiveTab('barcode')

    setScannerTestResult({
      code: scannedCode,
      charCount: scannedCode.length,
      suffix: 'Enter/Tab/Auto-Detect',
      speedMs: Math.round(lastKeyTimeRef.current ? Math.max(1, (Date.now() - lastKeyTimeRef.current) / scannedCode.length) : 8),
    })

    const currentBarcodes = form.data.barcodes
    let targetIndex = currentBarcodes.findIndex((b) => !b.barcode.trim())
    const unitId = form.data.base_unit_id || (units[0] ? String(units[0].id) : '')

    if (targetIndex === -1) {
      targetIndex = currentBarcodes.length
      const updated = [...currentBarcodes, { barcode: scannedCode, unit_id: unitId, is_primary: currentBarcodes.length === 0 }]
      form.setData('barcodes', updated)
    } else {
      const updated = currentBarcodes.map((b, i) => (i === targetIndex ? { ...b, barcode: scannedCode, unit_id: b.unit_id || unitId } : b))
      form.setData('barcodes', updated)
    }

    verifyBarcodeScan(targetIndex, scannedCode)

    setTimeout(() => {
      firstBarcodeRef.current?.focus()
    }, 80)
  }

  // Auto focus barcode input when switching to 'barcode' tab
  useEffect(() => {
    if (sheetOpen && activeTab === 'barcode') {
      const timer = setTimeout(() => {
        firstBarcodeRef.current?.focus()
      }, 80)
      return () => clearTimeout(timer)
    }
  }, [sheetOpen, activeTab])

  // Bulletproof Hardware Barcode Scanner Listener using Refs & Debounce
  useEffect(() => {
    if (!sheetOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return

      const currentTime = Date.now()
      const timeDiff = currentTime - lastKeyTimeRef.current

      // If keypress interval > 150ms, reset buffer (it's manual typing)
      if (timeDiff > 150) {
        scannerBufferRef.current = ''
      }
      lastKeyTimeRef.current = currentTime

      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current)
        scanTimerRef.current = null
      }

      if (e.key === 'Enter' || e.key === 'Tab') {
        if (scannerBufferRef.current.length >= 3) {
          e.preventDefault()
          e.stopPropagation()
          const scanned = scannerBufferRef.current
          scannerBufferRef.current = ''
          processScannedBarcode(scanned)
        }
        scannerBufferRef.current = ''
      } else if (e.key.length === 1) {
        scannerBufferRef.current += e.key

        // Fallback debounce timer: If scanner sends NO Enter/Tab suffix, process after 100ms idle
        scanTimerRef.current = setTimeout(() => {
          if (scannerBufferRef.current.length >= 4) {
            const scanned = scannerBufferRef.current
            scannerBufferRef.current = ''
            processScannedBarcode(scanned)
          }
        }, 100)
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current)
    }
  }, [sheetOpen, form.data.barcodes, form.data.base_unit_id])

  function addBarcode() {
    const unitId = form.data.base_unit_id || (units[0] ? String(units[0].id) : '')
    form.setData('barcodes', [...form.data.barcodes, { barcode: '', unit_id: unitId, is_primary: form.data.barcodes.length === 0 }])
  }

  function removeBarcode(index: number) {
    form.setData('barcodes', form.data.barcodes.filter((_, i) => i !== index))
  }

  function updateBarcode(index: number, patch: Partial<BarcodeField>) {
    form.setData('barcodes', form.data.barcodes.map((b, i) => (i === index ? { ...b, ...patch } : b)))
  }

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    const options = {
      preserveScroll: true as const,
      onSuccess: () => {
        toast.success(editing ? 'Produk Berhasil Diperbarui! 🎉' : 'Produk Berhasil Ditambahkan! 🎉', {
          description: `Produk "${form.data.name}" telah disimpan ke sistem.`,
          duration: 4000,
        })
        setSheetOpen(false)
      },
      onError: (errors: Record<string, string>) => {
        const errorKeys = Object.keys(errors)
        if (errorKeys.some((k) => k.startsWith('barcodes'))) {
          setActiveTab('barcode')
          toast.error('Gagal Menyimpan Barcode ⚠️', {
            description: errors['barcodes.0.barcode'] || errors['barcodes'] || 'Kode barcode bermasalah atau sudah terdaftar.',
            duration: 5000,
          })
        } else {
          const firstMsg = errors[errorKeys[0]] || 'Mohon lengkapi data yang ditandai merah.'
          toast.error('Gagal Menyimpan Produk ⚠️', {
            description: firstMsg,
            duration: 5000,
          })
        }
      },
    }
    if (editing) {
      form.put(route('admin.products.update', editing.id), options)
    } else {
      form.post(route('admin.products.store'), options)
    }
  }

  const columns: ColumnDef<ProductRow, unknown>[] = [
    {
      id: 'favorite_tag',
      header: '⭐',
      meta: { align: 'center' },
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => toggleFavoriteRow(row.original)}
          className="p-1 rounded-md hover:bg-amber-100 dark:hover:bg-amber-950/40 transition-colors"
          title={row.original.is_favorite ? 'Hapus dari Favorit' : 'Tandai sebagai Favorit'}
        >
          <Star
            className={`size-4 transition-transform hover:scale-110 ${
              row.original.is_favorite
                ? 'fill-amber-400 text-amber-500'
                : 'text-content-muted/40 hover:text-amber-400'
            }`}
          />
        </button>
      ),
    },
    {
      id: 'image',
      header: 'Foto',
      meta: { align: 'center' },
      cell: ({ row }) => (
        <Link href={route('admin.products.show', row.original.id)} className="flex items-center justify-center">
          <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface border border-border shadow-2xs transition-transform hover:scale-105">
            {row.original.image_url ? (
              <img
                src={row.original.image_url}
                alt={row.original.name}
                className="size-full object-cover"
              />
            ) : (
              <span className="text-[9px] font-medium text-content-muted">Tidak ada</span>
            )}
          </div>
        </Link>
      ),
    },
    {
      accessorKey: 'sku',
      header: 'SKU',
      meta: { align: 'center' },
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-content-muted shrink-0 whitespace-nowrap">{row.original.sku}</span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Nama Produk',
      meta: { align: 'center' },
      cell: ({ row }) => (
        <div className="max-w-[220px] mx-auto text-center flex flex-col items-center gap-0.5">
          <Link
            href={route('admin.products.show', row.original.id)}
            className="font-semibold text-content text-xs sm:text-sm hover:text-primary transition-colors hover:underline line-clamp-2"
          >
            {row.original.name}
          </Link>
          {row.original.is_consignment && (
            <Badge className="bg-purple-600 text-white text-[9px] px-1.5 py-0 font-normal">Titipan ({row.original.consignment_percent ?? 0}%)</Badge>
          )}
        </div>
      ),
    },
    {
      id: 'category',
      header: 'Kategori',
      meta: { align: 'center' },
      cell: ({ row }) => (
        <span className="text-xs font-medium text-content-muted whitespace-nowrap">{row.original.category?.name ?? '—'}</span>
      ),
    },
    {
      id: 'price',
      header: 'Harga',
      meta: { align: 'center' },
      cell: ({ row }) => (
        <div className="font-mono text-xs font-bold text-content whitespace-nowrap text-center">
          {row.original.prices[0] ? <Money amount={row.original.prices[0].price} /> : '—'}
        </div>
      ),
    },
    {
      id: 'is_visible_public',
      header: 'Storefront',
      meta: { align: 'center' },
      cell: ({ row }) => (
        row.original.is_visible_public ? (
          <Badge className="bg-teal text-white font-semibold text-[10px] shrink-0 whitespace-nowrap">Publik</Badge>
        ) : (
          <span className="text-[10px] text-content-muted">—</span>
        )
      ),
    },
    {
      id: 'status',
      header: 'Status',
      meta: { align: 'center' },
      cell: ({ row }) => (
        row.original.is_active ? (
          <Badge className="bg-success text-white font-semibold text-[10px] shrink-0 whitespace-nowrap">Aktif</Badge>
        ) : (
          <Badge variant="destructive" className="font-semibold text-[10px] shrink-0 whitespace-nowrap">Nonaktif</Badge>
        )
      ),
    },
    {
      id: 'actions',
      header: 'Aksi',
      meta: { align: 'center' },
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-7 px-2 text-[11px] font-semibold gap-1 bg-blue-50/70 border-blue-200 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
          >
            <Link href={route('admin.products.show', row.original.id)}>
              <Eye className="size-3" /> Detail
            </Link>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => openEdit(row.original)}
            className="h-7 px-2 text-[11px] font-semibold gap-1 border-border text-content hover:bg-surface-muted"
          >
            <Pencil className="size-3 text-content-muted" /> Edit
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => openPriceDialog(row.original)}
            className="h-7 px-2 text-[11px] font-semibold gap-1 bg-emerald-50/70 border-emerald-200 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
          >
            <DollarSign className="size-3" /> Harga
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Produk"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Produk' }]}
        actions={<Button onClick={openCreate}>Tambah Produk</Button>}
      />
      <PageTabs current={tab} tabs={[
        { key: 'products', label: 'Produk', href: route('admin.products.index'), permission: 'product.view' },
        { key: 'categories', label: 'Kategori', href: route('admin.categories.index'), permission: 'category.view' },
        { key: 'brands', label: 'Brand', href: route('admin.brands.index'), permission: 'brand.view' },
        { key: 'units', label: 'Satuan', href: route('admin.units.index'), permission: 'unit.view' },
      ]} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <StatCard label="Jumlah Produk" value={String(stats.total)} />
        <StatCard label="Produk Aktif" value={String(stats.active)} />
        <StatCard label="Favorit Kasir" value={String(stats.favorite ?? 0)} />
        <StatCard label="Produk Nonaktif" value={String(stats.inactive)} />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="Cari nama/SKU/barcode…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyFilter()}
          className="max-w-xs"
        />
        <Select value={categoryFilter || 'all'} onValueChange={(v) => setCategoryFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Semua kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua kategori</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={favoriteFilter || 'all'} onValueChange={(v) => setFavoriteFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Semua favorit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tag</SelectItem>
            <SelectItem value="1">⭐ Favorit Saja</SelectItem>
            <SelectItem value="0">Bukan Favorit</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={applyFilter}>Terapkan</Button>
      </div>

      <DataTable
        columns={columns}
        data={products.data}
        getRowId={(row) => String(row.id)}
        pagination={{
          page: products.current_page,
          perPage: products.per_page,
          total: products.total,
          onPageChange: (page) => router.get(route('admin.products.index'), { search, category_id: categoryFilter, page }, { preserveState: true }),
        }}
      />

      <AppSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={editing ? 'Ubah Produk' : 'Tambah Produk'}
        size="xl"
        footer={<Button type="submit" form="product-form" disabled={form.processing}>Simpan</Button>}
      >
          <form id="product-form" onSubmit={submit} className="flex flex-col gap-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="umum">Umum</TabsTrigger>
                <TabsTrigger value="barcode" className="relative">
                  Barcode
                  {Object.keys(form.errors).some((k) => k.startsWith('barcodes')) && (
                    <span className="ml-1.5 rounded-full bg-danger px-1.5 py-0.2 text-[9px] font-bold text-white">!</span>
                  )}
                </TabsTrigger>
                {!editing && <TabsTrigger value="harga">Harga</TabsTrigger>}
                <TabsTrigger value="stok">Stok Min-Maks</TabsTrigger>
              </TabsList>

              <TabsContent value="umum" className="flex flex-col gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="p-sku">SKU</Label>
                  <Input id="p-sku" value={form.data.sku} onChange={(e) => form.setData('sku', e.target.value)} />
                  {form.errors.sku && <p className="text-sm text-danger">{form.errors.sku}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-name">Nama</Label>
                  <Input id="p-name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
                  {form.errors.name && <p className="text-sm text-danger">{form.errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-content">Kategori</Label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => form.setData('category_id', '')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                        !form.data.category_id
                          ? 'bg-navy-900 text-white border-navy-900 shadow-xs font-semibold'
                          : 'bg-surface border-border text-content-muted hover:border-gray-400 hover:text-content'
                      }`}
                    >
                      Tanpa kategori
                    </button>
                    {categories.map((c) => {
                      const isSelected = form.data.category_id === String(c.id)
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => form.setData('category_id', String(c.id))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-navy-900 text-white border-navy-900 shadow-xs font-semibold'
                              : 'bg-surface border-border text-content-muted hover:border-gray-400 hover:text-content'
                          }`}
                        >
                          {c.name}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-content">Brand</Label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => form.setData('brand_id', '')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                        !form.data.brand_id
                          ? 'bg-navy-900 text-white border-navy-900 shadow-xs font-semibold'
                          : 'bg-surface border-border text-content-muted hover:border-gray-400 hover:text-content'
                      }`}
                    >
                      Tanpa brand
                    </button>
                    {brands.map((b) => {
                      const isSelected = form.data.brand_id === String(b.id)
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => form.setData('brand_id', String(b.id))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-navy-900 text-white border-navy-900 shadow-xs font-semibold'
                              : 'bg-surface border-border text-content-muted hover:border-gray-400 hover:text-content'
                          }`}
                        >
                          {b.name}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-content">Satuan Dasar</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {units.map((u) => {
                      const isSelected = form.data.base_unit_id === String(u.id)
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => handleSelectBaseUnit(String(u.id))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-navy-900 text-white border-navy-900 shadow-xs font-semibold'
                              : 'bg-surface border-border text-content-muted hover:border-gray-400 hover:text-content'
                          }`}
                        >
                          {u.name} <span className="font-mono text-[10px] opacity-75">({u.code})</span>
                        </button>
                      )
                    })}
                  </div>
                  {form.errors.base_unit_id && <p className="text-sm text-danger">{form.errors.base_unit_id}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-desc">Deskripsi</Label>
                  <Textarea id="p-desc" value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} />
                </div>
                <div className="space-y-2 pt-1">
                  <Label className="text-xs font-semibold text-content">Opsi & Status Produk</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label
                      htmlFor="p-expirable"
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer select-none ${
                        form.data.is_expirable
                          ? 'bg-blue-50/60 border-blue-300 text-blue-950 dark:bg-blue-950/30 dark:border-blue-700 dark:text-blue-200 font-medium'
                          : 'bg-surface border-border text-content-muted hover:border-gray-300'
                      }`}
                    >
                      <Checkbox
                        id="p-expirable"
                        checked={form.data.is_expirable}
                        onCheckedChange={(c) => form.setData('is_expirable', c === true)}
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold">Produk Kadaluwarsa</span>
                        <span className="text-[10px] text-content-muted">Wajib tanggal saat terima barang</span>
                      </div>
                    </label>

                    <label
                      htmlFor="p-favorite"
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer select-none ${
                        form.data.is_favorite
                          ? 'bg-amber-50/60 border-amber-300 text-amber-950 dark:bg-amber-950/30 dark:border-amber-700 dark:text-amber-200 font-medium'
                          : 'bg-surface border-border text-content-muted hover:border-gray-300'
                      }`}
                    >
                      <Checkbox
                        id="p-favorite"
                        checked={form.data.is_favorite}
                        onCheckedChange={(c) => form.setData('is_favorite', c === true)}
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold">Favorit Kasir</span>
                        <span className="text-[10px] text-content-muted">Tombol akses cepat di kasir</span>
                      </div>
                    </label>

                    <label
                      htmlFor="p-public"
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer select-none ${
                        form.data.is_visible_public
                          ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-200 font-medium'
                          : 'bg-surface border-border text-content-muted hover:border-gray-300'
                      }`}
                    >
                      <Checkbox
                        id="p-public"
                        checked={form.data.is_visible_public}
                        onCheckedChange={(c) => form.setData('is_visible_public', c === true)}
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold">Storefront Publik</span>
                        <span className="text-[10px] text-content-muted">Tampil di katalog web publik</span>
                      </div>
                    </label>

                    <label
                      htmlFor="p-consignment"
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer select-none ${
                        form.data.is_consignment
                          ? 'bg-purple-50/60 border-purple-300 text-purple-950 dark:bg-purple-950/30 dark:border-purple-700 dark:text-purple-200 font-medium'
                          : 'bg-surface border-border text-content-muted hover:border-gray-300'
                      }`}
                    >
                      <Checkbox
                        id="p-consignment"
                        checked={form.data.is_consignment}
                        onCheckedChange={(c) => form.setData('is_consignment', c === true)}
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold">Barang Titipan (Konsinyasi)</span>
                        <span className="text-[10px] text-content-muted">Bukan aset mart, komisi diakui saat jual</span>
                      </div>
                    </label>

                    <label
                      htmlFor="p-active"
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer select-none ${
                        form.data.is_active
                          ? 'bg-indigo-50/60 border-indigo-300 text-indigo-950 dark:bg-indigo-950/30 dark:border-indigo-700 dark:text-indigo-200 font-medium'
                          : 'bg-surface border-border text-content-muted hover:border-gray-300'
                      }`}
                    >
                      <Checkbox
                        id="p-active"
                        checked={form.data.is_active}
                        onCheckedChange={(c) => form.setData('is_active', c === true)}
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold">Status Aktif</span>
                        <span className="text-[10px] text-content-muted">Produk dapat ditransaksikan</span>
                      </div>
                    </label>
                  </div>

                  {form.data.is_consignment && (
                    <div className="space-y-1.5 pt-2">
                      <Label htmlFor="p-consignment-percent">Komisi Mart (%)</Label>
                      <Input
                        id="p-consignment-percent"
                        type="number"
                        min={0}
                        max={100}
                        step="1"
                        placeholder="mis. 20"
                        value={form.data.consignment_percent}
                        onChange={(e) => form.setData('consignment_percent', e.target.value)}
                      />
                      <p className="text-[11px] text-content-muted">Persentase komisi yang dipotong mart saat barang titipan ini terjual di kasir.</p>
                      {form.errors.consignment_percent && <p className="text-sm text-danger">{form.errors.consignment_percent}</p>}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="barcode" className="flex flex-col gap-3">
                <div className="rounded-xl border border-border bg-surface-muted/40 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-content">Input Barcode Scanner USB</span>
                    </div>
                    {scannerTestResult ? (
                      <Badge className="bg-emerald-600 text-white text-[10px] font-bold shrink-0">
                        Scan Berhasil Terdeteksi! 🎉
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-content-muted shrink-0">
                        Siap Membaca
                      </Badge>
                    )}
                  </div>

                  {scannerTestResult ? (
                    <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-lg bg-surface p-2.5 border border-border text-xs">
                      <div>
                        <span className="text-[10px] text-content-muted block">Kode Terbaca</span>
                        <span className="font-mono font-bold text-blue-700 dark:text-blue-300">{scannerTestResult.code}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-content-muted block">Panjang Digit</span>
                        <span className="font-semibold text-content">{scannerTestResult.charCount} Karakter</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-content-muted block">Kecepatan Respon</span>
                        <span className="font-semibold text-emerald-600">Sangat Baik ({scannerTestResult.speedMs}ms/char)</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-content-muted block">Deteksi Suffix</span>
                        <span className="font-semibold text-content">{scannerTestResult.suffix}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-[11px] text-content-muted">
                      Tembakkan alat barcode scanner USB Anda ke kemasan produk. Hasil scan akan otomatis dimasukkan ke kolom di bawah.
                    </p>
                  )}
                </div>

                <p className="text-xs text-content-muted">
                  Arahkan kursor atau langsung tembakkan scanner ke kemasan produk, atau klik <strong>Auto EAN-13</strong>.
                </p>
                {form.data.barcodes.map((b, index) => (
                  <div key={index} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label>Kode Barcode #{index + 1}</Label>
                        {b.is_primary && <Badge className="text-[9px] bg-blue-600 text-white">Utama</Badge>}
                      </div>
                      <div className="flex gap-1.5">
                        <Input
                          ref={index === 0 ? firstBarcodeRef : undefined}
                          data-barcode-field="true"
                          placeholder="Scan barcode dengan alat atau ketik di sini…"
                          value={b.barcode}
                          onChange={(e) => updateBarcode(index, { barcode: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              verifyBarcodeScan(index, b.barcode)
                              addBarcode()
                            }
                          }}
                          onBlur={() => {
                            if (b.barcode.trim()) {
                              verifyBarcodeScan(index, b.barcode)
                            }
                          }}
                          className="font-mono text-xs flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          title="Generate Barcode EAN-13 Otomatis"
                          onClick={() => updateBarcode(index, { barcode: generateEan13() })}
                          className="gap-1 text-xs text-blue-700 bg-blue-50/50 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 shrink-0"
                        >
                          <Sparkles className="size-3.5 text-blue-600" />
                          Auto EAN-13
                        </Button>
                      </div>
                    </div>
                    <div className="w-28 space-y-1.5">
                      <Label>Satuan</Label>
                      <Select value={b.unit_id} onValueChange={(v) => updateBarcode(index, { unit_id: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Satuan" />
                        </SelectTrigger>
                        <SelectContent>
                          {units.map((u) => (
                            <SelectItem key={u.id} value={String(u.id)}>{u.code}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeBarcode(index)}>
                      <Trash2 className="size-4 text-danger" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addBarcode} className="w-fit">
                  <Plus className="size-3.5" /> Tambah Barcode Lain
                </Button>
              </TabsContent>

              {!editing && (
                <TabsContent value="harga" className="flex flex-col gap-4">
                  <div className="space-y-1.5">
                    <Label>Outlet</Label>
                    <Select value={form.data.price.outlet_id} onValueChange={(v) => form.setData('price', { ...form.data.price, outlet_id: v })}>
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
                  <div className="space-y-1.5">
                    <Label>Satuan Harga</Label>
                    <Select value={form.data.price.unit_id} onValueChange={(v) => form.setData('price', { ...form.data.price, unit_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih satuan" />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Harga Jual</Label>
                    <MoneyInput value={form.data.price.price} onChange={(v) => form.setData('price', { ...form.data.price, price: v })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Harga Anggota (opsional)</Label>
                    <MoneyInput
                      value={form.data.price.member_price ?? 0}
                      onChange={(v) => form.setData('price', { ...form.data.price, member_price: v || null })}
                    />
                  </div>
                </TabsContent>
              )}

              <TabsContent value="stok" className="flex flex-col gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="p-min">Stok Minimum</Label>
                  <Input
                    id="p-min"
                    type="number"
                    min={0}
                    value={form.data.min_stock}
                    onChange={(e) => form.setData('min_stock', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-max">Stok Maksimum</Label>
                  <Input
                    id="p-max"
                    type="number"
                    min={0}
                    value={form.data.max_stock}
                    onChange={(e) => form.setData('max_stock', e.target.value)}
                  />
                  {form.errors.max_stock && <p className="text-sm text-danger">{form.errors.max_stock}</p>}
                </div>
              </TabsContent>
            </Tabs>
          </form>
      </AppSheet>

      <Dialog open={priceDialogOpen} onOpenChange={setPriceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah Harga — {priceTarget?.name}</DialogTitle>
          </DialogHeader>
          <form id="price-form" onSubmit={submitPrice} className="flex flex-col gap-4">
            <p className="text-sm text-content-muted">
              Harga lama otomatis ditutup pada tanggal berlaku baru (riwayat harga tidak dihapus, hanya diakhiri).
            </p>
            <div className="space-y-1.5">
              <Label>Outlet</Label>
              <Select value={priceForm.data.outlet_id} onValueChange={(v) => priceForm.setData('outlet_id', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {outlets.map((o) => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Satuan Harga</Label>
              <Select value={priceForm.data.unit_id} onValueChange={(v) => priceForm.setData('unit_id', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {units.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.name} ({u.code})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Harga Jual Baru</Label>
              <MoneyInput value={priceForm.data.price} onChange={(v) => priceForm.setData('price', v)} />
              {priceForm.errors.price && <p className="text-sm text-danger">{priceForm.errors.price}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Harga Anggota (opsional)</Label>
              <MoneyInput value={priceForm.data.member_price ?? 0} onChange={(v) => priceForm.setData('member_price', v || null)} />
            </div>
            <div className="space-y-1.5">
              <Label>Berlaku Mulai</Label>
              <Input type="date" value={priceForm.data.effective_from} onChange={(e) => priceForm.setData('effective_from', e.target.value)} />
              {priceForm.errors.effective_from && <p className="text-sm text-danger">{priceForm.errors.effective_from}</p>}
            </div>
          </form>
          <DialogFooter>
            <Button type="submit" form="price-form" disabled={priceForm.processing}>Simpan Harga</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
