import type { ReactNode } from 'react'
import { Link } from '@inertiajs/react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/Components/ui/breadcrumb'

type Crumb = {
  label: string
  href?: string
}

type PageHeaderProps = {
  title: string
  subtitle?: string
  breadcrumbs?: Crumb[]
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-border/90 bg-surface neu-flat p-4 sm:flex-row sm:items-center sm:justify-between shadow-sm transition-all duration-200">
      <div className="flex flex-col gap-1.5">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumb>
            <BreadcrumbList className="flex items-center gap-1.5">
              {breadcrumbs.map((crumb, index) => (
                <span key={crumb.label} className="flex items-center gap-1.5">
                  <BreadcrumbItem className="rounded-lg bg-bg border border-border px-2.5 py-0.5 text-[11px] font-semibold text-content shadow-2xs">
                    {crumb.href ? (
                      <Link href={crumb.href} prefetch className="hover:text-amber-600 transition-colors">
                        {crumb.label}
                      </Link>
                    ) : (
                      <BreadcrumbPage className="font-bold text-content">{crumb.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  {index < breadcrumbs.length - 1 && <BreadcrumbSeparator className="text-content-muted text-xs font-bold" />}
                </span>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        )}
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
          <h1 className="text-xl font-extrabold tracking-tight text-navy-950 dark:text-white font-sans">{title}</h1>
        </div>
        {subtitle && <p className="text-xs font-medium text-content-muted pl-4.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2 sm:self-center">{actions}</div>}
    </div>
  )
}
