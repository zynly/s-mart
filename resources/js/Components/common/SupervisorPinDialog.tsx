import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import { Button } from '@/Components/ui/button'
import { PinInput } from '@/Components/common/PinInput'

type SupervisorPinDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  permission: string
  title?: string
  description?: string
  onApproved: (approverId: number) => void
}

/**
 * Modal PIN otorisasi supervisor — dipakai lintas fase (void, ubah harga,
 * diskon di atas batas, approve opname/selisih kas). Basis: Dialog + PinInput
 * dari Fase 0. ConfirmDialog (AlertDialog) tidak dipakai karena perlu input
 * PIN, bukan sekadar konfirmasi ya/tidak.
 */
export function SupervisorPinDialog({
  open,
  onOpenChange,
  permission,
  title = 'Otorisasi Supervisor',
  description = 'Masukkan PIN supervisor untuk melanjutkan.',
  onApproved,
}: SupervisorPinDialogProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function submit(value: string) {
    setSubmitting(true)
    setError(null)

    router.post(
      route('authorization.override'),
      { permission, pin: value },
      {
        preserveScroll: true,
        onSuccess: (page) => {
          setPin('')
          onOpenChange(false)
          onApproved(page.props.approverId as number)
        },
        onError: (errors) => {
          setError(errors.pin ?? 'PIN tidak valid.')
          setPin('')
        },
        onFinish: () => setSubmitting(false),
      },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setPin('')
          setError(null)
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 py-2">
          <PinInput
            length={6}
            value={pin}
            onChange={setPin}
            onComplete={submit}
            disabled={submitting}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Batal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
