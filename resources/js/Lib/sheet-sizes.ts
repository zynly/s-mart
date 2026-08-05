// REVISI-UI-KASIR.md §3.2 — lebar Sheet adaptif berdasarkan kompleksitas
// konten, bukan satu ukuran default (sm:max-w-sm) untuk semua form.
export type SheetSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

export const SHEET_WIDTHS: Record<SheetSize, string> = {
  sm: 'w-full sm:max-w-sm', // ~384px — konfirmasi sederhana
  md: 'w-full sm:max-w-lg', // ~512px — form ringan (1 tab)
  lg: 'w-full sm:max-w-2xl', // ~672px — form sedang (2-3 tab)
  xl: 'w-full sm:max-w-4xl', // ~896px — form kompleks (4+ tab)
  full: 'w-full sm:max-w-[90vw]', // 90% layar — form sangat kompleks
}
