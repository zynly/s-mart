import { useForm } from '@inertiajs/react'
import type { FormEventHandler, ReactElement } from 'react'
import GuestLayout from '@/Layouts/GuestLayout'
import { PasswordStrengthMeter } from '@/Components/common/PasswordStrengthMeter'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'

type ResetProps = { token: string }

export default function Reset({ token }: ResetProps) {
  const { data, setData, post, processing, errors } = useForm({
    token,
    password: '',
    password_confirmation: '',
  })

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    post(route('wali.forgot-password.reset.store'))
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h1 className="text-lg font-semibold text-content">Buat Password Baru</h1>
        <p className="text-sm text-content-muted">Verifikasi berhasil — silakan buat password baru.</p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">Password Baru</Label>
          <Input id="password" type="password" autoFocus autoComplete="new-password" value={data.password} onChange={(e) => setData('password', e.target.value)} />
          <PasswordStrengthMeter password={data.password} />
          {errors.password && <p className="text-sm text-danger">{errors.password}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password_confirmation">Ulangi Password Baru</Label>
          <Input id="password_confirmation" type="password" autoComplete="new-password" value={data.password_confirmation} onChange={(e) => setData('password_confirmation', e.target.value)} />
        </div>

        <Button type="submit" disabled={processing} className="w-full">
          Simpan &amp; Masuk
        </Button>
      </form>
    </div>
  )
}

Reset.layout = (page: ReactElement) => <GuestLayout>{page}</GuestLayout>
