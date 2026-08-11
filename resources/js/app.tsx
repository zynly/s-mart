import '../css/app.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'

import { createInertiaApp } from '@inertiajs/react'
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import { route as ziggyRoute } from 'ziggy-js'
import type { ComponentType } from 'react'

const appName = import.meta.env.VITE_APP_NAME || 'Skillage Mart'

// ── Inisialisasi tema saat app boot ──────────────────────────────────────────
// Baca dari localStorage; jika belum ada, default = 'light'.
// Ini harus dieksekusi SEBELUM React mount agar tidak ada flash/flicker.
;(function initTheme() {
  const saved = localStorage.getItem('theme') ?? 'light'
  const isDark =
    saved === 'dark' ||
    (saved === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', isDark)
  // Pastikan localStorage selalu terisi supaya Zustand tidak jatuh ke 'system'
  if (!localStorage.getItem('theme')) {
    localStorage.setItem('theme', 'light')
  }
})()
// ─────────────────────────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function route(name?: string, params?: any, absolute?: boolean): string
}

createInertiaApp({
  title: (title) => (title ? `${title} - ${appName}` : appName),
  resolve: (name) =>
    // any: resolvePageComponent mengembalikan modul glob mentah ({ default }),
    // sedangkan tipe ComponentResolver dari @inertiajs/react hanya mengizinkan
    // Promise<Component> langsung — unwrap manual di boundary ini.
    resolvePageComponent(`./Pages/${name}.tsx`, import.meta.glob('./Pages/**/*.tsx')).then(
      (module: any) => module.default as ComponentType,
    ),
  setup({ el, App, props }) {
    // any: config Ziggy dibagikan lewat prop Inertia (bentuknya dinamis per
    // halaman), bukan tipe RouteList statis yang dikenal ziggy-js.
    const ziggyConfig = props.initialPage.props.ziggy as any
    globalThis.route = (name, params, absolute) =>
      ziggyRoute(name as never, params, absolute, ziggyConfig) as unknown as string

    createRoot(el).render(
      <>
        <App {...props} />
        <Toaster richColors position="top-right" />
      </>,
    )
  },
  progress: {
    delay: 500,
    color: '#fbbf24',
    showSpinner: false,
  },
})
