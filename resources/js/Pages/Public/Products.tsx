import { useEffect, useRef, useState, type ReactElement } from 'react'
import { router } from '@inertiajs/react'
import PublicLayout from '@/Layouts/PublicLayout'
import { ProductCardPublic } from '@/Components/public/ProductCardPublic'
import { CategoryChips } from '@/Components/public/CategoryChips'
import { EmptyState } from '@/Components/common/EmptyState'
import { Input } from '@/Components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { Button } from '@/Components/ui/button'
import type { Paginated } from '@/Types'
import type { PublicProduct } from '@/Types/storefront'

type ProductsProps = {
  products: Paginated<PublicProduct>
  categories: { id: number; name: string }[]
  brands: { id: number; name: string }[]
  filters: { search?: string; category_id?: string; brand_id?: string; sort: string }
}

const SORT_OPTIONS = [
  { value: 'terbaru', label: 'Terbaru' },
  { value: 'nama', label: 'Nama A-Z' },
  { value: 'harga_asc', label: 'Harga Terendah' },
  { value: 'harga_desc', label: 'Harga Tertinggi' },
]

export default function Products({ products, categories, brands, filters }: ProductsProps) {
  const [search, setSearch] = useState(filters.search ?? '')
  const isFirstRender = useRef(true)

  // State filter di URL query (bukan React state) — bisa di-bookmark,
  // tombol back browser bekerja, SEO friendly (spec §3.2).
  function applyFilters(next: Partial<typeof filters>) {
    router.get(route('produk.index'), { ...filters, ...next }, { preserveState: true, replace: true })
  }

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false

      return
    }

    const timeout = setTimeout(() => applyFilters({ search: search || undefined }), 300)

    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  return (
    <div className="flex flex-col gap-6 py-4">
      <h1 className="text-2xl font-semibold text-content">Semua Produk</h1>

      <div className="flex flex-col gap-4">
        <Input
          placeholder="Cari produk..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />

        <CategoryChips
          categories={categories}
          active={filters.category_id ? Number(filters.category_id) : null}
          onChange={(id) => applyFilters({ category_id: id ? String(id) : undefined })}
        />

        <div className="flex flex-wrap gap-2">
          <Select value={filters.brand_id ?? 'all'} onValueChange={(v) => applyFilters({ brand_id: v === 'all' ? undefined : v })}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Semua Brand" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Brand</SelectItem>
              {brands.map((brand) => (
                <SelectItem key={brand.id} value={String(brand.id)}>{brand.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.sort} onValueChange={(v) => applyFilters({ sort: v })}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Terbaru" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {products.data.length === 0 ? (
        <EmptyState title="Produk tidak ditemukan" description="Coba ubah kata kunci atau filter pencarian." />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.data.map((product) => (
            <ProductCardPublic key={product.slug} product={product} />
          ))}
        </div>
      )}

      {products.last_page > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={products.current_page <= 1}
            onClick={() => router.get(route('produk.index'), { ...filters, page: products.current_page - 1 }, { preserveState: true })}
          >
            Sebelumnya
          </Button>
          <span className="text-sm text-content-muted">Halaman {products.current_page} / {products.last_page}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={products.current_page >= products.last_page}
            onClick={() => router.get(route('produk.index'), { ...filters, page: products.current_page + 1 }, { preserveState: true })}
          >
            Berikutnya
          </Button>
        </div>
      )}
    </div>
  )
}

Products.layout = (page: ReactElement) => <PublicLayout>{page}</PublicLayout>
