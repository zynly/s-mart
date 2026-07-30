import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/Components/ui/button'

export type BulkAction = {
  label: string
  icon?: ReactNode
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost'
  onClick: () => void
}

type BulkActionBarProps = {
  selectedCount: number
  actions: BulkAction[]
  onClear: () => void
}

export function BulkActionBar({ selectedCount, actions, onClear }: BulkActionBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="fixed inset-x-0 bottom-4 z-20 flex justify-center px-4">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-2.5 shadow-lg">
        <span className="text-sm text-content">
          <strong>{selectedCount}</strong> baris dipilih
        </span>
        <div className="flex items-center gap-2">
          {actions.map((action) => (
            <Button key={action.label} size="sm" variant={action.variant ?? 'outline'} onClick={action.onClick}>
              {action.icon}
              {action.label}
            </Button>
          ))}
        </div>
        <Button size="icon-sm" variant="ghost" onClick={onClear} aria-label="Batalkan pilihan">
          <X className="size-4" />
        </Button>
      </div>
    </div>
  )
}
