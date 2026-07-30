import type { ComponentType, ReactNode } from 'react'
import { Inbox } from 'lucide-react'

type EmptyStateProps = {
  icon?: ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="rounded-full bg-navy-100 p-3 text-navy-500 dark:bg-navy-700 dark:text-navy-200">
        <Icon className="size-6" />
      </div>
      <div>
        <p className="font-medium text-content">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-content-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}
