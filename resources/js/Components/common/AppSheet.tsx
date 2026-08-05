import type { ReactNode } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/Components/ui/sheet'
import { SHEET_WIDTHS, type SheetSize } from '@/Lib/sheet-sizes'
import { cn } from '@/Lib/utils'

type AppSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  size?: SheetSize
  children: ReactNode
  footer?: ReactNode
}

/**
 * REVISI-UI-KASIR.md §3.3 — wrapper standar untuk semua Sheet form di
 * aplikasi: lebar adaptif (`size`), header & footer sticky, konten
 * tengah scrollable. Pakai ini alih-alih `<SheetContent>` polos supaya
 * form panjang (mis. Tambah Anggota 5 tab) tidak sesak/terpotong.
 */
export function AppSheet({ open, onOpenChange, title, description, size = 'md', children, footer }: AppSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={cn(SHEET_WIDTHS[size], 'flex flex-col gap-0 p-0')}>
        <SheetHeader className="shrink-0 border-b border-border px-6 py-5">
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <div className="flex shrink-0 justify-end gap-3 border-t border-border bg-surface px-6 py-4">
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
