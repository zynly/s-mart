import { useState } from 'react'
import { router } from '@inertiajs/react'
import { LogOut } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/Components/ui/alert-dialog'
import { Button } from '@/Components/ui/button'

type LogoutConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  logoutUrl?: string
  title?: string
  description?: string
}

export function LogoutConfirmDialog({
  open,
  onOpenChange,
  logoutUrl = route('logout'),
  title = 'Konfirmasi Keluar Sistem',
  description = 'Apakah Anda yakin ingin mengakhiri sesi aktif ini? Anda harus masuk kembali untuk mengakses akun.',
}: LogoutConfirmDialogProps) {
  const [loading, setLoading] = useState(false)

  const handleLogout = () => {
    setLoading(true)
    toast.info('Mengakhiri sesi akun...', {
      description: 'Sampai jumpa kembali di S-Mart!',
    })
    router.post(logoutUrl, {}, {
      onFinish: () => {
        setLoading(false)
        onOpenChange(false)
      },
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md rounded-2xl border-slate-200 p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <AlertDialogHeader className="flex flex-col items-center text-center">
          <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 shadow-sm">
            <LogOut className="size-7 stroke-[2.2]" />
          </div>
          <AlertDialogTitle className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-5 sm:mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
          <AlertDialogCancel
            disabled={loading}
            className="h-11 rounded-xl border-slate-200 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 font-semibold text-xs text-slate-700 dark:text-slate-300"
          >
            Tetap di Sini
          </AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={loading}
            onClick={handleLogout}
            className="h-11 gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 font-bold text-xs shadow-md shadow-rose-600/25 text-white"
          >
            <LogOut className="size-4" />
            {loading ? 'Memproses Keluar...' : 'Ya, Keluar Akun'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
