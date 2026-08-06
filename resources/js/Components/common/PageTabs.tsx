import { router, usePage } from '@inertiajs/react'
import { Tabs, TabsList, TabsTrigger } from '@/Components/ui/tabs'
import type { PageProps } from '@/Types'

export type PageTab = {
  key: string
  label: string
  href: string
  permission?: string
}

type PageTabsProps = {
  tabs: PageTab[]
  current: string
}

/**
 * T-117 (Fase UI-01). Menghubungkan beberapa route yang SUDAH ADA
 * (bukan konten tergabung dalam satu komponen) supaya terasa seperti
 * satu menu bertab — tiap tab navigasi penuh ke route saudaranya lewat
 * Inertia. `current` datang dari prop controller (bukan state client),
 * supaya refresh/deep-link tetap menampilkan tab yang benar.
 */
export function PageTabs({ tabs, current }: PageTabsProps) {
  const { auth } = usePage<PageProps>().props
  const visible = tabs.filter((tab) => !tab.permission || auth.user?.permissions.includes(tab.permission))

  if (visible.length <= 1) return null

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-border/90 bg-surface neu-flat p-1.5 shadow-sm">
      <Tabs
        value={current}
        onValueChange={(key) => {
          const target = visible.find((t) => t.key === key)
          if (target) router.visit(target.href, { preserveScroll: true })
        }}
      >
        <TabsList variant="default" className="w-full flex items-center justify-between border-none bg-transparent p-0 gap-2">
          {visible.map((tab) => (
            <TabsTrigger
              key={tab.key}
              value={tab.key}
              className="flex-1 w-full justify-center text-center py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  )
}
