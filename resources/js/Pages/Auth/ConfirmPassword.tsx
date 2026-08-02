import { useForm } from '@inertiajs/react'
import type { FormEventHandler, ReactElement } from 'react'
import GuestLayout from '@/Layouts/GuestLayout'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'

/**
 * T-106. Fortify config('fortify.features') 2FA diaktifkan dengan
 * `confirmPassword: true` sejak awal proyek, tapi view ini TIDAK
 * PERNAH dibuat — tanpanya, mengelola 2FA (aktifkan/nonaktifkan)
 * menabrak halaman kosong/500 karena Fortify redirect ke sini duluan
 * (password wajib dikonfirmasi ulang sebelum aksi sensitif).
 */
export default function ConfirmPassword() {
  const { data, setData, post, processing, errors } = useForm({ password: '' })

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    post(route('password.confirm'), { onFinish: () => setData('password', '') })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h1 className="text-lg font-semibold text-content">Konfirmasi Password</h1>
        <p className="text-sm text-content-muted">
          Ini area sensitif — masukkan ulang password Anda untuk melanjutkan.
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoFocus
            autoComplete="current-password"
            value={data.password}
            onChange={(e) => setData('password', e.target.value)}
          />
          {errors.password && <p className="text-sm text-danger">{errors.password}</p>}
        </div>

        <Button type="submit" disabled={processing} className="w-full">
          Konfirmasi
        </Button>
      </form>
    </div>
  )
}

ConfirmPassword.layout = (page: ReactElement) => <GuestLayout>{page}</GuestLayout>
