import { useForm } from '@inertiajs/react'
import { useState, type FormEventHandler, type ReactElement } from 'react'
import GuestLayout from '@/Layouts/GuestLayout'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'

/**
 * T-106. Halaman tantangan 2FA saat login — sebelumnya TIDAK ADA sama
 * sekali meski fitur 2FA sudah aktif di config('fortify.features').
 * User yang mengaktifkan 2FA akan mentok di sini (Fortify redirect ke
 * route two-factor.login setelah password benar) sebelum halaman ini
 * dibuat.
 */
export default function TwoFactorChallenge() {
  const [useRecoveryCode, setUseRecoveryCode] = useState(false)
  const { data, setData, post, processing, errors } = useForm({
    code: '',
    recovery_code: '',
  })

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    post(route('two-factor.login.store'))
  }

  function toggleMode() {
    setUseRecoveryCode((prev) => !prev)
    setData({ code: '', recovery_code: '' })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h1 className="text-lg font-semibold text-content">Verifikasi Dua Faktor</h1>
        <p className="text-sm text-content-muted">
          {useRecoveryCode
            ? 'Masukkan salah satu kode pemulihan Anda.'
            : 'Masukkan kode 6 digit dari aplikasi autentikator Anda.'}
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        {useRecoveryCode ? (
          <div className="space-y-1.5">
            <Label htmlFor="recovery_code">Kode Pemulihan</Label>
            <Input
              id="recovery_code"
              autoFocus
              autoComplete="one-time-code"
              value={data.recovery_code}
              onChange={(e) => setData('recovery_code', e.target.value)}
            />
            {errors.recovery_code && <p className="text-sm text-danger">{errors.recovery_code}</p>}
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="code">Kode Autentikator</Label>
            <Input
              id="code"
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              value={data.code}
              onChange={(e) => setData('code', e.target.value)}
            />
            {errors.code && <p className="text-sm text-danger">{errors.code}</p>}
          </div>
        )}

        <Button type="submit" disabled={processing} className="w-full">
          Verifikasi
        </Button>

        <button
          type="button"
          onClick={toggleMode}
          className="text-sm text-content-muted underline underline-offset-2 hover:text-content"
        >
          {useRecoveryCode ? 'Pakai kode autentikator sebagai gantinya' : 'Pakai kode pemulihan sebagai gantinya'}
        </button>
      </form>
    </div>
  )
}

TwoFactorChallenge.layout = (page: ReactElement) => <GuestLayout>{page}</GuestLayout>
