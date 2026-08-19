import { useState, useEffect, useRef, type FormEventHandler, type ReactElement } from 'react'
import { Link, router, useForm } from '@inertiajs/react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  MoreHorizontal, Plus, Trash2, Star, Eye, Sparkles, Pencil, DollarSign, Upload, ImageIcon,
  Package, QrCode, Tag, Boxes, Store, CheckCircle2, AlertCircle, Info, Ruler, Award, FileText, Check, Layers, ShieldCheck
} from 'lucide-react'
import { toast } from 'sonner'
import axios from 'axios'
import JsBarcode from 'jsbarcode'
import { QRCodeSVG } from 'qrcode.react'
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

function BarcodeQrPreview({ code, productName, unitName }: { code: string; productName?: string; unitName?: string }) {
  const barcodeRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (code && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, code, {
          format: code.length === 13 && /^\d+$/.test(code) ? 'EAN13' : 'CODE128',
          width: 1.6,
          height: 44,
          displayValue: true,
          fontSize: 11,
          margin: 4,
          background: '#ffffff',
          lineColor: '#0f172a',
        })
      } catch {
        try {
          JsBarcode(barcodeRef.current, code, {
            format: 'CODE128',
            width: 1.4,
            height: 42,
            displayValue: true,
            fontSize: 11,
            margin: 4,
            background: '#ffffff',
            lineColor: '#0f172a',
          })
        } catch {
          // ignore error
        }
      }
    }
  }, [code])

  const trimCode = code.trim()

  if (!trimCode) {
    return (
      <div className="flex h-20 items-center justify-center rounded-xl border border-dashed border-border bg-surface-muted/30 text-xs text-content-muted">
        <span>Belum ada kode barcode. Ketik atau scan kode di atas.</span>
      </div>
    )
  }

  return (
    <div className="mt-2.5 flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-blue-200/80 bg-gradient-to-r from-blue-50/60 via-surface to-indigo-50/50 p-3.5 dark:border-blue-900/40 dark:from-blue-950/20 dark:to-indigo-950/20 shadow-2xs">
      {/* Visual Kode QR */}
      <div className="flex flex-col items-center gap-1.5 shrink-0 bg-white p-2 rounded-xl border border-border shadow-xs">
        <QRCodeSVG value={trimCode} size={90} level="M" includeMargin />
        <div className="flex items-center gap-1 text-[10px] font-bold text-blue-700 dark:text-blue-400">
          <QrCode className="size-3" />
          <span>Kode QR</span>
        </div>
      </div>

      {/* Visual Barcode 1D & Detail Badge */}
      <div className="flex flex-1 flex-col items-center sm:items-start justify-center gap-1.5 w-full min-w-0">
        <div className="flex items-center gap-2">
          <Badge className="bg-navy-900 text-white font-mono text-[10px] uppercase font-bold">
            {trimCode.length === 13 && /^\d+$/.test(trimCode) ? 'EAN-13' : 'CODE-128'}
          </Badge>
          {unitName && (
            <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-800 dark:border-blue-700 dark:text-blue-300">
              Satuan: {unitName}
            </Badge>
          )}
        </div>
        <div className="overflow-x-auto max-w-full bg-white p-1.5 rounded-lg border border-border">
          <svg ref={barcodeRef} className="max-h-14" />
        </div>
        {productName && (
          <p className="text-[11px] font-medium text-content-muted truncate max-w-full">
            📦 {productName}
          </p>
        )}
      </div>
    </div>
  )
}

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
  // State untuk upload gambar di form
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

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
      checksum += parseInt(base.charAt(i)) * (i % 2 === 0 ? 1 : 3)
    }
    const checkDigit = (10 - (checksum % 10)) % 10
    return base + checkDigit
  }

  function openCreate() {
    setEditing(null)
    setActiveTab('umum')
    setImageFile(null)
    setImagePreview(null)
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
    setImageFile(null)
    setImagePreview(row.image_url)
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

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function uploadImageToProduct(productId: number) {
    if (!imageFile) return
    const fd = new FormData()
    fd.append('image', imageFile)
    fd.append('alt', form.data.name)
    setImageUploading(true)
    router.post(route('admin.products.upload-image', productId), fd, {
      preserveScroll: true,
      onFinish: () => setImageUploading(false),
      onSuccess: () => toast.success('Foto produk berhasil diunggah! 📸'),
      onError: (errs) => toast.error(errs.image ?? 'Gagal upload foto.'),
    })
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
      onSuccess: (page: any) => {
        toast.success(editing ? 'Produk Berhasil Diperbarui! 🎉' : 'Produk Berhasil Ditambahkan! 🎉', {
          description: `Produk "${form.data.name}" telah disimpan ke sistem.`,
          duration: 4000,
        })
        // Upload gambar jika ada file yang dipilih
        if (imageFile) {
          // Untuk create baru, ambil ID dari flash atau dari data terbaru
          const targetId = editing?.id ?? (page?.props?.flash?.new_product_id as number | undefined)
          if (targetId) {
            uploadImageToProduct(targetId)
          }
        }
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
          const firstMsg = (errorKeys[0] ? errors[errorKeys[0]] : null) || 'Mohon lengkapi data yang ditandai merah.'
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
            <img
              src={row.original.image_url ?? '/logo/logo2.png'}
              alt={row.original.name}
              className="size-full object-contain p-0.5"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo/logo2.png' }}
            />
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
        title={editing ? 'Ubah Produk' : 'Tambah Produk Baru'}
        description={editing ? `Sunting informasi & data produk "${editing.name}"` : 'Lengkapi informasi produk, barcode/QR, dan pengaturan persediaan.'}
        size="xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-content-muted">
              {editing ? `ID Produk: #${editing.id}` : 'Form Produk Baru'}
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
                Batal
              </Button>
              <Button type="submit" form="product-form" disabled={form.processing} className="gap-2 bg-navy-900 text-white hover:bg-navy-950">
                <CheckCircle2 className="size-4" />
                {editing ? 'Simpan Perubahan' : 'Simpan Produk'}
              </Button>
            </div>
          </div>
        }
      >
        <form id="product-form" onSubmit={submit} className="flex flex-col gap-5">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 h-11 p-1 bg-surface-muted/70 rounded-xl border border-border">
              <TabsTrigger value="umum" className="rounded-lg text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-navy-900 data-[state=active]:shadow-xs">
                <Package className="size-3.5 text-blue-600" />
                <span>Umum</span>
              </TabsTrigger>
              <TabsTrigger value="barcode" className="relative rounded-lg text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-navy-900 data-[state=active]:shadow-xs">
                <QrCode className="size-3.5 text-indigo-600" />
                <span>Barcode & QR</span>
                {Object.keys(form.errors).some((k) => k.startsWith('barcodes')) && (
                  <span className="ml-1 rounded-full bg-danger px-1.5 py-0.2 text-[9px] font-bold text-white animate-pulse">!</span>
                )}
              </TabsTrigger>
              {!editing && (
                <TabsTrigger value="harga" className="rounded-lg text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-navy-900 data-[state=active]:shadow-xs">
                  <Tag className="size-3.5 text-emerald-600" />
                  <span>Harga Awal</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="stok" className="rounded-lg text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-navy-900 data-[state=active]:shadow-xs">
                <Boxes className="size-3.5 text-amber-600" />
                <span>Stok Min-Maks</span>
              </TabsTrigger>
            </TabsList>

            {/* ── TAB 1: UMUM ── */}
            <TabsContent value="umum" className="mt-4 flex flex-col gap-4">
              {/* Card 1: Foto Produk */}
              <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                  <ImageIcon className="size-4 text-blue-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-navy-900">Foto Produk</h3>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-surface-muted/40 transition-colors hover:border-primary/50 shadow-2xs">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="size-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 p-2 text-center">
                        <ImageIcon className="size-6 text-content-muted/50" />
                        <span className="text-[10px] text-content-muted">Belum Ada Foto</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2 w-fit rounded-xl border-border bg-surface"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={imageUploading}
                    >
                      <Upload className="size-3.5 text-primary" />
                      {imagePreview ? 'Ganti Foto Produk' : 'Pilih Foto Produk'}
                    </Button>
                    {imageFile && (
                      <p className="text-[11px] font-medium text-emerald-600 max-w-[200px] truncate">
                        📎 {imageFile.name}
                      </p>
                    )}
                    {!imageFile && editing && !editing.image_url && (
                      <p className="text-[11px] text-amber-600">Menggunakan logo default mart</p>
                    )}
                    <p className="text-[10px] text-content-muted">Format JPG, PNG, WEBP (Maksimal 5MB)</p>
                  </div>
                </div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleImageSelect}
                />
              </div>

              {/* Card 2: Identitas Utama (SKU & Nama) */}
              <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                  <FileText className="size-4 text-indigo-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-navy-900">Identitas Produk</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5 sm:col-span-1">
                    <Label htmlFor="p-sku" className="text-xs font-semibold text-content">Kode SKU</Label>
                    <Input
                      id="p-sku"
                      placeholder="mis. SKU-0012"
                      value={form.data.sku}
                      onChange={(e) => form.setData('sku', e.target.value)}
                      className="font-mono text-xs rounded-xl"
                    />
                    {form.errors.sku && <p className="text-xs text-danger font-medium">{form.errors.sku}</p>}
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="p-name" className="text-xs font-semibold text-content">Nama Produk <span className="text-danger">*</span></Label>
                    <Input
                      id="p-name"
                      placeholder="Masukkan nama produk..."
                      value={form.data.name}
                      onChange={(e) => form.setData('name', e.target.value)}
                      className="text-xs font-medium rounded-xl"
                    />
                    {form.errors.name && <p className="text-xs text-danger font-medium">{form.errors.name}</p>}
                  </div>
                </div>
              </div>

              {/* Card 3: Klasifikasi (Kategori, Brand, Satuan) */}
              <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                  <Award className="size-4 text-emerald-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-navy-900">Klasifikasi & Satuan</h3>
                </div>

                {/* Kategori */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-content">Kategori Produk</Label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => form.setData('category_id', '')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                        !form.data.category_id
                          ? 'bg-navy-900 text-white border-navy-900 shadow-xs font-semibold'
                          : 'bg-surface-muted/60 border-border text-content-muted hover:border-gray-400 hover:text-content'
                      }`}
                    >
                      Tanpa Kategori
                    </button>
                    {categories.map((c) => {
                      const isSelected = form.data.category_id === String(c.id)
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => form.setData('category_id', String(c.id))}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-navy-900 text-white border-navy-900 shadow-xs font-semibold'
                              : 'bg-surface-muted/60 border-border text-content-muted hover:border-gray-400 hover:text-content'
                          }`}
                        >
                          {c.name}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Brand */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-content">Brand / Merek</Label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => form.setData('brand_id', '')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                        !form.data.brand_id
                          ? 'bg-navy-900 text-white border-navy-900 shadow-xs font-semibold'
                          : 'bg-surface-muted/60 border-border text-content-muted hover:border-gray-400 hover:text-content'
                      }`}
                    >
                      Tanpa Brand
                    </button>
                    {brands.map((b) => {
                      const isSelected = form.data.brand_id === String(b.id)
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => form.setData('brand_id', String(b.id))}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-navy-900 text-white border-navy-900 shadow-xs font-semibold'
                              : 'bg-surface-muted/60 border-border text-content-muted hover:border-gray-400 hover:text-content'
                          }`}
                        >
                          {b.name}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Satuan Dasar */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-content">Satuan Dasar <span className="text-danger">*</span></Label>
                  <div className="flex flex-wrap gap-1.5">
                    {units.map((u) => {
                      const isSelected = form.data.base_unit_id === String(u.id)
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => handleSelectBaseUnit(String(u.id))}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-navy-900 text-white border-navy-900 shadow-xs font-semibold'
                              : 'bg-surface-muted/60 border-border text-content-muted hover:border-gray-400 hover:text-content'
                          }`}
                        >
                          {u.name} <span className="font-mono text-[10px] opacity-75">({u.code})</span>
                        </button>
                      )
                    })}
                  </div>
                  {form.errors.base_unit_id && <p className="text-xs text-danger font-medium">{form.errors.base_unit_id}</p>}
                </div>
              </div>

              {/* Card 4: Deskripsi & Catatan */}
              <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-2xs space-y-2">
                <Label htmlFor="p-desc" className="text-xs font-semibold text-content">Deskripsi Produk (Opsional)</Label>
                <Textarea
                  id="p-desc"
                  rows={2}
                  placeholder="Catatan internal atau rincian deskripsi produk..."
                  value={form.data.description}
                  onChange={(e) => form.setData('description', e.target.value)}
                  className="text-xs rounded-xl"
                />
              </div>

              {/* Card 5: Opsi & Status Produk */}
              <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                  <ShieldCheck className="size-4 text-amber-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-navy-900">Opsi & Status Produk</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    htmlFor="p-expirable"
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                      form.data.is_expirable
                        ? 'bg-blue-50/70 border-blue-300 text-blue-950 dark:bg-blue-950/40 dark:border-blue-700 dark:text-blue-200'
                        : 'bg-surface border-border text-content-muted hover:border-gray-300'
                    }`}
                  >
                    <Checkbox
                      id="p-expirable"
                      checked={form.data.is_expirable}
                      onCheckedChange={(c) => form.setData('is_expirable', c === true)}
                      className="mt-0.5"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-navy-950 dark:text-white">Produk Kadaluwarsa</span>
                      <span className="text-[10px] text-content-muted">Wajib tanggal kadaluwarsa saat terima barang</span>
                    </div>
                  </label>

                  <label
                    htmlFor="p-favorite"
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                      form.data.is_favorite
                        ? 'bg-amber-50/70 border-amber-300 text-amber-950 dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-200'
                        : 'bg-surface border-border text-content-muted hover:border-gray-300'
                    }`}
                  >
                    <Checkbox
                      id="p-favorite"
                      checked={form.data.is_favorite}
                      onCheckedChange={(c) => form.setData('is_favorite', c === true)}
                      className="mt-0.5"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-navy-950 dark:text-white">Favorit Kasir</span>
                      <span className="text-[10px] text-content-muted">Tampil di tombol akses cepat layar kasir</span>
                    </div>
                  </label>

                  <label
                    htmlFor="p-public"
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                      form.data.is_visible_public
                        ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-200'
                        : 'bg-surface border-border text-content-muted hover:border-gray-300'
                    }`}
                  >
                    <Checkbox
                      id="p-public"
                      checked={form.data.is_visible_public}
                      onCheckedChange={(c) => form.setData('is_visible_public', c === true)}
                      className="mt-0.5"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-navy-950 dark:text-white">Storefront Publik</span>
                      <span className="text-[10px] text-content-muted">Ditampilkan di katalog web publik mart</span>
                    </div>
                  </label>

                  <label
                    htmlFor="p-consignment"
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                      form.data.is_consignment
                        ? 'bg-purple-50/70 border-purple-300 text-purple-950 dark:bg-purple-950/40 dark:border-purple-700 dark:text-purple-200'
                        : 'bg-surface border-border text-content-muted hover:border-gray-300'
                    }`}
                  >
                    <Checkbox
                      id="p-consignment"
                      checked={form.data.is_consignment}
                      onCheckedChange={(c) => form.setData('is_consignment', c === true)}
                      className="mt-0.5"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-navy-950 dark:text-white">Barang Titipan (Konsinyasi)</span>
                      <span className="text-[10px] text-content-muted">Bukan aset mart, komisi diakui saat terjual</span>
                    </div>
                  </label>

                  <label
                    htmlFor="p-active"
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none sm:col-span-2 ${
                      form.data.is_active
                        ? 'bg-indigo-50/70 border-indigo-300 text-indigo-950 dark:bg-indigo-950/40 dark:border-indigo-700 dark:text-indigo-200'
                        : 'bg-surface border-border text-content-muted hover:border-gray-300'
                    }`}
                  >
                    <Checkbox
                      id="p-active"
                      checked={form.data.is_active}
                      onCheckedChange={(c) => form.setData('is_active', c === true)}
                      className="mt-0.5"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-navy-950 dark:text-white">Status Produk Aktif</span>
                      <span className="text-[10px] text-content-muted">Produk aktif dapat ditransaksikan di kasir & stok</span>
                    </div>
                  </label>
                </div>

                {form.data.is_consignment && (
                  <div className="space-y-1.5 pt-2 border-t border-border/60">
                    <Label htmlFor="p-consignment-percent" className="text-xs font-semibold text-content">Komisi Mart (%)</Label>
                    <Input
                      id="p-consignment-percent"
                      type="number"
                      min={0}
                      max={100}
                      step="1"
                      placeholder="mis. 20"
                      value={form.data.consignment_percent}
                      onChange={(e) => form.setData('consignment_percent', e.target.value)}
                      className="text-xs rounded-xl max-w-xs"
                    />
                    <p className="text-[11px] text-content-muted">Persentase komisi yang dipotong mart saat barang titipan ini terjual di kasir.</p>
                    {form.errors.consignment_percent && <p className="text-xs text-danger font-medium">{form.errors.consignment_percent}</p>}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── TAB 2: BARCODE & KODE QR ── */}
            <TabsContent value="barcode" className="mt-4 flex flex-col gap-4">
              {/* Banner Status Scanner USB */}
              <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/70 via-surface to-blue-50/60 p-4 shadow-2xs dark:border-indigo-900/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="size-4 text-indigo-600" />
                    <span className="text-xs font-bold text-navy-950 dark:text-white">Hardware Barcode & QR Scanner USB</span>
                  </div>
                  {scannerTestResult ? (
                    <Badge className="bg-emerald-600 text-white text-[10px] font-bold shrink-0">
                      Scan Terdeteksi! 🎉
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-indigo-700 border-indigo-300 dark:border-indigo-700 dark:text-indigo-300 shrink-0">
                      Siap Membaca
                    </Badge>
                  )}
                </div>

                {scannerTestResult ? (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl bg-white p-3 border border-border text-xs shadow-2xs">
                    <div>
                      <span className="text-[10px] text-content-muted block">Kode Terbaca</span>
                      <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400">{scannerTestResult.code}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-content-muted block">Panjang Digit</span>
                      <span className="font-semibold text-content">{scannerTestResult.charCount} Karakter</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-content-muted block">Kecepatan Respon</span>
                      <span className="font-semibold text-emerald-600">{scannerTestResult.speedMs}ms/char</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-content-muted block">Status</span>
                      <span className="font-semibold text-emerald-600">Tersimpan</span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1.5 text-[11px] text-content-muted leading-relaxed">
                    Arahkan kursor atau langsung tembakkan scanner USB Anda ke kemasan produk. Hasil scan otomatis masuk &amp; menghasilkan kode QR visual.
                  </p>
                )}
              </div>

              {/* List Barcode & QR rendering */}
              <div className="space-y-4">
                {form.data.barcodes.map((b, index) => {
                  const selectedUnit = units.find((u) => String(u.id) === b.unit_id)
                  return (
                    <div key={index} className="rounded-2xl border border-border/80 bg-surface p-4 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between border-b border-border/60 pb-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-navy-900 text-white font-mono text-[10px]">
                            Barcode #{index + 1}
                          </Badge>
                          {b.is_primary && <Badge className="bg-blue-600 text-white text-[9px] font-bold">Utama</Badge>}
                        </div>
                        {form.data.barcodes.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBarcode(index)}
                            className="text-danger hover:bg-danger/10 text-xs gap-1 h-7"
                          >
                            <Trash2 className="size-3.5" /> Hapus
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                        <div className="sm:col-span-8 space-y-1.5">
                          <Label className="text-xs font-semibold text-content">Kode Barcode / QR</Label>
                          <div className="flex gap-1.5">
                            <Input
                              ref={index === 0 ? firstBarcodeRef : undefined}
                              data-barcode-field="true"
                              placeholder="Scan atau ketik kode barcode..."
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
                              className="font-mono text-xs flex-1 rounded-xl"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              title="Generate Barcode EAN-13 Otomatis"
                              onClick={() => updateBarcode(index, { barcode: generateEan13() })}
                              className="gap-1 text-xs text-blue-700 bg-blue-50/50 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 shrink-0 rounded-xl"
                            >
                              <Sparkles className="size-3.5 text-blue-600" />
                              Auto EAN-13
                            </Button>
                          </div>
                        </div>

                        <div className="sm:col-span-4 space-y-1.5">
                          <Label className="text-xs font-semibold text-content">Satuan Kemasan</Label>
                          <Select value={b.unit_id} onValueChange={(v) => updateBarcode(index, { unit_id: v })}>
                            <SelectTrigger className="rounded-xl text-xs">
                              <SelectValue placeholder="Pilih Satuan" />
                            </SelectTrigger>
                            <SelectContent>
                              {units.map((u) => (
                                <SelectItem key={u.id} value={String(u.id)}>{u.name} ({u.code})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Visual QR Code & Barcode Graphic Rendering */}
                      <BarcodeQrPreview
                        code={b.barcode}
                        productName={form.data.name}
                        unitName={selectedUnit?.code}
                      />
                    </div>
                  )
                })}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addBarcode}
                className="w-fit gap-2 rounded-xl border-dashed border-border"
              >
                <Plus className="size-4" /> Tambah Barcode / QR Lain
              </Button>
            </TabsContent>

            {/* ── TAB 3: HARGA AWAL (Hanya Saat Create Produk Baru) ── */}
            {!editing && (
              <TabsContent value="harga" className="mt-4 flex flex-col gap-4">
                <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/60 via-surface to-teal-50/50 p-4 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-emerald-200/60 pb-2">
                    <Tag className="size-4 text-emerald-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-navy-900">Harga Jual Awal</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-content">Outlet</Label>
                      <Select value={form.data.price.outlet_id} onValueChange={(v) => form.setData('price', { ...form.data.price, outlet_id: v })}>
                        <SelectTrigger className="rounded-xl text-xs">
                          <SelectValue placeholder="Pilih outlet..." />
                        </SelectTrigger>
                        <SelectContent>
                          {outlets.map((o) => (
                            <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-content">Satuan Harga</Label>
                      <Select value={form.data.price.unit_id} onValueChange={(v) => form.setData('price', { ...form.data.price, unit_id: v })}>
                        <SelectTrigger className="rounded-xl text-xs">
                          <SelectValue placeholder="Pilih satuan..." />
                        </SelectTrigger>
                        <SelectContent>
                          {units.map((u) => (
                            <SelectItem key={u.id} value={String(u.id)}>{u.name} ({u.code})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-content">Harga Jual Normal (Rp) <span className="text-danger">*</span></Label>
                      <MoneyInput
                        value={form.data.price.price}
                        onChange={(v) => form.setData('price', { ...form.data.price, price: v })}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-content">Harga Khusus Anggota (Opsional)</Label>
                      <MoneyInput
                        value={form.data.price.member_price ?? 0}
                        onChange={(v) => form.setData('price', { ...form.data.price, member_price: v || null })}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            )}

            {/* ── TAB 4: STOK MIN-MAKS ── */}
            <TabsContent value="stok" className="mt-4 flex flex-col gap-4">
              <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50/60 via-surface to-orange-50/50 p-4 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 border-b border-amber-200/60 pb-2">
                  <Boxes className="size-4 text-amber-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-navy-900">Batas Minimum &amp; Maksimum Stok</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="p-min" className="text-xs font-semibold text-content">Stok Minimum (Alert Restok)</Label>
                    <Input
                      id="p-min"
                      type="number"
                      min={0}
                      placeholder="mis. 5"
                      value={form.data.min_stock}
                      onChange={(e) => form.setData('min_stock', Number(e.target.value))}
                      className="text-xs rounded-xl"
                    />
                    <p className="text-[11px] text-content-muted">Sistem akan memberi peringatan jika stok produk di bawah batas ini.</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="p-max" className="text-xs font-semibold text-content">Stok Maksimum (Gudang)</Label>
                    <Input
                      id="p-max"
                      type="number"
                      min={0}
                      placeholder="mis. 100"
                      value={form.data.max_stock}
                      onChange={(e) => form.setData('max_stock', e.target.value)}
                      className="text-xs rounded-xl"
                    />
                    <p className="text-[11px] text-content-muted">Batas kapasitas maksimal stok produk yang disarankan di mart.</p>
                    {form.errors.max_stock && <p className="text-xs text-danger font-medium">{form.errors.max_stock}</p>}
                  </div>
                </div>
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
