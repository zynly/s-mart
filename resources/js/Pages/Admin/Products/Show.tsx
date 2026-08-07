import { useState, type FormEventHandler, type ReactElement } from 'react'
import { Link, router, useForm } from '@inertiajs/react'
import { ArrowLeft, Star, Edit, DollarSign, Package, Tag, Barcode, Eye, Plus, Trash2, Printer, Sparkles } from 'lucide-react'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { Money } from '@/Components/common/Money'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Badge } from '@/Components/ui/badge'
import { Switch } from '@/Components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'

type BarcodeItem = {
  id: number
  barcode: string
  is_primary: boolean
  unit?: { id: number; code: string; name: string }
}

type PriceItem = {
  id: number
  price: number
  member_price: number | null
  outlet?: { id: number; name: string }
  unit?: { id: number; code: string; name: string }
}

type ProductImageItem = {
  id: number
  url: string
  alt?: string
  is_primary: boolean
}

type ProductDetail = {
  id: number
  sku: string
  name: string
  description: string | null
  description_public: string | null
  is_active: boolean
  is_favorite: boolean
  is_visible_public: boolean
  is_expirable: boolean
  is_consignment: boolean
  consignment_percent: number | null
  min_stock: number
  max_stock: number | null
  category?: { id: number; name: string } | null
  brand?: { id: number; name: string } | null
  base_unit?: { id: number; code: string; name: string } | null
  barcodes: BarcodeItem[]
  prices: PriceItem[]
  formatted_images: ProductImageItem[]
}

type ShowProps = {
  product: ProductDetail
}

export default function Show({ product }: ShowProps) {
  const primaryImage = product.formatted_images.find((img) => img.is_primary) ?? product.formatted_images[0]
  const [activeImage, setActiveImage] = useState<string | null>(primaryImage?.url ?? null)
  const [addBarcodeOpen, setAddBarcodeOpen] = useState(false)
  const [selectedBarcodeForPrint, setSelectedBarcodeForPrint] = useState<BarcodeItem | null>(null)

  const barcodeForm = useForm({
    barcode: '',
    unit_id: product.base_unit ? String(product.base_unit.id) : '1',
    is_primary: product.barcodes.length === 0,
  })

  function toggleFavorite() {
    router.put(route('admin.products.toggle-favorite', product.id), {}, { preserveScroll: true })
  }

  function submitAddBarcode(e: React.FormEvent) {
    e.preventDefault()
    barcodeForm.post(route('admin.products.add-barcode', product.id), {
      preserveScroll: true,
      onSuccess: () => {
        setAddBarcodeOpen(false)
        barcodeForm.setData('barcode', '')
      },
    })
  }

  function handleDeleteBarcode(b: BarcodeItem) {
    if (confirm(`Hapus barcode "${b.barcode}"?`)) {
      router.delete(route('admin.products.delete-barcode', [product.id, b.id]), { preserveScroll: true })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={product.name}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Produk', href: route('admin.products.index') },
          { label: product.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={product.is_favorite ? 'default' : 'outline'}
              size="sm"
              onClick={toggleFavorite}
              className={product.is_favorite ? 'bg-mustard-500 text-navy-900 hover:bg-mustard-400' : ''}
            >
              <Star className={`size-4 ${product.is_favorite ? 'fill-current' : ''}`} />
              {product.is_favorite ? 'Favorit' : 'Tandai Favorit'}
            </Button>
            <Link href={route('admin.products.index')}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="size-4" /> Kembali
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Gallery & Product Info */}
        <div className="flex flex-col gap-6 lg:col-span-5">
          {/* Main Photo Gallery Card */}
          <Card className="overflow-hidden border border-border shadow-xs">
            <CardHeader className="bg-surface-muted border-b border-border py-3">
              <CardTitle className="text-xs uppercase tracking-wider text-content-muted font-bold flex items-center gap-2">
                <Eye className="size-4 text-primary" />
                Pratinjau Foto Produk
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex flex-col gap-3">
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-surface border border-border flex items-center justify-center shadow-xs">
                {activeImage ? (
                  <img src={activeImage} alt={product.name} className="size-full object-contain p-2" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-content-muted">
                    <Package className="size-12 opacity-30" />
                    <span className="text-xs">Belum ada foto produk</span>
                  </div>
                )}
              </div>

              {product.formatted_images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {product.formatted_images.map((img) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setActiveImage(img.url)}
                      className={`size-14 shrink-0 overflow-hidden rounded-lg border-2 p-0.5 transition ${activeImage === img.url ? 'border-primary shadow-xs' : 'border-border opacity-70 hover:opacity-100'}`}
                    >
                      <img src={img.url} alt={img.alt ?? product.name} className="size-full object-cover rounded-md" />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Overview Card */}
          <Card className="border border-border shadow-xs">
            <CardHeader className="bg-surface-muted border-b border-border py-3">
              <CardTitle className="text-xs uppercase tracking-wider text-content-muted font-bold flex items-center gap-2">
                <Tag className="size-4 text-primary" />
                Informasi Utama
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex flex-col gap-3.5 text-xs">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <span className="text-content-muted font-medium">SKU</span>
                <span className="font-mono font-bold text-content text-sm">{product.sku}</span>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <span className="text-content-muted font-medium">Kategori</span>
                <span className="font-semibold text-content">{product.category?.name ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <span className="text-content-muted font-medium">Brand</span>
                <span className="font-semibold text-content">{product.brand?.name ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <span className="text-content-muted font-medium">Satuan Dasar</span>
                <span className="font-semibold text-content">{product.base_unit ? `${product.base_unit.name} (${product.base_unit.code})` : '—'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <span className="text-content-muted font-medium">Status Keaktifan</span>
                {product.is_active ? (
                  <Badge className="bg-success text-white">
                    <CheckCircle2 className="size-3 mr-1" /> Aktif
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="size-3 mr-1" /> Nonaktif
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <span className="text-content-muted font-medium">Tag Favorit</span>
                {product.is_favorite ? (
                  <Badge className="bg-mustard-500 text-navy-900 font-bold">
                    <Star className="size-3 mr-1 fill-current" /> Favorit Kasir
                  </Badge>
                ) : (
                  <span className="text-content-muted">Bukan Favorit</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-content-muted font-medium">Storefront Publik</span>
                {product.is_visible_public ? (
                  <Badge className="bg-teal text-white">Tampil di Publik</Badge>
                ) : (
                  <span className="text-content-muted">Disembunyikan</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Pricing, Barcodes, Stock Rules & Description */}
        <div className="flex flex-col gap-6 lg:col-span-7">
          {/* Price & Outlet Card */}
          <Card className="border border-border shadow-xs">
            <CardHeader className="bg-surface-muted border-b border-border py-3 flex flex-row items-center justify-between">
              <CardTitle className="text-xs uppercase tracking-wider text-content-muted font-bold flex items-center gap-2">
                <DollarSign className="size-4 text-emerald-600" />
                Daftar Harga & Outlet
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-muted text-content-muted uppercase text-[10px] font-bold border-b border-border">
                    <tr>
                      <th className="px-4 py-2.5">Outlet</th>
                      <th className="px-4 py-2.5">Satuan</th>
                      <th className="px-4 py-2.5 text-right">Harga Jual</th>
                      <th className="px-4 py-2.5 text-right">Harga Anggota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {product.prices.length > 0 ? (
                      product.prices.map((p) => (
                        <tr key={p.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3 font-semibold text-content">{p.outlet?.name ?? 'Utama'}</td>
                          <td className="px-4 py-3 text-content-muted">{p.unit?.code ?? product.base_unit?.code}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-content">
                            <Money amount={p.price} />
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600">
                            {p.member_price ? <Money amount={p.member_price} /> : '—'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-4 text-center text-content-muted">Belum ada harga diset.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Barcode Card */}
          <Card className="border border-border shadow-xs">
            <CardHeader className="bg-surface-muted border-b border-border py-3 flex flex-row items-center justify-between">
              <CardTitle className="text-xs uppercase tracking-wider text-content-muted font-bold flex items-center gap-2">
                <Barcode className="size-4 text-blue-600" />
                Kode Barcode Terdaftar
              </CardTitle>
              <Button size="xs" variant="outline" onClick={() => setAddBarcodeOpen(true)} className="gap-1 text-xs">
                <Plus className="size-3.5" /> Tambah Barcode
              </Button>
            </CardHeader>
            <CardContent className="p-4 flex flex-col gap-2">
              {product.barcodes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {product.barcodes.map((b) => (
                    <div key={b.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-2xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <Barcode className="size-4 text-blue-600 shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="font-mono font-bold tracking-wider text-content truncate">{b.barcode}</span>
                          <div className="flex items-center gap-1">
                            {b.is_primary && <Badge className="bg-blue-600 text-white text-[8px] px-1 py-0">Utama</Badge>}
                            {b.unit && <span className="text-[10px] text-content-muted font-mono">({b.unit.code})</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          title="Cetak Label Barcode"
                          onClick={() => setSelectedBarcodeForPrint(b)}
                        >
                          <Printer className="size-3.5 text-content-muted hover:text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          title="Hapus Barcode"
                          onClick={() => handleDeleteBarcode(b)}
                        >
                          <Trash2 className="size-3.5 text-danger" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-lg border border-dashed border-border bg-surface-muted text-xs text-content-muted">
                  <span>Belum ada kode barcode terdaftar untuk produk ini.</span>
                  <Button size="xs" onClick={() => setAddBarcodeOpen(true)}>
                    <Plus className="size-3 mr-1" /> Tambah Kode
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stock & Expiry Rules Card */}
          <Card className="border border-border shadow-xs">
            <CardHeader className="bg-surface-muted border-b border-border py-3">
              <CardTitle className="text-xs uppercase tracking-wider text-content-muted font-bold flex items-center gap-2">
                <Package className="size-4 text-amber-600" />
                Aturan Stok & Kadaluwarsa
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="rounded-lg border border-border p-3 space-y-1">
                <span className="text-content-muted font-medium">Stok Minimum</span>
                <p className="font-mono text-base font-bold text-content">{product.min_stock} {product.base_unit?.code}</p>
              </div>
              <div className="rounded-lg border border-border p-3 space-y-1">
                <span className="text-content-muted font-medium">Stok Maksimum</span>
                <p className="font-mono text-base font-bold text-content">{product.max_stock ?? '—'} {product.base_unit?.code}</p>
              </div>
              <div className="rounded-lg border border-border p-3 flex items-center justify-between">
                <span className="text-content-muted font-medium">Produk Kadaluwarsa</span>
                {product.is_expirable ? <Badge className="bg-amber-500 text-white">Ya</Badge> : <Badge variant="outline">Tidak</Badge>}
              </div>
              <div className="rounded-lg border border-border p-3 flex items-center justify-between">
                <span className="text-content-muted font-medium">Sistem Konsinyasi</span>
                {product.is_consignment ? (
                  <Badge className="bg-indigo-600 text-white">Ya ({product.consignment_percent}%)</Badge>
                ) : (
                  <Badge variant="outline">Tidak</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Descriptions Card */}
          {(product.description || product.description_public) && (
            <Card className="border border-border shadow-xs">
              <CardHeader className="bg-surface-muted border-b border-border py-3">
                <CardTitle className="text-xs uppercase tracking-wider text-content-muted font-bold">Deskripsi Produk</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                {product.description && (
                  <div>
                    <span className="font-bold text-content block mb-1">Deskripsi Internal</span>
                    <p className="text-content-muted leading-relaxed whitespace-pre-line">{product.description}</p>
                  </div>
                )}
                {product.description_public && (
                  <div>
                    <span className="font-bold text-content block mb-1">Deskripsi Storefront Publik</span>
                    <p className="text-content-muted leading-relaxed whitespace-pre-line">{product.description_public}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog Modal: Tambah Barcode Baru */}
      <Dialog open={addBarcodeOpen} onOpenChange={setAddBarcodeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Barcode className="size-5 text-blue-600" />
              Tambah Barcode — {product.name}
            </DialogTitle>
          </DialogHeader>
          <form id="add-barcode-form" onSubmit={submitAddBarcode} className="flex flex-col gap-4 py-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="b-code">Kode Barcode</Label>
                <span className="text-[11px] text-content-muted">Kosongkan untuk **Auto-Generate**</span>
              </div>
              <div className="relative">
                <Input
                  id="b-code"
                  placeholder="Kosongkan untuk generate otomatis EAN-13"
                  value={barcodeForm.data.barcode}
                  onChange={(e) => barcodeForm.setData('barcode', e.target.value)}
                  className="font-mono"
                />
                {!barcodeForm.data.barcode && (
                  <Badge variant="secondary" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] bg-blue-50 text-blue-700 pointer-events-none">
                    <Sparkles className="size-3 mr-1" /> Auto EAN-13
                  </Badge>
                )}
              </div>
              {barcodeForm.errors.barcode && (
                <p className="text-xs text-danger font-medium">{barcodeForm.errors.barcode}</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="b-primary"
                checked={barcodeForm.data.is_primary}
                onCheckedChange={(c) => barcodeForm.setData('is_primary', c)}
              />
              <Label htmlFor="b-primary" className="font-medium text-xs cursor-pointer">
                Set sebagai Barcode Utama
              </Label>
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setAddBarcodeOpen(false)}>
              Batal
            </Button>
            <Button type="submit" form="add-barcode-form" disabled={barcodeForm.processing}>
              Simpan Barcode
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Modal: Pratinjau & Cetak Label Barcode */}
      <Dialog open={!!selectedBarcodeForPrint} onOpenChange={(open) => !open && setSelectedBarcodeForPrint(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Printer className="size-5 text-primary" />
              Cetak Label Barcode Produk
            </DialogTitle>
          </DialogHeader>

          {selectedBarcodeForPrint && (
            <div className="flex flex-col items-center gap-4 py-4">
              {/* Thermal Label Card Preview */}
              <div className="w-full max-w-[280px] border-2 border-dashed border-gray-400 bg-white p-4 rounded-xl shadow-xs text-center font-sans text-gray-900">
                <span className="block text-[11px] font-extrabold uppercase tracking-widest text-navy-900">SKILLAGE MART</span>
                <p className="mt-1 text-xs font-bold leading-tight line-clamp-2 text-gray-900">{product.name}</p>
                <div className="my-2.5 flex flex-col items-center justify-center border-y border-gray-200 py-2 bg-gray-50/50 rounded-md">
                  {/* Visual Barcode SVG Stripes */}
                  <div className="h-10 w-full flex items-center justify-center gap-[2px] px-4">
                    {Array.from({ length: 38 }).map((_, i) => (
                      <span
                        key={i}
                        className={`h-full ${i % 7 === 0 || i % 11 === 0 ? 'w-[3px] bg-black' : i % 3 === 0 ? 'w-[1px] bg-black' : 'w-[2px] bg-gray-800'}`}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-xs font-bold tracking-widest text-gray-900 mt-1">
                    {selectedBarcodeForPrint.barcode}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <span className="font-mono text-[10px] text-gray-500">{product.sku}</span>
                  <span className="font-mono font-extrabold text-sm text-gray-900">
                    {product.prices[0] ? <Money amount={product.prices[0].price} /> : 'Rp —'}
                  </span>
                </div>
              </div>

              <p className="text-xs text-content-muted text-center max-w-xs">
                Label ini siap dicetak ke printer label thermal/sticker (58mm / 80mm).
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setSelectedBarcodeForPrint(null)}>
              Tutup
            </Button>
            <Button type="button" onClick={() => window.print()} className="gap-2">
              <Printer className="size-4" /> Cetak Label Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

Show.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
