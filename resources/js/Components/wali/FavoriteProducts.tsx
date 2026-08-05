export type FavoriteProduct = { name: string; frequency: number; emoji: string }

type FavoriteProductsProps = {
  items: FavoriteProduct[]
}

/**
 * fase-16-v2.md §5 "Belanja Favorit Bulan Ini" — top 5 produk bulan
 * berjalan, ikon emoji ditebak dari nama produk (backend, tidak ada
 * kolom emoji per kategori di skema — lihat MemberController::guessEmoji()).
 */
export function FavoriteProducts({ items }: FavoriteProductsProps) {
  if (items.length === 0) {
    return <p className="text-sm text-content-muted">Belum ada data bulan ini</p>
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {items.map((item) => (
        <div key={item.name} className="flex items-center gap-3 py-2">
          <span className="text-lg leading-none">{item.emoji}</span>
          <p className="flex-1 text-sm text-content">{item.name}</p>
          <p className="text-sm font-medium text-content-muted">{item.frequency}x</p>
        </div>
      ))}
    </div>
  )
}
