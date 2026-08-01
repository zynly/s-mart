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
    <Tabs value={current} onValueChange={(key) => {
      const target = visible.find((t) => t.key === key)
      if (target) router.visit(target.href, { preserveScroll: true })
    }}
    >
      <TabsList variant="line" className="w-full justify-start overflow-x-auto">
        {visible.map((tab) => (
          <TabsTrigger key={tab.key} value={tab.key}>{tab.label}</TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
