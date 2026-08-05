import { useThemeStore } from '@/Store/useThemeStore'

/**
 * T-093 (Fase 15). Recharts default-nya tema terang — tanpa ini,
 * sumbu/grid grafik jadi nyaris tak terbaca di mode gelap. Warna
 * persis sesuai CATATAN-PERBAIKAN.md §Fase15 (`axisColor`
 * #94A3B8 dark / #2E5490 light). Baca `.dark` di <html> langsung
 * (bukan hitung ulang logika resolveIsDark) karena itu SUMBER
 * KEBENARAN yang sudah diterapkan `applyTheme()` — subscribe ke
 * `theme` dari store supaya re-render saat ThemeToggle diklik.
 */
export function useChartColors() {
  const theme = useThemeStore((s) => s.theme)
  void theme

  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')

  return {
    isDark,
    axisColor: isDark ? '#94A3B8' : '#2E5490',
    gridColor: isDark ? '#334155' : '#E2E8F0',
    tooltipBg: isDark ? '#1E293B' : '#FFFFFF',
    tooltipBorder: isDark ? '#334155' : '#E2E8F0',
    // Persis token proyek (resources/css/app.css): navy-500, mustard-500,
    // teal, danger, warning, success — bukan hex sembarang.
    palette: ['#2e5490', '#c9a227', '#0f8b8d', '#b3261e', '#c77700', '#1e7a4c'],
  }
}
