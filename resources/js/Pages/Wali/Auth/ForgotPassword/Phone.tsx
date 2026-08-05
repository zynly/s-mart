import { useForm } from '@inertiajs/react'
import type { FormEventHandler, ReactElement } from 'react'
import GuestLayout from '@/Layouts/GuestLayout'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'

export default function Phone() {
  const { data, setData, post, processing, errors } = useForm({ phone: '' })

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    post(route('wali.forgot-password.phone.store'))
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h1 className="text-lg font-semibold text-content">Lupa Password</h1>
        <p className="text-sm text-content-muted">Masukkan nomor HP yang terdaftar sebagai wali.</p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="phone">Nomor HP</Label>
          <Input id="phone" autoFocus autoComplete="tel" inputMode="tel" value={data.phone} onChange={(e) => setData('phone', e.target.value)} />
          {errors.phone && <p className="text-sm text-danger">{errors.phone}</p>}
        </div>

        <Button type="submit" disabled={processing || data.phone.trim().length === 0} className="w-full">
          Lanjutkan
        </Button>
      </form>
    </div>
  )
}

Phone.layout = (page: ReactElement) => <GuestLayout>{page}</GuestLayout>
