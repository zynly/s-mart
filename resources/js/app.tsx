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
import type { ComponentType } from 'react'

const appName = import.meta.env.VITE_APP_NAME || 'Skillage Mart'

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
    createRoot(el).render(
      <>
        <App {...props} />
        <Toaster richColors position="top-right" />
      </>,
    )
  },
  progress: {
    color: '#1B3A6B',
  },
})
