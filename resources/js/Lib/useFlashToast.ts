import { useEffect } from 'react'
import { usePage } from '@inertiajs/react'
import { toast } from 'sonner'
import type { PageProps } from '@/Types'

/**
 * Bug nyata ditemukan Fase 16 saat verifikasi Playwright: prop
 * `flash.success`/`error`/`warning`/`info` dibagikan dari SETIAP
 * controller sejak Fase 1 (`->with('success', ...)` dipakai puluhan
 * kali di seluruh backlog) tapi TIDAK PERNAH dibaca di frontend mana
 * pun — grep `flash` di resources/js hanya muncul di deklarasi tipe.
 * User tidak pernah melihat konfirmasi aksi berhasil/gagal lewat toast
 * sama sekali. Satu hook dipakai ulang di AdminLayout dan WaliLayout,
 * bukan ditulis ulang tiap halaman.
 */
export function useFlashToast() {
  const { flash } = usePage<PageProps>().props

  useEffect(() => {
    if (flash.success) toast.success(flash.success)
    if (flash.error) toast.error(flash.error)
    if (flash.warning) toast.warning(flash.warning)
    if (flash.info) toast.info(flash.info)
  }, [flash.success, flash.error, flash.warning, flash.info])
}
