import { Link, router, usePage } from '@inertiajs/react'
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

export function PageTabs({ tabs, current }: PageTabsProps) {
  const { auth } = usePage<PageProps>().props
  const userPermissions = Array.isArray(auth?.user?.permissions) ? auth.user.permissions : []
  const visible = tabs.filter((tab) => !tab.permission || userPermissions.includes(tab.permission))

  if (visible.length <= 1) return null

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-border/90 bg-surface neu-flat p-1.5 shadow-sm">
      <Tabs value={current}>
        <TabsList variant="default" className="w-full flex items-center justify-between border-none bg-transparent p-0 gap-2">
          {visible.map((tab) => (
            <TabsTrigger
              key={tab.key}
              value={tab.key}
              asChild
              className="flex-1 w-full justify-center text-center py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200"
            >
              <Link href={tab.href} prefetch="hover" preserveScroll>
                {tab.label}
              </Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  )
}
