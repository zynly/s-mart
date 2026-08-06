// REVISI-UI-KASIR.md §3.2 — lebar Sheet adaptif berdasarkan kompleksitas
// konten, bukan satu ukuran default (sm:max-w-sm) untuk semua form.
export type SheetSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

// Perbaikan lanjutan — semua ukuran digandakan persis 2x dari nilai
// asal (384/512/672/896px) via arbitrary value, supaya form yang tadi
// sesak (terutama xl: 4-6 tab) punya ruang layak. `full` tidak bisa
// literal 2x (90vw×2 > lebar layar), dinaikkan ke 96vw (nyaris penuh).
//
// PENTING: prefix WAJIB persis `data-[side=right]:sm:` (bukan cuma
// `sm:`) — SheetContent bawaan (resources/js/Components/ui/sheet.tsx)
// sudah punya class `data-[side=right]:sm:max-w-sm` (384px). Kalau di
// sini cuma ditulis `sm:max-w-[...]`, tailwind-merge menganggap
// modifier-nya BEDA (tidak dianggap konflik) sehingga class lama TETAP
// ada di output — dan karena attribute-selector `[data-side=right]`
// menambah spesifisitas CSS, aturan 384px lama itu yang menang di
// browser walau override ini taruh belakangan. Sudah pernah kejadian:
// lebar Sheet terlihat tidak berubah sama sekali meski value di sini
// sudah diganti.
export const SHEET_WIDTHS: Record<SheetSize, string> = {
  sm: 'w-full data-[side=right]:sm:max-w-[768px]', // 2× 384px — konfirmasi sederhana
  md: 'w-full data-[side=right]:sm:max-w-[1024px]', // 2× 512px — form ringan (1 tab)
  lg: 'w-full data-[side=right]:sm:max-w-[1344px]', // 2× 672px — form sedang (2-3 tab)
  xl: 'w-full data-[side=right]:sm:max-w-[1792px]', // 2× 896px — form kompleks (4+ tab)
  full: 'w-full data-[side=right]:sm:max-w-[96vw]', // hampir penuh layar — form sangat kompleks
}
