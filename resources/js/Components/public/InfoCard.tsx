import type { ComponentType } from 'react'

type InfoCardProps = {
  icon: ComponentType<{ className?: string }>
  title: string
  content: string
}

export function InfoCard({ icon: Icon, title, content }: InfoCardProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface p-6 text-center">
      <div className="rounded-full bg-navy-100 p-3 text-navy-700 dark:bg-navy-800 dark:text-navy-200">
        <Icon className="size-5" />
      </div>
      <p className="font-medium text-content">{title}</p>
      <p className="text-sm whitespace-pre-line text-content-muted">{content}</p>
    </div>
  )
}
