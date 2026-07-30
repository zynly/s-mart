import { Loader2 } from 'lucide-react'

type LoadingOverlayProps = {
  show: boolean
  message?: string
}

export function LoadingOverlay({ show, message = 'Memproses…' }: LoadingOverlayProps) {
  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface px-6 py-5 shadow-lg">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="text-sm text-content">{message}</p>
      </div>
    </div>
  )
}
