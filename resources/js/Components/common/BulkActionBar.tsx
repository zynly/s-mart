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
    <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 pointer-events-none animate-in fade-in-0 slide-in-from-bottom-5 duration-200">
      <div className="pointer-events-auto flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md px-4 py-2.5 shadow-2xl dark:border-slate-800 dark:bg-slate-900/95 ring-1 ring-black/5">
        <div className="flex items-center gap-2 border-r border-slate-200 dark:border-slate-800 pr-3.5">
          <span className="flex size-2 rounded-full bg-blue-600 animate-ping" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            <strong className="text-blue-600 dark:text-blue-400 font-extrabold text-sm">{selectedCount}</strong> data dipilih
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions.map((action) => (
            <Button
              key={action.label}
              size="xs"
              variant={action.variant ?? 'outline'}
              onClick={action.onClick}
              className="h-8 gap-1.5 px-3 text-xs font-semibold rounded-xl cursor-pointer shadow-xs transition-transform active:scale-95"
            >
              {action.icon}
              <span>{action.label}</span>
            </Button>
          ))}
        </div>
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={onClear}
          aria-label="Batalkan pilihan"
          className="size-7 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer ml-1"
          title="Batalkan semua pilihan"
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
